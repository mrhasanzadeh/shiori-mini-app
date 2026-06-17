import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logo from '../assets/images/shiori-logo.svg'

type Mode = 'login' | 'register'

type ProfileAuthPanelProps = {
  onSuccess?: () => void
  login: (email: string, password: string) => Promise<unknown>
  register: (email: string, password: string, displayName: string) => Promise<unknown>
  layout?: 'page' | 'card'
}

export const ProfileAuthPanel = ({
  onSuccess,
  login,
  register,
  layout = 'card',
}: ProfileAuthPanelProps) => {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, displayName.trim() || 'کاربر')
      }
      onSuccess?.()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'خطا در ورود'
      setError(message.replace(/^API \d+: /, '').replace(/^"|"$/g, ''))
    } finally {
      setLoading(false)
    }
  }

  const form = (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="display-name" className="text-foreground/90">
            نام
          </Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="نام نمایشی"
            autoComplete="name"
            className="h-11 bg-background/80 border-border/80"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground/90">
          ایمیل
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="h-11 bg-background/80 border-border/80"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground/90">
          رمز عبور
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          required
          className="h-11 bg-background/80 border-border/80"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive leading-6 rounded-lg bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full h-11 font-semibold bg-primary-600 text-white" disabled={loading}>
        {loading ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ساخت حساب'}
      </Button>
    </form>
  )

  const modeToggle = (
    <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
      <button
        type="button"
        onClick={() => setMode('login')}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
          mode === 'login'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        ورود
      </button>
      <button
        type="button"
        onClick={() => setMode('register')}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
          mode === 'register'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        ثبت‌نام
      </button>
    </div>
  )

  if (layout === 'page') {
    return (
      <div className="relative min-h-[calc(100dvh-5rem)] flex flex-col justify-center px-5 pb-28 pt-16 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/25 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-primary-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-400/5 via-transparent to-background" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[340px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-background/80 shadow-lg ring-1 ring-primary-400/20 backdrop-blur-sm">
              <img src={logo} alt="" className="h-9 w-9" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">شیوری</h1>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-xl shadow-primary-400/5 backdrop-blur-md">
            {modeToggle}
            <div className="mt-5">{form}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-5 rounded-2xl border border-border bg-card overflow-hidden p-4 space-y-4">
      {modeToggle}
      {form}
    </div>
  )
}
