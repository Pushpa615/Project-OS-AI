import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: Get single task with dependencies, evidence, comments ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        milestone: {
          select: { id: true, title: true, status: true, progress: true },
        },
        project: {
          select: { id: true, name: true, techStack: true },
        },
        dependencies: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true, priority: true },
            },
          },
        },
        dependentTasks: {
          include: {
            task: {
              select: { id: true, title: true, status: true, priority: true },
            },
          },
        },
        evidence: {
          orderBy: { createdAt: 'desc' },
        },
        taskComments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        aiRequests: {
          select: { id: true, type: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      { error: 'Failed to get task' },
      { status: 500 }
    )
  }
}

// ========== PUT: Update task ==========
const updateTaskSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['not_started','in_progress','submitted','under_review','verified_completed','overdue']).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  completionPercent: z.number().min(0).max(100).optional(),
  evidenceReq: z.string().nullable().optional(),
  order: z.number().int().optional(),
  milestoneId: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { id } = await params
    const body = await req.json()
    const parsed = updateTaskSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId, ...updateFields } = parsed.data

    // Check task exists
    const existingTask = await db.task.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Build update data
    const data: Record<string, unknown> = {}
    if (updateFields.title !== undefined) data.title = updateFields.title
    if (updateFields.description !== undefined) data.description = updateFields.description
    if (updateFields.assignedTo !== undefined) data.assignedTo = updateFields.assignedTo
    if (updateFields.priority !== undefined) data.priority = updateFields.priority
    if (updateFields.status !== undefined) data.status = updateFields.status
    if (updateFields.startDate !== undefined) data.startDate = updateFields.startDate ? new Date(updateFields.startDate) : null
    if (updateFields.dueDate !== undefined) data.dueDate = updateFields.dueDate ? new Date(updateFields.dueDate) : null
    if (updateFields.estimatedHours !== undefined) data.estimatedHours = updateFields.estimatedHours
    if (updateFields.actualHours !== undefined) data.actualHours = updateFields.actualHours
    if (updateFields.completionPercent !== undefined) data.completionPercent = updateFields.completionPercent
    if (updateFields.evidenceReq !== undefined) data.evidenceReq = updateFields.evidenceReq
    if (updateFields.order !== undefined) data.order = updateFields.order
    if (updateFields.milestoneId !== undefined) data.milestoneId = updateFields.milestoneId

    // Handle verified_completed status
    if (updateFields.status === 'verified_completed') {
      data.verifiedAt = new Date()
      data.verifiedBy = sessionUserId
      data.completionPercent = 100
    }

    const updated = await db.task.update({
      where: { id },
      data,
    })

    // If status changed, notify assignee
    if (updateFields.status && updateFields.status !== existingTask.status && updated.assignedTo) {
      const statusMessages: Record<string, string> = {
        in_progress: 'has been started',
        submitted: 'has been submitted for review',
        under_review: 'is under review',
        verified_completed: 'has been verified and completed!',
        overdue: 'is overdue',
        not_started: 'has been reset to not started',
      }

      const message = statusMessages[updateFields.status] || 'status has been updated'

      await db.notification.create({
        data: {
          userId: updated.assignedTo,
          type: 'task_status_change',
          title: 'Task Status Updated',
          message: `Task "${updated.title}" ${message}.`,
          link: `/projects/${existingTask.projectId}`,
          metadata: JSON.stringify({ taskId: id, projectId: existingTask.projectId, newStatus: updateFields.status }),
        },
      })
    }

    // Create activity log
    await db.activityLog.create({
      data: {
        projectId: existingTask.projectId,
        userId: sessionUserId,
        action: 'task_updated',
        description: `Updated task "${existingTask.title}"`,
        metadata: JSON.stringify({
          taskId: id,
          fields: Object.keys(updateFields),
          previousStatus: existingTask.status,
          newStatus: updateFields.status,
        }),
      },
    })

    // Update project progress if completion changed
    if (updateFields.completionPercent !== undefined || updateFields.status !== undefined) {
      const allTasks = await db.task.findMany({
        where: { projectId: existingTask.projectId },
        select: { completionPercent: true },
      })

      const avgProgress = allTasks.length > 0
        ? allTasks.reduce((sum, t) => sum + t.completionPercent, 0) / allTasks.length
        : 0

      await db.project.update({
        where: { id: existingTask.projectId },
        data: { progress: Math.round(avgProgress * 100) / 100 },
      })
    }

    return NextResponse.json({
      data: updated,
      message: 'Task updated successfully',
    })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
