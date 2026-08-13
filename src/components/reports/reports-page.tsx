'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Sparkles,
  Eye,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Lightbulb,
  User,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress: number
}

interface Report {
  id: string
  projectId: string
  summary: string | null
  strengths: string | null
  weaknesses: string | null
  challenges: string | null
  improvements: string | null
  recommendedSkills: string | null
  overallAssessment: string | null
  generatedAt: string
  [key: string]: unknown
}

interface AiFeedback {
  id: string
  userId: string
  userName?: string
  strength: string | null
  improvement: string | null
  nextSteps: string | null
}

// ==================== HELPERS ====================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function parseList(str: string | null): string[] {
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : [str]
  } catch {
    return str.split('\n').filter((s) => s.trim())
  }
}

// ==================== COMPONENT ====================

export function ReportsPage({ userId, projectId: initialProjectId }: { userId: string; projectId?: string }) {
  const navigate = useNavStore((s) => s.navigate)

  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [feedback, setFeedback] = useState<AiFeedback[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects
  async function fetchProjects() {
    try {
      const res = await fetch(`/api/projects?userId=${userId}`)
      const json = await res.json()
      if (json.data) setProjects(json.data)
    } catch {
      // ignore
    }
  }

  // Fetch reports
  async function fetchReports(projectId?: string) {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const url = `/api/reports?projectId=${projectId}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) {
        const data = Array.isArray(json.data) ? json.data : [json.data]
        setReports(data)
        if (data.length > 0) {
          setSelectedReport(data[0])
        }
      }
      if (json.feedback) {
        setFeedback(json.feedback.map((fb: { id: string; userId: string; strength: string | null; improvement: string | null; nextSteps: string | null; user?: { name?: string; email?: string } }) => ({
          id: fb.id,
          userId: fb.userId,
          userName: fb.user?.name || fb.user?.email,
          strength: fb.strength,
          improvement: fb.improvement,
          nextSteps: fb.nextSteps,
        })))
      }
    } catch {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [userId])

  useEffect(() => {
    fetchReports(initialProjectId)
  }, [userId, initialProjectId])

  // Generate report
  async function generateReport(projectId: string) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        fetchReports(projectId)
      }
    } catch {
      setError('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  // ==================== PROJECT LIST VIEW (no projectId) ====================

  if (!initialProjectId) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated project reports and assessments
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#FEF2F2]0/10 text-[#EF4444] dark:text-[#EF4444] text-sm">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <Card className="text-center p-8">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-semibold mb-1">No Projects Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a project first to generate reports.</p>
            <Button onClick={() => navigate('create-project')}>Create Project</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const projectReport = reports.find((r) => r.projectId === project.id)
              return (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.status.replace(/_/g, ' ')} · {Math.round(project.progress)}% complete
                        </p>
                      </div>
                      <Badge
                        className={
                          projectReport
                            ? 'bg-[#ECFDF5]0/10 text-[#22C55E] hover:bg-[#ECFDF5]0/20 shrink-0'
                            : 'bg-[#FFFBEB]0/10 text-[#F59E0B] hover:bg-[#FFFBEB]0/20 shrink-0'
                        }
                      >
                        {projectReport ? 'Report Ready' : 'No Report'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      {projectReport ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('reports', { projectId: project.id })}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Report
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => generateReport(project.id)}
                          disabled={generating}
                        >
                          {generating ? (
                            <>
                              <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Report
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ==================== PROJECT REPORT VIEW (with projectId) ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const report = reports[0]
  const project = projects.find((p) => p.id === initialProjectId)

  if (!report && !generating) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <button
          onClick={() => navigate('reports')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          ← Back to Reports
        </button>
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold mb-2">No Report Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate an AI-powered report for {project?.name || 'this project'}
          </p>
          <Button onClick={() => generateReport(initialProjectId!)}>
            <Sparkles className="h-4 w-4 mr-2" /> Generate Report
          </Button>
        </div>
      </div>
    )
  }

  if (generating && !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Generating Report</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI is analyzing your project data...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!report) return null

  const skills = parseList(report.recommendedSkills)
  const feedbackItems = feedback

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('reports')}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back to Reports
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {project?.name || 'Project'} Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated on {formatDate(report.generatedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => generateReport(initialProjectId!)} disabled={generating}>
          {generating ? (
            <>
              <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerate
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#FEF2F2]0/10 text-[#EF4444] dark:text-[#EF4444] text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      {report.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#22C55E]" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{report.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.strengths && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#22C55E]" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.strengths}</p>
            </CardContent>
          </Card>
        )}
        {report.weaknesses && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#F59E0B]" /> Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.weaknesses}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Challenges & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.challenges && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#EF4444]" /> Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.challenges}</p>
            </CardContent>
          </Card>
        )}
        {report.improvements && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-[#F59E0B]" /> Improvements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.improvements}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommended Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-[#64748B]" /> Recommended Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Assessment */}
      {report.overallAssessment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#22C55E]" /> Overall Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{report.overallAssessment}</p>
          </CardContent>
        </Card>
      )}

      {/* Individual Feedback */}
      {feedbackItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-[#64748B]" /> Individual Feedback
            </CardTitle>
            <CardDescription className="text-xs">Per-member assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedbackItems.map((fb) => (
                <div key={fb.id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(fb.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{fb.userName || 'Unknown User'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {fb.strength && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[#22C55E]">Strengths</p>
                        <p className="text-xs text-muted-foreground">{fb.strength}</p>
                      </div>
                    )}
                    {fb.improvement && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[#F59E0B]">Improvements</p>
                        <p className="text-xs text-muted-foreground">{fb.improvement}</p>
                      </div>
                    )}
                    {fb.nextSteps && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[#64748B]">Next Steps</p>
                        <p className="text-xs text-muted-foreground">{fb.nextSteps}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
