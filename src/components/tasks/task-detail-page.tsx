'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Brain,
  Send,
  Link2,
  FileText,
  Camera,
  GitBranch,
  MessageSquare,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Target,
  Hourglass,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface TaskDetail {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string | null
  startDate: string | null
  estimatedHours: number | null
  actualHours: number | null
  completionPercent: number
  evidenceReq: string | null
  milestoneId: string | null
  createdAt: string
  updatedAt: string
  assignee: { id: string; name: string | null; email: string; avatar: string | null } | null
  milestone: { id: string; title: string; status: string; progress: number } | null
  project: { id: string; name: string; techStack: string }
  dependencies: { dependsOn: { id: string; title: string; status: string; priority: string } }[]
  dependentTasks: { task: { id: string; title: string; status: string; priority: string } }[]
  evidence: EvidenceItem[]
  taskComments: Comment[]
  aiRequests: { id: string; type: string; status: string; createdAt: string }[]
}

interface EvidenceItem {
  id: string
  type: string
  title: string
  description: string
  url: string | null
  fileName: string | null
  confidence: number | null
  aiAnalysis: string | null
  createdAt: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null; email: string; avatar: string | null }
}

// ==================== HELPERS ====================

const statusColors: Record<string, string> = {
  not_started: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]',
  in_progress: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20',
  blocked: 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20',
  submitted: 'bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20',
  under_review: 'bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20',
  verified_completed: 'bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/20',
  overdue: 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20',
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20', label: 'Critical' },
  high: { color: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20', label: 'High' },
  medium: { color: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20', label: 'Medium' },
  low: { color: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]', label: 'Low' },
}

const evidenceTypeIcons: Record<string, React.ElementType> = {
  screenshot: ImageIcon,
  video: FileText,
  document: FileText,
  link: Link2,
  code: GitBranch,
  other: FileText,
}

const evidenceTypes = [
  { value: 'link', label: 'Demo Link' },
  { value: 'code', label: 'GitHub Commit' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'document', label: 'Documentation' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ==================== MAIN COMPONENT ====================

export function TaskDetailPage({ taskId, userId }: { taskId: string; userId: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // AI Help state
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Evidence dialog state
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceType, setEvidenceType] = useState('link')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceDesc, setEvidenceDesc] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceSaving, setEvidenceSaving] = useState(false)

  // Verifying state
  const [verifying, setVerifying] = useState(false)

  // Editable fields
  const [editStatus, setEditStatus] = useState('')
  const [editCompletion, setEditCompletion] = useState(0)
  const [editHours, setEditHours] = useState('')
  const [editEstimated, setEditEstimated] = useState('')
  const [depsExpanded, setDepsExpanded] = useState(true)
  const [depOfExpanded, setDepOfExpanded] = useState(true)

  // Fetch task
  useEffect(() => {
    async function fetchTask() {
      try {
        setLoading(true)
        const res = await fetch(`/api/tasks/${taskId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch task')
        const t = json.data
        setTask(t)
        setEditStatus(t.status)
        setEditCompletion(t.completionPercent)
        setEditHours(t.actualHours?.toString() || '')
        setEditEstimated(t.estimatedHours?.toString() || '')
        setComments(t.taskComments || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId])

  // Save task details
  async function handleSave() {
    try {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(false)
      const body: Record<string, unknown> = {
        userId,
        status: editStatus,
        completionPercent: editCompletion,
        actualHours: editHours ? parseFloat(editHours) : null,
        estimatedHours: editEstimated ? parseFloat(editEstimated) : null,
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update task')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      // Re-fetch
      const taskRes = await fetch(`/api/tasks/${taskId}`)
      const taskJson = await taskRes.json()
      if (taskRes.ok) setTask(taskJson.data)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Add evidence
  async function handleAddEvidence() {
    try {
      setEvidenceSaving(true)
      const body = {
        userId,
        type: evidenceType,
        title: evidenceTitle,
        description: evidenceDesc,
        url: evidenceUrl,
      }
      const res = await fetch(`/api/tasks/${taskId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add evidence')
      setEvidenceOpen(false)
      setEvidenceTitle('')
      setEvidenceDesc('')
      setEvidenceUrl('')
      setEvidenceType('link')
      // Re-fetch
      const taskRes = await fetch(`/api/tasks/${taskId}`)
      const taskJson = await taskRes.json()
      if (taskRes.ok) setTask(taskJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add evidence')
    } finally {
      setEvidenceSaving(false)
    }
  }

  // Verify with AI
  async function handleVerify() {
    try {
      setVerifying(true)
      const res = await fetch(`/api/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Verification failed')
      // Re-fetch task
      const taskRes = await fetch(`/api/tasks/${taskId}`)
      const taskJson = await taskRes.json()
      if (taskRes.ok) setTask(taskJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  // Add comment
  async function handleAddComment() {
    if (!commentInput.trim()) return
    try {
      setSubmittingComment(true)
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId,
          content: commentInput.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add comment')
      setCommentInput('')
      const newComment = json.data
      setComments((prev) => [...prev, newComment])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  // AI Chat
  async function handleAiChat() {
    if (!aiQuestion.trim()) return
    const question = aiQuestion.trim()
    setAiQuestion('')
    setAiMessages((prev) => [...prev, { role: 'user', content: question }])
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId,
          projectId: task?.project.id,
          type: 'code_help',
          question,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI chat failed')
      setAiMessages((prev) => [...prev, { role: 'assistant', content: json.data?.response || 'No response' }])
    } catch (err) {
      setAiMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate('tasks')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    )
  }

  if (!task) return null

  const pConfig = priorityConfig[task.priority] || priorityConfig.medium

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => task.project ? navigate('project-detail', { id: task.project.id }) : navigate('tasks')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold truncate">{task.title}</h1>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusColors[task.status] || ''}`}>
                  {task.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 ${pConfig.color}`}>
                  {pConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto mb-6 bg-muted p-1 rounded-lg h-auto gap-1">
            <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <FileText className="h-3.5 w-3.5 hidden sm:block" />
              Details
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <ImageIcon className="h-3.5 w-3.5 hidden sm:block" />
              Evidence
            </TabsTrigger>
            <TabsTrigger value="ai-help" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <Brain className="h-3.5 w-3.5 hidden sm:block" />
              AI Help
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <MessageSquare className="h-3.5 w-3.5 hidden sm:block" />
              Comments
              {comments.length > 0 && (
                <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                  {comments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ==================== DETAILS TAB ==================== */}
          <TabsContent value="details" className="space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                {task.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
              </CardContent>
            </Card>

            {/* Editable details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Assigned To */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned To</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assignee.avatar || ''} />
                          <AvatarFallback className="text-[10px]">
                            {task.assignee.name?.charAt(0).toUpperCase() || task.assignee.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{task.assignee.name || task.assignee.email}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Milestone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Milestone</span>
                  </div>
                  <span className="text-sm font-medium">
                    {task.milestone ? task.milestone.title : 'None'}
                  </span>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Start:</span>
                    <span className="font-medium">{formatDate(task.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Due:</span>
                    <span className="font-medium">{formatDate(task.dueDate)}</span>
                  </div>
                </div>

                <Separator />

                {/* Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={editEstimated}
                      onChange={(e) => setEditEstimated(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Actual Hours</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <Separator />

                {/* Completion slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Completion</Label>
                    <span className="text-sm font-medium">{editCompletion}%</span>
                  </div>
                  <Slider
                    value={[editCompletion]}
                    onValueChange={(v) => setEditCompletion(v[0])}
                    max={100}
                    step={5}
                  />
                  <Progress value={editCompletion} className="h-1.5" />
                </div>

                <Separator />

                {/* Status dropdown */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="verified_completed">Verified Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  {saveSuccess && (
                    <span className="text-xs text-[#22C55E] flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Saved!
                    </span>
                  )}
                  {saveError && (
                    <span className="text-xs text-destructive">{saveError}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dependencies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dependencies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* This task depends on */}
                <div>
                  <button
                    className="flex items-center gap-2 text-sm font-medium w-full text-left"
                    onClick={() => setDepsExpanded(!depsExpanded)}
                  >
                    {depsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Depends On ({task.dependencies.length})
                  </button>
                  {depsExpanded && (
                    <div className="ml-6 mt-2 space-y-2">
                      {task.dependencies.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No dependencies</p>
                      ) : (
                        task.dependencies.map((dep) => (
                          <div
                            key={dep.dependsOn.id}
                            className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate('task-detail', { id: dep.dependsOn.id })}
                          >
                            <Badge variant="outline" className={`text-[10px] ${statusColors[dep.dependsOn.status] || ''}`}>
                              {dep.dependsOn.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className="flex-1 truncate">{dep.dependsOn.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Tasks depending on this */}
                <div>
                  <button
                    className="flex items-center gap-2 text-sm font-medium w-full text-left"
                    onClick={() => setDepOfExpanded(!depOfExpanded)}
                  >
                    {depOfExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Required By ({task.dependentTasks.length})
                  </button>
                  {depOfExpanded && (
                    <div className="ml-6 mt-2 space-y-2">
                      {task.dependentTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tasks depend on this</p>
                      ) : (
                        task.dependentTasks.map((dep) => (
                          <div
                            key={dep.task.id}
                            className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate('task-detail', { id: dep.task.id })}
                          >
                            <Badge variant="outline" className={`text-[10px] ${statusColors[dep.task.status] || ''}`}>
                              {dep.task.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className="flex-1 truncate">{dep.task.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== EVIDENCE TAB ==================== */}
          <TabsContent value="evidence" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Evidence ({task.evidence.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying || task.evidence.length === 0}
                  className="gap-1.5"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Verify with AI
                </Button>
                <Button size="sm" onClick={() => setEvidenceOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Evidence
                </Button>
              </div>
            </div>

            {task.evidence.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No evidence added yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add screenshots, links, or code to prove task completion.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {task.evidence.map((ev) => {
                  const Icon = evidenceTypeIcons[ev.type] || FileText
                  return (
                    <Card key={ev.id}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-medium">{ev.title}</h4>
                            {ev.confidence !== null && ev.confidence !== undefined && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${
                                  ev.confidence >= 70
                                    ? 'bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/20'
                                    : ev.confidence >= 40
                                      ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20'
                                      : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20'
                                }`}
                              >
                                {Math.round(ev.confidence)}% confidence
                              </Badge>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              <Link2 className="h-3 w-3" />
                              {ev.url}
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Evidence Dialog */}
            <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Evidence</DialogTitle>
                  <DialogDescription>Add proof of work for this task</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={evidenceType} onValueChange={setEvidenceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {evidenceTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      placeholder="e.g., Login page implementation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={evidenceDesc}
                      onChange={(e) => setEvidenceDesc(e.target.value)}
                      placeholder="Brief description of the evidence"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEvidenceOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddEvidence}
                    disabled={evidenceSaving || !evidenceTitle.trim()}
                    className="gap-2"
                  >
                    {evidenceSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add Evidence
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ==================== AI HELP TAB ==================== */}
          <TabsContent value="ai-help" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Code Helper</h3>
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {aiMessages.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Ask AI for help with this task.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get code suggestions, debugging help, or architecture advice.
                  </p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
              <Input
                placeholder="Ask about your task..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) handleAiChat() }}
                disabled={aiLoading}
                className="flex-1"
              />
              <Button onClick={handleAiChat} disabled={aiLoading || !aiQuestion.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ==================== COMMENTS TAB ==================== */}
          <TabsContent value="comments" className="space-y-4">
            <h3 className="text-sm font-semibold">
              Comments ({comments.length})
            </h3>

            {/* Comment input */}
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0 mt-0.5">
                {userId.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !submittingComment) handleAddComment() }}
                  disabled={submittingComment}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={submittingComment || !commentInput.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Comments list */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.user.avatar || ''} />
                      <AvatarFallback className="text-[10px]">
                        {comment.user.name?.charAt(0).toUpperCase() || comment.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user.name || comment.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
