import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: List projects for user ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    const projects = await db.project.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
        status: { not: 'archived' },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        milestones: {
          select: { id: true, title: true, status: true, progress: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: projects })
  } catch (error) {
    console.error('List projects error:', error)
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}

// ========== POST: Create project ==========
const createProjectSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Description is required'),
  projectType: z.string().min(1, 'Project type is required'),
  targetUsers: z.string().optional().default(''),
  goal: z.string().optional().default(''),
  deadline: z.string().optional().default(''),
  difficulty: z.string().optional().default('medium'),
  techStack: z.array(z.string()).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  requirements: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      userId,
      name,
      description,
      projectType,
      targetUsers,
      goal,
      deadline,
      difficulty,
      techStack,
      features,
      requirements,
    } = parsed.data

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create project with creator as leader
    const project = await db.project.create({
      data: {
        name,
        description,
        projectType,
        targetUsers,
        goal,
        deadline: deadline ? new Date(deadline) : null,
        difficulty,
        techStack: JSON.stringify(techStack),
        features: JSON.stringify(features),
        requirements,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'leader',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    })

    // Create activity log
    await db.activityLog.create({
      data: {
        projectId: project.id,
        userId,
        action: 'project_created',
        description: `Created project "${project.name}"`,
        metadata: JSON.stringify({ projectType, difficulty }),
      },
    })

    return NextResponse.json(
      { data: project, message: 'Project created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
