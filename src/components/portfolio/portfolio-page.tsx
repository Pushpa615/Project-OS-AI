'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Plus,
  Eye,
  Globe,
  Lock,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  Github,
  Link as LinkIcon,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface Project {
  id: string
  name: string
}

interface PortfolioItem {
  id: string
  projectId: string | null
  title: string
  description: string | null
  technologies: string
  contribution: string | null
  githubUrl: string | null
  liveUrl: string | null
  aiSummary: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// ==================== HELPERS ====================

function parseTechnologies(techStr: string): string[] {
  try {
    return JSON.parse(techStr)
  } catch {
    return techStr.split(',').map((t) => t.trim()).filter(Boolean)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ==================== TAG INPUT ====================

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')

  function addTag() {
    const tag = input.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={placeholder || 'Type and press Enter'}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          Add
        </Button>
      </div>
    </div>
  )
}

// ==================== COMPONENT ====================

export function PortfolioPage({ userId }: { userId: string }) {
  const navigate = useNavStore((s) => s.navigate)

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    projectId: '',
    title: '',
    description: '',
    technologies: [] as string[],
    contribution: '',
    githubUrl: '',
    liveUrl: '',
    isPublic: false,
  })

  // Detail view state
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  // Fetch portfolios and projects
  const fetchPortfolios = useCallback(async () => {
    try {
      const portRes = await fetch(`/api/portfolio?userId=${userId}`)
      const portJson = await portRes.json()
      if (portJson.data) {
        setPortfolios(Array.isArray(portJson.data) ? portJson.data : [portJson.data])
      }
    } catch {
      // silently fail on refresh
    }
  }, [userId])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [portRes, projRes] = await Promise.all([
          fetch(`/api/portfolio?userId=${userId}`),
          fetch(`/api/projects?userId=${userId}`),
        ])
        const portJson = await portRes.json()
        if (portJson.data) {
          setPortfolios(Array.isArray(portJson.data) ? portJson.data : [portJson.data])
        }
        const projJson = await projRes.json()
        if (projJson.data) {
          setProjects(projJson.data.map((p: Project) => ({ id: p.id, name: p.name })))
        }
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Create or Update portfolio
  async function handleSubmit() {
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const isEditing = !!editingId
      const method = isEditing ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        userId,
        projectId: form.projectId || null,
        title: form.title,
        description: form.description || null,
        technologies: JSON.stringify(form.technologies),
        contribution: form.contribution || null,
        githubUrl: form.githubUrl || null,
        liveUrl: form.liveUrl || null,
        isPublic: form.isPublic,
      }
      if (isEditing) {
        body.id = editingId
      }

