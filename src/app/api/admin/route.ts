import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'

// ========== GET: Admin system data ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    // Fetch all users with profile
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        profile: { select: { fullName: true, college: true } },
        _count: {
          select: {
            createdProjects: true,
            projectMemberships: true,
            assignedTasks: true,
            dailyCheckins: true,
          },
        },
      },
    })

    // Fetch all projects
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        createdBy: true,
        createdAt: true,
        _count: { select: { members: true, tasks: true } },
      },
    })

    // System-wide counts
    const totalTasks = await db.task.count()
    const completedTasks = await db.task.count({ where: { status: 'verified_completed' } })
    const aiRequests = await db.aiRequest.count()
    const notifications = await db.notification.count()
    const integrations = await db.connectedAccount.count()
    const checkins = await db.dailyCheckin.count()

    // Recent activity logs
    const activityLogs = await db.activityLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      data: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name || u.profile?.fullName || 'Unknown',
          role: u.role,
          avatar: u.avatar,
          createdAt: u.createdAt,
          projectCount: u._count.createdProjects + u._count.projectMemberships,
          taskCount: u._count.assignedTasks,
          checkinCount: u._count.dailyCheckins,
        })),
        projects,
        systemStats: {
          totalProjects: projects.length,
          totalUsers: users.length,
          totalTasks,
          completedTasks,
          aiRequests,
          notificationsSent: notifications,
          activeIntegrations: integrations,
          totalCheckins: checkins,
        },
        activityLogs: activityLogs.map((l) => ({
          id: l.id,
          action: l.action,
          description: l.description,
          createdAt: l.createdAt,
          userName: l.user?.name || 'System',
          projectId: l.projectId,
        })),
      },
    })
  } catch (error) {
    console.error('Admin GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 })
  }
}

// ========== PATCH: Update user role ==========
const updateRoleSchema = z.object({
  adminUserId: z.string().min(1),
  targetUserId: z.string().min(1),
  newRole: z.enum(['member', 'admin']),
})

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = updateRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { targetUserId, newRole } = parsed.data

    // Prevent self-demotion
    if (sessionUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Update role
    const updated = await db.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, name: true, email: true, role: true },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: sessionUserId,
        action: 'role_changed',
        description: `Changed ${updated.name || updated.email}'s role to ${newRole}`,
        metadata: JSON.stringify({ targetUserId, newRole }),
      },
    })

    return NextResponse.json({ data: updated, message: 'Role updated' })
  } catch (error) {
    console.error('Admin PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}
