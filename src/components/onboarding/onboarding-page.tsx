'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Plus,
  GraduationCap,
  Code,
  Link2,
  Github,
  Linkedin,
  Figma,
  Globe,
  Database,
  Send,
  Palette,
  Server,
  Flame,
  Layers,
  Circle,
  FileCode,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ==================== TYPES & CONSTANTS ====================

const SKILLS_LIST = [
  { name: 'HTML', icon: Code },
  { name: 'CSS', icon: Palette },
  { name: 'JavaScript', icon: FileCode },
  { name: 'TypeScript', icon: FileCode },
  { name: 'React', icon: Code },
  { name: 'Next.js', icon: Globe },
  { name: 'Node.js', icon: Server },
  { name: 'Python', icon: Code },
  { name: 'Java', icon: Code },
  { name: 'C++', icon: Code },
  { name: 'SQL', icon: Database },
  { name: 'MongoDB', icon: Database },
  { name: 'PostgreSQL', icon: Database },
  { name: 'AI/ML', icon: Brain },
  { name: 'UI/UX', icon: Layers },
  { name: 'Figma', icon: Figma },
  { name: 'Git', icon: Circle },
  { name: 'GitHub', icon: Github },
]

const ACCOUNT_PROVIDERS = [
  { name: 'GitHub', icon: Github, color: 'text-foreground' },
  { name: 'LinkedIn', icon: Linkedin, color: 'text-[#3B82F6]' },
  { name: 'Figma', icon: Figma, color: 'text-[#64748B]' },
  { name: 'Vercel', icon: Globe, color: 'text-foreground' },
  { name: 'Netlify', icon: Globe, color: 'text-[#64748B]' },
  { name: 'Render', icon: Server, color: 'text-[#22C55E]' },
  { name: 'Railway', icon: Server, color: 'text-[#64748B]' },
  { name: 'Firebase', icon: Flame, color: 'text-[#F59E0B]' },
  { name: 'Supabase', icon: Database, color: 'text-[#22C55E]' },
  { name: 'MongoDB Atlas', icon: Database, color: 'text-[#22C55E]' },
  { name: 'Postman', icon: Send, color: 'text-[#F59E0B]' },
  { name: 'Canva', icon: Palette, color: 'text-[#64748B]' },
]

const stepLabels = ['Personal Info', 'Skills', 'Developer Accounts']

// ==================== SCHEMAS ====================

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  college: z.string().min(1, 'College is required'),
  course: z.string().min(1, 'Course is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  phone: z.string(),
  bio: z.string(),
})

// ==================== COMPONENTS ====================

