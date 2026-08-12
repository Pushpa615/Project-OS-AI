'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Sparkles,
  Lightbulb,
  ArrowDown,
  RotateCcw,
  MessageSquare,
  Zap,
  BookOpen,
  Clock,
  ChevronRight,
  Trash2,
  Terminal,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

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
  id: string
  role: 'user' | 'assistant'
  content: string
  type: string
  timestamp: string
}

interface AIAssistantPageProps {
  userId: string
  projectId?: string
  taskId?: string
}

type AssistantMode = 'code' | 'bug' | 'docs' | 'deadline'

const MODES: { value: AssistantMode; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { value: 'code', label: 'Code Help', icon: Code2, color: 'text-emerald-500', description: 'Get coding assistance' },
  { value: 'bug', label: 'Bug Fix', icon: Bug, color: 'text-red-500', description: 'Debug and fix issues' },
  { value: 'docs', label: 'Docs', icon: FileText, color: 'text-violet-500', description: 'Generate documentation' },
  { value: 'deadline', label: 'Timeline', icon: CalendarClock, color: 'text-amber-500', description: 'Analyze deadlines' },
]

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

const SUGGESTED_PROMPTS: Record<AssistantMode, string[]> = {
  code: [
    'How do I implement user authentication?',
    'Help me optimize this database query',
    'Review my API endpoint design',
    'Suggest a file structure for my project',
  ],
  bug: [
    'I am getting a 500 error on my API',
    'My component is not re-rendering on state change',
    'Database connection is timing out',
    'Help me fix a memory leak',
  ],
  docs: [
    'Generate a comprehensive README',
    'Create an SRS document',
    'Write API documentation',
    'Create an architecture overview',
  ],
  deadline: [
    'Analyze my project timeline',
    'What tasks are at risk?',
    'Suggest a catch-up plan',
    'Help me prioritize overdue tasks',
  ],
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ code, onCopy }: { code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative mt-2 rounded-lg bg-zinc-950 dark:bg-zinc-900 border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 dark:bg-zinc-800 border-b">
        <Terminal className="h-3.5 w-3.5 text-zinc-400" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm text-zinc-200 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function MessageBubble({ message, mode }: { message: ChatMessage; mode: AssistantMode }) {
  const isUser = message.role === 'user'
  const modeConfig = MODES.find((m) => m.value === mode)

  // Parse content for code blocks
  const parts = message.content.split(/(```[\s\S]*?```)/g)
  const renderedParts = parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, '')
      return <CodeBlock key={i} code={code} onCopy={() => {}} />
    }
    return <span key={i}>{part}</span>
  })

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      {!isUser ? (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      ) : (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            You
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-0">
            <div className="flex items-center gap-2 mb-1">
              <Bot className={cn('h-3.5 w-3.5', modeConfig?.color)} />
              <span className="text-xs font-medium text-muted-foreground">
                {modeConfig?.label} Assistant
              </span>
            </div>
            <div className="whitespace-pre-wrap text-foreground/90">{renderedParts}</div>
          </div>
        )}
        <p
          className={cn(
            'text-[10px] mt-1.5',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {formatDistanceToNow(parseISO(message.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function AIAssistantPage({ userId, projectId, taskId }: AIAssistantPageProps) {
  const navigate = useNavStore((s) => s.navigate)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Projects & tasks
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Mode
  const [activeMode, setActiveMode] = useState<AssistantMode>('code')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [selectedDocType, setSelectedDocType] = useState('')

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`/api/projects?userId=${userId}`)
        const json = await res.json()
        if (json.data) {
          setProjects(json.data)
          // Auto-select first project if none selected
          if (!projectId && json.data.length > 0) {
            setSelectedProjectId(json.data[0].id)
          }
        }
      } catch {
        // silent
      } finally {
        setProjectsLoading(false)
      }
    }
    fetchProjects()
  }, [userId, projectId])

  // Fetch tasks when project changes
  useEffect(() => {
    async function fetchTasks() {
      if (!selectedProjectId) {
        setTasks([])
        return
      }
      try {
        const res = await fetch(`/api/tasks?projectId=${selectedProjectId}`)
        const json = await res.json()
        if (json.data) setTasks(json.data)
      } catch {
        // silent
      }
    }
    fetchTasks()
  }, [selectedProjectId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [messages, loading])

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 100)
    }
  }, [])

  // AI request
  const callAI = useCallback(
    async (type: string, question: string, context: string = '') => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId: selectedProjectId || projectId || undefined,
            taskId: taskId || undefined,
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
    [userId, selectedProjectId, projectId, taskId]
  )

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      type: activeMode,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Build context based on mode
    let aiType = activeMode
    let context = ''

    if (activeMode === 'docs') {
      aiType = 'general'
      context = `Document Type: ${selectedDocType}`
    } else if (activeMode === 'deadline') {
      aiType = 'general'
      // Fetch overdue tasks for context
      try {
        const res = await fetch(`/api/tasks?projectId=${selectedProjectId}&status=overdue`)
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          context = `Overdue tasks: ${json.data.map((t: Task) => t.title).join(', ')}`
        }
      } catch {
        // silent
      }
    }

    const response = await callAI(aiType, input.trim(), context)

    if (response) {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: response,
        type: activeMode,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    }

    // Focus input again
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [input, loading, activeMode, selectedDocType, selectedProjectId, callAI])

  // Handle suggested prompt click
  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // Clear chat
  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const modeConfig = MODES.find((m) => m.value === activeMode)
  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ==================== HEADER ==================== */}
      <div className="border-b bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by AI to help you build better</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Project selector */}
            {!projectsLoading && projects.length > 0 && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
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
            )}
            {hasMessages && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClearChat}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mode selector pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
          {MODES.map((mode) => {
            const Icon = mode.icon
            const isActive = activeMode === mode.value
            return (
              <button
                key={mode.value}
                onClick={() => setActiveMode(mode.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {mode.label}
              </button>
            )
          })}
          {activeMode === 'docs' && (
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="h-7 w-[150px] text-[11px] rounded-full border-dashed">
                <SelectValue placeholder="Doc type..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ==================== CHAT AREA ==================== */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
        >
          {/* Empty state with suggestions */}
          {!hasMessages && !loading && (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="max-w-md w-full text-center space-y-6">
                {/* Mode icon & description */}
                <div className="space-y-3">
                  <div className={cn(
                    'h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto',
                    activeMode === 'code' && 'bg-emerald-500/10',
                    activeMode === 'bug' && 'bg-red-500/10',
                    activeMode === 'docs' && 'bg-violet-500/10',
                    activeMode === 'deadline' && 'bg-amber-500/10'
                  )}>
                    {modeConfig && <modeConfig.icon className={cn('h-7 w-7', modeConfig.color)} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{modeConfig?.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {modeConfig?.description} — ask anything about your project
                    </p>
                  </div>
                </div>

                {/* Suggested prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS[activeMode].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(prompt)}
                      className="flex items-center gap-2.5 p-3 rounded-xl border bg-card hover:bg-accent/50 text-left transition-colors group"
                    >
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        'bg-muted group-hover:bg-primary/10 transition-colors'
                      )}>
                        {i === 0 && <Zap className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                        {i === 1 && <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                        {i === 2 && <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                        {i === 3 && <Lightbulb className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground line-clamp-2 transition-colors">
                        {prompt}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>

                {/* Quick stats */}
                {selectedProjectId && tasks.length > 0 && (
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {tasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {tasks.filter((t) => t.status === 'completed').length} completed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {hasMessages && (
            <div className="py-4 space-y-1">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} mode={activeMode} />
              ))}
              {loading && <TypingIndicator />}
            </div>
          )}

          {/* Loading with no messages */}
          {!hasMessages && loading && <TypingIndicator />}
        </div>

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-background border shadow-lg flex items-center justify-center hover:bg-accent transition-colors z-10"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ==================== INPUT AREA ==================== */}
      <div className="border-t bg-card px-4 py-3 shrink-0">
        {error && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs text-destructive">{error}</span>
            <button onClick={() => setError(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              placeholder={
                activeMode === 'code'
                  ? 'Ask for code help...'
                  : activeMode === 'bug'
                    ? 'Describe the bug you are facing...'
                    : activeMode === 'docs'
                      ? 'What documentation do you need?'
                      : 'Ask about your timeline...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              className="min-h-[44px] max-h-[120px] resize-none pr-12 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
              }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl shrink-0 p-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+Enter</kbd> to send · AI can make mistakes
        </p>
      </div>
    </div>
  )
}
