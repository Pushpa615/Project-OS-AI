'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Filter,
  Loader2,
  Circle,
  CircleDot,
  Ban,
  Send,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string | null
  startDate: string | null
  completionPercent: number
  estimatedHours: number | null
  actualHours: number | null
  assignedTo: string | null
  assignee: { id: string; name: string | null; email: string; avatar: string | null } | null
  milestone: { id: string; title: string; status: string } | null
  _count: { evidence: number; taskComments: number }
}

// ==================== CONSTANTS ====================

const COLUMNS: { key: string; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'not_started', label: 'Not Started', icon: Circle, color: 'text-slate-400' },
  { key: 'in_progress', label: 'In Progress', icon: CircleDot, color: 'text-amber-500' },
  { key: 'blocked', label: 'Blocked', icon: Ban, color: 'text-red-500' },
  { key: 'submitted', label: 'Submitted', icon: Send, color: 'text-violet-500' },
  { key: 'under_review', label: 'Under Review', icon: Eye, color: 'text-cyan-500' },
  { key: 'verified_completed', label: 'Verified Completed', icon: CheckCircle, color: 'text-emerald-500' },
  { key: 'overdue', label: 'Overdue', icon: XCircle, color: 'text-red-600' },
]

const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' },
  medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium' },
  low: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Low' },
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// ==================== HELPERS ====================

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 3
    const pb = priorityOrder[b.priority] ?? 3
    return pa - pb
  })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ==================== TASK CARD ====================

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const pConfig = priorityConfig[task.priority] || priorityConfig.medium

  return (
    <Card
      className="cursor-pointer hover:shadow-sm transition-shadow border rounded-lg"
      onClick={onClick}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${pConfig.color}`}>
            {pConfig.label}
          </Badge>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {task.assignee.name?.charAt(0).toUpperCase() || task.assignee.email.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{task.assignee.name || task.assignee.email}</span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(task.completionPercent)}%</span>
          </div>
          <Progress value={task.completionPercent} className="h-1" />
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== COLUMN SKELETON ====================

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function TasksPage({ userId, projectId }: { userId: string; projectId?: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState(projectId || 'all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Fetch tasks
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        if (projectId) params.set('projectId', projectId)
        const res = await fetch(`/api/tasks?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch tasks')
        setAllTasks(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [projectId])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = allTasks
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter)
    }
    return result
  }, [allTasks, priorityFilter])

  // Group by status
  const columnsMap = useMemo(() => {
    const map: Record<string, Task[]> = {}
    COLUMNS.forEach((col) => {
      map[col.key] = sortByPriority(filteredTasks.filter((t) => t.status === col.key))
    })
    return map
  }, [filteredTasks])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Tasks</h1>
              <p className="text-xs text-muted-foreground">
                {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        {error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex gap-4 min-w-max pb-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="w-72 shrink-0">
                <ColumnSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-w-max pb-4">
            {COLUMNS.map((col) => {
              const tasks = columnsMap[col.key]
              const Icon = col.icon
              return (
                <div key={col.key} className="w-72 shrink-0">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Icon className={`h-4 w-4 ${col.color}`} />
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {tasks.length}
                    </Badge>
                  </div>

                  {/* Column cards */}
                  <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <div className="border border-dashed rounded-lg p-6 text-center">
                        <p className="text-xs text-muted-foreground">No tasks</p>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => navigate('task-detail', { id: task.id })}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
