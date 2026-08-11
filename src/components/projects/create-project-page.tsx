'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  Sparkles,
  Briefcase,
  UserPlus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useNavStore } from '@/lib/nav-store'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ==================== SCHEMA ====================

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Description is required'),
  projectType: z.string().min(1, 'Project type is required'),
  targetUsers: z.string(),
  goal: z.string(),
  deadline: z.string(),
  difficulty: z.string(),
  techStack: z.array(z.string()),
  features: z.array(z.string()),
  requirements: z.string(),
})

type ProjectForm = z.infer<typeof createProjectSchema>

// ==================== TAG INPUT ====================

function TagInput({
  tags,
  setTags,
  placeholder,
}: {
  tags: string[]
  setTags: (tags: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  function addTag() {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      setTags([...tags, val])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] items-center focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : 'Add more...'}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent border-0 p-1 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ==================== STEP INDICATOR ====================

const STEPS = [
  { label: 'Basic Info', icon: Briefcase },
  { label: 'Details', icon: Sparkles },
  { label: 'Team', icon: UserPlus },
]

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === currentStep
        const isCompleted = i < currentStep
        return (
          <div key={step.label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-[11px] sm:text-xs text-muted-foreground hidden sm:inline">
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-6 sm:w-12 ${i < currentStep ? 'bg-primary/40' : 'bg-muted'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function CreateProjectPage({ userId }: { userId: string }) {
  const navigate = useNavStore((s) => s.navigate)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      projectType: '',
      targetUsers: '',
      goal: '',
      deadline: '',
      difficulty: 'medium',
      techStack: [],
      features: [],
      requirements: '',
    },
  })

  const techStack = watch('techStack') || []
  const features = watch('features') || []

  function addMember() {
    if (!memberEmail.trim()) return
    if (teamMembers.includes(memberEmail.trim())) {
      setMemberError('Email already added')
      return
    }
    setTeamMembers([...teamMembers, memberEmail.trim()])
    setMemberEmail('')
    setMemberError(null)
  }

  function removeMember(email: string) {
    setTeamMembers(teamMembers.filter((m) => m !== email))
  }

  async function handleKeyDownMember(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  async function onSubmit(data: ProjectForm) {
    try {
      setSubmitting(true)
      setError(null)

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId, teamMembers }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create project')

      navigate('project-detail', { id: json.data.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function nextStep() {
    let valid = false
    if (step === 0) {
      valid = await trigger(['name', 'description', 'projectType', 'targetUsers', 'goal'])
    } else if (step === 1) {
      valid = await trigger(['deadline', 'difficulty', 'requirements'])
    }
    if (valid) {
      setStep((s) => Math.min(s + 1, 2))
    }
  }

  async function prevStep() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Create Project</h1>
              <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <StepIndicator currentStep={step} />

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Tell us about your project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Project Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., E-commerce Platform"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="What is your project about?"
                    rows={3}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectType">
                    Project Type <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="projectType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="projectType">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Stack Web App">Full Stack Web App</SelectItem>
                          <SelectItem value="Mobile App">Mobile App</SelectItem>
                          <SelectItem value="AI/ML Project">AI/ML Project</SelectItem>
                          <SelectItem value="Hackathon Project">Hackathon Project</SelectItem>
                          <SelectItem value="College Project">College Project</SelectItem>
                          <SelectItem value="Research Project">Research Project</SelectItem>
                          <SelectItem value="Personal Project">Personal Project</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.projectType && (
                    <p className="text-xs text-destructive">{errors.projectType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetUsers">Target Users</Label>
                  <Input
                    id="targetUsers"
                    placeholder="e.g., College students, Small businesses"
                    {...register('targetUsers')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Project Goal</Label>
                  <Textarea
                    id="goal"
                    placeholder="What do you want to achieve?"
                    rows={2}
                    {...register('goal')}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Details</CardTitle>
                <CardDescription>Set up deadlines, tech stack, and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" {...register('deadline')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Controller
                      name="difficulty"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="difficulty">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tech Stack</Label>
                  <p className="text-xs text-muted-foreground">Type and press Enter to add tags</p>
                  <TagInput
                    tags={techStack}
                    setTags={(tags) => setValue('techStack', tags)}
                    placeholder="e.g., React, Node.js, PostgreSQL"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Features</Label>
                  <p className="text-xs text-muted-foreground">Type and press Enter to add features</p>
                  <TagInput
                    tags={features}
                    setTags={(tags) => setValue('features', tags)}
                    placeholder="e.g., User Authentication, Payment Integration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="List any specific requirements or constraints"
                    rows={3}
                    {...register('requirements')}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Team */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
                <CardDescription>
                  Add team members to collaborate on this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Current user (creator) */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    You
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">You (Creator)</p>
                    <p className="text-xs text-muted-foreground">Team Lead</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Leader</Badge>
                </div>

                <div className="text-sm font-medium">
                  Team Size: <span className="text-muted-foreground">{teamMembers.length + 1} members</span>
                </div>

                {/* Add member */}
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Add Team Members</Label>
                  <div className="flex gap-2">
                    <Input
                      id="memberEmail"
                      placeholder="Enter email address"
                      value={memberEmail}
                      onChange={(e) => {
                        setMemberEmail(e.target.value)
                        setMemberError(null)
                      }}
                      onKeyDown={handleKeyDownMember}
                    />
                    <Button type="button" variant="outline" onClick={addMember} className="shrink-0 gap-1">
                      <UserPlus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {memberError && <p className="text-xs text-destructive">{memberError}</p>}
                </div>

                {/* Member list */}
                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} added
                    </p>
                    <div className="space-y-2">
                      {teamMembers.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-3 p-2.5 border rounded-lg"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {email.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{email}</p>
                            <p className="text-xs text-muted-foreground">Member</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeMember(email)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground border-t pt-4">
                  Team members will be able to join once the project is created. You can add more members from the project settings later.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} className="gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
