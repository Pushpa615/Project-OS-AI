import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: List connected accounts ==========
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
    const body = await req.json()
    const parsed = connectAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId, provider, displayName, url } = parsed.data

    // Check user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const provider = searchParams.get('provider')

    if (!userId || !provider) {
      return NextResponse.json(
        { error: 'userId and provider query parameters are required' },
        { status: 400 }
      )
    }

    const existing = await db.connectedAccount.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    await db.connectedAccount.delete({
      where: {
        userId_provider: { userId, provider },
      },
    })

    return NextResponse.json({
      message: 'Account disconnected successfully',
    })
  } catch (error) {
    console.error('Disconnect account error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
