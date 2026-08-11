import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const userCount = await db.user.count()
    const projectCount = await db.project.count()
    const taskCount = await db.task.count()

    return NextResponse.json({
      status: 'ok',
      service: 'Project OS AI',
      version: '1.0.0',
      stats: {
        users: userCount,
        projects: projectCount,
        tasks: taskCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Service unhealthy' },
      { status: 503 }
    )
  }
}
