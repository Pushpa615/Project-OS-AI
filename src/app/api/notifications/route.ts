import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: List notifications ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || sessionUserId
    const unreadOnly = searchParams.get('unread')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { userId }
    if (unreadOnly === 'true') {
      where.read = false
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Also return unread count
    const unreadCount = await db.notification.count({
      where: { userId, read: false },
    })

    return NextResponse.json({
      data: notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to list notifications' },
      { status: 500 }
    )
  }
}

// ========== POST: Mark notifications as read ==========
const markReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID is required'),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = markReadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { notificationIds } = parsed.data

    await db.notification.updateMany({
      where: { id: { in: notificationIds }, userId: sessionUserId },
      data: { read: true },
    })

    return NextResponse.json({
      message: `Marked ${notificationIds.length} notifications as read`,
    })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

// ========== PUT: Update notification preferences ==========
const updatePrefsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  emailNotifs: z.boolean().optional(),
  smsNotifs: z.boolean().optional(),
  pushNotifs: z.boolean().optional(),
  inAppNotifs: z.boolean().optional(),
  reminderDays: z.array(z.number()).optional(),
  reminderHours: z.array(z.number()).optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = updatePrefsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId, ...updateFields } = parsed.data

    // Build update data
    const data: Record<string, unknown> = {}
    if (updateFields.emailNotifs !== undefined) data.emailNotifs = updateFields.emailNotifs
    if (updateFields.smsNotifs !== undefined) data.smsNotifs = updateFields.smsNotifs
    if (updateFields.pushNotifs !== undefined) data.pushNotifs = updateFields.pushNotifs
    if (updateFields.inAppNotifs !== undefined) data.inAppNotifs = updateFields.inAppNotifs
    if (updateFields.reminderDays !== undefined) data.reminderDays = JSON.stringify(updateFields.reminderDays)
    if (updateFields.reminderHours !== undefined) data.reminderHours = JSON.stringify(updateFields.reminderHours)

    // Upsert notification preferences
    const prefs = await db.notificationPreference.upsert({
      where: { userId: sessionUserId },
      create: {
        userId: sessionUserId,
        ...data,
      },
      update: data,
    })

    return NextResponse.json({
      data: prefs,
      message: 'Notification preferences updated',
    })
  } catch (error) {
    console.error('Update notification prefs error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
