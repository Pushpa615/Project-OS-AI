import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: List connected accounts ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || sessionUserId

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    const accounts = await db.connectedAccount.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    })

    return NextResponse.json({ data: accounts })
  } catch (error) {
    console.error('List connected accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to list connected accounts' },
      { status: 500 }
    )
  }
}

// ========== POST: Connect account ==========
const connectAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  provider: z.string().min(1, 'Provider is required'),
  displayName: z.string().optional().default(''),
  url: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = connectAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: bodyUserId, provider, displayName, url } = parsed.data

    const userId = bodyUserId || sessionUserId

    // Check user exists and has a profile (required for ConnectedAccount FK)
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    if (!user.profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete onboarding first.' },
        { status: 400 }
      )
    }

    // Check if already connected
    const existing = await db.connectedAccount.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Account with ${provider} is already connected` },
        { status: 409 }
      )
    }

    // Connect account
    const account = await db.connectedAccount.create({
      data: {
        userId,
        provider,
        displayName: displayName || provider,
        url: url || null,
      },
    })

    return NextResponse.json(
      { data: account, message: 'Account connected successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Connect account error:', error)
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    )
  }
}

// ========== DELETE: Disconnect account ==========
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const body = await req.json()

    const deleteSchema = z.object({
      userId: z.string().min(1),
      provider: z.string().min(1),
      id: z.string().min(1),
    })
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId, provider, id } = parsed.data

    if (id) {
      // Delete by ID (frontend sends this way)
      const existing = await db.connectedAccount.findFirst({ where: { id, userId } })
      if (!existing) {
        return NextResponse.json(
          { error: 'Connected account not found' },
          { status: 404 }
        )
      }
      await db.connectedAccount.delete({ where: { id } })
    } else if (provider) {
      // Delete by userId+provider composite key
      const existing = await db.connectedAccount.findUnique({
        where: { userId_provider: { userId, provider } },
      })
      if (!existing) {
        return NextResponse.json(
          { error: 'Connected account not found' },
          { status: 404 }
        )
      }
      await db.connectedAccount.delete({
        where: { userId_provider: { userId, provider } },
      })
    } else {
      return NextResponse.json(
        { error: 'Either id or provider is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Account disconnected successfully' })
  } catch (error) {
    console.error('Disconnect account error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
