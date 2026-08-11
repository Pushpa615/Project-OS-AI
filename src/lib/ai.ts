import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"
import { v4 as uuid } from "uuid"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface AiResponse {
  content: string
  model: string
  tokens: { completion_tokens: number; prompt_tokens: number; total_tokens: number }
}

export async function aiChat(
  messages: ChatMessage[],
  options?: { thinking?: boolean; jsonMode?: boolean }
): Promise<AiResponse> {
  const tmpFile = path.join(os.tmpdir(), `zai-${uuid()}.json`)
  try {
    const systemMsg = messages.find((m) => m.role === "system")
    const userMsgs = messages.filter((m) => m.role !== "system")
    const lastUser = userMsgs.filter((m) => m.role === "user").pop()
    const assistantMsgs = userMsgs.filter((m) => m.role === "assistant")

    let prompt = ""
    if (assistantMsgs.length > 0) {
      prompt = assistantMsgs.map((m) => `Assistant: ${m.content}`).join("\n") + `\nUser: ${lastUser?.content || ""}`
    } else {
      prompt = lastUser?.content || ""
    }

    let cmd = `z-ai chat -p ${JSON.stringify(prompt)}`
    if (systemMsg) cmd += ` -s ${JSON.stringify(systemMsg.content)}`
    if (options?.thinking) cmd += ` --thinking`
    cmd += ` -o ${JSON.stringify(tmpFile)}`

    execSync(cmd, { encoding: "utf-8", timeout: 120000 })
    const data = JSON.parse(fs.readFileSync(tmpFile, "utf-8"))
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || "unknown",
      tokens: data.usage || { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 },
    }
  } catch (error) {
    throw new Error(`AI request failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  } finally {
    try { fs.unlinkSync(tmpFile) } catch {}
  }
}

export async function aiGeneratePlan(project: {
  name: string
  description: string
  projectType: string
  deadline?: string
  techStack: string[]
 features: string[]
 difficulty: string
  teamSize?: number
  requirements?: string
  targetUsers?: string
  goal?: string
}): Promise<string> {
  const prompt = `You are an expert project planner AI. Generate a detailed project plan as JSON.

Project: ${project.name}
Type: ${project.projectType}
Description: ${project.description}
Goal: ${project.goal || "Not specified"}
Target Users: ${project.targetUsers || "Not specified"}
Deadline: ${project.deadline || "Not specified"}
Difficulty: ${project.difficulty}
Tech Stack: ${project.techStack.join(", ")}
Features: ${project.features.join(", ")}
Team Size: ${project.teamSize || 1}
Requirements: ${project.requirements || "None specified"}

Generate a JSON object with this EXACT structure (no markdown, only valid JSON):
{
  "roadmap": {
    "summary": "Brief overview of the approach",
    "phases": [
      {
        "name": "Phase name",
        "description": "What this phase covers",
        "order": 1
      }
    ],
    "risks": ["Risk 1", "Risk 2"]
  },
  "milestones": [
    {
      "title": "Milestone title",
      "description": "What needs to be achieved",
      "order": 1,
      "phaseIndex": 0
    }
  ],
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description of what to do",
      "milestoneIndex": 0,
      "priority": "medium",
      "estimatedHours": 4,
      "dependsOn": [],
      "evidenceReq": "What evidence proves this is done",
      "order": 1
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks. Adapt tasks to the actual project type and tech stack. Do NOT generate generic tasks.`

  const response = await aiChat([
    { role: "system", content: "You are an expert project planner. Always respond with valid JSON only. No markdown. No code blocks." },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiAnalyzeCheckin(checkin: {
  completed: string
  workingOn: string
  blocked: boolean
  blockReason?: string
  remains?: string
  needHelp?: string
  assignedTasks: { title: string; status: string; dueDate?: string }[]
}): Promise<string> {
  const prompt = `Analyze this daily check-in and provide brief constructive feedback.

Completed today: ${checkin.completed}
Currently working on: ${checkin.workingOn}
Blocked: ${checkin.blocked}${checkin.blockReason ? ` - Reason: ${checkin.blockReason}` : ""}
Remaining: ${checkin.remains || "Not specified"}
Needs help: ${checkin.needHelp || "No"}

Assigned tasks:
${checkin.assignedTasks.map((t) => `- ${t.title} (${t.status}, due: ${t.dueDate || "No deadline"})`).join("\n")}

Provide brief, encouraging, actionable feedback (3-5 sentences).`

  const response = await aiChat([
    { role: "system", content: "You are a helpful project mentor. Be encouraging but honest. Keep feedback brief and actionable." },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiCodeHelp(context: {
  taskTitle: string
  taskDescription: string
  question: string
  techStack: string[]
}): Promise<string> {
  const prompt = `Help with this development task:

Task: ${context.taskTitle}
Description: ${context.taskDescription}
Tech Stack: ${context.techStack.join(", ")}
Question: ${context.question}

Provide a clear explanation with implementation approach, pseudocode or code examples, and suggested files/architecture where helpful. Encourage understanding over copying.`

  const response = await aiChat([
    { role: "system", content: "You are an expert software engineer mentor. Provide clear, educational explanations with practical code examples. Encourage understanding and testing." },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiBugHelp(context: {
  errorMessage: string
  relevantCode?: string
  expectedBehavior: string
  actualBehavior: string
  techStack: string[]
}): Promise<string> {
  const prompt = `Help debug this issue:

Error: ${context.errorMessage}
Expected: ${context.expectedBehavior}
Actual: ${context.actualBehavior}
Tech Stack: ${context.techStack.join(", ")}
${context.relevantCode ? `Relevant Code:\n${context.relevantCode}` : ""}

Provide: explanation, likely cause, debugging steps, suggested solution, and prevention advice.`

  const response = await aiChat([
    { role: "system", content: "You are an expert debugger. Analyze errors systematically and provide clear, step-by-step solutions." },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiGenerateDoc(type: string, context: {
  projectName: string
  description: string
  techStack: string[]
  features: string[]
  tasks?: { title: string; description: string; status: string }[]
}): Promise<string> {
  const prompt = `Generate ${type} for this project:

Project: ${context.projectName}
Description: ${context.description}
Tech Stack: ${context.techStack.join(", ")}
Features: ${context.features.join(", ")}
${context.tasks ? `Tasks completed:\n${context.tasks.map((t) => `- ${t.title}: ${t.description} (${t.status})`).join("\n")}` : ""}

Generate a professional, detailed ${type}.`

  const response = await aiChat([
    { role: "system", content: `You are a technical writer. Generate professional documentation. Use markdown formatting.` },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiAnalyzeEvidence(evidence: {
  taskTitle: string
  taskDescription: string
  evidenceItems: { type: string; title: string; description?: string; url?: string }[]
}): Promise<string> {
  const prompt = `Analyze evidence of work completion for this task:

Task: ${evidence.taskTitle}
Description: ${evidence.taskDescription}

Evidence provided:
${evidence.evidenceItems.map((e) => `- [${e.type}] ${e.title}: ${e.description || e.url || "No details"}`).join("\n")}

Analyze and respond with JSON (no markdown):
{
  "confidence": 0.0-1.0,
  "summary": "Brief analysis",
  "found": ["Evidence found list"],
  "missing": ["Evidence missing list"],
  "recommendation": "verified_completed or needs_review"
}`

  const response = await aiChat([
    { role: "system", content: "You are an evidence verification AI. Respond with valid JSON only. No markdown." },
    { role: "user", content: prompt },
  ])
  return response.content
}

export async function aiGenerateReport(projectData: {
  name: string
  description: string
  projectType: string
  startDate: string
  endDate?: string
  taskStats: { total: number; completed: number; verified: number; overdue: number; inProgress: number }
  teamContributions: { name: string; completedTasks: number; verifiedTasks: number; totalHours: number; checkins: number }[]
  milestones: { title: string; status: string; progress: number }[]
}): Promise<string> {
  const prompt = `Generate a comprehensive AI-assisted project report. Project data:

Name: ${projectData.name}
Description: ${projectData.description}
Type: ${projectData.projectType}
Start: ${projectData.startDate}
End: ${projectData.endDate || "Ongoing"}
Tasks: ${projectData.taskStats.total} total, ${projectData.taskStats.completed} completed, ${projectData.taskStats.verified} verified, ${projectData.taskStats.overdue} overdue
Team:
${projectData.teamContributions.map((t) => `- ${t.name}: ${t.completedTasks} tasks, ${t.verifiedTasks} verified, ${t.totalHours}h, ${t.checkins} check-ins`).join("\n")}
Milestones:
${projectData.milestones.map((m) => `- ${m.title}: ${m.status} (${m.progress}%)`).join("\n")}

Generate JSON:
{
  "summary": "Project summary",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1"],
  "challenges": ["Challenge 1"],
  "improvements": ["Improvement 1"],
  "recommendedSkills": ["Skill 1"],
  "futureImprovements": "Suggestion",
  "overallAssessment": "AI-assisted assessment",
  "individualFeedback": [{"name": "Name", "strength": "What they did well", "improvement": "What could improve", "nextSteps": "Recommended next steps"}]
}

Valid JSON only. No markdown.`

  const response = await aiChat([
    { role: "system", content: "You are a project assessment AI. Generate fair, constructive reports. Respond with valid JSON only. No markdown." },
    { role: "user", content: prompt },
  ])
  return response.content
}