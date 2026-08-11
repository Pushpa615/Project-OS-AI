import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: List portfolios ==========
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

    const portfolios = await db.portfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: portfolios })
  } catch (error) {
    console.error('List portfolios error:', error)
    return NextResponse.json(
      { error: 'Failed to list portfolios' },
      { status: 500 }
    )
  }
}

// ========== POST: Create portfolio ==========
const createPortfolioSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  projectId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  technologies: z.array(z.string()).optional().default([]),
  contribution: z.string().optional().default(''),
  screenshots: z.array(z.string()).optional().default([]),
  githubUrl: z.string().optional().default(''),
  liveUrl: z.string().optional().default(''),
  isPublic: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createPortfolioSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      userId,
      projectId,
      title,
      description,
      technologies,
      contribution,
      screenshots,
      githubUrl,
      liveUrl,
      isPublic,
    } = parsed.data

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const portfolio = await db.portfolio.create({
      data: {
        userId,
        projectId: projectId || null,
        title,
        description,
        technologies: JSON.stringify(technologies),
        contribution,
        screenshots: JSON.stringify(screenshots),
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        isPublic,
      },
    })

    return NextResponse.json(
      { data: portfolio, message: 'Portfolio created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create portfolio error:', error)
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    )
  }
}

// ========== PUT: Update portfolio ==========
const updatePortfolioSchema = z.object({
  id: z.string().min(1, 'Portfolio ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  projectId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  technologies: z.array(z.string()).optional().default([]),
  contribution: z.string().optional().default(''),
  screenshots: z.array(z.string()).optional().default([]),
  githubUrl: z.string().optional().default(''),
  liveUrl: z.string().optional().default(''),
  isPublic: z.boolean().default(false),
})

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = updatePortfolioSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      id,
      userId,
      projectId,
      title,
      description,
      technologies,
      contribution,
      screenshots,
      githubUrl,
      liveUrl,
      isPublic,
    } = parsed.data

    // Verify the portfolio exists and belongs to the user
    const existing = await db.portfolio.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    const updated = await db.portfolio.update({
      where: { id },
      data: {
        title,
        description,
        technologies: JSON.stringify(technologies),
        contribution,
        screenshots: JSON.stringify(screenshots),
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        isPublic,
        projectId: projectId || null,
      },
    })

    return NextResponse.json({
      data: updated,
      message: 'Portfolio updated successfully',
    })
  } catch (error) {
    console.error('Update portfolio error:', error)
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    )
  }
}

// ========== DELETE: Delete portfolio ==========
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify the portfolio exists and belongs to the user
    const existing = await db.portfolio.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    await db.portfolio.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Portfolio deleted successfully',
    })
  } catch (error) {
    console.error('Delete portfolio error:', error)
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    )
  }
}