      const res = await fetch('/api/portfolio', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setDialogOpen(false)
        resetForm()
        setEditingId(null)
        // Refresh portfolios
        await fetchPortfolios()
        // If we were editing and viewing the same item, update the selected portfolio
        if (isEditing && selectedPortfolio) {
          const updated = portfolios.find((p) => p.id === editingId)
          if (updated) {
            setSelectedPortfolio({
              ...updated,
              title: form.title,
              description: form.description || null,
              technologies: JSON.stringify(form.technologies),
              contribution: form.contribution || null,
              githubUrl: form.githubUrl || null,
              liveUrl: form.liveUrl || null,
              isPublic: form.isPublic,
            })
          }
        }
      }
    } catch {
      setError(editingId ? 'Failed to update portfolio' : 'Failed to create portfolio')
    } finally {
      setSaving(false)
    }
  }

  // Open edit dialog pre-populated with item data
  function handleEdit(item: PortfolioItem) {
    setEditingId(item.id)
    setForm({
      projectId: item.projectId || '',
      title: item.title,
      description: item.description || '',
      technologies: parseTechnologies(item.technologies),
      contribution: item.contribution || '',
      githubUrl: item.githubUrl || '',
      liveUrl: item.liveUrl || '',
      isPublic: item.isPublic,
    })
    setDialogOpen(true)
  }

  // Delete portfolio
  async function handleDelete() {
    if (!selectedPortfolio) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio?id=${selectedPortfolio.id}&userId=${userId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setDeleteDialogOpen(false)
        setSelectedPortfolio(null)
        await fetchPortfolios()
      }
    } catch {
      setError('Failed to delete portfolio')
    } finally {
      setDeleting(false)
    }
  }

  // Generate AI summary
  async function handleGenerateSummary() {
    if (!selectedPortfolio) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/portfolio/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: selectedPortfolio.id }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else if (json.data) {
        setSelectedPortfolio({ ...selectedPortfolio, aiSummary: json.data.aiSummary })
      }
    } catch {
      setError('Failed to generate AI summary')
    } finally {
      setGeneratingSummary(false)
    }
  }

  function resetForm() {
    setForm({
      projectId: '',
      title: '',
      description: '',
      technologies: [],
      contribution: '',
      githubUrl: '',
      liveUrl: '',
      isPublic: false,
    })
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      resetForm()
      setEditingId(null)
    }
  }

  // ==================== DETAIL VIEW ====================

  if (selectedPortfolio) {
    const techs = parseTechnologies(selectedPortfolio.technologies)
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <button
          onClick={() => setSelectedPortfolio(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Portfolio
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              {selectedPortfolio.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {selectedPortfolio.isPublic ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                  <Globe className="h-3 w-3 mr-1" /> Public
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" /> Private
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Updated {formatDate(selectedPortfolio.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPortfolio.githubUrl && (
              <a href={selectedPortfolio.githubUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Github className="h-3.5 w-3.5 mr-1.5" /> GitHub
                </Button>
              </a>
            )}
            {selectedPortfolio.liveUrl && (
              <a href={selectedPortfolio.liveUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Live Demo
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => handleEdit(selectedPortfolio)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        {techs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {techs.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {selectedPortfolio.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {selectedPortfolio.description}
              </p>
            </CardContent>
          </Card>
        )}

        {selectedPortfolio.contribution && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">My Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {selectedPortfolio.contribution}
              </p>
            </CardContent>
          </Card>
        )}

        {selectedPortfolio.aiSummary ? (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {selectedPortfolio.aiSummary}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generate an AI-powered summary for your portfolio</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="gap-1.5"
              >
                {generatingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Portfolio Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this portfolio item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Portfolio Item</DialogTitle>
              <DialogDescription>
                Update your portfolio entry details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-title">Title *</Label>
                <Input
                  id="port-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. E-Commerce Platform"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-desc">Description</Label>
                <Textarea
                  id="port-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <TagInput
                  value={form.technologies}
                  onChange={(v) => setForm({ ...form, technologies: v })}
                  placeholder="e.g. React, Node.js, PostgreSQL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-contribution">Contribution</Label>
                <Textarea
                  id="port-contribution"
                  value={form.contribution}
                  onChange={(e) => setForm({ ...form, contribution: e.target.value })}
                  placeholder="Describe your role and contributions..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port-github">GitHub URL</Label>
                  <Input
                    id="port-github"
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port-live">Live URL</Label>
                  <Input
                    id="port-live"
                    value={form.liveUrl}
                    onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Portfolio</Label>
                  <p className="text-xs text-muted-foreground">Make this entry visible to others</p>
                </div>
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(c) => setForm({ ...form, isPublic: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error display in detail view */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showcase your projects and achievements
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Portfolio Item' : 'Create Portfolio Entry'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update your portfolio entry details' : 'Add a project to your portfolio showcase'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-title">Title *</Label>
                <Input
                  id="port-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. E-Commerce Platform"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-desc">Description</Label>
                <Textarea
                  id="port-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <TagInput
                  value={form.technologies}
                  onChange={(v) => setForm({ ...form, technologies: v })}
                  placeholder="e.g. React, Node.js, PostgreSQL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port-contribution">Contribution</Label>
                <Textarea
                  id="port-contribution"
                  value={form.contribution}
                  onChange={(e) => setForm({ ...form, contribution: e.target.value })}
                  placeholder="Describe your role and contributions..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port-github">GitHub URL</Label>
                  <Input
                    id="port-github"
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port-live">Live URL</Label>
                  <Input
                    id="port-live"
                    value={form.liveUrl}
                    onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Portfolio</Label>
                  <p className="text-xs text-muted-foreground">Make this entry visible to others</p>
                </div>
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(c) => setForm({ ...form, isPublic: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : editingId ? (
                  <Pencil className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {editingId ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Portfolio Grid */}
      {portfolios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((item) => {
            const techs = parseTechnologies(item.technologies)
            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setSelectedPortfolio(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate pr-2">{item.title}</h3>
                    {item.isPublic ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0">
                        <Globe className="h-3 w-3 mr-1" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <Lock className="h-3 w-3 mr-1" /> Private
                      </Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  {techs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {techs.slice(0, 5).map((tech) => (
                        <Badge key={tech} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tech}
                        </Badge>
                      ))}
                      {techs.length > 5 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{techs.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}

                  {item.contribution && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      <span className="font-medium">Role:</span> {item.contribution}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                    <span className="text-xs text-primary flex items-center gap-1">
                      View <Eye className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="text-center p-8">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold mb-1">No Portfolio Entries</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first portfolio entry to showcase your work.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Portfolio
          </Button>
        </Card>
      )}
    </div>
  )
}
