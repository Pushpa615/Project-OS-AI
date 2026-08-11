'use client'

import { useEffect, useState, useCallback } from 'react'
import { useNavStore } from '@/lib/nav-store'
import { AuthPages } from '@/components/auth/auth-pages'
import { OnboardingPage } from '@/components/onboarding/onboarding-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { ProjectsPage } from '@/components/projects/projects-page'
import { CreateProjectPage } from '@/components/projects/create-project-page'
import { ProjectDetailPage } from '@/components/projects/project-detail-page'
import { TasksPage } from '@/components/tasks/tasks-page'
import { TaskDetailPage } from '@/components/tasks/task-detail-page'
import { TeamPage } from '@/components/team/team-page'
import { CalendarPage } from '@/components/calendar/calendar-page'
import { CheckinPage } from '@/components/checkin/checkin-page'
import { AIAssistantPage } from '@/components/ai-assistant/ai-assistant-page'
import { NotificationsPage } from '@/components/notifications/notifications-page'
import { AnalyticsPage } from '@/components/analytics/analytics-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { IntegrationsPage } from '@/components/settings/integrations-page'
import { AdminPage } from '@/components/admin/admin-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { PortfolioPage } from '@/components/portfolio/portfolio-page'
import { EvidencePage } from '@/components/evidence/evidence-page'
import { AppShell } from '@/components/layout/app-shell'

interface AppUser {
  id: string
  email: string
  name: string
  role: string
}

const authPages = new Set(['auth'])
const onboardPages = new Set(['onboarding'])

export default function Home() {
  const page = useNavStore((s) => s.page)
  const params = useNavStore((s) => s.params)
  const navigate = useNavStore((s) => s.navigate)
  const [user, setUser] = useState<AppUser | null>(null)
  const [onboarded, setOnboarded] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        if (session?.user && session.user.id) {
          const userData: AppUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || '',
            role: (session.user as Record<string, string>).role || 'member',
          }
          setUser(userData)
          // Check onboarding status
          try {
            const profileRes = await fetch(`/api/onboarding?userId=${userData.id}`)
            const profileData = await profileRes.json()
            if (profileData.data?.onboarded) {
              setOnboarded(true)
              navigate('dashboard')
            } else {
              navigate('onboarding')
            }
          } catch {
            navigate('onboarding')
          }
        }
      } catch {
        navigate('auth')
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [navigate])

  const handleAuthSuccess = useCallback(
    (userData: AppUser) => {
      setUser(userData)
      navigate('onboarding')
    },
    [navigate]
  )

  const handleOnboardingComplete = useCallback(() => {
    setOnboarded(true)
    navigate('dashboard')
  }, [navigate])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Project OS AI...</p>
        </div>
      </div>
    )
  }

  if (authPages.has(page) || !user) {
    return <AuthPages onAuthSuccess={handleAuthSuccess} />
  }

  if (onboardPages.has(page) && !onboarded) {
    return <OnboardingPage userId={user.id} onComplete={handleOnboardingComplete} />
  }

  // Render page content
  function renderPage() {
    switch (page) {
      case 'dashboard': return <DashboardPage user={user} />
      case 'projects': return <ProjectsPage userId={user.id} />
      case 'create-project': return <CreateProjectPage userId={user.id} />
      case 'project-detail': return params.id ? <ProjectDetailPage projectId={params.id} userId={user.id} /> : <ProjectsPage userId={user.id} />
      case 'tasks': return <TasksPage userId={user.id} projectId={params.projectId} />
      case 'task-detail': return params.id ? <TaskDetailPage taskId={params.id} userId={user.id} /> : <TasksPage userId={user.id} />
      case 'team': return <TeamPage userId={user.id} projectId={params.projectId} />
      case 'calendar': return <CalendarPage userId={user.id} projectId={params.projectId} />
      case 'checkin': return <CheckinPage userId={user.id} projectId={params.projectId} />
      case 'ai-assistant': return <AIAssistantPage userId={user.id} projectId={params.projectId} taskId={params.taskId} />
      case 'notifications': return <NotificationsPage userId={user.id} />
      case 'analytics': return <AnalyticsPage userId={user.id} projectId={params.projectId} />
      case 'settings': return <SettingsPage userId={user.id} />
      case 'integrations': return <IntegrationsPage userId={user.id} />
      case 'admin': return <AdminPage userId={user.id} />
      case 'reports': return <ReportsPage userId={user.id} projectId={params.projectId} />
      case 'portfolio': return <PortfolioPage userId={user.id} />
      case 'evidence': return <EvidencePage userId={user.id} taskId={params.taskId} projectId={params.projectId} />
      default: return <DashboardPage user={user} />
    }
  }

  return <AppShell user={user}>{renderPage()}</AppShell>
}
