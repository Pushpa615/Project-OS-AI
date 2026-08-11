import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: Get calendar events ==========
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

    // Get tasks with due dates
    const tasks = await db.task.findMany({
      where: {
        projectId,
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        startDate: true,
        status: true,
        priority: true,
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Get milestones with due dates
    const milestones = await db.milestone.findMany({
      where: {
        projectId,
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        dueDate: true,
        status: true,
        progress: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    // Get meetings
    const meetings = await db.meeting.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        duration: true,
      },
      orderBy: { date: 'asc' },
    })

    // Format as calendar events
    const taskEvents = tasks.map((t) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      description: t.description,
      startDate: t.startDate?.toISOString() || null,
      endDate: t.dueDate?.toISOString() || null,
      allDay: true,
      color: getTaskColor(t.status, t.priority),
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      milestone: t.milestone,
    }))

    const milestoneEvents = milestones.map((m) => ({
      id: m.id,
      type: 'milestone',
      title: m.title,
      description: m.description,
      startDate: m.startDate?.toISOString() || null,
      endDate: m.dueDate?.toISOString() || null,
      allDay: true,
      color: getMilestoneColor(m.status),
      status: m.status,
      progress: m.progress,
    }))

    const meetingEvents = meetings.map((m) => ({
      id: m.id,
      type: 'meeting',
      title: m.title,
      description: m.description,
      startDate: m.date.toISOString(),
      endDate: m.duration
        ? new Date(m.date.getTime() + m.duration * 60 * 1000).toISOString()
        : null,
      allDay: false,
      color: '#6366f1',
    }))

    const events = [
      ...milestoneEvents,
      ...taskEvents,
      ...meetingEvents,
    ].sort((a, b) => {
      const aStart = a.startDate ? new Date(a.startDate).getTime() : 0
      const bStart = b.startDate ? new Date(b.startDate).getTime() : 0
      return aStart - bStart
    })

    return NextResponse.json({ data: events })
  } catch (error) {
    console.error('Get calendar error:', error)
    return NextResponse.json(
      { error: 'Failed to get calendar events' },
      { status: 500 }
    )
  }
}

function getTaskColor(status: string, priority: string): string {
  if (status === 'overdue') return '#ef4444'
  if (status === 'verified_completed') return '#22c55e'
  if (status === 'under_review') return '#f59e0b'
  if (status === 'submitted') return '#3b82f6'
  if (status === 'in_progress') return '#8b5cf6'

  // Not started - use priority color
  switch (priority) {
    case 'critical': return '#dc2626'
    case 'high': return '#ea580c'
    case 'medium': return '#ca8a04'
    case 'low': return '#6b7280'
    default: return '#6b7280'
  }
}

function getMilestoneColor(status: string): string {
  switch (status) {
    case 'completed': return '#22c55e'
    case 'in_progress': return '#3b82f6'
    case 'delayed': return '#ef4444'
    default: return '#6b7280'
  }
}
