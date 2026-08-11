import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: List members ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const { id } = await params

    const members = await db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({ data: members })
  } catch (error) {
    console.error('List members error:', error)
    return NextResponse.json(
      { error: 'Failed to list members' },
      { status: 500 }
    )
  }
}

// ========== POST: Add member ==========
const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['leader', 'member', 'reviewer']).default('member'),
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
    const parsed = addMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: bodyUserId, role } = parsed.data
    const userId = bodyUserId || sessionUserId

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already a member
    const existingMember = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 409 }
      )
    }

    // Add member
    const member = await db.projectMember.create({
      data: {
        projectId: id,
        userId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // Create notification for the added user
    await db.notification.create({
      data: {
        userId,
        type: 'project_invite',
        title: 'Added to Project',
        message: `You have been added to the project "${project.name}" as ${role}.`,
        link: `/projects/${id}`,
        metadata: JSON.stringify({ projectId: id }),
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: id,
        userId,
        action: 'member_added',
        description: `${user.name || user.email} joined the project as ${role}`,
      },
    })

    return NextResponse.json(
      { data: member, message: 'Member added successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}

// ========== DELETE: Remove member ==========
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || sessionUserId

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if the member exists
    const member = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this project' },
        { status: 404 }
      )
    }

    // Don't allow removing the last leader
    if (member.role === 'leader') {
      const leaderCount = await db.projectMember.count({
        where: { projectId: id, role: 'leader' },
      })
      if (leaderCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last leader of the project' },
          { status: 400 }
        )
      }
    }

    // Remove member
    await db.projectMember.delete({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: id,
        userId,
        action: 'member_removed',
        description: `A member was removed from the project`,
      },
    })

    return NextResponse.json({
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
