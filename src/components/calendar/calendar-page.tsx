'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Target,
  Clock,
  AlertTriangle,
  Users,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from 'date-fns'

type EventType = 'milestone' | 'task' | 'meeting'

interface CalendarEvent {
  id: string
  type: EventType
  title: string
  description?: string | null
  startDate: string | null
  endDate: string | null
  allDay: boolean
  color: string
  status?: string
  priority?: string
  assignee?: { id: string; name: string; avatar?: string | null } | null
  milestone?: { id: string; title: string } | null
}

interface CalendarPageProps {
  userId: string
  projectId?: string
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPE_ICONS: Record<EventType, typeof Target> = {
  milestone: Target,
  task: Clock,
  meeting: Users,
}

const TYPE_COLORS: Record<EventType, string> = {
  milestone: 'bg-emerald-500',
  task: 'bg-amber-500',
  meeting: 'bg-violet-500',
}

export function CalendarPage({ userId, projectId }: CalendarPageProps) {
  const navigate = useNavStore((s) => s.navigate)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar?projectId=${projectId}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setEvents(json.data || [])
      }
    } catch {
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const getEventsForDay = useCallback(
    (day: Date) => {
      return events.filter((e) => {
        const eventDate = e.startDate || e.endDate
        if (!eventDate) return false
        try {
          const d = parseISO(eventDate)
          return isSameDay(d, day)
        } catch {
          return false
        }
      })
    },
    [events]
  )

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return []
    return getEventsForDay(selectedDate)
  }, [selectedDate, getEventsForDay])

  const getEventDisplayColor = useCallback((event: CalendarEvent) => {
    if (event.color === '#ef4444' || event.color === '#dc2626') return 'bg-red-500'
    if (event.color === '#22c55e') return 'bg-emerald-500'
    if (event.color === '#f59e0b' || event.color === '#ca8a04' || event.color === '#ea580c')
      return 'bg-amber-500'
    if (event.color === '#6366f1' || event.color === '#8b5cf6') return 'bg-violet-500'
    return 'bg-gray-500'
  }, [])

  const getEventBorderClass = useCallback((event: CalendarEvent) => {
    const color = getEventDisplayColor(event)
    return color.replace('bg-', 'border-')
  }, [getEventDisplayColor])

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (event.type === 'task') {
        navigate('task-detail', { id: event.id })
      } else if (event.type === 'milestone' && projectId) {
        navigate('project-detail', { id: projectId })
      }
    },
    [navigate, projectId]
  )

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1))
  const goToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  const isOverdue = (event: CalendarEvent) => {
    if (event.status === 'overdue') return true
    if (event.type === 'task' && event.endDate) {
      try {
        return isBefore(parseISO(event.endDate), startOfDay(new Date()))
      } catch {
        return false
      }
    }
    return false
  }

  // No project selected
  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">No Project Selected</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a project to view its calendar.
            </p>
          </div>
          <Button onClick={() => navigate('projects')}>View Projects</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
              <p className="text-sm text-muted-foreground">Project timeline and events</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

        {/* Month Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, row) => (
                  <div key={row} className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, col) => (
                      <Skeleton key={col} className="h-20 w-full rounded" />
                    ))}
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchEvents}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="h-9 flex items-center justify-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    const dayEvents = getEventsForDay(day)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                    const today = isToday(day)

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        className={
                          'relative min-h-[72px] sm:min-h-[84px] p-1.5 rounded-lg text-left transition-colors border ' +
                          (isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-transparent hover:bg-muted/50')
                        }
                      >
                        <span
                          className={
                            'text-sm font-medium inline-flex h-7 w-7 items-center justify-center rounded-full ' +
                            (today
                              ? 'bg-primary text-primary-foreground'
                              : isCurrentMonth
                                ? 'text-foreground'
                                : 'text-muted-foreground/50')
                          }
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Event dots */}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={
                                'h-1.5 rounded-full ' + getEventDisplayColor(event)
                              }
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        {selectedDate && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <Badge variant="secondary">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No events on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => {
                    const Icon = TYPE_ICONS[event.type]
                    const overdue = isOverdue(event)
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={
                          'w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ' +
                          getEventBorderClass(event) + '/30'
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ' +
                              (overdue ? 'bg-red-100 dark:bg-red-900/20' : 'bg-muted')
                            }
                          >
                            <Icon
                              className={
                                'h-4 w-4 ' +
                                (overdue
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-muted-foreground')
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {event.title}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  'text-[10px] px-1.5 py-0 ' +
                                  (event.type === 'milestone'
                                    ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                    : event.type === 'meeting'
                                      ? 'border-violet-500/50 text-violet-600 dark:text-violet-400'
                                      : overdue
                                        ? 'border-red-500/50 text-red-600 dark:text-red-400'
                                        : 'border-amber-500/50 text-amber-600 dark:text-amber-400')
                                }
                              >
                                {event.type === 'milestone'
                                  ? 'Milestone'
                                  : event.type === 'meeting'
                                    ? 'Meeting'
                                    : overdue
                                      ? 'Overdue'
                                      : 'Deadline'}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {event.description}
                              </p>
                            )}
                            {event.assignee && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to {event.assignee.name}
                              </p>
                            )}
                            {event.milestone && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Milestone: {event.milestone.title}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>Milestones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Task Deadlines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              <span>Meetings</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
