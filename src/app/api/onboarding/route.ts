import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    const profile = await db.userProfile.findUnique({
      where: { userId },
      include: { connectedAccounts: true },
    })
    if (!profile) {
      return NextResponse.json({ data: { onboarded: false } })
    }
    return NextResponse.json({
      data: {
        ...profile,
        skills: JSON.parse(profile.skills || '[]'),
        onboarded: profile.onboarded,
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

    const { userId, fullName, college, course, academicYear, phone, bio, skills } = parsed.data

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
