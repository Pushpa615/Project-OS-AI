import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextRequest, NextResponse } from 'next/server'

interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthSuccess {
  user: AuthUser
  error?: undefined
}

interface AuthFailure {
  error: NextResponse<{ error: string }>
  user?: undefined
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Require authentication on an API route.
 * Returns { user } on success, or { error: NextResponse } on failure.
 */
export async function requireAuth(_req: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as Record<string, string> | undefined
    if (!session?.user || !sessionUser?.id) {
      return {
        error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      }
    }
    return {
      user: {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: sessionUser.name || '',
        role: sessionUser.role || 'member',
      },
    }
  } catch {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }
}

/**
 * Require admin role.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const auth = await requireAuth(req)
  if (auth.error) return auth
  if (auth.user.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    }
  }
  return { user: auth.user }
}

/**
 * Verify the user is a member of the given project.
 */
export async function requireProjectMember(userId: string, projectId: string) {
  const { db } = await import('./db')
  const membership = await db.projectMember.findFirst({
    where: {
      userId,
      projectId,
    },
  })
  if (!membership) {
    return {
      error: NextResponse.json({ error: 'Not a project member' }, { status: 403 }),
    }
  }
  return { membership }
}

/**
 * Verify the user is a project leader or admin.
 */
export async function requireProjectLeader(userId: string, projectId: string) {
  const { db } = await import('./db')
  const membership = await db.projectMember.findFirst({
    where: {
      userId,
      projectId,
    },
  })
  if (!membership || (membership.role !== 'leader' && membership.role !== 'admin')) {
    return {
      error: NextResponse.json({ error: 'Project leader access required' }, { status: 403 }),
    }
  }
  return { membership }
}
