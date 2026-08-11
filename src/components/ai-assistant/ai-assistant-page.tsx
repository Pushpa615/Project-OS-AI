'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bot,
  Code2,
  Bug,
  FileText,
  CalendarClock,
  Send,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  Clock,
  Trash2,
  BarChart3,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface Project {
  id: string
  name: string
  projectType: string
  status: string
}

interface Task {
  id: string
  title: string
  status: string
}

interface ChatMessage {
  question: string
  response: string
  type: string
  timestamp: string
}

interface AIAssistantPageProps {
  userId: string
  projectId?: string
  taskId?: string
}

const DOC_TYPES = [
  { value: 'README', label: 'README' },
  { value: 'Abstract', label: 'Abstract' },
  { value: 'Project Report', label: 'Project Report' },
  { value: 'SRS', label: 'SRS (Software Requirements)' },
  { value: 'API Docs', label: 'API Documentation' },
  { value: 'Architecture', label: 'Architecture Document' },
  { value: 'Database', label: 'Database Documentation' },
  { value: 'Presentation Outline', label: 'Presentation Outline' },
  { value: 'Demo Script', label: 'Demo Script' },
]

export function AIAssistantPage({ userId, projectId, taskId }: AIAssistantPageProps) {
  const navigate = useNavStore((s) => s.navigate)

  // Projects & tasks for selectors
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Shared AI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tab 1: Code Assistant
  const [codeProjectId, setCodeProjectId] = useState<string>(projectId || '')
  const [codeTaskId, setCodeTaskId] = useState<string>(taskId || '')
  const [codeQuestion, setCodeQuestion] = useState('')
  const [codeHistory, setCodeHistory] = useState<ChatMessage[]>([])

  // Tab 2: Bug Assistant
  const [bugErrorMessage, setBugErrorMessage] = useState('')
  const [bugRelevantCode, setBugRelevantCode] = useState('')
  const [bugExpected, setBugExpected] = useState('')
  const [bugActual, setBugActual] = useState('')
  const [bugResponse, setBugResponse] = useState('')
  const [bugHistory, setBugHistory] = useState<ChatMessage[]>([])

  // Tab 3: Documentation
  const [docProjectId, setDocProjectId] = useState<string>(projectId || '')
  const [docType, setDocType] = useState('')
  const [docResponse, setDocResponse] = useState('')
  const [copied, setCopied] = useState(false)

  // Tab 4: Deadline Manager
  const [deadlineProjectId, setDeadlineProjectId] = useState<string>(projectId || '')
  const [deadlineResponse, setDeadlineResponse] = useState('')
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?userId=${userId}`)
      const json = await res.json()
      if (json.data) setProjects(json.data)
    } catch {
      // silent
    } finally {
      setProjectsLoading(false)
    }
  }, [userId])

  // Fetch tasks for a project
  const fetchTasks = useCallback(async (pid: string) => {
    if (!pid) {
      setTasks([])
      return
    }
    try {
      const res = await fetch(`/api/tasks?projectId=${pid}`)
      const json = await res.json()
      if (json.data) setTasks(json.data)
    } catch {
      // silent
    }
  }, [])

  // Fetch overdue tasks
  const fetchOverdue = useCallback(async (pid: string) => {
    if (!pid) return
    try {
      const res = await fetch(`/api/tasks?projectId=${pid}&status=overdue`)
      const json = await res.json()
      if (json.data) setOverdueTasks(json.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (codeProjectId) fetchTasks(codeProjectId)
  }, [codeProjectId, fetchTasks])

  useEffect(() => {
    if (deadlineProjectId) fetchOverdue(deadlineProjectId)
  }, [deadlineProjectId, fetchOverdue])

  // AI request helper — accepts explicit projectId/taskId overrides
  const callAI = useCallback(
    async (type: string, question: string, context: string = '', overrides?: { projectId?: string; taskId?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId: overrides?.projectId || projectId || undefined,
            taskId: overrides?.taskId || taskId || undefined,
            type,
            question,
            context,
          }),
        })
        const json = await res.json()
        if (json.error) {
          setError(json.error)
          return null
        }
        return json.data.response as string
      } catch {
        setError('AI request failed. Please try again.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [userId, projectId, taskId]
  )

  // Code assistant submit
  const handleCodeSubmit = async () => {
    if (!codeQuestion.trim()) return
    const response = await callAI('code_help', codeQuestion, undefined, { projectId: codeProjectId, taskId: codeTaskId || undefined })
    if (response) {
      setCodeHistory((prev) => [
        { question: codeQuestion, response, type: 'code_help', timestamp: new Date().toISOString() },
        ...prev,
      ])
      setCodeQuestion('')
    }
  }

  // Bug assistant submit
  const handleBugSubmit = async () => {
    if (!bugErrorMessage.trim()) return
    const context = [
      bugRelevantCode ? `Relevant Code:\n${bugRelevantCode}` : '',
      bugExpected ? `Expected Behavior: ${bugExpected}` : '',
      bugActual ? `Actual Behavior: ${bugActual}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const response = await callAI('bug_help', bugErrorMessage, context, { projectId })
    if (response) {
      setBugHistory((prev) => [
        { question: bugErrorMessage, response, type: 'bug_help', timestamp: new Date().toISOString() },
        ...prev,
      ])
      setBugResponse(response)
      setBugErrorMessage('')
      setBugRelevantCode('')
      setBugExpected('')
      setBugActual('')
    }
  }

  // Documentation submit
  const handleDocGenerate = async () => {
    if (!docProjectId || !docType) return
    const question = `Generate a ${docType} document for this project. Include all relevant sections, be comprehensive and professional.`
    const response = await callAI('general', question, undefined, { projectId: docProjectId })
    if (response) {
      setDocResponse(response)
    }
  }

  // Deadline manager submit
  const handleDeadlineAnalyze = async () => {
    if (!deadlineProjectId) return
    const overdueInfo = overdueTasks
      .map((t) => ` - ${t.title} (${t.status})`)
      .join('\n')
    const question = `Analyze the current project timeline and provide: 1) Timeline status assessment, 2) Overdue task analysis, 3) Risk identification, 4) Specific AI-powered recommendations for getting back on track.\n\nOverdue tasks:\n${overdueInfo || 'None'}`
    const response = await callAI('general', question, undefined, { projectId: deadlineProjectId })
    if (response) {
      setDeadlineResponse(response)
    }
  }

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearHistory = (setter: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => {
    setter([])
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Powered by AI to help you build better
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="code" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="code" className="gap-1.5 text-xs sm:text-sm">
              <Code2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
            <TabsTrigger value="bug" className="gap-1.5 text-xs sm:text-sm">
              <Bug className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bug</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="deadline" className="gap-1.5 text-xs sm:text-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Deadlines</span>
            </TabsTrigger>
          </TabsList>

          {/* =========== TAB 1: Code Assistant =========== */}
          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-500" />
                  Code Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Project</label>
                    <Select value={codeProjectId} onValueChange={(v) => setCodeProjectId(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {codeProjectId && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Task (optional)</label>
                      <Select value={codeTaskId} onValueChange={(v) => setCodeTaskId(v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Ask for help</label>
                  <Textarea
                    placeholder="Describe what you need help with..."
                    value={codeQuestion}
                    onChange={(e) => setCodeQuestion(e.target.value)}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCodeSubmit()
                    }}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {error}
                  </p>
                )}

                <Button onClick={handleCodeSubmit} disabled={loading || !codeQuestion.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Get Help
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Code history */}
            {codeHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => clearHistory(setCodeHistory)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
                {codeHistory.map((msg, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">You</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{msg.question}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {msg.response}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* =========== TAB 2: Bug Assistant =========== */}
          <TabsContent value="bug" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-500" />
                  Bug Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Error Message</label>
                  <Textarea
                    placeholder="Paste the error message or stack trace..."
                    value={bugErrorMessage}
                    onChange={(e) => setBugErrorMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Relevant Code (optional)
                  </label>
                  <Textarea
                    placeholder="Paste the code where the bug occurs..."
                    value={bugRelevantCode}
                    onChange={(e) => setBugRelevantCode(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Expected Behavior</label>
                    <Input
                      placeholder="What should happen?"
                      value={bugExpected}
                      onChange={(e) => setBugExpected(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Actual Behavior</label>
                    <Input
                      placeholder="What actually happens?"
                      value={bugActual}
                      onChange={(e) => setBugActual(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {error}
                  </p>
                )}

                <Button onClick={handleBugSubmit} disabled={loading || !bugErrorMessage.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bug className="h-4 w-4 mr-2" />
                      Analyze Bug
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Bug response */}
            {bugResponse && (
              <Card className="border-red-200 dark:border-red-900/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-2">Bug Analysis</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {bugResponse}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bug history */}
            {bugHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => clearHistory(setBugHistory)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
                {bugHistory.map((msg, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bug className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{msg.question}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {msg.response}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* =========== TAB 3: Documentation Generator =========== */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  Documentation Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Project</label>
                    <Select value={docProjectId} onValueChange={(v) => setDocProjectId(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Document Type</label>
                    <Select value={docType} onValueChange={(v) => setDocType(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((dt) => (
                          <SelectItem key={dt.value} value={dt.value}>
                            {dt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {error}
                  </p>
                )}

                <Button
                  onClick={handleDocGenerate}
                  disabled={loading || !docProjectId || !docType}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated doc */}
            {docResponse && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      Generated: {docType}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleCopy(docResponse)}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {docResponse}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* =========== TAB 4: Smart Deadline Manager =========== */}
          <TabsContent value="deadline" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-500" />
                  Smart Deadline Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Project</label>
                  <Select value={deadlineProjectId} onValueChange={(v) => setDeadlineProjectId(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-64">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {error}
                  </p>
                )}

                <Button
                  onClick={handleDeadlineAnalyze}
                  disabled={loading || !deadlineProjectId}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analyze Timeline
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Overdue tasks */}
            {deadlineProjectId && overdueTasks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Overdue Tasks ({overdueTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => navigate('task-detail', { id: task.id })}
                        className="w-full text-left p-2.5 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-sm font-medium truncate">{task.title}</span>
                          <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:text-red-400 shrink-0">
                            {task.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI deadline response */}
            {deadlineResponse && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {deadlineResponse}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
