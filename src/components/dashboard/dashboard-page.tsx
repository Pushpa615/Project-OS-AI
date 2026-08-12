'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  Activity,
  ChevronRight,
  FolderOpen,
  Brain,
  BarChart3,
  Bell,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Target,
  ListChecks,
  Play,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavStore } from '@/lib/nav-store'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ==================== TYPES ====================

interface DashboardUser {
  id: string
  email: string
  name: string
  role: string
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress: number
  deadline: string | null
  projectType: string
  _count: { tasks: number }
  milestones: { id: string; title: string; status: string; progress: number }[]
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  projectId: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  read: boolean
}

// ==================== PROGRESS RING ====================

function ProgressRing({ value, size = 44, strokeWidth = 4, className = '' }: { value: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  const color = value >= 75 ? 'text-emerald-500' : value >= 40 ? 'text-amber-500' : 'text-red-400'

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">{Math.round(value)}%</span>
    </div>
  )
}

// ==================== HELPERS ====================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No deadline'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  } catch {
    return ''
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'in_progress':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    case 'completed':
    case 'verified_completed':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    case 'not_started':
      return 'bg-muted text-muted-foreground border-border'
    case 'on_hold':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
    case 'overdue':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    case 'high':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    case 'low':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  try {
    return new Date(dateStr) < new Date()
  } catch {
    return false
  }
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ==================== SKELETON COMPONENTS ====================

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm bg-gradient-to-br from-muted/50 to-muted/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProjectCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full ml-3" />
        </div>
        <Skeleton className="h-1.5 w-full mb-3" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== STAT CARD ====================

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, onClick }: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  onClick?: () => void
}) {
  return (
    <Card
      className="border-0 shadow-sm bg-gradient-to-br from-muted/50 to-muted/20 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

interface DashboardPageProps {
  user: DashboardUser
}

export function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavStore((s) => s.navigate)

  // Data states
  const [projects, setProjects] = useState<Project[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [notStartedTasks, setNotStartedTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Loading state
  const [loading, setLoading] = useState(true)

  // Today info
  const today = new Date()
  const greeting =
    today.getHours() < 12
      ? 'Good morning'
      : today.getHours() < 18
      ? 'Good afternoon'
      : 'Good evening'
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const userId = user.id
        const [projectsRes, overdueRes, notStartedRes, completedRes, notifsRes] =
          await Promise.allSettled([
            fetch(`/api/projects?userId=${userId}`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=overdue`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=not_started`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=completed`).then((r) => r.json()),
            fetch(`/api/notifications?userId=${userId}&unread=true`).then((r) => r.json()),
          ])

        if (projectsRes.status === 'fulfilled' && projectsRes.value.data) setProjects(projectsRes.value.data)
        if (overdueRes.status === 'fulfilled' && overdueRes.value.data) setOverdueTasks(overdueRes.value.data)
        if (notStartedRes.status === 'fulfilled' && notStartedRes.value.data) setNotStartedTasks(notStartedRes.value.data)
        if (completedRes.status === 'fulfilled' && completedRes.value.data) setCompletedTasks(completedRes.value.data)
        if (notifsRes.status === 'fulfilled') {
          setNotifications(notifsRes.value.data || [])
          setUnreadCount(notifsRes.value.unreadCount || 0)
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user.id])

  // Compute stats
  const activeProjects = projects.filter((p) => p.status !== 'completed' && p.status !== 'archived')
  const totalTasks = projects.reduce((acc, p) => acc + p._count.tasks, 0)
  const allTasks = [...overdueTasks, ...notStartedTasks, ...completedTasks]
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress')
  const tasksDueToday = allTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate).toDateString() === today.toDateString() &&
      t.status !== 'completed' &&
      t.status !== 'verified_completed'
  )

  // Chart data
  const chartData = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return {
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          tasks: completedTasks.filter((t) => {
            if (!t.dueDate) return false
            const td = new Date(t.dueDate)
            return td.toDateString() === d.toDateString() && td <= new Date()
          }).length,
        }
      }),
    [completedTasks]
  )

  // Task distribution data for pie chart
  const taskDistData = useMemo(() => {
    const notStarted = allTasks.filter((t) => t.status === 'not_started').length
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length
    const completed = allTasks.filter((t) => t.status === 'completed' || t.status === 'verified_completed').length
    const overdue = allTasks.filter((t) => t.status === 'overdue').length
    return [
      { name: 'Not Started', value: notStarted, color: 'hsl(var(--muted-foreground))' },
      { name: 'In Progress', value: inProgress, color: 'hsl(45, 93%, 47%)' },
      { name: 'Completed', value: completed, color: 'hsl(160, 84%, 39%)' },
      { name: 'Overdue', value: overdue, color: 'hsl(0, 84%, 60%)' },
    ].filter((d) => d.value > 0)
  }, [allTasks])

  const recentActivity = notifications.slice(0, 5)

  // AI tips based on data
  const aiTips = useMemo(() => {
    const tips: { icon: React.ElementType; title: string; desc: string; action?: () => void }[] = []
    if (overdueTasks.length > 0) {
      tips.push({
        icon: AlertTriangle,
        title: 'Overdue tasks need attention',
        desc: `You have ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task' : 'tasks'}. Consider reprioritizing or extending deadlines.`,
        action: () => navigate('tasks'),
      })
    }
    if (notStartedTasks.length > 0 && inProgressTasks.length < 3) {
      tips.push({
        icon: Play,
        title: 'Start more tasks',
        desc: `${notStartedTasks.length} tasks are waiting. Focus on high-priority items first.`,
        action: () => navigate('tasks'),
      })
    }
    if (activeProjects.length > 0) {
      const lowProgress = activeProjects.filter((p) => p.progress < 25)
      if (lowProgress.length > 0) {
        tips.push({
          icon: Target,
          title: `${lowProgress.length} ${lowProgress.length === 1 ? 'project' : 'projects'} need momentum`,
          desc: 'Consider generating an AI plan or breaking down tasks into smaller steps.',
          action: () => navigate('ai-assistant'),
        })
      }
    }
    if (tips.length === 0) {
      tips.push({
        icon: Sparkles,
        title: 'All on track!',
        desc: 'No urgent issues. Use AI Assistant for code help, documentation, or deadline planning.',
        action: () => navigate('ai-assistant'),
      })
    }
    return tips.slice(0, 2)
  }, [overdueTasks, notStartedTasks, inProgressTasks, activeProjects, navigate])

  const nextProject = activeProjects.sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })[0]

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{dateStr}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {greeting}, {user.name ? user.name.split(' ')[0] : 'there'}!
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="relative" onClick={() => navigate('notifications')}>
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Button size="sm" onClick={() => navigate('create-project')}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <ProjectCardSkeleton key={i} />
                ))}
              </div>
              <div className="space-y-6">
                <Skeleton className="h-72 w-full rounded-xl" />
                <Skeleton className="h-72 w-full rounded-xl" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Active Projects"
                value={activeProjects.length}
                sub={`${totalTasks} total tasks`}
                icon={FolderOpen}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                onClick={() => navigate('projects')}
              />
              <StatCard
                label="In Progress"
                value={inProgressTasks.length}
                sub={`${notStartedTasks.length} not started`}
                icon={Play}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                onClick={() => navigate('tasks')}
              />
              <StatCard
                label="Overdue"
                value={overdueTasks.length}
                sub={overdueTasks.length > 0 ? 'Needs attention' : 'All on track'}
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                onClick={() => navigate('tasks')}
              />
              <StatCard
                label="Completed"
                value={completedTasks.length}
                sub={totalTasks > 0 ? `${Math.round((completedTasks.length / totalTasks) * 100)}% completion` : 'No tasks yet'}
                icon={CheckCircle2}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-500"
              />
            </div>

            {/* AI Insights Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiTips.map((tip, i) => (
                <Card key={i} className="border-primary/15 bg-gradient-to-r from-primary/[0.03] to-transparent hover:shadow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <tip.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{tip.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                      </div>
                      {tip.action && (
                        <Button variant="ghost" size="sm" className="shrink-0" onClick={tip.action}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('checkin')}>
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                    Daily Check-in
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('tasks')}>
                    <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                    All Tasks
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('calendar')}>
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Calendar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('ai-assistant')}>
                    <Brain className="h-3.5 w-3.5 mr-1.5" />
                    AI Assistant
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('analytics')}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Analytics
                  </Button>
                </div>

                {/* Project Overview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Your Projects
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('projects')}>
                      View all <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {projects.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-10 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <FolderOpen className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1.5">No projects yet</h3>
                        <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                          Create your first project and let AI help you plan, track, and deliver it successfully.
                        </p>
                        <Button onClick={() => navigate('create-project')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Project
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.slice(0, 4).map((project) => {
                        const daysLeft = getDaysUntil(project.deadline)
                        return (
                          <Card
                            key={project.id}
                            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => navigate('project-detail', { id: project.id })}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                    {project.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(project.status)}`}>
                                      {project.status.replace(/_/g, ' ')}
                                    </Badge>
                                    <span>{project.projectType}</span>
                                  </p>
                                </div>
                                <ProgressRing value={project.progress} size={48} strokeWidth={4} className="ml-3" />
                              </div>
                              <Progress value={project.progress} className="h-1.5 mb-3" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ListChecks className="h-3 w-3" />
                                  {project._count.tasks} tasks
                                </span>
                                {project.deadline ? (
                                  <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft < 0 ? 'text-red-500 font-medium' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500 font-medium' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {daysLeft !== null && daysLeft < 0
                                      ? `${Math.abs(daysLeft)}d overdue`
                                      : daysLeft !== null && daysLeft === 0
                                      ? 'Due today'
                                      : daysLeft !== null && daysLeft <= 7
                                      ? `${daysLeft}d left`
                                      : formatDate(project.deadline)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    No deadline
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card className="md:col-span-3 border-0 shadow-sm">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Task Completion
                      </CardTitle>
                      <CardDescription className="text-xs">Last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-5 px-5">
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                            <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              }}
                            />
                            <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 border-0 shadow-sm">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Task Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-5 px-5">
                      {taskDistData.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="h-36 w-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={taskDistData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={65}
                                  paddingAngle={3}
                                  dataKey="value"
                                  strokeWidth={0}
                                >
                                  {taskDistData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {taskDistData.map((d) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span>{d.name}</span>
                                <span className="font-medium text-foreground">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">No tasks yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Upcoming Deadline */}
                {nextProject && nextProject.deadline && (
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/[0.03] to-orange-500/[0.03]">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Deadline</span>
                      </div>
                      <h3
                        className="font-semibold text-sm mb-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate('project-detail', { id: nextProject.id })}
                      >
                        {nextProject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {getDaysUntil(nextProject.deadline) !== null && getDaysUntil(nextProject.deadline)! < 0
                          ? `Overdue by ${Math.abs(getDaysUntil(nextProject.deadline)!)} days`
                          : getDaysUntil(nextProject.deadline) === 0
                          ? 'Due today'
                          : `${getDaysUntil(nextProject.deadline)} days remaining`}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Progress value={nextProject.progress} className="h-1.5 flex-1 mr-3" />
                        <span className="text-xs font-medium">{Math.round(nextProject.progress)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-5 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5 px-5">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-6">
                        <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {recentActivity.map((notif) => (
                          <div key={notif.id} className="flex items-start gap-3 group">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Bell className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{notif.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Overdue Tasks */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-5 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Overdue Tasks
                      {overdueTasks.length > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">{overdueTasks.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5 px-5">
                    {overdueTasks.length === 0 ? (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500/60 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">All tasks on track</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {overdueTasks.slice(0, 5).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => navigate('task-detail', { id: task.id })}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{task.title}</p>
                                <p className="text-[10px] text-red-500">{formatDate(task.dueDate)}</p>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </div>
                          ))}
                        </div>
                        {overdueTasks.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => navigate('tasks')}>
                            View all {overdueTasks.length} overdue
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-5 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5 px-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total Projects</span>
                        <span className="text-sm font-semibold">{projects.length}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Active Tasks</span>
                        <span className="text-sm font-semibold">{inProgressTasks.length}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Unread</span>
                        <span className="text-sm font-semibold">{unreadCount}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Completion Rate</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {totalTasks > 0 ? `${Math.round((completedTasks.length / totalTasks) * 100)}%` : '--'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
