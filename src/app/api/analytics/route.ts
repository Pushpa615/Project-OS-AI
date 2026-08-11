import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: Get analytics for project or user ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    // Determine which projects to analyze
    let projectIds: string[] = []
    let projectName = 'All Projects'
    let projectStatus = ''
    let projectProgress = 0
    let projectDeadline: Date | null = null
    let projectCreatedAt = new Date()

    if (projectId) {
      // Single project analytics
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
        },
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      projectIds = [projectId]
      projectName = project.name
      projectStatus = project.status
      projectProgress = project.progress
      projectDeadline = project.deadline
      projectCreatedAt = project.createdAt
    } else if (userId) {
      // User-level analytics across all projects
      const userProjects = await db.project.findMany({
        where: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } },
          ],
          status: { not: 'archived' },
        },
        select: { id: true },
      })
      projectIds = userProjects.map((p) => p.id)
      if (projectIds.length === 0) {
        return NextResponse.json({
          data: {
            project: { id: '', name: 'All Projects', status: '', progress: 0, createdAt: new Date(), deadline: null, daysRemaining: null },
            taskStats: { total: 0, notStarted: 0, inProgress: 0, submitted: 0, underReview: 0, verifiedCompleted: 0, overdue: 0, completionRate: 0, averageProgress: 0 },
            milestoneStats: [],
            teamStats: [],
            overdueCount: 0,
            overdueTasks: [],
            priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
            recentActivity: 0,
          },
        })
      }
    } else {
      return NextResponse.json(
        { error: 'projectId or userId query parameter is required' },
        { status: 400 }
      )
    }

    // Get all tasks for selected projects
    const tasks = await db.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
    })

    // Get milestones for selected projects
    const milestones = await db.milestone.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: { status: true, completionPercent: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Calculate task stats
    const taskStats = {
      total: tasks.length,
      notStarted: tasks.filter((t) => t.status === 'not_started').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      completed: tasks.filter((t) => t.status === 'verified_completed').length,
      overdue: tasks.filter((t) => t.status === 'overdue').length,
      completionRate: tasks.length > 0
        ? Math.round((tasks.filter((t) => t.status === 'verified_completed').length / tasks.length) * 100)
        : 0,
      averageProgress: tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.completionPercent, 0) / tasks.length)
        : 0,
    }

    // Calculate milestone progress
    const milestoneStats = milestones.map((m) => {
      const mTasks = m.tasks
      const completedTasks = mTasks.filter((t) => t.status === 'verified_completed').length
      const avgProgress = mTasks.length > 0
        ? Math.round(mTasks.reduce((sum, t) => sum + t.completionPercent, 0) / mTasks.length)
        : 0
      return {
        id: m.id,
        title: m.title,
        totalTasks: mTasks.length,
        completedTasks,
        progress: avgProgress,
        status: avgProgress === 100 ? 'completed' : avgProgress > 0 ? 'in_progress' : 'not_started',
      }
    })

    // Calculate team contribution stats
    const allMembers = await db.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })
    const uniqueMemberIds = [...new Set(allMembers.map((m) => m.userId))]
    const teamStats: Array<{userId: string; name: string; role: string; avatar: string | null; totalTasks: number; completedTasks: number; inProgressTasks: number; overdueTasks: number; totalHours: number; estimatedHours: number; checkinCount: number; contributionScore: number}> = []

    for (const memberId of uniqueMemberIds) {
      const memberTasks = tasks.filter((t) => t.assignedTo === memberId)
      const member = allMembers.find((m) => m.userId === memberId)
      const checkinCount = await db.dailyCheckin.count({
        where: { userId: memberId },
      })

      teamStats.push({
        userId: memberId,
        name: member?.user.name || 'Unknown',
        role: member?.role || 'member',
        avatar: member?.user.avatar || null,
        totalTasks: memberTasks.length,
        completedTasks: memberTasks.filter((t) => t.status === 'verified_completed').length,
        inProgressTasks: memberTasks.filter((t) => t.status === 'in_progress').length,
        overdueTasks: memberTasks.filter((t) => t.status === 'overdue').length,
        totalHours: memberTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
        estimatedHours: memberTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        checkinCount,
        contributionScore: memberTasks.length > 0
          ? Math.round((memberTasks.filter((t) => t.status === 'verified_completed').length / memberTasks.length) * 100)
          : 0,
      })
    }

    // Sort team by contribution
    teamStats.sort((a, b) => b.contributionScore - a.contributionScore)

    // Calculate overdue count (tasks past due date that aren't completed)
    const now = new Date()
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < now &&
        !['verified_completed', 'submitted', 'under_review'].includes(t.status)
    )

    // Priority distribution
    const priorityDistribution = {
      critical: tasks.filter((t) => t.priority === 'critical').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    }

    // Timeline data (tasks created per week - last 8 weeks)
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
    const recentTasks = tasks.filter((t) => t.createdAt >= eightWeeksAgo)

    return NextResponse.json({
      data: {
        project: {
          id: projectId || '',
          name: projectName,
          status: projectStatus,
          progress: projectProgress,
          createdAt: projectCreatedAt,
          deadline: projectDeadline,
          daysRemaining: projectDeadline
            ? Math.max(0, Math.ceil((projectDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : null,
        },
        taskStats,
        milestoneStats,
        teamStats,
        overdueCount: overdueTasks.length,
        overdueTasks: overdueTasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          assignee: t.assignee?.name || 'Unassigned',
        })),
        priorityDistribution,
        recentActivity: recentTasks.length,
      },
    })
  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
