import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user with profile and notification preferences
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        profile: {
          create: {},
        },
        notificationPrefs: {
          create: {},
        },
      },
      include: {
        profile: true,
        notificationPrefs: true,
      },
    })

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { data: userWithoutPassword, message: 'User registered successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}
