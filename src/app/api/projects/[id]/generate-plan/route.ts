import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { aiGeneratePlan } from '@/lib/ai'

// ========== POST: Generate AI plan for project ==========
const generatePlanSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { id } = await params
    const body = await req.json()
    const parsed = generatePlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId } = parsed.data

    // Check project exists
    const project = await db.project.findUnique({
      where: { id },
      include: {
        members: true,
        milestones: true,
        tasks: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Don't regenerate if plan already exists
    if (project.milestones.length > 0) {
      return NextResponse.json(
        { error: 'Project already has a plan. Please clear existing milestones first.' },
        { status: 400 }
      )
    }

    // Parse project data for AI
    const projectData = {
      name: project.name,
      description: project.description,
      projectType: project.projectType,
      deadline: project.deadline?.toISOString(),
      techStack: JSON.parse(project.techStack || '[]'),
      features: JSON.parse(project.features || '[]'),
      difficulty: project.difficulty,
      teamSize: project.members.length,
      requirements: project.requirements || undefined,
      targetUsers: project.targetUsers || undefined,
      goal: project.goal || undefined,
    }

    // Create AI request record
    const aiRequest = await db.aiRequest.create({
      data: {
        projectId: id,
        userId: sessionUserId,
        type: 'generate_plan',
        prompt: JSON.stringify(projectData),
        status: 'processing',
      },
    })

    try {
      // Call AI to generate plan
      const aiResult = await aiGeneratePlan(projectData)

      // Parse the AI response (strip potential markdown code blocks)
      let cleanResult = aiResult.trim()
      if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const plan = JSON.parse(cleanResult)

      // Create milestones from plan
      const milestones = plan.milestones || []
      const tasks = plan.tasks || []

      const createdMilestones: Array<{id: string; title: string; description: string | null; order: number; projectId: string; arrayIndex: number}> = []

      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i]
        const created = await db.milestone.create({
          data: {
            projectId: id,
            title: milestone.title,
            description: milestone.description || null,
            order: milestone.order ?? i,
          },
        })
        createdMilestones.push({ ...created, arrayIndex: i })
      }

      // Create tasks and link to milestones
      const createdTasks: Array<{id: string; projectId: string; title: string; description: string | null; priority: string; estimatedHours: number | null; milestoneId: string | null; order: number; status: string}> = []
      const taskIdMap = new Map<number, string>() // task order -> task id

      for (const task of tasks) {
        const milestoneIndex = task.milestoneIndex ?? 0
        const matchingMilestone = createdMilestones[
          milestoneIndex
        ]

        const created = await db.task.create({
          data: {
            projectId: id,
            milestoneId: matchingMilestone?.id || null,
            title: task.title,
            description: task.description || null,
            priority: task.priority || 'medium',
            estimatedHours: task.estimatedHours || null,
            evidenceReq: task.evidenceReq || null,
            order: task.order || 0,
            status: 'not_started',
          },
        })
        createdTasks.push(created)
        taskIdMap.set(task.order || 0, created.id)
      }

      // Create task dependencies
      for (const task of tasks) {
        if (task.dependsOn && task.dependsOn.length > 0) {
          const currentTaskId = taskIdMap.get(task.order || 0)
          if (!currentTaskId) continue

          for (const depIndex of task.dependsOn) {
            const depTaskId = taskIdMap.get(depIndex)
            if (!depTaskId || depTaskId === currentTaskId) continue

            try {
              await db.taskDependency.create({
                data: {
                  taskId: currentTaskId,
                  dependsOnId: depTaskId,
                },
              })
            } catch {
              // Unique constraint may trigger, ignore
            }
          }
        }
      }

      // Update project status to active
      await db.project.update({
        where: { id },
        data: { status: 'active' },
      })

      // Update AI request record
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
          projectId: id,
          userId: sessionUserId,
          action: 'plan_generated',
          description: 'AI-generated project plan created',
          metadata: JSON.stringify({
            milestones: createdMilestones.length,
            tasks: createdTasks.length,
          }),
        },
      })

      return NextResponse.json({
        data: {
          roadmap: plan.roadmap,
          milestones: createdMilestones.map(({ id: mId, title, description, order }) => ({
            id: mId,
            title,
            description,
            order,
          })),
          tasks: createdTasks.map(({ id: tId, title, description, priority, estimatedHours }) => ({
            id: tId,
            title,
            description,
            priority,
            estimatedHours,
          })),
        },
        message: 'AI plan generated successfully',
      })
    } catch (aiError) {
      // Update AI request as failed
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        },
      })

      return NextResponse.json(
        { error: 'Failed to generate AI plan', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Generate plan error:', error)
    return NextResponse.json(
      { error: 'Failed to generate project plan' },
      { status: 500 }
    )
  }
}
