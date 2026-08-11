import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    // Find user with password hash
    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, passwordHash: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Account not found or uses OAuth login' },
        { status: 400 }
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await db.user.update({
      where: { id: auth.user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
