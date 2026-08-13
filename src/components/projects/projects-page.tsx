'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  FolderOpen,
  Clock,
  Users,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface ProjectMember {
  userId: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress: number
  deadline: string | null
  projectType: string
  createdAt: string
  updatedAt: string
  _count: { tasks: number }
  members: ProjectMember[]
  milestones: { id: string; title: string; status: string; progress: number }[]
}

// ==================== HELPERS ====================

const statusColors: Record<string, string> = {
  active: 'bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/20',
  completed: 'bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20',
  on_hold: 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20',
  planning: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]',
}

const typeColors: Record<string, string> = {
  'Full Stack Web App': 'bg-[#F1F5F9] text-[#64748B]',
  'Mobile App': 'bg-[#F1F5F9] text-[#64748B]',
  'AI/ML Project': 'bg-[#FFFBEB] text-[#F59E0B]',
  'Hackathon Project': 'bg-[#FEF2F2] text-[#EF4444]',
  'College Project': 'bg-[#F1F5F9] text-[#64748B]',
  'Research Project': 'bg-[#ECFDF5] text-[#22C55E]',
  'Personal Project': 'bg-[#FFFBEB] text-[#F59E0B]',
  Other: 'bg-[#F1F5F9] text-[#475569]',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No deadline'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ==================== SKELETON LOADING ====================

function ProjectCardSkeleton() {
  return (
    <Card className="border rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full border-2 border-background" />
            ))}
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== PROJECT CARD ====================

function ProjectCard({ project, onView }: { project: Project; onView: () => void }) {
  const taskCount = project._count.tasks
  const memberCount = project.members.length

  return (
    <Card className="border rounded-xl hover:shadow-md transition-shadow group cursor-pointer" onClick={onView}>
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${typeColors[project.projectType] || 'bg-[#F1F5F9] text-[#475569]'}`}>
              {project.projectType}
            </Badge>
          </div>
          <Badge variant="outline" className={`text-[10px] px-2 py-0 shrink-0 ${statusColors[project.status] || ''}`}>
            {project.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(project.deadline)}</span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(project.progress)}%</span>
          </div>
          <Progress value={project.progress} className="h-1.5" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {taskCount} task{taskCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {memberCount}
            </span>
          </div>

          {/* Team avatars */}
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map((member) => (
              <Avatar key={member.userId} className="h-7 w-7 border-2 border-background">
                <AvatarImage src={member.user.avatar || ''} alt={member.user.name || ''} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {member.user.name?.charAt(0).toUpperCase() || member.user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {memberCount > 4 && (
              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                +{memberCount - 4}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== EMPTY STATE ====================

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No Projects Yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        Create your first project to start tracking tasks, milestones, and team collaboration.
      </p>
      <Button onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Project
      </Button>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function ProjectsPage({ userId }: { userId: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/projects?userId=${userId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch projects')
        setProjects(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [userId])

  // Filter and search
  const filteredProjects = useMemo(() => {
    let result = projects

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter)
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.projectType.toLowerCase().includes(q)
      )
    }

    return result
  }, [projects, search, filter])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage and track all your projects
              </p>
            </div>
            <Button onClick={() => navigate('create-project')} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          projects.length === 0 ? (
            <EmptyState onCreate={() => navigate('create-project')} />
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No projects match your search or filter.</p>
            </div>
          )
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => navigate('project-detail', { id: project.id })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
