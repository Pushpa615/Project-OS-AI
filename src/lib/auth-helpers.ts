import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Require authentication on an API route.
 * Returns { user } on success, or { error: NextResponse } on failure.
 *
 * Usage:
 *   const auth = await requireAuth(req)
 *   if (auth.error) return auth.error
 *   const userId = auth.user.id
 */
export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }
  return {
    user: {
      id: (session.user as Record<string, string>).id,
      email: session.user.email || '',
      name: session.user.name || '',
      role: (session.user as Record<string, string>).role || 'member',
    },
  }
}

/**
 * Require admin role.
 */
export async function requireAdmin(req: NextRequest) {
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
 * Returns { membership } on success, or { error: NextResponse } on failure.
 */
export async function requireProjectMember(userId: string, projectId: string) {
  const { db } = await import('./db')
  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
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
  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  })
  if (!membership || (membership.role !== 'leader' && membership.role !== 'admin')) {
    return {
      error: NextResponse.json({ error: 'Project leader access required' }, { status: 403 }),
    }
  }
  return { membership }
}
