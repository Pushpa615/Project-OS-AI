'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Target,
  Users,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface Project {
  id: string
  name: string
  status: string
}

interface AnalyticsData {
  taskStats: {
    total: number
    completed: number
    inProgress: number
    notStarted: number
    blocked: number
    overdue: number
  }
  milestoneProgress: { id: string; title: string; progress: number; status: string }[]
  teamContribution: { name: string; tasks: number; completed: number; inProgress: number }[]
  weeklyActivity: { week: string; completed: number }[]
  priorityDistribution: { priority: string; count: number }[]
  overdueCount: number
  onTimeRate: number
  overallProgress: number
}

// ==================== COLORS ====================

const STATUS_COLORS: Record<string, string> = {
  Not_Started: '#94a3b8',
  In_Progress: '#f59e0b',
  Blocked: '#ef4444',
  Completed: '#10b981',
  Overdue: '#f97316',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#94a3b8', '#ef4444', '#f97316']
const BAR_COLORS = ['#10b981', '#f59e0b']

// ==================== COMPONENT ====================

export function AnalyticsPage({ userId, projectId: initialProjectId }: { userId: string; projectId?: string }) {
  const navigate = useNavStore((s) => s.navigate)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'all')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?userId=${userId}`)
      const json = await res.json()
      if (json.data) setProjects(json.data)
    } catch {
      // ignore
    }
  }, [userId])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = selectedProjectId === 'all'
        ? `/api/analytics?userId=${userId}`
        : `/api/analytics?projectId=${selectedProjectId}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) {
        setAnalytics(json.data)
      } else if (json.error) {
        setError(json.error)
      }
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedProjectId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Task status data for bar chart
  const taskStatusData = analytics
    ? [
        { name: 'Not Started', count: analytics.taskStats.notStarted },
        { name: 'In Progress', count: analytics.taskStats.inProgress },
        { name: 'Blocked', count: analytics.taskStats.blocked },
        { name: 'Completed', count: analytics.taskStats.completed },
        { name: 'Overdue', count: analytics.taskStats.overdue },
      ]
    : []

  // Pie chart data
  const pieData = analytics
    ? [
        { name: 'Completed', value: analytics.taskStats.completed },
        { name: 'In Progress', value: analytics.taskStats.inProgress },
        { name: 'Not Started', value: analytics.taskStats.notStarted },
        { name: 'Blocked', value: analytics.taskStats.blocked },
        { name: 'Overdue', value: analytics.taskStats.overdue },
      ].filter((d) => d.value > 0)
    : []

  // Risk level for deadline proximity
  function getDeadlineRisk(projectId: string): 'low' | 'medium' | 'high' | 'critical' {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return 'low'
    return 'medium' // simplified
  }

  // ==================== LOADING STATE ====================

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  // ==================== ERROR STATE ====================

  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error Loading Analytics</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </Card>
      </div>
    )
  }

  const stats = analytics?.taskStats
  const milestoneProgress = analytics?.milestoneProgress || []
  const teamContribution = analytics?.teamContribution || []
  const weeklyActivity = analytics?.weeklyActivity || []

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track project progress and team performance
          </p>
        </div>
        {projects.length > 0 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Overall Progress</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{analytics?.overallProgress ?? 0}%</div>
          <Progress value={analytics?.overallProgress ?? 0} className="mt-2 h-1.5" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Tasks Completed</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-teal-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{stats?.completed ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            of {stats?.total ?? 0} total
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">On-Time Rate</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{analytics?.onTimeRate ?? 0}%</div>
          <p className="text-xs text-muted-foreground mt-1">tasks delivered on time</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Overdue</span>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{stats?.overdue ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">tasks past deadline</p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tasks by Status Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tasks by Status</CardTitle>
            <CardDescription className="text-xs">Distribution of task statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {taskStatusData.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.name.replace(/ /g, '_')] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Task Completion Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Completion Distribution</CardTitle>
            <CardDescription className="text-xs">Task status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No task data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Activity Trend</CardTitle>
            <CardDescription className="text-xs">Tasks completed per week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {weeklyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyActivity} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No weekly activity data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Member Contribution Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Team Contribution</CardTitle>
            <CardDescription className="text-xs">Tasks per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {teamContribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamContribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No team data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress & Project Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Milestone Progress</CardTitle>
            <CardDescription className="text-xs">Track milestone completion</CardDescription>
          </CardHeader>
          <CardContent>
            {milestoneProgress.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {milestoneProgress.map((ms) => (
                  <div key={ms.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate mr-2">{ms.title}</span>
                      <Badge
                        variant={ms.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          ms.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0'
                            : ms.status === 'in_progress'
                              ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shrink-0'
                              : 'shrink-0'
                        }
                      >
                        {ms.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <Progress value={ms.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No milestones yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Project Health</CardTitle>
            <CardDescription className="text-xs">Key health indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Schedule Risk */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Schedule Risk</span>
                </div>
                <Badge
                  className={
                    (stats?.overdue ?? 0) > 3
                      ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      : (stats?.overdue ?? 0) > 0
                        ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  }
                >
                  {(stats?.overdue ?? 0) > 3 ? 'High' : (stats?.overdue ?? 0) > 0 ? 'Medium' : 'Low'}
                </Badge>
              </div>

              <div className="h-px bg-border" />

              {/* Team Workload */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Team Workload</span>
                </div>
                <Badge
                  className={
                    teamContribution.length === 0
                      ? 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20'
                      : (stats?.inProgress ?? 0) > (teamContribution.length * 3)
                        ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  }
                >
                  {teamContribution.length === 0
                    ? 'N/A'
                    : (stats?.inProgress ?? 0) > teamContribution.length * 3
                      ? 'Overloaded'
                      : 'Balanced'}
                </Badge>
              </div>

              <div className="h-px bg-border" />

              {/* Deadline Proximity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Deadline Proximity</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                  On Track
                </Badge>
              </div>

              <div className="h-px bg-border" />

              {/* Blocked Tasks */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Blocked Tasks</span>
                </div>
                <Badge
                  className={
                    (stats?.blocked ?? 0) > 2
                      ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      : (stats?.blocked ?? 0) > 0
                        ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  }
                >
                  {stats?.blocked ?? 0} blocked
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deadline Risk Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Deadline Risk
          </CardTitle>
          <CardDescription className="text-xs">Upcoming deadlines with risk assessment</CardDescription>
        </CardHeader>
        <CardContent>
          {milestoneProgress.filter((m) => m.status !== 'completed').length > 0 ? (
            <div className="space-y-3">
              {milestoneProgress
                .filter((m) => m.status !== 'completed')
                .map((ms) => {
                  const risk =
                    ms.progress < 30 ? 'critical' : ms.progress < 60 ? 'high' : ms.progress < 80 ? 'medium' : 'low'
                  return (
                    <div
                      key={ms.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            risk === 'critical'
                              ? 'bg-red-500'
                              : risk === 'high'
                                ? 'bg-amber-500'
                                : risk === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-sm font-medium truncate">{ms.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={ms.progress} className="w-24 h-1.5" />
                        <Badge
                          className={
                            risk === 'critical'
                              ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                              : risk === 'high'
                                ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                                : risk === 'medium'
                                  ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          }
                        >
                          {risk.charAt(0).toUpperCase() + risk.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              All milestones completed! No deadline risks.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
