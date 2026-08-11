import { create } from "zustand"

type AppPage =
  | "auth"
  | "onboarding"
  | "dashboard"
  | "projects"
  | "project-detail"
  | "create-project"
  | "tasks"
  | "task-detail"
  | "team"
  | "calendar"
  | "checkin"
  | "ai-assistant"
  | "notifications"
  | "analytics"
  | "settings"
  | "integrations"
  | "admin"
  | "reports"
  | "portfolio"
  | "evidence"

interface NavState {
  page: AppPage
  params: Record<string, string>
  sidebarOpen: boolean
  navigate: (page: AppPage, params?: Record<string, string>) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useNavStore = create<NavState>((set) => ({
  page: "auth",
  params: {},
  sidebarOpen: true,
  navigate: (page, params = {}) => set({ page, params }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

export type { AppPage }
