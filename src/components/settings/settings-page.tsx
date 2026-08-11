'use client'

import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Eye,
  Palette,
  Save,
  Loader2,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTheme } from 'next-themes'

// ==================== TYPES ====================

interface ProfileData {
  fullName: string
  email: string
  college: string
  course: string
  academicYear: string
  phone: string
  bio: string
  skills: string[]
}

interface NotifPrefs {
  emailNotifs: boolean
  smsNotifs: boolean
  pushNotifs: boolean
  inAppNotifs: boolean
  reminderDays: number[]
  reminderHours: number[]
}

// ==================== COMPONENT ====================

export function SettingsPage({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const { theme, setTheme } = useTheme()

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    email: '',
    college: '',
    course: '',
    academicYear: '',
    phone: '',
    bio: '',
    skills: [],
  })

  // Notification prefs state
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    emailNotifs: true,
    smsNotifs: false,
    pushNotifs: true,
    inAppNotifs: true,
    reminderDays: [7, 3, 1],
    reminderHours: [6, 1],
  })

  // Privacy state
  const [publicPortfolio, setPublicPortfolio] = useState(false)
  const [dataSharing, setDataSharing] = useState({ analytics: true, ai: true, team: true })

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch profile and notification prefs
  useEffect(() => {
    async function fetchData() {
      try {
        const profileRes = await fetch(`/api/onboarding?userId=${userId}`)
        const profileJson = await profileRes.json()
        if (profileJson.data) {
          const d = profileJson.data
          setProfile({
            fullName: d.fullName || d.name || '',
            email: d.email || userEmail || '',
            college: d.college || '',
            course: d.course || '',
            academicYear: d.academicYear || '',
            phone: d.phone || '',
            bio: d.bio || '',
            skills: d.skills || [],
          })
          // Load notification preferences if returned by the API
          if (d.notificationPrefs) {
            const p = d.notificationPrefs
            setNotifPrefs({
              emailNotifs: p.emailNotifs ?? true,
              smsNotifs: p.smsNotifs ?? false,
              pushNotifs: p.pushNotifs ?? true,
              inAppNotifs: p.inAppNotifs ?? true,
              reminderDays: safeJSONParse(p.reminderDays, [7, 3, 1]),
              reminderHours: safeJSONParse(p.reminderHours, [6, 1]),
            })
          }
        }
      } catch {
        // ignore — use defaults
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId, userEmail])

  function safeJSONParse(val: unknown, fallback: number[]): number[] {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val)
        return Array.isArray(parsed) ? parsed : fallback
      } catch {
        return fallback
      }
    }
    return fallback
  }

  function clearMessages() {
    setError(null)
    setSuccess(null)
  }

  // Save profile
  async function saveProfile() {
    clearMessages()
    setSaving('profile')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fullName: profile.fullName,
          college: profile.college,
          course: profile.course,
          academicYear: profile.academicYear,
          phone: profile.phone,
          bio: profile.bio,
          skills: profile.skills,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setSuccess('Profile updated successfully')
      }
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(null)
    }
  }

  // Save notifications
  async function saveNotifications() {
    clearMessages()
    setSaving('notifications')
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences: {
            emailNotifs: notifPrefs.emailNotifs,
            smsNotifs: notifPrefs.smsNotifs,
            pushNotifs: notifPrefs.pushNotifs,
            inAppNotifs: notifPrefs.inAppNotifs,
            reminderDays: JSON.stringify(notifPrefs.reminderDays),
            reminderHours: JSON.stringify(notifPrefs.reminderHours),
          },
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setSuccess('Notification preferences saved')
      }
    } catch {
      setError('Failed to save preferences')
    } finally {
      setSaving(null)
    }
  }

  // Change password
  async function changePassword() {
    clearMessages()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setSaving('security')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setSuccess('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Failed to change password')
    } finally {
      setSaving(null)
    }
  }

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-96" />
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Success / Error Messages */}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Save className="h-4 w-4" /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== PROFILE TAB ==================== */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    readOnly
                    className="bg-muted opacity-70"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <Input
                    id="college"
                    value={profile.college}
                    onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                    placeholder="Your college/university"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    value={profile.course}
                    onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                    placeholder="Your course of study"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Select
                    value={profile.academicYear}
                    onValueChange={(v) => setProfile({ ...profile, academicYear: v })}
                  >
                    <SelectTrigger id="academicYear">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Your phone number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving === 'profile'}>
                  {saving === 'profile' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== NOTIFICATIONS TAB ==================== */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifPrefs.emailNotifs}
                    onCheckedChange={(c) => setNotifPrefs({ ...notifPrefs, emailNotifs: c })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">SMS Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={notifPrefs.smsNotifs}
                    onCheckedChange={(c) => setNotifPrefs({ ...notifPrefs, smsNotifs: c })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive push notifications in browser</p>
                  </div>
                  <Switch
                    checked={notifPrefs.pushNotifs}
                    onCheckedChange={(c) => setNotifPrefs({ ...notifPrefs, pushNotifs: c })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">In-App Notifications</p>
                    <p className="text-xs text-muted-foreground">Show notifications inside the app</p>
                  </div>
                  <Switch
                    checked={notifPrefs.inAppNotifs}
                    onCheckedChange={(c) => setNotifPrefs({ ...notifPrefs, inAppNotifs: c })}
                  />
                </div>
              </div>

              <Separator />

              {/* Reminder Configuration */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Deadline Reminders</p>
                  <p className="text-xs text-muted-foreground">Days before deadline to send reminders</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {[7, 3, 1].map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={notifPrefs.reminderDays.includes(day)}
                        onCheckedChange={(checked) => {
                          setNotifPrefs({
                            ...notifPrefs,
                            reminderDays: checked
                              ? [...notifPrefs.reminderDays, day]
                              : notifPrefs.reminderDays.filter((d) => d !== day),
                          })
                        }}
                      />
                      <Label htmlFor={`day-${day}`} className="text-sm">
                        {day} day{day !== 1 ? 's' : ''} before
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Same-Day Reminders</p>
                  <p className="text-xs text-muted-foreground">Hours before deadline to send reminders</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {[6, 1].map((hour) => (
                    <div key={hour} className="flex items-center gap-2">
                      <Checkbox
                        id={`hour-${hour}`}
                        checked={notifPrefs.reminderHours.includes(hour)}
                        onCheckedChange={(checked) => {
                          setNotifPrefs({
                            ...notifPrefs,
                            reminderHours: checked
                              ? [...notifPrefs.reminderHours, hour]
                              : notifPrefs.reminderHours.filter((h) => h !== hour),
                          })
                        }}
                      />
                      <Label htmlFor={`hour-${hour}`} className="text-sm">
                        {hour} hour{hour !== 1 ? 's' : ''} before
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveNotifications} disabled={saving === 'notifications'}>
                  {saving === 'notifications' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SECURITY TAB ==================== */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={changePassword} disabled={saving === 'security'}>
                    {saving === 'security' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-base text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Delete Account</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and
                          remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            // In a real app, this would call a delete API
                            alert('Account deletion is disabled in demo mode.')
                          }}
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== PRIVACY TAB ==================== */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy Settings</CardTitle>
              <CardDescription>Control your data and visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Public Portfolio</p>
                  <p className="text-xs text-muted-foreground">
                    Allow others to view your portfolio page
                  </p>
                </div>
                <Switch
                  checked={publicPortfolio}
                  onCheckedChange={setPublicPortfolio}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Data Sharing Preferences</p>
                  <p className="text-xs text-muted-foreground">
                    Control how your data is used within the platform
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Analytics Data</p>
                    <p className="text-xs text-muted-foreground">Include your activity in team analytics</p>
                  </div>
                  <Switch
                    checked={dataSharing.analytics}
                    onCheckedChange={(c) => setDataSharing({ ...dataSharing, analytics: c })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">AI Processing</p>
                    <p className="text-xs text-muted-foreground">Allow AI to analyze your tasks and provide feedback</p>
                  </div>
                  <Switch
                    checked={dataSharing.ai}
                    onCheckedChange={(c) => setDataSharing({ ...dataSharing, ai: c })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Team Visibility</p>
                    <p className="text-xs text-muted-foreground">Show your activity to team members</p>
                  </div>
                  <Switch
                    checked={dataSharing.team}
                    onCheckedChange={(c) => setDataSharing({ ...dataSharing, team: c })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== APPEARANCE TAB ==================== */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-xs font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-xs font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'system'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-xs font-medium">System</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
