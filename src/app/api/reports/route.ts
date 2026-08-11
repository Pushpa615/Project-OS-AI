import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { aiGenerateReport } from '@/lib/ai'

// ========== GET: Get reports for project ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const reports = await db.projectReport.findMany({
      where: { projectId },
      orderBy: { generatedAt: 'desc' },
    })

    return NextResponse.json({ data: reports })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: 'Failed to get reports' },
      { status: 500 }
    )
  }
}

// ========== POST: Generate report ==========
const generateReportSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  userId: z.string().min(1, 'User ID is required'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = generateReportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { projectId, userId } = parsed.data

    // Get project with members and tasks
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        milestones: {
          include: {
            tasks: {
              select: { status: true, completionPercent: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate task stats
    const taskStats = {
      total: project.tasks.length,
      completed: project.tasks.filter((t) => t.status === 'verified_completed').length,
      verified: project.tasks.filter((t) => t.status === 'verified_completed').length,
      overdue: project.tasks.filter((t) => t.status === 'overdue').length,
      inProgress: project.tasks.filter((t) => t.status === 'in_progress').length,
    }

    // Calculate team contributions
    const teamContributions = await Promise.all(
      project.members.map(async (member) => {
        const memberTasks = project.tasks.filter((t) => t.assignedTo === member.userId)
        const checkinCount = await db.dailyCheckin.count({
          where: { userId: member.userId },
        })

        return {
          name: member.user.name || member.user.email,
          completedTasks: memberTasks.filter((t) => t.status === 'verified_completed').length,
          verifiedTasks: memberTasks.filter((t) => t.status === 'verified_completed').length,
          totalHours: memberTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
          checkins: checkinCount,
        }
      })
    )

    // Milestone data
    const milestoneData = project.milestones.map((m) => ({
      title: m.title,
      status: m.status,
      progress: m.tasks.length > 0
        ? Math.round(m.tasks.reduce((sum, t) => sum + t.completionPercent, 0) / m.tasks.length)
        : 0,
    }))

    // Create AI request record
    const aiRequest = await db.aiRequest.create({
      data: {
        projectId,
        userId,
        type: 'generate_report',
        prompt: JSON.stringify({ taskStats, teamContributions, milestoneData }),
        status: 'processing',
      },
    })

    try {
      // Call AI to generate report
      const aiResult = await aiGenerateReport({
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        startDate: project.createdAt.toISOString(),
        endDate: project.completedAt?.toISOString(),
        taskStats,
        teamContributions,
        milestones: milestoneData,
      })

      // Parse AI response
      let cleanResult = aiResult.trim()
      if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      let reportData: Record<string, unknown>
      try {
        reportData = JSON.parse(cleanResult)
      } catch {
        reportData = { summary: cleanResult }
      }

      // Save report
      const report = await db.projectReport.create({
        data: {
          projectId,
          summary: (reportData.summary as string) || '',
          strengths: JSON.stringify((reportData.strengths as string[]) || []),
          weaknesses: JSON.stringify((reportData.weaknesses as string[]) || []),
          challenges: JSON.stringify((reportData.challenges as string[]) || []),
          improvements: JSON.stringify((reportData.improvements as string[]) || []),
          recommendedSkills: JSON.stringify((reportData.recommendedSkills as string[]) || []),
          futureImprovements: (reportData.futureImprovements as string) || '',
          overallAssessment: (reportData.overallAssessment as string) || '',
          taskCompletion: JSON.stringify(taskStats),
          teamContribution: JSON.stringify(teamContributions),
        },
      })

      // Create AI feedback for each team member
      const individualFeedback = (reportData.individualFeedback as Array<Record<string, string>>) || []
      for (const feedback of individualFeedback) {
        const member = project.members.find(
          (m) => m.user.name === feedback.name || m.user.email === feedback.name
        )
        if (member) {
          await db.aiFeedback.create({
            data: {
              userId: member.userId,
              projectId,
              category: 'project_report',
              strength: feedback.strength || '',
              improvement: feedback.improvement || '',
              nextSteps: feedback.nextSteps || '',
            },
          })
        }
      }

      // Update AI request
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          response: aiResult,
          status: 'completed',
        },
      })

      // Log activity
      await db.activityLog.create({
        data: {
          projectId,
          userId,
          action: 'report_generated',
          description: `Generated AI project report for "${project.name}"`,
          metadata: JSON.stringify({ reportId: report.id }),
        },
      })

      return NextResponse.json(
        { data: { report, aiAnalysis: reportData }, message: 'Report generated successfully' },
        { status: 201 }
      )
    } catch (aiError) {
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        },
      })

      return NextResponse.json(
        { error: 'Failed to generate report', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
