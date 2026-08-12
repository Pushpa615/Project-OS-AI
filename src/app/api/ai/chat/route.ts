import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { aiChat, aiCodeHelp, aiBugHelp } from '@/lib/ai'

// ========== POST: General AI chat ==========
const aiChatSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  type: z.enum(['general', 'code_help', 'bug_help', 'planning', 'code', 'bug', 'docs', 'deadline']).default('general'),
  question: z.string().min(1, 'Question is required'),
  context: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const sessionUserId = auth.user.id

    const body = await req.json()
    const parsed = aiChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId: _userId, projectId, taskId, type, question, context } = parsed.data

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: sessionUserId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get project/task context if available
    let projectContext = ''
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { name: true, description: true, techStack: true, projectType: true },
      })
      if (project) {
        const techStack = JSON.parse(project.techStack || '[]')
        projectContext = `Project: ${project.name}\nType: ${project.projectType}\nDescription: ${project.description}\nTech Stack: ${techStack.join(', ')}`
      }
    }

    let taskContext = ''
    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { title: true, description: true },
      })
      if (task) {
        taskContext = `Task: ${task.title}\nDescription: ${task.description || 'None'}`
      }
    }

    // Create AI request record
    const aiRequest = await db.aiRequest.create({
      data: {
        projectId: projectId || null,
        taskId: taskId || null,
        userId: sessionUserId,
        type: `chat_${type}`,
        prompt: question,
        status: 'processing',
      },
    })

    try {
      let response = ''

      switch (type) {
        case 'code':
        case 'code_help': {
          // Need task/project for code help
          const task = taskId
            ? await db.task.findUnique({
                where: { id: taskId },
                select: { title: true, description: true },
              })
            : null
          const project = projectId
            ? await db.project.findUnique({
                where: { id: projectId },
                select: { techStack: true },
              })
            : null

          response = await aiCodeHelp({
            taskTitle: task?.title || 'General',
            taskDescription: task?.description || context,
            question,
            techStack: project ? JSON.parse(project.techStack || '[]') : [],
          })
          break
        }

        case 'bug':
        case 'bug_help': {
          const project = projectId
            ? await db.project.findUnique({
                where: { id: projectId },
                select: { techStack: true },
              })
            : null

          response = await aiBugHelp({
            errorMessage: question,
            relevantCode: context || undefined,
            expectedBehavior: '',
            actualBehavior: context || 'Unknown',
            techStack: project ? JSON.parse(project.techStack || '[]') : [],
          })
          break
        }

        default: {
          // General chat
          const systemPrompt = `You are a helpful AI assistant for Project OS, a project management platform for students. 
${projectContext ? `\n${projectContext}` : ''}
${taskContext ? `\n${taskContext}` : ''}
${context ? `\nAdditional Context: ${context}` : ''}

Provide helpful, educational, and actionable responses. Be encouraging and supportive.`

          const aiResponse = await aiChat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ])
          response = aiResponse.content
        }
      }

      // Update AI request
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          response,
          status: 'completed',
        },
      })

      return NextResponse.json({
        data: { response, type, requestId: aiRequest.id },
      })
    } catch (aiError) {
      await db.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        },
      })

      return NextResponse.json(
        { error: 'AI chat failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI chat request' },
      { status: 500 }
    )
  }
}