interface OnboardingPageProps {
  userId: string
  onComplete: () => void
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-center gap-2">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep

          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground scale-100'
                      : isActive
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                </div>
                <span
                  className={`text-sm hidden sm:inline transition-colors ${
                    isActive ? 'text-foreground font-semibold' : isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="w-6 sm:w-12" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Step 1: Personal Info
function PersonalInfoStep({ onNext }: { onNext: (data: z.infer<typeof personalInfoSchema>) => void }) {
  const form = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
      college: '',
      course: '',
      academicYear: '',
      phone: '',
      bio: '',
    },
  })

  function onSubmit(values: z.infer<typeof personalInfoSchema>) {
    onNext(values)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Tell us about yourself</h2>
        <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="college"
            render={({ field }) => (
              <FormItem>
                <FormLabel>College / University</FormLabel>
                <FormControl>
                  <Input placeholder="MIT, Stanford, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course / Major</FormLabel>
                  <FormControl>
                    <Input placeholder="Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1st">1st Year</SelectItem>
                      <SelectItem value="2nd">2nd Year</SelectItem>
                      <SelectItem value="3rd">3rd Year</SelectItem>
                      <SelectItem value="4th">4th Year</SelectItem>
                      <SelectItem value="5th">5th Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a bit about yourself, your interests, and what you're working on..."
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full sm:w-auto sm:ml-auto sm:flex">
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Form>
    </div>
  )
}

// Step 2: Skills
function SkillsStep({
  initialSkills,
  onNext,
  onBack,
}: {
  initialSkills: string[]
  onNext: (skills: string[]) => void
  onBack: () => void
}) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkills)
  const [otherSkill, setOtherSkill] = useState('')

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  function addOtherSkill() {
    const trimmed = otherSkill.trim()
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed])
      setOtherSkill('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addOtherSkill()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Code className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Select your skills</h2>
        <p className="text-sm text-muted-foreground">
          Pick the technologies you work with ({selectedSkills.length} selected)
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {SKILLS_LIST.map((skill) => {
          const isSelected = selectedSkills.includes(skill.name)
          return (
            <button
              key={skill.name}
              onClick={() => toggleSkill(skill.name)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <skill.icon className="h-4 w-4" />
              {skill.name}
              {isSelected && <Check className="h-3 w-3" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 max-w-sm mx-auto">
        <Input
          placeholder="Add custom skill..."
          value={otherSkill}
          onChange={(e) => setOtherSkill(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addOtherSkill} disabled={!otherSkill.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
            >
              {skill}
              <button onClick={() => toggleSkill(skill)} className="hover:text-destructive transition-colors">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 justify-between sm:justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={() => onNext(selectedSkills)}>
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}



// Step 3: Developer Accounts
function AccountsStep({
  userId,
  onComplete,
  onBack,
  onSkip,
}: {
  userId: string
  onComplete: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [accountUrls, setAccountUrls] = useState<Record<string, string>>({})
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function connectAccount(provider: string) {
    const url = accountUrls[provider]?.trim()
    if (connecting) return

    setConnecting(provider)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider,
          displayName: provider,
          url: url || '',
        }),
      })

      if (res.ok) {
        setConnectedAccounts((prev) => [...prev, provider])
      }
    } catch {
      // Silently fail for onboarding
    } finally {
      setConnecting(null)
    }
  }

  async function handleComplete() {
    setSaving(true)
    try {
      // Connect any accounts with URLs that aren't yet connected
      const pendingProviders = Object.entries(accountUrls)
        .filter(([provider, url]) => url.trim() && !connectedAccounts.includes(provider))
        .map(([provider]) => provider)

      for (const provider of pendingProviders) {
        if (!connectedAccounts.includes(provider)) {
          await fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              provider,
              displayName: provider,
              url: accountUrls[provider]?.trim() || '',
            }),
          })
        }
      }
    } catch {
      // Continue regardless
    } finally {
      setSaving(false)
      onComplete()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Link2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Connect your accounts</h2>
        <p className="text-sm text-muted-foreground">
          Link your developer accounts for a richer profile
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {ACCOUNT_PROVIDERS.map((provider) => {
          const isConnected = connectedAccounts.includes(provider.name)
          const url = accountUrls[provider.name] || ''

          return (
            <Card
              key={provider.name}
              className={`relative p-4 transition-all ${
                isConnected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
            >
              {isConnected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <provider.icon className={`h-8 w-8 ${provider.color}`} />
                <span className="text-sm font-medium">{provider.name}</span>
                <Input
                  placeholder="Profile URL"
                  value={url}
                  onChange={(e) => setAccountUrls((prev) => ({ ...prev, [provider.name]: e.target.value }))}
                  className="h-8 text-xs"
                  disabled={isConnected}
                />
                {!isConnected && (
                  <Button
                    type="button"
                    size="sm"
                    variant={url.trim() ? 'default' : 'outline'}
                    className="w-full text-xs h-7"
                    disabled={connecting === provider.name || (!url.trim() && !isConnected)}
                    onClick={() => connectAccount(provider.name)}
                  >
                    {connecting === provider.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isConnected ? (
                      'Connected'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-3 justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleComplete} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Setup
            <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function OnboardingPage({ userId, onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(1)
  const [personalData, setPersonalData] = useState<z.infer<typeof personalInfoSchema> | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handlePersonalInfoNext(data: z.infer<typeof personalInfoSchema>) {
    setPersonalData(data)
    setStep(2)
  }

  async function handleSkillsNext(selectedSkills: string[]) {
    setSkills(selectedSkills)
    setStep(3)
  }

  async function handleComplete() {
    if (!personalData) return

    setSaving(true)
    setError('')

    async function attemptSave(retryCount = 0): Promise<boolean> {
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            fullName: personalData.fullName,
            college: personalData.college,
            course: personalData.course,
            academicYear: personalData.academicYear,
            phone: personalData.phone,
            bio: personalData.bio,
            skills,
          }),
        })
        if (!res.ok) {
          const contentType = res.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            // Server returned non-JSON (e.g. 502 HTML page) — likely server restarting
            if (retryCount < 3) {
              const delay = Math.pow(2, retryCount) * 1000
              await new Promise((r) => setTimeout(r, delay))
              return attemptSave(retryCount + 1)
            }
            setError('Server is temporarily unavailable. Please wait a moment and retry.')
            console.error('Onboarding failed: non-JSON response, status:', res.status)
            return false
          }
          const data = await res.json()
          if (data.error?.includes('already completed onboarding')) {
            return true
          }
          setError(data.error || 'Failed to save onboarding data')
          console.error('Failed to save onboarding data:', data.error || res.status)
          return false
        }
        return true
      } catch (err) {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000
          await new Promise((r) => setTimeout(r, delay))
          return attemptSave(retryCount + 1)
        }
        console.error('Onboarding save error:', err)
        setError('Network error. Please check your connection and try again.')
        return false
      }
    }

    const success = await attemptSave()
    setSaving(false)
    if (success) {
      onComplete()
    }
  }

  if (saving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Setting up your workspace...</h2>
            <p className="text-sm text-muted-foreground mt-1">This will only take a moment</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold">Project OS AI</span>
        </div>

        <StepIndicator currentStep={step} totalSteps={3} />

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
                <span>{error}</span>
                <button onClick={handleComplete} className="ml-2 underline underline-offset-2 hover:text-foreground transition-colors shrink-0">Retry</button>
              </div>
            )}
            {step === 1 && <PersonalInfoStep onNext={handlePersonalInfoNext} />}
            {step === 2 && (
              <SkillsStep
                initialSkills={skills}
                onNext={handleSkillsNext}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <AccountsStep
                userId={userId}
                onComplete={handleComplete}
                onBack={() => setStep(2)}
                onSkip={handleComplete}
              />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of 3 &mdash; {stepLabels[step - 1]}
        </p>
      </div>
    </div>
  )
}
