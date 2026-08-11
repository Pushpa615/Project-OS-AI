import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { aiAnalyzeCheckin } from '@/lib/ai'

// ========== GET: Get checkins ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || sessionUserId
    const date = searchParams.get('date')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { userId }
    if (date) where.date = date

    const checkins = await db.dailyCheckin.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { date: 'desc' },
      take: date ? undefined : 30,
    })

    return NextResponse.json({ data: checkins })
  } catch (error) {
    console.error('Get checkins error:', error)
    return NextResponse.json(
      { error: 'Failed to get checkins' },
      { status: 500 }
    )
  }
}

// ========== POST: Submit checkin ==========
const checkinSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  projectId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  completed: z.string().optional().default(''),
  workingOn: z.string().optional().default(''),
  blocked: z.boolean().default(false),
  blockReason: z.string().optional().default(''),
  remains: z.string().optional().default(''),
  needHelp: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = checkinSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      userId: bodyUserId,
      projectId,
      date,
      completed,
      workingOn,
      blocked,
      blockReason,
      remains,
      needHelp,
    } = parsed.data

    const userId = bodyUserId || sessionUserId

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get assigned tasks for AI context
    const assignedTasks = await db.task.findMany({
      where: { assignedTo: userId, status: { not: 'verified_completed' } },
      select: { title: true, status: true, dueDate: true },
      take: 10,
    })

    // Call AI for feedback
    let aiFeedback: string | null = null
    try {
      aiFeedback = await aiAnalyzeCheckin({
        completed: completed || 'Nothing reported',
        workingOn: workingOn || 'Nothing reported',
        blocked,
        blockReason: blockReason || undefined,
        remains: remains || undefined,
        needHelp: needHelp || undefined,
        assignedTasks: assignedTasks.map((t) => ({
          title: t.title,
          status: t.status,
          dueDate: t.dueDate?.toISOString(),
        })),
      })
    } catch (aiError) {
      console.error('AI checkin analysis failed:', aiError)
      aiFeedback = null
    }

    // Upsert checkin (one per user per day)
    const checkin = await db.dailyCheckin.upsert({
      where: {
        userId_date: { userId, date },
      },
      create: {
        userId,
        projectId: projectId || null,
        date,
        completed,
        workingOn,
        blocked,
        blockReason,
        remains,
        needHelp,
        aiFeedback,
      },
      update: {
        projectId: projectId || null,
        completed,
        workingOn,
        blocked,
        blockReason,
        remains,
        needHelp,
        aiFeedback,
      },
    })

    return NextResponse.json(
      { data: checkin, message: 'Checkin submitted successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Submit checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to submit checkin' },
      { status: 500 }
    )
  }
}
