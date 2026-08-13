'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ClipboardCheck,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Loader2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'

interface Checkin {
  id: string
  userId: string
  projectId: string | null
  date: string
  completed: string
  workingOn: string
  blocked: boolean
  blockReason: string
  remains: string
  needHelp: string
  aiFeedback: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

interface CheckinPageProps {
  userId: string
  projectId?: string
}

export function CheckinPage({ userId, projectId }: CheckinPageProps) {
  const navigate = useNavStore((s) => s.navigate)
  const today = format(new Date(), 'yyyy-MM-dd')

  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [completed, setCompleted] = useState('')
  const [workingOn, setWorkingOn] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [remains, setRemains] = useState('')
  const [needHelp, setNeedHelp] = useState('')

  // Expand state for recent checkins
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetchCheckins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/checkins?userId=${userId}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setCheckins(json.data || [])
      }
    } catch {
      setError('Failed to load check-ins')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchCheckins()
  }, [fetchCheckins])

  const todayCheckin = checkins.find((c) => c.date === today)
  const hasCheckedInToday = !!todayCheckin

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch('/api/checkins', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId: projectId || undefined,
          date: isEditing && todayCheckin ? todayCheckin.date : today,
          completed,
          workingOn,
          blocked,
          blockReason: blocked ? blockReason : '',
          remains,
          needHelp,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setSubmitError(json.error)
      } else {
        // Reset form
        setCompleted('')
        setWorkingOn('')
        setBlocked(false)
        setBlockReason('')
        setRemains('')
        setNeedHelp('')
        setIsEditing(false)
        // Refresh
        fetchCheckins()
      }
    } catch {
      setSubmitError(isEditing ? 'Failed to update check-in' : 'Failed to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCheckinDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr)
      if (isToday(d)) return 'Today'
      return format(d, 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Check-in</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Today's Check-in */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {hasCheckedInToday ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    Checked in today
                  </>
                ) : (
                  'Check in for today'
                )}
              </CardTitle>
              <Badge variant={hasCheckedInToday ? 'default' : 'outline'}>
                {hasCheckedInToday ? 'Done' : 'Pending'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hasCheckedInToday && todayCheckin && !isEditing ? (
              /* Show today's check-in with AI feedback */
              <div className="space-y-4">
                <CheckinContent checkin={todayCheckin} expanded />

                {todayCheckin.aiFeedback && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Feedback</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {todayCheckin.aiFeedback}
                    </p>
                  </div>
                )}

                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCompleted(todayCheckin.completed || '')
                    setWorkingOn(todayCheckin.workingOn || '')
                    setBlocked(todayCheckin.blocked)
                    setBlockReason(todayCheckin.blockReason || '')
                    setRemains(todayCheckin.remains || '')
                    setNeedHelp(todayCheckin.needHelp || '')
                    setIsEditing(true)
                  }}
                >
                  Update Today's Check-in
                </Button>
              </div>
            ) : (
              /* Check-in form */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">What did you complete today?</label>
                  <Textarea
                    placeholder="List tasks, features, or accomplishments..."
                    value={completed}
                    onChange={(e) => setCompleted(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What are you currently working on?
                  </label>
                  <Textarea
                    placeholder="Describe what you're working on now..."
                    value={workingOn}
                    onChange={(e) => setWorkingOn(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="blocked"
                      checked={blocked}
                      onCheckedChange={(checked) => setBlocked(!!checked)}
                    />
                    <label
                      htmlFor="blocked"
                      className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                      Are you blocked?
                    </label>
                  </div>
                  {blocked && (
                    <div className="space-y-2 ml-7">
                      <label className="text-sm text-muted-foreground">Reason for block</label>
                      <Textarea
                        placeholder="What's blocking you?"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">What remains?</label>
                  <Textarea
                    placeholder="What still needs to be done..."
                    value={remains}
                    onChange={(e) => setRemains(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Do you need help?</label>
                  <Textarea
                    placeholder="Describe what you need help with..."
                    value={needHelp}
                    onChange={(e) => setNeedHelp(e.target.value)}
                    rows={2}
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {submitError}
                  </p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isEditing ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Check-in' : 'Submit Check-in'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Check-ins</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchCheckins}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : checkins.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No check-ins yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start by submitting your first daily check-in above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {checkins.map((checkin) => {
                const isExpanded = expandedIds.has(checkin.id) || checkin.date === today
                return (
                  <Card key={checkin.id}>
                    <button
                      className="w-full text-left"
                      onClick={() => toggleExpand(checkin.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={
                                'h-9 w-9 rounded-lg flex items-center justify-center ' +
                                (checkin.blocked
                                  ? 'bg-[#FFFBEB] dark:bg-[#F59E0B]/20'
                                  : 'bg-[#ECFDF5] dark:bg-[#22C55E]/20')
                              }
                            >
                              {checkin.blocked ? (
                                <AlertTriangle className="h-4 w-4 text-[#F59E0B] dark:text-[#F59E0B]" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-[#22C55E] dark:text-[#22C55E]" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {formatCheckinDate(checkin.date)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {checkin.completed
                                  ? checkin.completed.substring(0, 60) +
                                    (checkin.completed.length > 60 ? '...' : '')
                                  : 'No details'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {checkin.aiFeedback && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </button>
                    {isExpanded && <CheckinContent checkin={checkin} expanded />}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckinContent({
  checkin,
  expanded,
}: {
  checkin: Checkin
  expanded: boolean
}) {
  if (!expanded) return null

  return (
    <div className="px-4 pb-4 space-y-3">
      <Separator />
      {checkin.completed && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </p>
          <p className="text-sm whitespace-pre-wrap">{checkin.completed}</p>
        </div>
      )}
      {checkin.workingOn && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Working On</p>
          <p className="text-sm whitespace-pre-wrap">{checkin.workingOn}</p>
        </div>
      )}
      {checkin.blocked && checkin.blockReason && (
        <div>
          <p className="text-xs font-medium text-[#F59E0B] dark:text-[#F59E0B] mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Blocked
          </p>
          <p className="text-sm whitespace-pre-wrap">{checkin.blockReason}</p>
        </div>
      )}
      {checkin.remains && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">What Remains</p>
          <p className="text-sm whitespace-pre-wrap">{checkin.remains}</p>
        </div>
      )}
      {checkin.needHelp && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Needs Help
          </p>
          <p className="text-sm whitespace-pre-wrap">{checkin.needHelp}</p>
        </div>
      )}
      {checkin.aiFeedback && (
        <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">AI Feedback</span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {checkin.aiFeedback}
          </p>
        </div>
      )}
    </div>
  )
}
