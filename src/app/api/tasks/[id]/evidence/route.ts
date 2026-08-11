import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== POST: Add evidence ==========
const addEvidenceSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['screenshot', 'video', 'document', 'link', 'code', 'other']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  url: z.string().optional().default(''),
  fileName: z.string().optional().default(''),
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
    const parsed = addEvidenceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId, type, title, description, url, fileName } = parsed.data

    // Check task exists
    const task = await db.task.findUnique({
      where: { id },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Create evidence
    const evidence = await db.taskEvidence.create({
      data: {
        taskId: id,
        type,
        title,
        description,
        url: url || null,
        fileName: fileName || null,
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: task.projectId,
        userId: sessionUserId,
        action: 'evidence_added',
        description: `Added evidence "${title}" to task "${task.title}"`,
        metadata: JSON.stringify({ taskId: id, evidenceId: evidence.id, type }),
      },
    })

    return NextResponse.json(
      { data: evidence, message: 'Evidence added successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add evidence error:', error)
    return NextResponse.json(
      { error: 'Failed to add evidence' },
      { status: 500 }
    )
  }
}

// ========== GET: List evidence for task ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    const sessionUserId = auth.error ? undefined : auth.user.id

    const { id } = await params

    const evidence = await db.taskEvidence.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: evidence })
  } catch (error) {
    console.error('List evidence error:', error)
    return NextResponse.json(
      { error: 'Failed to list evidence' },
      { status: 500 }
    )
  }
}
