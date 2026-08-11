import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: List comments ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')

    if (!projectId && !taskId) {
      return NextResponse.json(
        { error: 'Either projectId or taskId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (taskId) where.taskId = taskId

    const comments = await db.comment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: comments })
  } catch (error) {
    console.error('List comments error:', error)
    return NextResponse.json(
      { error: 'Failed to list comments' },
      { status: 500 }
    )
  }
}

// ========== POST: Create comment ==========
const createCommentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  content: z.string().min(1, 'Comment content is required'),
  mentions: z.array(z.string()).optional().default([]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createCommentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId, projectId, taskId, content, mentions } = parsed.data

    if (!projectId && !taskId) {
      return NextResponse.json(
        { error: 'Either projectId or taskId is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        projectId: projectId || null,
        taskId: taskId || null,
        userId,
        content,
        mentions: JSON.stringify(mentions),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      for (const mentionId of mentions) {
        if (mentionId === userId) continue

        await db.notification.create({
          data: {
            userId: mentionId,
            type: 'comment_mention',
            title: 'You were mentioned in a comment',
            message: `${user.name || user.email} mentioned you in a comment: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
            link: taskId ? `/projects/${projectId}/tasks/${taskId}` : `/projects/${projectId}`,
            metadata: JSON.stringify({ commentId: comment.id, projectId, taskId }),
          },
        })
      }
    }

    // Notify project/task members
    if (projectId) {
      const projectMembers = await db.projectMember.findMany({
        where: { projectId, userId: { not: userId } },
        select: { userId: true },
      })

      const memberIds = projectMembers.map((m) => m.userId).filter((mId) => !mentions.includes(mId))

      for (const memberId of memberIds) {
        await db.notification.create({
          data: {
            userId: memberId,
            type: 'new_comment',
            title: 'New Comment',
            message: `${user.name || user.email} commented ${taskId ? `on a task` : `on the project`}`,
            link: taskId ? `/projects/${projectId}/tasks/${taskId}` : `/projects/${projectId}`,
            metadata: JSON.stringify({ commentId: comment.id, projectId, taskId }),
          },
        })
      }
    }

    return NextResponse.json(
      { data: comment, message: 'Comment created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
