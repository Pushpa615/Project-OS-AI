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
  teamMembers: z.array(z.string()).optional().default([]),
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
      teamMembers,
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

    // Add team members by email lookup
    if (teamMembers && teamMembers.length > 0) {
      const existingUsers = await db.user.findMany({
        where: { email: { in: teamMembers } },
        select: { id: true, email: true },
      })
      const emailToId = new Map(existingUsers.map((u) => [u.email, u.id]))
      const membersToCreate = []
      const notFoundEmails = []

      for (const email of teamMembers) {
        const uid = emailToId.get(email)
        if (uid && uid !== userId) {
          membersToCreate.push({ projectId: project.id, userId: uid, role: 'member' })
        } else if (uid !== userId) {
          notFoundEmails.push(email)
        }
      }

      if (membersToCreate.length > 0) {
        await db.projectMember.createMany({ data: membersToCreate })
      }

      // Create notifications for added members
      for (const m of membersToCreate) {
        await db.notification.create({
          data: {
            userId: m.userId,
            type: 'project_invite',
            title: 'Added to Project',
            message: `You have been added as a member to project "${name}"`,
            link: `project-detail?id=${project.id}`,
            metadata: JSON.stringify({ projectId: project.id }),
          },
        })
      }
    }

    // Re-fetch with all members included
    const finalProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    })

    return NextResponse.json(
      { data: finalProject, message: 'Project created successfully' },
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
