import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { isTelegramMiniApp } from '@/lib/telegramEnv'
import { isWebAdminOnlyMode } from '@/lib/adminAccess'
import { loginAdminPortal } from '@/services/adminPortalAuth'
import logo from '@/assets/images/shiori-logo.svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const safeAdminNextPath = (value: string | null): string => {
  if (!value || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return '/admin'
  }
  return value
}

const inputClassName =
  'h-11 border-input bg-background pr-10 text-foreground [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_oklch(0.145_0_0)] [&:-webkit-autofill]:[-webkit-text-fill-color:oklch(0.985_0_0)]'

const AdminLogin = () => {
  const [searchParams] = useSearchParams()
  const access = useAdminAccess()
  const nextPath = safeAdminNextPath(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'ورود پنل ادمین — شیوری'
  }, [])

  if (isTelegramMiniApp() && isWebAdminOnlyMode()) {
    return <Navigate to="/" replace />
  }

  if (!access.isReady || access.roleLoading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary-400" />
      </div>
    )
  }

  if (access.isStaff) {
    return <Navigate to={nextPath} replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await loginAdminPortal(email, password)
      window.location.assign(nextPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ورود ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="relative mx-auto w-full max-w-md text-start"
    >
      <div
        className="pointer-events-none absolute -inset-x-8 -top-12 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.488_0.243_264.376_/_0.22),transparent_60%),radial-gradient(ellipse_at_bottom,_oklch(0.424_0.199_265.638_/_0.14),transparent_55%)]"
        aria-hidden
      />

      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <img src={logo} alt="شیوری" className="h-12 w-12" />
        <h1 className="text-xl font-bold">شیوری</h1>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-email">ایمیل</Label>
            <div className="relative">
              <Mail
                className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder="admin@shiori.app"
                className={inputClassName}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">رمز عبور</Label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder="••••••••"
                className={`${inputClassName} pl-10`}
                required
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ورود…
              </>
            ) : (
              'ورود'
            )}
          </Button>
        </form>
      </div>

      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground mt-6 inline-flex w-full items-center justify-center gap-1.5 text-sm transition-colors"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
        بازگشت به سایت
      </Link>
    </div>
  )
}

export default AdminLogin
