import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { isTelegramMiniApp } from '@/lib/telegramEnv'
import { isWebAdminOnlyMode } from '@/lib/adminAccess'
import { loginAdminPortal } from '@/services/adminPortalAuth'
import logo from '@/assets/images/shiori-logo.svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const safeAdminNextPath = (value: string | null): string => {
  if (!value || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return '/admin'
  }
  return value
}

const AdminLogin = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const access = useAdminAccess()
  const nextPath = safeAdminNextPath(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
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
      navigate(nextPath, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ورود ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-3 mb-6">
        <img src={logo} alt="شیوری" className="w-10 h-10" />
        <div className="text-center">
          <h1 className="text-xl font-bold">پنل مدیریت شیوری</h1>
          <p className="text-muted-foreground text-sm mt-1">
            با حساب ادمین وارد شوید. سطح دسترسی بر اساس نقش شما تعیین می‌شود.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ورود</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="admin-email" className="text-sm text-muted-foreground">
                ایمیل
              </label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm text-muted-foreground">
                رمز عبور
              </label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? <p className="text-red-400 text-xs">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'در حال ورود…' : 'ورود به پنل'}
            </Button>
          </form>

          <div className="mt-4">
            <Button asChild type="button" variant="secondary" className="w-full">
              <Link to="/">بازگشت به سایت</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminLogin
