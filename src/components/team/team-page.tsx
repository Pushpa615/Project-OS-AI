'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Users,
  CheckCircle,
  AlertCircle,
  Trophy,
  Target,
  Loader2,
  UserPlus,
  Mail,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useNavStore } from '@/lib/nav-store'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ==================== TYPES ====================

interface MemberData {
  userId: string
  name: string
  role: string
  avatar: string | null
  email?: string
  joinedAt?: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  contributionScore: number
  totalHours?: number
  estimatedHours?: number
  checkinCount?: number
}

interface TeamAnalytics {
  teamStats: MemberData[]
  taskStats: {
    total: number
    notStarted: number
    inProgress: number
    submitted: number
    underReview: number
    verifiedCompleted: number
    overdue: number
  }
}

// ==================== HELPERS ====================

const roleColors: Record<string, string> = {
  leader: 'bg-primary/10 text-primary border-primary/20',
  member: 'bg-slate-100 text-slate-600 border-slate-200',
  reviewer: 'bg-amber-100 text-amber-700 border-amber-200',
}

const BAR_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#ec4899', '#6366f1']

function getInitials(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase()
  return email.charAt(0).toUpperCase()
}

// ==================== MEMBER CARD SKELETON ====================

function MemberCardSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

export function TeamPage({ userId, projectId }: { userId: string; projectId?: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [members, setMembers] = useState<MemberData[]>([])
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const promises: Promise<void>[] = []

        // Fetch analytics for project
        if (projectId) {
          promises.push(
            fetch(`/api/analytics?projectId=${projectId}`)
              .then((res) => res.json())
              .then((json) => {
                if (json.data) {
                  setAnalytics(json.data)
                  setMembers(json.data.teamStats || [])
                }
              })
              .catch(() => {})
          )
        }

        // Fetch members list
        if (projectId) {
          promises.push(
            fetch(`/api/projects/${projectId}/members`)
              .then((res) => res.json())
              .then((json) => {
                if (json.data && !analytics) {
                  // If analytics didn't load, fall back to members
                  const m = (json.data || []).map((d: { user: { id: string; name: string | null; email: string; avatar: string | null }; role: string; joinedAt: string }) => ({
                    userId: d.user.id,
                    name: d.user.name || d.user.email,
                    role: d.role,
                    avatar: d.user.avatar,
                    email: d.user.email,
                    joinedAt: d.joinedAt,
                    totalTasks: 0,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    overdueTasks: 0,
                    contributionScore: 0,
                  }))
                  if (members.length === 0) setMembers(m)
                }
              })
              .catch(() => {})
          )
        }

        await Promise.all(promises)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  async function handleAddMember() {
    if (!projectId || !memberEmail.trim()) return
    try {
      setAddingMember(true)
      setMemberError(null)
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberEmail.trim(), role: 'member' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add member')
      setMemberEmail('')
      // Re-fetch
      const [analyticsRes, membersRes] = await Promise.all([
        fetch(`/api/analytics?projectId=${projectId}`).then((r) => r.json()),
        fetch(`/api/projects/${projectId}/members`).then((r) => r.json()),
      ])
      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data)
        setMembers(analyticsRes.data.teamStats || [])
      }
      if (membersRes.data && members.length === 0) {
        setMembers(membersRes.data.map((d: any) => ({
          userId: d.user.id,
          name: d.user.name || d.user.email,
          role: d.role,
          avatar: d.user.avatar,
          email: d.user.email,
          joinedAt: d.joinedAt,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          contributionScore: 0,
        })))
      }
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  // Bar chart data for contribution analysis
  const chartData = members.map((m) => ({
    name: m.name.split(' ')[0],
    completed: m.completedTasks,
    total: m.totalTasks,
    inProgress: m.inProgressTasks,
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Team</h1>
              <p className="text-xs text-muted-foreground">
                {projectId ? 'Project team members' : 'All team members across projects'}
              </p>
            </div>
          </div>
          {projectId && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Add member (project context) */}
        {projectId && (
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter member email or user ID"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value)
                    setMemberError(null)
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember() }}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleAddMember} disabled={addingMember || !memberEmail.trim()} className="gap-1.5 shrink-0">
                {addingMember ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add Member
              </Button>
            </CardContent>
            {memberError && (
              <div className="px-4 pb-3">
                <p className="text-xs text-destructive">{memberError}</p>
              </div>
            )}
          </Card>
        )}

        {/* Team stats summary */}
        {!loading && members.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Members', value: members.length, icon: Users, color: 'text-muted-foreground' },
              {
                label: 'Tasks Assigned',
                value: members.reduce((sum, m) => sum + m.totalTasks, 0),
                icon: Target,
                color: 'text-amber-600',
              },
              {
                label: 'Tasks Completed',
                value: members.reduce((sum, m) => sum + m.completedTasks, 0),
                icon: CheckCircle,
                color: 'text-emerald-600',
              },
              {
                label: 'Avg Contribution',
                value:
                  members.length > 0
                    ? Math.round(members.reduce((sum, m) => sum + m.contributionScore, 0) / members.length)
                    : 0,
                icon: Trophy,
                color: 'text-primary',
              },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold">
                        {stat.label === 'Avg Contribution' ? `${stat.value}%` : stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Contribution Analysis Chart */}
        {!loading && projectId && members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution Analysis</CardTitle>
              <CardDescription>Task completion by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <MemberCardSkeleton key={i} />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">No Team Members</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {projectId
                ? 'Add team members to collaborate on this project.'
                : 'Join a project to see team members here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member, idx) => (
              <Card key={member.userId} className="rounded-xl">
                <CardContent className="p-5">
                  {/* Member header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={member.avatar || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(member.name || null, member.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">{member.name}</h3>
                        {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 capitalize ${roleColors[member.role] || roleColors.member}`}
                      >
                        {member.role}
                      </Badge>
                      {member.joinedAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Tasks</p>
                      <p className="text-sm font-bold">{member.totalTasks}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Done</p>
                      <p className="text-sm font-bold text-emerald-700">{member.completedTasks}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">In Progress</p>
                      <p className="text-sm font-bold text-amber-700">{member.inProgressTasks}</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Contribution</p>
                      <p className="text-sm font-bold text-primary">{member.contributionScore}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {member.totalTasks > 0 && (
                    <div className="mt-3">
                      <Progress value={(member.completedTasks / member.totalTasks) * 100} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
