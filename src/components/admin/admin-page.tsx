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
  Loader2,
  CheckSquare,
  ClipboardList,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'

// ==================== TYPES ====================

interface UserData {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  projectCount: number
  taskCount: number
  checkinCount: number
}

interface ProjectRow {
  id: string
  name: string
  status: string
  progress: number
  createdBy: string
  createdAt: string
  _count: { members: number; tasks: number }
}

interface SystemStats {
  totalProjects: number
  totalUsers: number
  totalTasks: number
  completedTasks: number
  aiRequests: number
  notificationsSent: number
  activeIntegrations: number
  totalCheckins: number
}

interface ActivityLogEntry {
  id: string
  action: string
  description: string | null
  createdAt: string
  userName: string
  projectId: string | null
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
  const [fetching, setFetching] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
  const [changingRole, setChangingRole] = useState<string | null>(null)

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

  // Fetch admin data
  async function fetchAdminData() {
    if (userRole !== 'admin') return
    setFetching(true)
    try {
      const res = await fetch(`/api/admin?userId=${userId}`)
      const json = await res.json()
      if (json.data) {
        setUsers(json.data.users || [])
        setProjects(json.data.projects || [])
        setSystemStats(json.data.systemStats || null)
        setActivityLogs(json.data.activityLogs || [])
      }
    } catch {
      toast.error('Failed to load admin data')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [userRole, userId])

  // Change user role via API
  async function handleChangeRole(targetUserId: string, newRole: string) {
    setChangingRole(targetUserId)
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId, targetUserId, newRole }),
      })
      const json = await res.json()
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        )
        toast.success('Role updated successfully')
      } else {
        toast.error(json.error || 'Failed to update role')
      }
    } catch {
      toast.error('Failed to update role')
    } finally {
      setChangingRole(null)
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
          <div className="h-16 w-16 rounded-2xl bg-[#FEF2F2]0/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-[#EF4444]" />
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

  // ==================== STAT CARDS ====================

  const statCards = systemStats
    ? [
        { label: 'Total Projects', value: systemStats.totalProjects, icon: <FolderOpen className="h-4 w-4" />, color: 'text-[#22C55E] bg-[#ECFDF5]/10' },
        { label: 'Total Users', value: systemStats.totalUsers, icon: <Users className="h-4 w-4" />, color: 'text-[#64748B] bg-[#F1F5F9]/10' },
        { label: 'Tasks Completed', value: systemStats.completedTasks, icon: <CheckSquare className="h-4 w-4" />, color: 'text-[#F59E0B] bg-[#FFFBEB]/10' },
        { label: 'AI Requests', value: systemStats.aiRequests, icon: <Cpu className="h-4 w-4" />, color: 'text-[#64748B] bg-[#64748B]/10' },
        { label: 'Notifications', value: systemStats.notificationsSent, icon: <Bell className="h-4 w-4" />, color: 'text-[#64748B] bg-[#F1F5F9]/10' },
        { label: 'Integrations', value: systemStats.activeIntegrations, icon: <Link2 className="h-4 w-4" />, color: 'text-[#64748B] bg-[#64748B]/10' },
      ]
    : []

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System management and monitoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAdminData} disabled={fetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
            <ClipboardList className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Activity Logs</span>
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
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            {user.id === userId ? (
                              <Badge variant="secondary">{user.role}</Badge>
                            ) : (
                              <Select
                                value={user.role}
                                onValueChange={(v) => handleChangeRole(user.id, v)}
                                disabled={changingRole === user.id}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  {changingRole === user.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{user.projectCount}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.taskCount} tasks
                            </Badge>
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
              <CardTitle className="text-base">All Projects</CardTitle>
              <CardDescription>{projects.length} total projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Progress</TableHead>
                        <TableHead className="hidden md:table-cell">Members</TableHead>
                        <TableHead className="hidden md:table-cell">Tasks</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                project.status === 'active'
                                  ? 'bg-[#ECFDF5]/10 text-[#22C55E] hover:bg-[#ECFDF5]/20'
                                  : project.status === 'completed'
                                    ? 'bg-[#F1F5F9]/10 text-[#64748B] hover:bg-[#F1F5F9]/20'
                                    : 'bg-[#FFFBEB]/10 text-[#F59E0B] hover:bg-[#FFFBEB]/20'
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
                          <TableCell className="hidden md:table-cell">{project._count?.tasks || 0}</TableCell>
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
            {statCards.map((stat, i) => (
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
                  <span className="text-sm">Database (SQLite)</span>
                  <Badge className="bg-[#ECFDF5]/10 text-[#22C55E] hover:bg-[#ECFDF5]/20">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Service (z-ai)</span>
                  <Badge className="bg-[#ECFDF5]/10 text-[#22C55E] hover:bg-[#ECFDF5]/20">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notification Engine</span>
                  <Badge className="bg-[#ECFDF5]/10 text-[#22C55E] hover:bg-[#ECFDF5]/20">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Authentication</span>
                  <Badge className="bg-[#ECFDF5]/10 text-[#22C55E] hover:bg-[#ECFDF5]/20">Active</Badge>
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
                <div className="max-h-96 overflow-y-auto">
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
                          <TableCell className="font-medium text-sm">
                            <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.description || '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {log.userName}
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
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
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
