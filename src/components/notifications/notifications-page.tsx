'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  ListTodo,
  Users,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  FileText,
  Bot,
  Loader2,
  Inbox,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: string | null
  createdAt: string
}

type FilterTab = 'all' | 'unread' | 'tasks' | 'deadlines' | 'team'

interface NotificationsPageProps {
  userId: string
}

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  task_assigned: { icon: ListTodo, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
  task_status: { icon: ListTodo, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  task_mention: { icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/20' },
  deadline_approaching: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  overdue: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20' },
  project_invitation: { icon: Users, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/20' },
  member_joined: { icon: Users, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/20' },
  member_removed: { icon: Users, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/20' },
  ai_feedback: { icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
  report_ready: { icon: FileText, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/20' },
  meeting: { icon: CalendarDays, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/20' },
  comment: { icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/20' },
}

const DEFAULT_TYPE_CONFIG = { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' }

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'deadlines', label: 'Deadlines' },
  { value: 'team', label: 'Team' },
]

const TYPE_FILTER_MAP: Record<string, FilterTab> = {
  task_assigned: 'tasks',
  task_status: 'tasks',
  task_mention: 'tasks',
  deadline_approaching: 'deadlines',
  overdue: 'deadlines',
  project_invitation: 'team',
  member_joined: 'team',
  member_removed: 'team',
}

export function NotificationsPage({ userId }: NotificationsPageProps) {
  const navigate = useNavStore((s) => s.navigate)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ userId })
      if (activeFilter === 'unread') params.set('unread', 'true')
      const res = await fetch(`/api/notifications?${params}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setNotifications(json.data || [])
        setUnreadCount(json.unreadCount || 0)
      }
    } catch {
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [userId, activeFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setMarkingAll(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds }),
      })
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch {
      // silent
    } finally {
      setMarkingAll(false)
    }
  }

  const handleMarkRead = async (notif: NotificationItem) => {
    if (notif.read) return
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notif.id] }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silent
    }
  }

  const handleNotificationClick = (notif: NotificationItem) => {
    handleMarkRead(notif)

    if (!notif.link) return

    // Parse link like /projects/abc123 or /tasks/def456
    const parts = notif.link.split('/').filter(Boolean)
    if (parts.length >= 2) {
      const resource = parts[0]
      const id = parts[1]
      if (resource === 'projects') {
        navigate('project-detail', { id })
      } else if (resource === 'tasks') {
        navigate('task-detail', { id })
      }
    }
  }

  // Client-side filter for tasks/deadlines/team when using 'all' or 'unread'
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all' || activeFilter === 'unread') return true
    return TYPE_FILTER_MAP[n.type] === activeFilter
  })

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="text-xs px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Stay updated on your projects</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              Mark All Read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={activeFilter === tab.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setActiveFilter(tab.value)}
            >
              {tab.label}
              {tab.value === 'unread' && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                {activeFilter === 'unread' ? (
                  <BellOff className="h-8 w-8 text-muted-foreground/40" />
                ) : (
                  <Inbox className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <h3 className="font-medium">
                {activeFilter === 'unread'
                  ? 'All caught up!'
                  : 'No notifications'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilter === 'unread'
                  ? "You've read all your notifications."
                  : activeFilter === 'tasks'
                    ? 'No task notifications yet.'
                    : activeFilter === 'deadlines'
                      ? 'No deadline notifications yet.'
                      : activeFilter === 'team'
                        ? 'No team notifications yet.'
                        : 'Notifications about your projects will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif) => {
              const config = TYPE_CONFIG[notif.type] || DEFAULT_TYPE_CONFIG
              const Icon = config.icon
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={
                    'w-full text-left rounded-lg border transition-colors ' +
                    (notif.read
                      ? 'border-transparent hover:bg-muted/50'
                      : 'border-primary/10 bg-primary/[0.02] hover:bg-primary/5')
                  }
                >
                  <div className="p-4 flex items-start gap-3">
                    <div
                      className={
                        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ' +
                        config.bg
                      }
                    >
                      <Icon className={('h-4 w-4 ' + config.color) as string} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={
                            'text-sm leading-tight ' +
                            (notif.read ? 'text-muted-foreground' : 'font-medium')
                          }
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Load More hint */}
            {filteredNotifications.length >= 50 && (
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing recent notifications. Older notifications are archived.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
