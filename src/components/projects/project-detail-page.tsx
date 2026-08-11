'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Brain,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  FolderOpen,
  BarChart3,
  Calendar,
  Sparkles,
  Play,
  Send,
  ExternalLink,
  UserPlus,
  X,
  Upload,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useNavStore } from '@/lib/nav-store'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

// ==================== TYPES ====================

interface ProjectMember {
  userId: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string; avatar: string | null }
}

interface Milestone {
  id: string
  title: string
  description: string | null
  status: string
  progress: number
  order: number
  _count: { tasks: number }
}

interface ProjectTask {
  id: string
  status: string
  priority: string
}

interface TaskStats {
  total: number
  notStarted: number
  inProgress: number
  submitted: number
  underReview: number
  verifiedCompleted: number
  overdue: number
}

interface AnalyticsTeamStat {
  userId: string
  name: string
  role: string
  avatar: string | null
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  contributionScore: number
}

interface Report {
  id: string
  summary: string
  strengths: string
  weaknesses: string
  challenges: string
  improvements: string
  recommendedSkills: string
  futureImprovements: string
  overallAssessment: string
  generatedAt: string
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress: number
  deadline: string | null
  projectType: string
  difficulty: string
  techStack: string
  features: string
  requirements: string
  targetUsers: string
  goal: string
  createdAt: string
  completedAt: string | null
  members: ProjectMember[]
  milestones: Milestone[]
  tasks: ProjectTask[]
  taskStats: TaskStats
  _count: { tasks: number; comments: number; files: number; reports: number }
}

// ==================== HELPERS ====================

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-teal-100 text-teal-700 border-teal-200',
  on_hold: 'bg-amber-100 text-amber-700 border-amber-200',
  planning: 'bg-slate-100 text-slate-700 border-slate-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ef4444', '#06b6d4']

const PIE_DATA_LABELS: Record<string, string> = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  submitted: 'Submitted',
  underReview: 'Under Review',
  verifiedCompleted: 'Completed',
  overdue: 'Overdue',
}

