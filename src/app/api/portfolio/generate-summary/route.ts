import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { aiChat } from '@/lib/ai'

const schema = z.object({
  portfolioId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const portfolio = await db.portfolio.findFirst({
      where: { id: parsed.data.portfolioId, userId: auth.user.id },
      include: { user: { select: { name: true } } },
    })
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    const techs = JSON.parse(portfolio.technologies || '[]')
    let projectContext = ''
    if (portfolio.projectId) {
      const project = await db.project.findUnique({
        where: { id: portfolio.projectId },
        include: { milestones: { select: { title: true, status: true } } },
      })
      if (project) {
        projectContext = `\nRelated Project: ${project.name}\nMilestones: ${project.milestones.map((m) => `${m.title} (${m.status})`).join(', ')}`
      }
    }

    const response = await aiChat([
      {
        role: 'system',
        content: 'You are a professional portfolio writer. Write compelling, concise summaries for a developer portfolio. Highlight technical depth, problem-solving, and impact. Write in third person. 3-5 sentences max.',
      },
      {
        role: 'user',
        content: `Generate a professional portfolio summary for this project entry:\n\nTitle: ${portfolio.title}\nDescription: ${portfolio.description || 'No description'}\nTechnologies: ${techs.join(', ')}\nContribution: ${portfolio.contribution || 'Not specified'}\n${projectContext}\n\nWrite a compelling 3-5 sentence summary suitable for a developer portfolio.`,
      },
    ])

    const updated = await db.portfolio.update({
      where: { id: portfolio.id },
      data: { aiSummary: response.content },
    })

    return NextResponse.json({ data: updated, message: 'AI summary generated' })
  } catch (error) {
    console.error('Generate portfolio summary error:', error)
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 })
  }
}
