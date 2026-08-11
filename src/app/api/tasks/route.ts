import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: List tasks ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const milestoneId = searchParams.get('milestoneId')

    const where: Record<string, unknown> = {}

    if (projectId) where.projectId = projectId
    if (assignedTo) where.assignedTo = assignedTo
    if (status) where.status = status
    if (milestoneId) where.milestoneId = milestoneId

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
        dependencies: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        _count: {
          select: { evidence: true, taskComments: true },
        },
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({ data: tasks })
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to list tasks' },
      { status: 500 }
    )
  }
}

// ========== POST: Create task ==========
const createTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  milestoneId: z.string().optional(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().default(''),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['not_started','in_progress','submitted','under_review','verified_completed','overdue']).default('not_started'),
  startDate: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().min(0).optional(),
  completionPercent: z.number().min(0).max(100).default(0),
  evidenceReq: z.string().optional(),
  order: z.number().int().default(0),
  dependencies: z.array(z.string()).optional().default([]),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = createTaskSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      projectId,
      milestoneId,
      title,
      description,
      assignedTo,
      priority,
      status,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      completionPercent,
      evidenceReq,
      order,
      dependencies,
    } = parsed.data

    // Check project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify milestone belongs to project if provided
    if (milestoneId) {
      const milestone = await db.milestone.findFirst({
        where: { id: milestoneId, projectId },
      })
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found in this project' },
          { status: 404 }
        )
      }
    }

    // Create task
    const task = await db.task.create({
      data: {
        projectId,
        milestoneId: milestoneId || null,
        title,
        description,
        assignedTo: assignedTo || null,
        priority,
        status,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours || null,
        actualHours: actualHours || null,
        completionPercent,
        evidenceReq,
        order,
      },
    })

    // Create task dependencies
    if (dependencies && dependencies.length > 0) {
      for (const depId of dependencies) {
        if (depId === task.id) continue
        try {
          await db.taskDependency.create({
            data: {
              taskId: task.id,
              dependsOnId: depId,
            },
          })
        } catch {
          // Ignore unique constraint errors
        }
      }
    }

    // Create activity log
    await db.activityLog.create({
      data: {
        projectId,
        userId: assignedTo || project.createdBy,
        action: 'task_created',
        description: `Created task "${title}"`,
        metadata: JSON.stringify({ taskId: task.id, priority, status }),
      },
    })

    // Notify assignee
    if (assignedTo) {
      await db.notification.create({
        data: {
          userId: assignedTo,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned the task "${title}" in project "${project.name}".`,
          link: `/projects/${projectId}`,
          metadata: JSON.stringify({ projectId, taskId: task.id }),
        },
      })
    }

    return NextResponse.json(
      { data: task, message: 'Task created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
