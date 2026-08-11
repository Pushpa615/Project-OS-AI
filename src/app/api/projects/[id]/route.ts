import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: Get single project with members, milestones, task stats ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { tasks: true } },
          },
        },
        _count: {
          select: { tasks: true, comments: true, files: true, reports: true },
        },
        tasks: {
          select: { id: true, status: true, priority: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Compute task stats
    const taskStats = {
      total: project.tasks.length,
      notStarted: project.tasks.filter((t) => t.status === 'not_started').length,
      inProgress: project.tasks.filter((t) => t.status === 'in_progress').length,
      submitted: project.tasks.filter((t) => t.status === 'submitted').length,
      underReview: project.tasks.filter((t) => t.status === 'under_review').length,
      verifiedCompleted: project.tasks.filter((t) => t.status === 'verified_completed').length,
      overdue: project.tasks.filter((t) => t.status === 'overdue').length,
    }

    const result = {
      ...project,
      taskStats,
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    )
  }
}

// ========== PUT: Update project fields ==========
const updateProjectSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  projectType: z.string().optional(),
  targetUsers: z.string().optional(),
  goal: z.string().optional(),
  deadline: z.string().nullable().optional(),
  difficulty: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  status: z.enum(['active','completed','archived','on_hold']).optional(),
  progress: z.number().min(0).max(100).optional(),
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
    const parsed = updateProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId, ...updateFields } = parsed.data

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Build update data
    const data: Record<string, unknown> = {}
    if (updateFields.name !== undefined) data.name = updateFields.name
    if (updateFields.description !== undefined) data.description = updateFields.description
    if (updateFields.projectType !== undefined) data.projectType = updateFields.projectType
    if (updateFields.targetUsers !== undefined) data.targetUsers = updateFields.targetUsers
    if (updateFields.goal !== undefined) data.goal = updateFields.goal
    if (updateFields.deadline !== undefined) data.deadline = updateFields.deadline ? new Date(updateFields.deadline) : null
    if (updateFields.difficulty !== undefined) data.difficulty = updateFields.difficulty
    if (updateFields.techStack !== undefined) data.techStack = JSON.stringify(updateFields.techStack)
    if (updateFields.features !== undefined) data.features = JSON.stringify(updateFields.features)
    if (updateFields.requirements !== undefined) data.requirements = updateFields.requirements
    if (updateFields.status !== undefined) data.status = updateFields.status
    if (updateFields.progress !== undefined) data.progress = updateFields.progress

    // If project is being completed, set completedAt
    if (updateFields.status === 'completed' && project.status !== 'completed') {
      data.completedAt = new Date()
    }

    const updated = await db.project.update({
      where: { id },
      data,
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: id,
        userId: sessionUserId,
        action: 'project_updated',
        description: `Updated project "${project.name}"`,
        metadata: JSON.stringify({ fields: Object.keys(updateFields) }),
      },
    })

    return NextResponse.json({
      data: updated,
      message: 'Project updated successfully',
    })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// ========== DELETE: Archive project ==========
const deleteProjectSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { id } = await params
    const body = await req.json()
    const parsed = deleteProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId } = parsed.data

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Archive the project (soft delete)
    await db.project.update({
      where: { id },
      data: { status: 'archived' },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: id,
        userId: sessionUserId,
        action: 'project_archived',
        description: `Archived project "${project.name}"`,
      },
    })

    return NextResponse.json({
      message: 'Project archived successfully',
    })
  } catch (error) {
    console.error('Archive project error:', error)
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    )
  }
}
