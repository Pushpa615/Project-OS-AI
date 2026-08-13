'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
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
  GripVertical,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavStore } from '@/lib/nav-store'
import { cn } from '@/lib/utils'

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
  { key: 'not_started', label: 'Not Started', icon: Circle, color: 'text-[#94A3B8]' },
  { key: 'in_progress', label: 'In Progress', icon: CircleDot, color: 'text-[#F59E0B]' },
  { key: 'blocked', label: 'Blocked', icon: Ban, color: 'text-[#EF4444]' },
  { key: 'submitted', label: 'Submitted', icon: Send, color: 'text-[#64748B]' },
  { key: 'under_review', label: 'Under Review', icon: Eye, color: 'text-[#64748B]' },
  { key: 'verified_completed', label: 'Verified Completed', icon: CheckCircle, color: 'text-[#22C55E]' },
  { key: 'overdue', label: 'Overdue', icon: XCircle, color: 'text-[#EF4444]' },
]

const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20', label: 'Critical' },
  high: { color: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20', label: 'High' },
  medium: { color: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20', label: 'Medium' },
  low: { color: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]', label: 'Low' },
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

// ==================== DRAGGABLE TASK CARD ====================

function DraggableTaskCard({ task, onClick, onStatusChange }: { task: Task; onClick: () => void; onStatusChange: (taskId: string, newStatus: string) => void }) {
  const pConfig = priorityConfig[task.priority] || priorityConfig.medium
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, type: 'task' },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  // Find next and previous status for quick actions
  const currentIdx = COLUMNS.findIndex((c) => c.key === task.status)
  const nextStatus = currentIdx >= 0 && currentIdx < COLUMNS.length - 1 ? COLUMNS[currentIdx + 1] : null

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="cursor-grab hover:shadow-sm transition-shadow border rounded-lg active:cursor-grabbing group">
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5 hidden sm:block" {...listeners} />
              <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pConfig.color}`}>
                {pConfig.label}
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity sm:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1" align="end">
                  {COLUMNS.filter((c) => c.key !== task.status).map((col) => {
                    const ColIcon = col.icon
                    return (
                      <button
                        key={col.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          onStatusChange(task.id, col.key)
                        }}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <ColIcon className={cn('h-3.5 w-3.5', col.color)} />
                        <span>Move to {col.label}</span>
                      </button>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>
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

          {/* Footer: progress + quick move button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(task.completionPercent)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1">
                <div
                  className="bg-primary rounded-full h-1 transition-all"
                  style={{ width: `${task.completionPercent}%` }}
                />
              </div>
            </div>
            {nextStatus && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(task.id, nextStatus.key)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors shrink-0"
                title={`Move to ${nextStatus.label}`}
              >
                <ArrowRight className="h-3 w-3" />
                <span className="hidden lg:inline">{nextStatus.label}</span>
              </button>
            )}
          </div>

          {/* Evidence & comments indicators */}
          {(task._count.evidence > 0 || task._count.taskComments > 0) && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {task._count.evidence > 0 && (
                <span className="flex items-center gap-0.5">
                  <CheckCircle className="h-3 w-3" /> {task._count.evidence} evidence
                </span>
              )}
              {task._count.taskComments > 0 && (
                <span>{task._count.taskComments} comments</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== DRAG OVERLAY CARD ====================

function DragOverlayCard({ task }: { task: Task }) {
  const pConfig = priorityConfig[task.priority] || priorityConfig.medium

  return (
    <Card className="cursor-grabbing shadow-lg border-primary/30 rounded-lg w-72 bg-background/95 backdrop-blur-sm">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${pConfig.color}`}>
            {pConfig.label}
          </Badge>
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {task.assignee.name?.charAt(0).toUpperCase() || task.assignee.email.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{task.assignee.name || task.assignee.email}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== DROPPABLE COLUMN ====================

function DroppableColumn({
  column,
  tasks,
  navigate,
  updatingTaskId,
  onStatusChange,
}: {
  column: (typeof COLUMNS)[number]
  tasks: Task[]
  navigate: (page: Parameters<ReturnType<typeof useNavStore.getState>['navigate']>[0], params?: Record<string, string>) => void
  updatingTaskId: string | null
  onStatusChange: (taskId: string, newStatus: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.key}`,
    data: { type: 'column', status: column.key },
  })

  const Icon = column.icon

  return (
    <div className="w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={`h-4 w-4 ${column.color}`} />
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {tasks.length}
        </Badge>
      </div>

      {/* Column cards - droppable area */}
      <div
        ref={setNodeRef}
        className={`space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 rounded-lg transition-colors duration-200 min-h-[80px] p-1 ${
          isOver
            ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset'
            : ''
        }`}
      >
        {tasks.length === 0 ? (
          <div
            className={`border border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
              isOver ? 'border-primary/40 bg-primary/5' : ''
            }`}
          >
            <p className="text-xs text-muted-foreground">
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`relative ${updatingTaskId === task.id ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <DraggableTaskCard
                task={task}
                onClick={() => navigate('task-detail', { id: task.id })}
                onStatusChange={onStatusChange}
              />
              {updatingTaskId === task.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ==================== COLUMN SKELETON ====================

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-lg" />
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
  const [priorityFilter, setPriorityFilter] = useState('all')

  // DnD state
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const tasksBeforeDrag = useRef<Task[] | null>(null)

  // Configure DnD sensors — 8px activation distance avoids accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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

  // Handle drag start — store snapshot for potential revert
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined
    if (task) {
      setActiveTask(task)
      tasksBeforeDrag.current = [...allTasks]
    }
  }, [allTasks])

  // Quick status change (for mobile and quick-action button)
  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setUpdatingTaskId(taskId)
    setAllTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update task status')
    } catch {
      setAllTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    } finally {
      setUpdatingTaskId(null)
    }
  }, [allTasks, userId])

  // Handle drag end — optimistic update with API call and revert on failure
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const draggedTask = active.data.current?.task as Task | undefined
    if (!draggedTask) return

    // Determine the target column status
    let targetStatus: string | null = null
    if (over.data.current?.type === 'column') {
      targetStatus = over.data.current.status as string
    } else if (over.data.current?.type === 'task') {
      // Dropped on another task card — use that task's column
      targetStatus = (over.data.current.task as Task).status
    }

    // Nothing to do if same column or no valid target
    if (!targetStatus || targetStatus === draggedTask.status) return

    // Optimistically move the task to the new column
    setUpdatingTaskId(draggedTask.id)
    setAllTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, status: targetStatus! } : t
      )
    )

    try {
      const res = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update task status')
    } catch {
      // Revert to pre-drag state on failure
      if (tasksBeforeDrag.current) {
        setAllTasks(tasksBeforeDrag.current)
      } else {
        setAllTasks((prev) =>
          prev.map((t) =>
            t.id === draggedTask.id ? { ...t, status: draggedTask.status } : t
          )
        )
      }
    } finally {
      setUpdatingTaskId(null)
      tasksBeforeDrag.current = null
    }
  }, [userId])

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max pb-4">
              {COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.key}
                  column={col}
                  tasks={columnsMap[col.key]}
                  navigate={navigate}
                  updatingTaskId={updatingTaskId}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeTask ? <DragOverlayCard task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
