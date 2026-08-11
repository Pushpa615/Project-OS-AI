'use client'

import { useState, useEffect } from 'react'
import {
  FileCheck,
  Plus,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
 Clock,
  XCircle,
  Loader2,
  ImageIcon,
  FileText,
  Link as LinkIcon,
  Code,
  Video,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface TaskBasic {
  id: string
  title: string
  status: string
  assigneeName?: string
  evidenceCount?: number
}

interface Evidence {
  id: string
  taskId: string
  type: string
  title: string
  description: string | null
  url: string | null
  fileName: string | null
  confidence: number | null
  aiAnalysis: string | null
  createdAt: string
}

// ==================== HELPERS ====================

const EVIDENCE_ICONS: Record<string, React.ReactNode> = {
  screenshot: <ImageIcon className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
}

function getConfidenceBadge(confidence: number | null) {
  if (confidence === null) return null
  if (confidence >= 0.8)
    return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">{Math.round(confidence * 100)}% - Verified</Badge>
  if (confidence >= 0.5)
    return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">{Math.round(confidence * 100)}% - Partial</Badge>
  return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">{Math.round(confidence * 100)}% - Low</Badge>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ==================== COMPONENT ====================

export function EvidencePage({
  userId,
  taskId: initialTaskId,
  projectId: initialProjectId,
}: {
  userId: string
  taskId?: string
  projectId?: string
}) {
  const navigate = useNavStore((s) => s.navigate)

  const [tasks, setTasks] = useState<TaskBasic[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null)
  const [evidenceMap, setEvidenceMap] = useState<Record<string, Evidence[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTaskId, setDialogTaskId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'link',
    title: '',
    description: '',
    url: '',
  })

  // Fetch tasks for project view
  async function fetchTasks() {
    if (!initialProjectId || initialTaskId) return
    try {
      const res = await fetch(`/api/tasks?projectId=${initialProjectId}`)
      const json = await res.json()
      if (json.data) {
        setTasks(json.data)
      }
    } catch {
      // ignore
    }
  }

  // Fetch evidence for a task
  async function fetchEvidence(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/evidence`)
      const json = await res.json()
      if (json.data) {
        setEvidenceMap((prev) => ({
          ...prev,
          [taskId]: Array.isArray(json.data) ? json.data : [json.data],
        }))
      }
    } catch {
      // ignore
    }
  }

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        if (initialTaskId) {
          setSelectedTaskId(initialTaskId)
          await fetchEvidence(initialTaskId)
        } else if (initialProjectId) {
          const taskRes = await fetch(`/api/tasks?projectId=${initialProjectId}`)
          const taskJson = await taskRes.json()
          if (taskJson.data) {
            const taskList = taskJson.data
            setTasks(taskList)
            // Fetch evidence for all tasks
            await Promise.all(taskList.map((t: TaskBasic) => fetchEvidence(t.id)))
            if (taskList.length > 0) {
              setSelectedTaskId(taskList[0].id)
            }
          }
        }
      } catch {
        setError('Failed to load evidence data')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [initialTaskId, initialProjectId])

  // Add evidence
  async function handleAddEvidence() {
    if (!dialogTaskId || !form.title.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/tasks/${dialogTaskId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: form.type,
          title: form.title,
          description: form.description || null,
          url: form.url || null,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setDialogOpen(false)
        resetForm()
        fetchEvidence(dialogTaskId)
      }
    } catch {
      setError('Failed to add evidence')
    } finally {
      setAdding(false)
    }
  }

  // Verify evidence with AI
  async function handleVerify(taskId: string) {
    setVerifying(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        fetchEvidence(taskId)
      }
    } catch {
      setError('Failed to verify evidence')
    } finally {
      setVerifying(null)
    }
  }

  function resetForm() {
    setForm({ type: 'link', title: '', description: '', url: '' })
    setDialogTaskId('')
  }

  function openAddDialog(taskId: string) {
    setDialogTaskId(taskId)
    resetForm()
    setDialogOpen(true)
    setError(null)
  }

  // Current evidence list
  const currentEvidence = selectedTaskId ? evidenceMap[selectedTaskId] || [] : []
  const currentTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // ==================== EMPTY STATE ====================

  if (!initialTaskId && !initialProjectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h2 className="text-lg font-semibold mb-2">No Context</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Navigate to a task or project to view evidence.
          </p>
          <Button onClick={() => navigate('projects')}>Go to Projects</Button>
        </Card>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Evidence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialTaskId
              ? 'Manage evidence for this task'
              : `Evidence across ${tasks.length} tasks`}
          </p>
        </div>
        {selectedTaskId && (
          <Button onClick={() => openAddDialog(selectedTaskId)}>
            <Plus className="h-4 w-4 mr-2" /> Add Evidence
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Task Selector (project view) */}
      {!initialTaskId && tasks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tasks.map((task) => {
            const evCount = (evidenceMap[task.id] || []).length
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors shrink-0 ${
                  selectedTaskId === task.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="truncate max-w-40">{task.title}</span>
                {evCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {evCount}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* No tasks */}
      {tasks.length === 0 && !initialTaskId && (
        <Card className="text-center p-8">
          <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold mb-1">No Tasks Found</h3>
          <p className="text-sm text-muted-foreground">No tasks to show evidence for.</p>
        </Card>
      )}

      {/* Selected task evidence */}
      {selectedTaskId && (
        <div className="space-y-4">
          {/* Verify button */}
          {currentEvidence.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {currentTask?.title || 'Task'} — {currentEvidence.length} evidence item{currentEvidence.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVerify(selectedTaskId)}
                disabled={verifying === selectedTaskId}
              >
                {verifying === selectedTaskId ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Verify with AI
              </Button>
            </div>
          )}

          {/* Evidence List */}
          {currentEvidence.length > 0 ? (
            <div className="space-y-3">
              {currentEvidence.map((ev) => (
                <Card key={ev.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                          {EVIDENCE_ICONS[ev.type] || EVIDENCE_ICONS.other}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium">{ev.title}</h4>
                            <Badge variant="outline" className="text-[10px]">
                              {ev.type}
                            </Badge>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> {ev.url}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {getConfidenceBadge(ev.confidence)}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(ev.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {ev.aiAnalysis && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3 text-primary" /> AI Analysis
                        </p>
                        <p className="text-xs text-muted-foreground">{ev.aiAnalysis}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-semibold mb-1">No Evidence</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add evidence to verify task completion.
              </p>
              <Button onClick={() => openAddDialog(selectedTaskId)}>
                <Plus className="h-4 w-4 mr-2" /> Add Evidence
              </Button>
            </Card>
          )}

          {/* Project-wide summary (project view) */}
          {!initialTaskId && tasks.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Project Evidence Summary</CardTitle>
                <CardDescription className="text-xs">AI verification status across all tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tasks.map((task) => {
                    const evList = evidenceMap[task.id] || []
                    const verifiedCount = evList.filter((e) => e.confidence !== null).length
                    const avgConfidence =
                      verifiedCount > 0
                        ? evList
                            .filter((e) => e.confidence !== null)
                            .reduce((sum, e) => sum + (e.confidence || 0), 0) / verifiedCount
                        : null

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {avgConfidence !== null && avgConfidence >= 0.8 ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : evList.length > 0 ? (
                            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="text-sm truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{evList.length} items</span>
                          {avgConfidence !== null && (
                            <Badge
                              className={
                                avgConfidence >= 0.8
                                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                              }
                            >
                              {Math.round(avgConfidence * 100)}%
                            </Badge>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Evidence Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Evidence</DialogTitle>
            <DialogDescription>
              Provide proof of task completion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screenshot">Screenshot</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="code">Code Snippet</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title *</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Homepage screenshot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe this evidence..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-url">URL</Label>
              <Input
                id="ev-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvidence} disabled={adding || !form.title.trim()}>
              {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
