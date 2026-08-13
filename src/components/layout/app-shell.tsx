'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useNavStore, type AppPage } from '@/lib/nav-store'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useRealtimeNotifications } from '@/lib/realtime-notifications'
import { X, Heart } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  CheckSquare,
  Users,
  Calendar,
  MessageSquare,
  Bot,
  Bell,
  BarChart3,
  Settings,
  Plug,
  Shield,
  FileText,
  Briefcase,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react'

interface AppUser {
  id: string
  email: string
  name: string
  role: string
}

interface NavItem {
  page: AppPage
  label: string
  icon: React.ElementType
}

const mainNav: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'projects', label: 'Projects', icon: FolderKanban },
  { page: 'tasks', label: 'Tasks', icon: CheckSquare },
  { page: 'team', label: 'Team', icon: Users },
  { page: 'calendar', label: 'Calendar', icon: Calendar },
]

const aiNav: NavItem[] = [
  { page: 'checkin', label: 'Daily Check-in', icon: MessageSquare },
  { page: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { page: 'evidence', label: 'Evidence Hub', icon: ShieldCheck },
]

const insightsNav: NavItem[] = [
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'reports', label: 'Reports', icon: FileText },
  { page: 'portfolio', label: 'Portfolio', icon: Briefcase },
]

const bottomNav: NavItem[] = [
  { page: 'settings', label: 'Settings', icon: Settings },
  { page: 'integrations', label: 'Integrations', icon: Plug },
]

function NavItemButton({
  item,
  collapsed,
  currentPage,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}) {
  const isActive = currentPage === item.page
  const Icon = item.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onNavigate(item.page)}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            isActive && 'bg-accent text-accent-foreground font-medium',
            collapsed && 'justify-center px-2'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
    </Tooltip>
  )
}

function NavSection({
  items,
  collapsed,
  currentPage,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <NavItemButton
          key={item.page}
          item={item}
          collapsed={collapsed}
          currentPage={currentPage}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

function SidebarContent({
  user,
  collapsed,
  onNavigate,
}: {
  user: AppUser
  collapsed: boolean
  onNavigate: (page: AppPage) => void
}) {
  const currentPage = useNavStore((s) => s.page)
  const { setTheme, theme } = useTheme()

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: '/' })
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-4 border-b',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm truncate">Project OS AI</h1>
            <p className="text-[10px] text-muted-foreground truncate">AI-Powered Management</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <div>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground mb-2 px-3">Main</p>}
            <NavSection items={mainNav} collapsed={collapsed} currentPage={currentPage} onNavigate={onNavigate} />
          </div>
          <div>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground mb-2 px-3">AI & Work</p>}
            <NavSection items={aiNav} collapsed={collapsed} currentPage={currentPage} onNavigate={onNavigate} />
          </div>
          <div>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground mb-2 px-3">Insights</p>}
            <NavSection items={insightsNav} collapsed={collapsed} currentPage={currentPage} onNavigate={onNavigate} />
          </div>
          {user.role === 'admin' && (
            <div>
              {!collapsed && <p className="text-xs font-medium text-muted-foreground mb-2 px-3">Admin</p>}
              <NavItemButton item={{ page: 'admin', label: 'Admin', icon: Shield }} collapsed={collapsed} currentPage={currentPage} onNavigate={onNavigate} />
            </div>
          )}
          <div>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground mb-2 px-3">Account</p>}
            <NavSection items={bottomNav} collapsed={collapsed} currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-3 space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</TooltipContent>}
        </Tooltip>
        <Separator />
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSignOut}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-destructive/10 hover:text-destructive',
                collapsed && 'justify-center px-2'
              )}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  )
}

export function AppShell({
  user,
  children,
}: {
  user: AppUser
  children: React.ReactNode
}) {
  const navigate = useNavStore((s) => s.navigate)
  const sidebarOpen = useNavStore((s) => s.sidebarOpen)
  const toggleSidebar = useNavStore((s) => s.toggleSidebar)
  const setSidebarOpen = useNavStore((s) => s.setSidebarOpen)
  const [notifCount, setNotifCount] = useState(0)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  const handleNewNotification = useCallback((notification: { title: string; message: string }) => {
    setNotifCount((c) => c + 1)
    setToast({ title: notification.title, message: notification.message })
  }, [])

  useRealtimeNotifications(user.id, handleNewNotification)

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}&unread=true`)
        const data = await res.json()
        setNotifCount(data.data?.length || 0)
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [user.id])

  const handleNavigate = useCallback(
    (page: AppPage) => {
      navigate(page)
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    },
    [navigate, setSidebarOpen]
  )

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-[70px]'
        )}
      >
        <SidebarContent user={user} collapsed={!sidebarOpen} onNavigate={handleNavigate} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center gap-3 px-4 sticky top-0 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent user={user} collapsed={false} onNavigate={handleNavigate} />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex gap-1.5"
            onClick={() => navigate('create-project')}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Project
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => handleNavigate('notifications')}
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate('settings')}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            Built with <Heart className="h-3 w-3 text-destructive/60 fill-destructive/60" /> by Project OS AI
          </span>
          <span className="hidden sm:inline">v1.0.0</span>
        </footer>

        {/* Real-time notification toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in-0 duration-300">
            <div className="bg-card border shadow-lg rounded-xl p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{toast.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
