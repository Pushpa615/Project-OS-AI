'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  Users,
  FolderOpen,
  Activity,
  Cpu,
  Bell,
  Link2,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

// ==================== TYPES ====================

interface ProjectData {
  id: string
  name: string
  status: string
  progress: number
  createdBy: string
  creatorName?: string
  _count: { members: number }
  createdAt: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  projectCount: number
}

interface SystemStat {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

interface ActivityLog {
  id: string
  action: string
  description: string | null
  createdAt: string
  userName?: string
}

// ==================== HELPERS ====================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ==================== COMPONENT ====================

export function AdminPage({ userId }: { userId: string }) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  // System stats (mock)
  const [systemStats, setSystemStats] = useState<SystemStat[]>([])

  // Fetch user role
  useEffect(() => {
    async function fetchRole() {
      try {
        const res = await fetch('/api/auth/session')
        const json = await res.json()
        setUserRole((json.user as Record<string, string>)?.role || 'member')
      } catch {
        setUserRole('member')
      } finally {
        setLoading(false)
      }
    }
    fetchRole()
  }, [])

  // Fetch data once role is confirmed
  useEffect(() => {
    if (userRole !== 'admin') return

    async function fetchData() {
      try {
        const [projRes, analyticsRes] = await Promise.all([
          fetch(`/api/projects?userId=${userId}`),
          fetch(`/api/analytics?userId=${userId}`),
        ])

        const projJson = await projRes.json()
        if (projJson.data) {
          setProjects(projJson.data)

          // Extract unique users from projects
          const userMap = new Map<string, UserInfo>()
          projJson.data.forEach((p: ProjectData & { members?: { userId: string; user?: { id: string; name: string; email: string; role: string; createdAt: string } }[] }) => {
            // Add creator
            if (!userMap.has(p.createdBy)) {
              userMap.set(p.createdBy, {
                id: p.createdBy,
                name: p.creatorName || 'Unknown',
                email: '',
                role: 'member',
                createdAt: p.createdAt,
                projectCount: 1,
              })
            } else {
              const u = userMap.get(p.createdBy)!
              u.projectCount++
            }

            // Add members
            if (p.members) {
              p.members.forEach((m) => {
                if (!userMap.has(m.userId)) {
                  userMap.set(m.userId, {
                    id: m.userId,
                    name: m.user?.name || 'Unknown',
                    email: m.user?.email || '',
                    role: 'member',
                    createdAt: m.user?.createdAt || p.createdAt,
                    projectCount: 1,
                  })
                } else {
                  const u = userMap.get(m.userId)!
                  u.projectCount++
                }
              })
            }
          })
          setUsers(Array.from(userMap.values()))
        }

        const analyticsJson = await analyticsRes.json()
        if (analyticsJson.data) {
          const d = analyticsJson.data
          const projectCount = projectsResJson.data?.length || 0
          const userCount = Array.from(userMap.values()).length || 1
          setSystemStats([
            { label: 'Total Projects', value: projectCount, icon: <FolderOpen className="h-4 w-4" />, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'Total Users', value: userCount, icon: <Users className="h-4 w-4" />, color: 'text-teal-500 bg-teal-500/10' },
            { label: 'Tasks Completed', value: d.taskStats?.completed || 0, icon: <Activity className="h-4 w-4" />, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'AI Requests', value: 0, icon: <Cpu className="h-4 w-4" />, color: 'text-violet-500 bg-violet-500/10' },
            { label: 'Notifications Sent', value: 0, icon: <Bell className="h-4 w-4" />, color: 'text-cyan-500 bg-cyan-500/10' },
            { label: 'Active Integrations', value: 0, icon: <Link2 className="h-4 w-4" />, color: 'text-pink-500 bg-pink-500/10' },
          ])
        }
      } catch {
        // ignore
      }
    }
    fetchData()
  }, [userRole, userId])

  // Change user role
  async function handleChangeRole(userIdToChange: string, newRole: string) {
    try {
      setUsers((prev) =>
        prev.map((u) => (u.id === userIdToChange ? { ...u, role: newRole } : u))
      )
    } catch {
      // In a real app, this would call an admin API
    }
  }

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  // ==================== ACCESS DENIED ====================

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You do not have permission to access the admin dashboard.
          </p>
          <p className="text-xs text-muted-foreground">
            Required role: <Badge variant="secondary">admin</Badge> — Your role:{' '}
            <Badge variant="secondary">{userRole}</Badge>
          </p>
        </Card>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System management and monitoring
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex flex-wrap gap-1">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Activity Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription>{users.length} registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Projects</TableHead>
                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {user.email || '—'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(v) => handleChangeRole(user.id, v)}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{user.projectCount}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-xs">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== PROJECTS TAB ==================== */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects</CardTitle>
              <CardDescription>{projects.length} total projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Creator</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Progress</TableHead>
                        <TableHead className="hidden md:table-cell">Members</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {project.creatorName || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                project.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                  : project.status === 'completed'
                                    ? 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20'
                                    : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                              }
                            >
                              {project.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Progress value={project.progress} className="w-20 h-1.5" />
                              <span className="text-xs text-muted-foreground">{Math.round(project.progress)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{project._count?.members || 0}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {formatDate(project.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No projects found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SYSTEM TAB ==================== */}
        <TabsContent value="system">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {systemStats.map((stat, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Service</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notification Service</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Integration Service</span>
                  <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">Limited</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ACTIVITY LOGS TAB ==================== */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>System-wide activity log</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="hidden sm:table-cell">User</TableHead>
                        <TableHead className="hidden md:table-cell">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-sm">{log.action}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.description || '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {log.userName || 'System'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No activity logs yet. Activity will appear here as users interact with the system.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