function parseJSONField(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseJSONObj(val: string | null | undefined): Record<string, unknown> {
  if (!val) return {}
  try {
    return JSON.parse(val)
  } catch {
    return {}
  }
}

// ==================== MAIN COMPONENT ====================

export function ProjectDetailPage({ projectId, userId }: { projectId: string; userId: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [milestoneTasks, setMilestoneTasks] = useState<Record<string, any[]>>({})

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true)
        const res = await fetch(`/api/projects/${projectId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch project')
        setProject(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  // Fetch tasks when on tasks/team tab
  useEffect(() => {
    if (activeTab === 'tasks' || activeTab === 'team') {
      fetchTasks()
      fetchAnalytics()
    }
  }, [activeTab, projectId])

  // Fetch reports
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports()
    }
  }, [activeTab, projectId])

  async function fetchTasks() {
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`)
      const json = await res.json()
      if (res.ok) setTasks(json.data || [])
    } catch { /* ignore */ }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch(`/api/analytics?projectId=${projectId}`)
      const json = await res.json()
      if (res.ok) setAnalytics(json.data)
    } catch { /* ignore */ }
  }

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports?projectId=${projectId}`)
      const json = await res.json()
      if (res.ok) setReports(json.data || [])
    } catch { /* ignore */ }
  }

  async function handleGeneratePlan() {
    try {
      setGeneratingPlan(true)
      const res = await fetch(`/api/projects/${projectId}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate plan')
      // Re-fetch project
      const projRes = await fetch(`/api/projects/${projectId}`)
      const projJson = await projRes.json()
      if (projRes.ok) setProject(projJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setGeneratingPlan(false)
    }
  }

  async function handleGenerateReport() {
    try {
      setGeneratingReport(true)
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate report')
      await fetchReports()
      // Also update project status
      const projRes = await fetch(`/api/projects/${projectId}`)
      const projJson = await projRes.json()
      if (projRes.ok) setProject(projJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function handleSaveEdit() {
    try {
      setSavingEdit(true)
      setError(null)
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: editName, description: editDescription }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update project')
      setProject(json.data)
      setEditDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setSavingEdit(false)
    }
  }

  function openEditDialog() {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description)
    setEditDialogOpen(true)
  }

  // Fetch files when on files tab
  useEffect(() => {
    if (activeTab === 'files') {
      fetchFiles()
    }
  }, [activeTab, projectId])

  async function fetchFiles() {
    try {
      const res = await fetch(`/api/files?projectId=${projectId}`)
      const json = await res.json()
      if (res.ok) setFiles(json.data || [])
    } catch { /* ignore */ }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingFile(true)
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })
      if (!res.ok) throw new Error('Failed to upload file')
      await fetchFiles()
      const projRes = await fetch(`/api/projects/${projectId}`)
      const projJson = await projRes.json()
      if (projRes.ok) setProject(projJson.data)
    } catch { /* ignore */ } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  async function handleFileDelete(fileId: string) {
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete file')
      await fetchFiles()
      const projRes = await fetch(`/api/projects/${projectId}`)
      const projJson = await projRes.json()
      if (projRes.ok) setProject(projJson.data)
    } catch { /* ignore */ }
  }

  async function fetchMilestoneTasks(msId: string) {
    if (milestoneTasks[msId]) return
    try {
      const res = await fetch(`/api/tasks?milestoneId=${msId}`)
      const json = await res.json()
      if (res.ok) {
        setMilestoneTasks((prev) => ({ ...prev, [msId]: json.data || [] }))
      }
    } catch { /* ignore */ }
  }

  async function handleAddMember() {
    if (!memberEmail.trim()) return
    try {
      setMemberError(null)
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberEmail.trim(), role: 'member' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add member')
      setMemberEmail('')
      // Re-fetch project for member list
      const projRes = await fetch(`/api/projects/${projectId}`)
      const projJson = await projRes.json()
      if (projRes.ok) setProject(projJson.data)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member')
    }
  }

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-4">
          <p className="text-destructive">{error || 'Project not found'}</p>
          <Button variant="outline" onClick={() => navigate('projects')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const techStackList = parseJSONField(project.techStack)
  const featuresList = parseJSONField(project.features)
  const taskStats = project.taskStats
  const hasMilestones = project.milestones && project.milestones.length > 0

  // Pie chart data
  const pieData = [
    { name: 'Not Started', value: taskStats.notStarted },
    { name: 'In Progress', value: taskStats.inProgress },
    { name: 'Submitted', value: taskStats.submitted },
    { name: 'Under Review', value: taskStats.underReview },
    { name: 'Completed', value: taskStats.verifiedCompleted },
    { name: 'Overdue', value: taskStats.overdue },
  ].filter((d) => d.value > 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold truncate">{project.name}</h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0 ${statusColors[project.status] || ''}`}
                >
                  {project.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={openEditDialog}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto mb-6 bg-muted p-1 rounded-lg h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <FileText className="h-3.5 w-3.5 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <CheckCircle className="h-3.5 w-3.5 hidden sm:block" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <Users className="h-3.5 w-3.5 hidden sm:block" />
              Team
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <FolderOpen className="h-3.5 w-3.5 hidden sm:block" />
              Files
            </TabsTrigger>
            <TabsTrigger value="ai-planner" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <Brain className="h-3.5 w-3.5 hidden sm:block" />
              AI Planner
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm flex-1 shrink-0">
              <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW TAB ==================== */}
          <TabsContent value="overview" className="space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{project.projectType}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Difficulty</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {project.difficulty || 'medium'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${statusColors[project.status] || ''}`}
                    >
                      {project.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tech Stack & Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {techStackList.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tech Stack</p>
                      <div className="flex flex-wrap gap-1.5">
                        {techStackList.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {featuresList.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Features</p>
                      <ul className="space-y-1">
                        {featuresList.map((f, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!techStackList.length && !featuresList.length && (
                    <p className="text-sm text-muted-foreground">No tech stack or features defined.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Requirements */}
            {project.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.requirements}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Milestones timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Milestones</CardTitle>
                <CardDescription>{hasMilestones ? `${project.milestones.length} milestones` : 'No milestones yet'}</CardDescription>
              </CardHeader>
              <CardContent>
                {hasMilestones ? (
                  <div className="space-y-4">
                    {project.milestones.map((ms, i) => (
                      <div key={ms.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              ms.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : ms.progress > 0
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {i + 1}
                          </div>
                          {i < project.milestones.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{ms.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {ms._count.tasks} task{ms._count.tasks !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <Progress value={ms.progress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1">{Math.round(ms.progress)}% complete</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Use AI Planner to generate milestones and tasks.</p>
                )}
              </CardContent>
            </Card>

            {/* Task Status Pie Chart */}
            {taskStats.total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Progress</CardTitle>
                  <CardDescription>{taskStats.total} total tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: '12px' }}
                            formatter={(value: string) => (
                              <span className="text-xs">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      {[
                        { label: 'Not Started', value: taskStats.notStarted, color: PIE_COLORS[0] },
                        { label: 'In Progress', value: taskStats.inProgress, color: PIE_COLORS[1] },
                        { label: 'Completed', value: taskStats.verifiedCompleted, color: PIE_COLORS[4] },
                        { label: 'Overdue', value: taskStats.overdue, color: PIE_COLORS[5] },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <div>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-semibold">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== TASKS TAB ==================== */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Stats summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Tasks', value: taskStats.total, icon: CheckCircle, color: 'text-muted-foreground' },
                { label: 'Completed', value: taskStats.verifiedCompleted, icon: CheckCircle, color: 'text-emerald-600' },
                { label: 'In Progress', value: taskStats.inProgress, icon: Clock, color: 'text-amber-600' },
                { label: 'Overdue', value: taskStats.overdue, icon: AlertTriangle, color: 'text-red-600' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Button onClick={() => navigate('tasks', { projectId })} className="gap-2">
              Go to Tasks
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </TabsContent>

          {/* ==================== TEAM TAB ==================== */}
          <TabsContent value="team" className="space-y-6">
            {/* Add member */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Team Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter user email or ID"
                    value={memberEmail}
                    onChange={(e) => {
                      setMemberEmail(e.target.value)
                      setMemberError(null)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember() } }}
                  />
                  <Button onClick={handleAddMember} className="gap-1.5 shrink-0">
                    <UserPlus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                {memberError && (
                  <p className="text-xs text-destructive mt-2">{memberError}</p>
                )}
              </CardContent>
            </Card>

            {/* Member list */}
            <div className="space-y-3">
              {project.members.map((member) => (
                <Card key={member.userId}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {member.user.name?.charAt(0).toUpperCase() || member.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="outline" className="text-[10px] capitalize px-1.5">
                          {member.role}
                        </Badge>
                        <span>Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {analytics?.teamStats && (() => {
                      const stat = (analytics.teamStats as AnalyticsTeamStat[]).find(
                        (s) => s.userId === member.userId
                      )
                      if (!stat) return null
                      return (
                        <div className="text-right text-xs hidden sm:block">
                          <p className="text-muted-foreground">{stat.totalTasks} tasks</p>
                          <p className="font-medium text-emerald-600">{stat.completedTasks} done</p>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== FILES TAB ==================== */}
          <TabsContent value="files" className="space-y-4">
            {/* Upload area */}
            <Card>
              <CardContent className="p-6">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports all file types</p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <label htmlFor="file-upload" className="mt-3 inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 cursor-pointer"
                      asChild
                      disabled={uploadingFile}
                    >
                      <span>
                        {uploadingFile ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Choose File
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* File list */}
            {files.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleFileDelete(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== AI PLANNER TAB ==================== */}
          <TabsContent value="ai-planner" className="space-y-6">
            {!hasMilestones ? (
              <Card>
                <CardContent className="p-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">AI Project Planner</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Let AI analyze your project details and generate a complete plan with milestones,
                    tasks, dependencies, and time estimates.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="gap-2"
                  >
                    {generatingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Project Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Generated Plan</h3>
                  <Badge variant="outline" className="text-xs">
                    {project.milestones.length} milestones
                  </Badge>
                </div>

                {/* Milestone timeline with tasks */}
                <div className="space-y-3">
                  {project.milestones.map((ms, idx) => (
                    <Card key={ms.id}>
                      <CardHeader className="pb-2 cursor-pointer" onClick={() => {
                        const el = document.getElementById(`ms-tasks-${ms.id}`)
                        if (el) {
                          const isHidden = el.classList.contains('hidden')
                          el.classList.toggle('hidden')
                          if (isHidden) fetchMilestoneTasks(ms.id)
                        }
                      }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              ms.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : ms.progress > 0
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <CardTitle className="text-sm">{ms.title}</CardTitle>
                              <p className="text-xs text-muted-foreground">{ms._count.tasks} tasks</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={ms.progress} className="h-1.5 w-20 hidden sm:block" />
                            <span className="text-xs text-muted-foreground">{Math.round(ms.progress)}%</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent id={`ms-tasks-${ms.id}`} className="hidden pt-0">
                        <Separator className="mb-3" />
                        {milestoneTasks[ms.id] && milestoneTasks[ms.id].length > 0 ? (
                          <div className="space-y-1.5">
                            {milestoneTasks[ms.id].map((task: any) => (
                              <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 shrink-0 ${
                                    task.status === 'verified_completed'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : task.status === 'in_progress'
                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                        : task.status === 'overdue'
                                          ? 'bg-red-100 text-red-700 border-red-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {task.status.replace(/_/g, ' ')}
                                </Badge>
                                <span className="flex-1 truncate">{task.title}</span>
                                {task.assignee && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {task.assignee.name || task.assignee.email}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {milestoneTasks[ms.id] ? 'No tasks in this milestone.' : 'Loading tasks...'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== REPORTS TAB ==================== */}
          <TabsContent value="reports" className="space-y-6">
            {reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Project Report</CardTitle>
                        <CardDescription>
                          Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.overallAssessment && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Overall Assessment</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.overallAssessment}</p>
                      </div>
                    )}
                    {report.summary && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Summary</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.summary}</p>
                      </div>
                    )}
                    {(() => {
                      const strengths = parseJSONField(report.strengths)
                      if (strengths.length > 0) return (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Strengths</h4>
                          <ul className="space-y-1">
                            {strengths.map((s: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                    {(() => {
                      const weaknesses = parseJSONField(report.weaknesses)
                      if (weaknesses.length > 0) return (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Areas for Improvement</h4>
                          <ul className="space-y-1">
                            {weaknesses.map((w: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                    {report.recommendedSkills && (() => {
                      const skills = parseJSONField(report.recommendedSkills)
                      if (skills.length > 0) return (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Recommended Skills</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((s: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {report.futureImprovements && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Future Improvements</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.futureImprovements}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : project.status === 'completed' ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No reports generated yet.</p>
                  <Button onClick={handleGenerateReport} disabled={generatingReport} className="gap-2">
                    {generatingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
                  <h3 className="text-base font-medium">Report Not Available</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Complete the project to generate a comprehensive AI-powered report with insights,
                    strengths analysis, and recommendations.
                  </p>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    variant="outline"
                    className="gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Complete Project & Generate Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Project description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
