import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// ========== GET: Get overdue tasks ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const now = new Date()

    const where: Record<string, unknown> = {
      dueDate: { lt: now },
      status: {
        notIn: ['verified_completed', 'submitted', 'under_review'],
      },
    }

    if (projectId) where.projectId = projectId

    const overdueTasks = await db.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({
      data: overdueTasks,
      count: overdueTasks.length,
    })
  } catch (error) {
    console.error('Get overdue tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to get overdue tasks' },
      { status: 500 }
    )
  }
}

// ========== POST: Check and update overdue tasks ==========
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const now = new Date()

    // Find all tasks that are overdue but not yet marked
    const overdueTasks = await db.task.findMany({
      where: {
        dueDate: { lt: now },
        status: {
          notIn: ['verified_completed', 'submitted', 'under_review', 'overdue'],
        },
      },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    let updatedCount = 0
    const updatedTaskIds: string[] = []

    for (const task of overdueTasks) {
      // Update task status to overdue
      await db.task.update({
        where: { id: task.id },
        data: { status: 'overdue' },
      })

      updatedTaskIds.push(task.id)
      updatedCount++

      // Create notification for assignee
      if (task.assignedTo) {
        await db.notification.create({
          data: {
            userId: task.assignedTo,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Your task "${task.title}" in project "${task.project.name}" is overdue.`,
            link: `/projects/${task.projectId}`,
            metadata: JSON.stringify({ taskId: task.id, projectId: task.projectId }),
          },
        })
      }
    }

    // Log activity for each affected project
    const affectedProjectIds = [...new Set(overdueTasks.map((t) => t.projectId))]
    for (const projId of affectedProjectIds) {
      const projTasks = overdueTasks.filter((t) => t.projectId === projId)
      await db.activityLog.create({
        data: {
          projectId: projId,
          action: 'tasks_overdue',
          description: `${projTasks.length} tasks marked as overdue`,
          metadata: JSON.stringify({ taskIds: projTasks.map((t) => t.id) }),
        },
      })
    }

    return NextResponse.json({
      data: {
        newlyOverdue: updatedCount,
        taskIds: updatedTaskIds,
      },
      message: updatedCount > 0
        ? `${updatedCount} tasks marked as overdue`
        : 'No new overdue tasks found',
    })
  } catch (error) {
    console.error('Update overdue tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to update overdue tasks' },
      { status: 500 }
    )
  }
}
