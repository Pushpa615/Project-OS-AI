'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Brain,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  User,
  KeyRound,
  Sparkles,
  Target,
  BarChart3,
  Calendar,
  Users,
  FileText,
  CheckCircle2,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ==================== FEATURES DATA ====================

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Planning',
    desc: 'Generate project plans, get code help, and receive intelligent recommendations.',
  },
  {
    icon: Target,
    title: 'Evidence-Based Tracking',
    desc: 'Verify task completion with evidence. AI analyzes and validates your work.',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    desc: 'Track progress with real-time dashboards, burndown charts, and AI insights.',
  },
  {
    icon: Calendar,
    title: 'Daily Check-ins',
    desc: 'Structured daily standups with AI feedback to keep your team on track.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    desc: 'Manage team members, assign tasks, and coordinate project milestones.',
  },
  {
    icon: FileText,
    title: 'Auto Documentation',
    desc: 'Generate READMEs, SRS docs, and project reports with a single click.',
  },
]

const STATS = [
  { value: '10K+', label: 'Projects Managed' },
  { value: '50K+', label: 'Tasks Completed' },
  { value: '98%', label: 'On-Time Delivery' },
  { value: '4.9', label: 'User Rating' },
]

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password'

interface AuthPagesProps {
  onAuthSuccess: (user: { id: string; email: string; name: string; role: string }) => void
}

// ==================== SCHEMAS ====================

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ==================== LOGIN FORM ====================

function LoginForm({ onSuccess, onSwitch }: { onSuccess: AuthPagesProps['onAuthSuccess']; onSwitch: (v: AuthView) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setServerError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setServerError('Invalid email or password. Please try again.')
        return
      }

      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()

      if (session?.user) {
        const userId = (session.user as Record<string, string>).id
        if (userId) {
          onSuccess({
            id: userId,
            email: session.user.email,
            name: session.user.name || '',
            role: (session.user as Record<string, string>).role || 'member',
          })
        } else {
          const profileRes = await fetch(`/api/auth/register?email=${encodeURIComponent(values.email)}`)
          const profileData = await profileRes.json()
          if (profileData.data) {
            onSuccess({
              id: profileData.data.id,
              email: profileData.data.email,
              name: profileData.data.name || '',
              role: profileData.data.role || 'member',
            })
          }
        }
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to continue to Project OS AI</p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="you@example.com" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Button type="button" variant="link" className="px-0 h-auto text-xs text-muted-foreground hover:text-primary" onClick={() => onSwitch('forgot-password')}>
                    Forgot password?
                  </Button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="pl-10 pr-10" {...field} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <button onClick={() => onSwitch('signup')} className="text-primary hover:underline font-medium">
          Create one free
        </button>
      </div>
    </div>
  )
}

// ==================== SIGNUP FORM ====================

function SignupForm({ onSuccess, onSwitch }: { onSuccess: AuthPagesProps['onAuthSuccess']; onSwitch: (v: AuthView) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setServerError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
      })

      const regData = await res.json()

      if (!res.ok) {
        setServerError(regData.error || 'Registration failed. Please try again.')
        return
      }

      const registeredUser = regData.data

      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (registeredUser) {
        onSuccess({
          id: registeredUser.id,
          email: registeredUser.email,
          name: registeredUser.name || values.name,
          role: registeredUser.role || 'member',
        })
      } else if (result?.ok) {
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()
        if (session?.user) {
          onSuccess({
            id: (session.user as Record<string, string>).id || '',
            email: session.user.email || '',
            name: session.user.name || values.name,
            role: (session.user as Record<string, string>).role || 'member',
          })
        }
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">Start managing projects with AI today</p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="John Doe" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="you@example.com" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 chars" className="pl-10 pr-9" {...field} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm" className="pl-10 pr-9" {...field} />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button onClick={() => onSwitch('login')} className="text-primary hover:underline font-medium">
          Sign in
        </button>
      </div>
    </div>
  )
}

// ==================== FORGOT PASSWORD FORM ====================

function ForgotPasswordForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setServerError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error || 'Failed to send reset email.')
        return
      }

      setSuccess(true)
    } catch {
      setServerError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to your email address.
            </p>
          </div>
        </div>
        <Button className="w-full" onClick={() => onSwitch('login')}>
          Back to Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Forgot password?</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="you@example.com" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </Form>

      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="sm" onClick={() => onSwitch('login')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
      </div>
    </div>
  )
}

// ==================== RESET PASSWORD FORM ====================

function ResetPasswordForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setServerError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error || 'Failed to reset password.')
        return
      }

      onSwitch('login')
    } catch {
      setServerError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
        <p className="text-sm text-muted-foreground">Enter your new password</p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" className="pl-10 pr-10" {...field} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" className="pl-10 pr-10" {...field} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </Form>

      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="sm" onClick={() => onSwitch('login')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
      </div>
    </div>
  )
}

// ==================== LEFT PANEL: BRANDING ====================

function BrandingPanel({ view }: { view: AuthView }) {
  return (
    <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="/hero-illustration.png"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-slate-900/80" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Project OS AI</span>
        </div>
      </div>

      {/* Hero section */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
        {view === 'login' || view === 'forgot-password' || view === 'reset-password' ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 w-fit mb-6">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-300">AI-Powered Project Management</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Build projects
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400"> smarter</span>,
              <br />not harder
            </h2>
            <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-8">
              The all-in-one AI operating system for student projects. Plan, track, verify, and deliver with intelligent assistance at every step.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.slice(0, 4).map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <feature.icon className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white">{feature.title}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 w-fit mb-6">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-300">Get started in seconds</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Your AI project
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"> companion</span>
              <br />awaits
            </h2>
            <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-8">
              Join thousands of students delivering exceptional projects. Get AI-powered planning, smart tracking, and automatic documentation.
            </p>

            {/* All 6 features */}
            <div className="space-y-2.5">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{feature.title}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400/60 shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stats bar */}
      <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg xl:text-xl font-bold text-white">{stat.value}</p>
              <p className="text-[11px] text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function AuthPages({ onAuthSuccess }: AuthPagesProps) {
  const [view, setView] = useState<AuthView>('login')

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <BrandingPanel view={view} />

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Project OS AI</span>
          </div>

          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {view === 'login' && <LoginForm onSuccess={onAuthSuccess} onSwitch={setView} />}
              {view === 'signup' && <SignupForm onSuccess={onAuthSuccess} onSwitch={setView} />}
              {view === 'forgot-password' && <ForgotPasswordForm onSwitch={setView} />}
              {view === 'reset-password' && <ResetPasswordForm onSwitch={setView} />}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            By continuing, you agree to our{' '}
            <span className="text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-2">Terms</span>
            {' '}and{' '}
            <span className="text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-2">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
