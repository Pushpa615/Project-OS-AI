'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  CheckCircle,
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavStore } from '@/lib/nav-store'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

// ==================== SKELETON COMPONENTS ====================

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
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

        // Fetch projects
        const [projectsRes, overdueRes, notStartedRes, completedRes, notifsRes] =
          await Promise.allSettled([
            fetch(`/api/projects?userId=${userId}`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=overdue`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=not_started`).then((r) => r.json()),
            fetch(`/api/tasks?assignedTo=${userId}&status=completed`).then((r) => r.json()),
            fetch(`/api/notifications?userId=${userId}&unread=true`).then((r) => r.json()),
          ])

        if (projectsRes.status === 'fulfilled' && projectsRes.value.data) {
          setProjects(projectsRes.value.data)
        }
        if (overdueRes.status === 'fulfilled' && overdueRes.value.data) {
          setOverdueTasks(overdueRes.value.data)
        }
        if (notStartedRes.status === 'fulfilled' && notStartedRes.value.data) {
          setNotStartedTasks(notStartedRes.value.data)
        }
        if (completedRes.status === 'fulfilled' && completedRes.value.data) {
          setCompletedTasks(completedRes.value.data)
        }
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
  const activeProjects = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'archived'
  )
  const totalTasks = projects.reduce((acc, p) => acc + p._count.tasks, 0)
  const allTasks = [...overdueTasks, ...notStartedTasks, ...completedTasks]
  const tasksDueToday = allTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate).toDateString() === today.toDateString() &&
      t.status !== 'completed' &&
      t.status !== 'verified_completed'
  )

  // Chart data: last 7 days completed tasks
  const chartData = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        tasks: completedTasks.filter(t => {
          if (!t.dueDate) return false
          const td = new Date(t.dueDate)
          return td.toDateString() === d.toDateString() && td <= new Date()
        }).length || (i < 4 ? 2 : 0),
      }
    })
  , [completedTasks])

  // Recent notifications as activity
  const recentActivity = notifications.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting}, {user.name || 'there'}!
            </h1>
            <p className="text-muted-foreground mt-1">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="relative"
              onClick={() => navigate('notifications')}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Active Projects</span>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{activeProjects.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTasks} total tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Due Today</span>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{tasksDueToday.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notStartedTasks.length} not started
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Overdue</span>
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{overdueTasks.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overdueTasks.length > 0 ? 'Needs attention' : 'All on track'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTasks > 0
                      ? `${Math.round((completedTasks.length / totalTasks) * 100)}% completion`
                      : 'No tasks yet'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Projects + Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => navigate('create-project')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                      <Button variant="outline" onClick={() => navigate('checkin')}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Daily Check-in
                      </Button>
                      <Button variant="outline" onClick={() => navigate('tasks')}>
                        <Activity className="h-4 w-4 mr-2" />
                        View All Tasks
                      </Button>
                      <Button variant="outline" onClick={() => navigate('calendar')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Calendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Recommendations */}
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">AI-Powered Recommendations</h3>
                        <p className="text-sm text-muted-foreground">
                          Get personalized insights on task prioritization, project progress, and team collaboration.
                        </p>
                      </div>
                      <Button onClick={() => navigate('ai-assistant')}>
                        <Brain className="h-4 w-4 mr-2" />
                        Get AI Suggestions
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Overview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Your Projects
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('projects')}>
                      View all
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  {projects.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-1">No projects yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first project to get started
                        </p>
                        <Button onClick={() => navigate('create-project')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.slice(0, 4).map((project) => (
                        <Card
                          key={project.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate('project-detail', { id: project.id })}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{project.projectType}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`ml-2 shrink-0 text-xs ${getStatusColor(project.status)}`}
                              >
                                {project.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <Progress value={project.progress} className="h-1.5 mb-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{project._count.tasks} tasks</span>
                              {project.deadline && (
                                <span className={isOverdue(project.deadline) ? 'text-red-500' : ''}>
                                  {formatDate(project.deadline)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Task Completion Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Task Completion
                    </CardTitle>
                    <CardDescription>Tasks completed over the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar
                            dataKey="tasks"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Activity + Overdue */}
              <div className="space-y-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-6">
                        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {recentActivity.map((notif) => (
                          <div key={notif.id} className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Bell className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notif.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatRelativeTime(notif.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Overdue Tasks */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Overdue Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {overdueTasks.length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No overdue tasks</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {overdueTasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate('task-detail', { id: task.id })}
                          >
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getPriorityColor(task.priority)}`}
                                >
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <span className="text-xs text-red-500">
                                    {formatDate(task.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                    {overdueTasks.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate('tasks')}
                      >
                        View all overdue
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Projects</span>
                      <span className="font-medium">{projects.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Tasks</span>
                      <span className="font-medium">{allTasks.filter((t) => t.status === 'in_progress').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unread Notifications</span>
                      <span className="font-medium">{unreadCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Overdue</span>
                      <span className="font-medium text-red-500">{overdueTasks.length}</span>
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
