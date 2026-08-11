import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: Get analytics for project ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    // Check project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get all tasks for this project
    const tasks = await db.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
    })

    // Get milestones
    const milestones = await db.milestone.findMany({
      where: { projectId },
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
      submitted: tasks.filter((t) => t.status === 'submitted').length,
      underReview: tasks.filter((t) => t.status === 'under_review').length,
      verifiedCompleted: tasks.filter((t) => t.status === 'verified_completed').length,
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
    const memberIds = project.members.map((m) => m.userId)
    const teamStats = []

    for (const memberId of memberIds) {
      const memberTasks = tasks.filter((t) => t.assignedTo === memberId)
      const member = project.members.find((m) => m.userId === memberId)
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
          id: project.id,
          name: project.name,
          status: project.status,
          progress: project.progress,
          createdAt: project.createdAt,
          deadline: project.deadline,
          daysRemaining: project.deadline
            ? Math.max(0, Math.ceil((project.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
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
