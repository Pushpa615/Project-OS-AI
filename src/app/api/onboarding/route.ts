import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

const onboardingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fullName: z.string().min(1, 'Full name is required'),
  college: z.string().optional().default(''),
  course: z.string().optional().default(''),
  academicYear: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  bio: z.string().optional().default(''),
  skills: z.array(z.string()).optional().default([]),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || sessionUserId
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    const [profile, user, notifPrefs] = await Promise.all([
      db.userProfile.findUnique({
        where: { userId },
        include: { connectedAccounts: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      }),
      db.notificationPreference.findUnique({
        where: { userId },
      }),
    ])
    if (!profile) {
      return NextResponse.json({ data: { onboarded: false, email: user?.email || '' } })
    }
    return NextResponse.json({
      data: {
        ...profile,
        email: user?.email || '',
        skills: JSON.parse(profile.skills || '[]'),
        onboarded: profile.onboarded,
        notificationPrefs: notifPrefs
          ? {
              emailNotifs: notifPrefs.emailNotifs,
              smsNotifs: notifPrefs.smsNotifs,
              pushNotifs: notifPrefs.pushNotifs,
              inAppNotifs: notifPrefs.inAppNotifs,
              reminderDays: notifPrefs.reminderDays,
              reminderHours: notifPrefs.reminderHours,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Get onboarding error:', error)
    return NextResponse.json({ error: 'Failed to get onboarding data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = onboardingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fullName, college, course, academicYear, phone, bio, skills, userId: bodyUserId } = parsed.data

    // Try session auth first, fall back to userId from body (for fresh registrations)
    let userId = bodyUserId
    try {
      const auth = await requireAuth(req)
      if (!auth.error) {
        userId = auth.user.id
      }
    } catch {
      // Continue with body userId
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already onboarded
    const existingProfile = await db.userProfile.findUnique({ where: { userId } })
    if (existingProfile?.onboarded) {
      return NextResponse.json(
        { error: 'User has already completed onboarding' },
        { status: 400 }
      )
    }

    // Update user profile
    const profile = await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName,
        college,
        course,
        academicYear,
        phone,
        bio,
        skills: JSON.stringify(skills),
        onboarded: true,
      },
      update: {
        fullName,
        college,
        course,
        academicYear,
        phone,
        bio,
        skills: JSON.stringify(skills),
        onboarded: true,
      },
    })

    // Update user name if not set
    if (!user.name || user.name === '') {
      await db.user.update({
        where: { id: userId },
        data: { name: fullName },
      })
    }

    return NextResponse.json({
      data: profile,
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}

// ========== PUT: Update profile (settings page) ==========
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = onboardingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fullName, college, course, academicYear, phone, bio, skills } = parsed.data
    const userId = sessionUserId

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName,
        college,
        course,
        academicYear,
        phone,
        bio,
        skills: JSON.stringify(skills),
        onboarded: true,
      },
      update: {
        fullName,
        college,
        course,
        academicYear,
        phone,
        bio,
        skills: JSON.stringify(skills),
      },
    })

    // Also update user name
    await db.user.update({
      where: { id: userId },
      data: { name: fullName },
    })

    return NextResponse.json({
      data: profile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
