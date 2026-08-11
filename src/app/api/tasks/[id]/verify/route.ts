import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { aiAnalyzeEvidence } from '@/lib/ai'

// ========== POST: Verify task using AI ==========
const verifyTaskSchema = z.object({
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
    const parsed = verifyTaskSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId } = parsed.data

    // Check task exists with evidence
    const task = await db.task.findUnique({
      where: { id },
      include: {
        evidence: true,
        project: true,
        milestone: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if task has evidence
    if (task.evidence.length === 0) {
      return NextResponse.json(
        { error: 'Cannot verify task without evidence. Please add evidence first.' },
        { status: 400 }
      )
    }

    // Create AI request record
    const aiRequest = await db.aiRequest.create({
      data: {
        projectId: task.projectId,
        taskId: id,
        userId: sessionUserId,
        type: 'verify_evidence',
        prompt: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          evidenceReq: task.evidenceReq,
          evidenceItems: task.evidence.map((e) => ({
            type: e.type,
            title: e.title,
            description: e.description,
            url: e.url,
          })),
        }),
        status: 'processing',
      },
    })

    try {
      // Call AI to analyze evidence
      const aiResult = await aiAnalyzeEvidence({
        taskTitle: task.title,
        taskDescription: task.description || '',
        evidenceItems: task.evidence.map((e) => ({
          type: e.type,
          title: e.title,
          description: e.description || '',
          url: e.url || '',
        })),
      })

      // Parse the AI response
      let cleanResult = aiResult.trim()
      if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      let analysis: { confidence: number; summary: string; found: string[]; missing: string[]; recommendation: string }
      try {
        analysis = JSON.parse(cleanResult)
      } catch {
        analysis = {
          confidence: 0.5,
          summary: cleanResult,
          found: [],
          missing: [],
          recommendation: 'needs_review',
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

      // Update evidence records with AI analysis
      await db.taskEvidence.updateMany({
        where: { taskId: id },
        data: {
          confidence: analysis.confidence,
          aiAnalysis: JSON.stringify(analysis),
        },
      })

      // Determine new status based on AI recommendation
      let newStatus: string
      if (analysis.recommendation === 'verified_completed' && analysis.confidence >= 0.7) {
        newStatus = 'verified_completed'
      } else if (analysis.recommendation === 'verified_completed') {
        newStatus = 'under_review'
      } else {
        newStatus = 'under_review'
      }

      // Update task status
      const updatedTask = await db.task.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'verified_completed' ? {
            verifiedAt: new Date(),
            verifiedBy: sessionUserId,
            completionPercent: 100,
          } : {}),
        },
      })

      // Log activity
      await db.activityLog.create({
        data: {
          projectId: task.projectId,
          userId: sessionUserId,
          action: 'task_verified',
          description: `AI verified task "${task.title}"`,
          metadata: JSON.stringify({
            taskId: id,
            recommendation: analysis.recommendation,
            confidence: analysis.confidence,
            newStatus,
          }),
        },
      })

      // Notify task assignee
      if (task.assignedTo && task.assignedTo !== userId) {
        await db.notification.create({
          data: {
            userId: task.assignedTo,
            type: 'task_verified',
            title: 'Task Verification Complete',
            message: `Your task "${task.title}" has been verified. Status: ${newStatus.replace(/_/g, ' ')}.`,
            link: `/projects/${task.projectId}`,
            metadata: JSON.stringify({ taskId: id, projectId: task.projectId, newStatus }),
          },
        })
      }

      return NextResponse.json({
        data: {
          analysis,
          task: updatedTask,
          newStatus,
        },
        message: 'Task verification completed',
      })
    } catch (aiError) {
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        },
      })

      return NextResponse.json(
        { error: 'AI verification failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Verify task error:', error)
    return NextResponse.json(
      { error: 'Failed to verify task' },
      { status: 500 }
    )
  }
}
