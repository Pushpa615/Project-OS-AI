'use client'

import { useState, useEffect } from 'react'
import {
  Link2,
  Unlink,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useNavStore } from '@/lib/nav-store'

// ==================== TYPES ====================

interface ConnectedAccount {
  id: string
  provider: string
  displayName: string | null
  url: string | null
  lastSyncedAt: string | null
  connectedAt: string
}

interface ProviderConfig {
  id: string
  name: string
  icon: string
  description: string
  color: string
}

// ==================== PROVIDERS ====================

const PROVIDERS: ProviderConfig[] = [
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Connect your GitHub repositories', color: 'bg-[#1E293B]' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Link your professional profile', color: 'bg-[#3B82F6]' },
  { id: 'figma', name: 'Figma', icon: '🎨', description: 'Connect your design files', color: 'bg-[#64748B]' },
  { id: 'vercel', name: 'Vercel', icon: '▲', description: 'Link your Vercel deployments', color: 'bg-[#1E293B]' },
  { id: 'netlify', name: 'Netlify', icon: '🌐', description: 'Connect Netlify sites', color: 'bg-[#F1F5F9]' },
  { id: 'render', name: 'Render', icon: '⚡', description: 'Link Render services', color: 'bg-[#22C55E]' },
  { id: 'railway', name: 'Railway', icon: '🚂', description: 'Connect Railway projects', color: 'bg-[#F1F5F9]' },
  { id: 'firebase', name: 'Firebase', icon: '🔥', description: 'Link Firebase projects', color: 'bg-[#FFFBEB]0' },
  { id: 'supabase', name: 'Supabase', icon: '⚡', description: 'Connect Supabase backend', color: 'bg-[#ECFDF5]0' },
  { id: 'mongodb', name: 'MongoDB Atlas', icon: '🍃', description: 'Link MongoDB clusters', color: 'bg-[#22C55E]' },
  { id: 'postman', name: 'Postman', icon: '📮', description: 'Connect Postman collections', color: 'bg-[#FFFBEB]0' },
  { id: 'canva', name: 'Canva', icon: '🖼️', description: 'Link Canva designs', color: 'bg-[#F1F5F9]' },
]

// ==================== HELPERS ====================

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ==================== COMPONENT ====================

export function IntegrationsPage({ userId }: { userId: string }) {
  const navigate = useNavStore((s) => s.navigate)

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null)
  const [connectUrl, setConnectUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Fetch connected accounts
  async function fetchAccounts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations?userId=${userId}`)
      const json = await res.json()
      if (json.data) {
        setAccounts(json.data)
      }
    } catch {
      setError('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [userId])

  function isConnected(providerId: string): ConnectedAccount | undefined {
    return accounts.find((a) => a.provider === providerId)
  }

  // Connect provider
  async function handleConnect() {
    if (!selectedProvider || !connectUrl.trim()) return
    setConnecting(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: selectedProvider.id,
          url: connectUrl.trim(),
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setDialogOpen(false)
        setConnectUrl('')
        fetchAccounts()
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  // Disconnect provider
  async function handleDisconnect(accountId: string, providerName: string) {
    try {
      const res = await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, userId }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        fetchAccounts()
      }
    } catch {
      setError(`Failed to disconnect ${providerName}`)
    }
  }

  // Open connect dialog
  function openConnectDialog(provider: ProviderConfig) {
    setSelectedProvider(provider)
    const existing = isConnected(provider.id)
    setConnectUrl(existing?.url || '')
    setDialogOpen(true)
    setError(null)
  }

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
            <Link2 className="h-6 w-6 text-primary" />
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your developer tools and accounts
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {accounts.length} of {PROVIDERS.length} connected
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FEF2F2]0/10 text-[#EF4444] dark:text-[#EF4444] text-sm">
          {error}
        </div>
      )}

      {/* Provider Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.id)
          return (
            <Card key={provider.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                      {provider.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  {connected ? (
                    <Badge className="bg-[#ECFDF5]0/10 text-[#22C55E] hover:bg-[#ECFDF5]0/20 shrink-0">
                      <CheckCircle className="h-3 w-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      <XCircle className="h-3 w-3 mr-1" /> Not Connected
                    </Badge>
                  )}
                </div>

                {connected && connected.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Last synced: {formatTime(connected.lastSyncedAt)}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#EF4444]"
                      onClick={() => handleDisconnect(connected.id, provider.name)}
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => openConnectDialog(provider)}>
                      <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect
                    </Button>
                  )}

                  {connected && connected.url && (
                    <a
                      href={connected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedProvider?.icon}</span>
              Connect {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your {selectedProvider?.name} profile or project URL to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="connectUrl">Profile or Project URL</Label>
              <Input
                id="connectUrl"
                value={connectUrl}
                onChange={(e) => setConnectUrl(e.target.value)}
                placeholder={`https://${selectedProvider?.id.toLowerCase()}.com/your-username`}
              />
              <p className="text-xs text-muted-foreground">
                This is a demo integration — we store your public URL for reference.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={connecting || !connectUrl.trim()}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
