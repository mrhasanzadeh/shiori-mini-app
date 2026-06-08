import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { getTelegramUserRole } from '../services/supabaseUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  children: ReactNode
}

const parseAllowedIds = (value: unknown): Set<number> => {
  const raw = typeof value === 'string' ? value : ''
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const ids = new Set<number>()
  for (const p of parts) {
    const n = Number(p)
    if (Number.isFinite(n)) ids.add(n)
  }
  return ids
}

const AdminGate = ({ children }: Props) => {
  const { user, isReady } = useTelegramApp()
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [dbRoleLoading, setDbRoleLoading] = useState(true)
  const [dbIsAdmin, setDbIsAdmin] = useState(false)

  const allowedIds = useMemo(() => parseAllowedIds(import.meta.env.VITE_ADMIN_TELEGRAM_IDS), [])

  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  const webAuthed = useMemo(() => {
    try {
      return localStorage.getItem('admin_web_authed') === '1'
    } catch {
      return false
    }
  }, [])

  const userId = user?.id

  useEffect(() => {
    if (!isReady) return

    if (typeof userId !== 'number') {
      setDbIsAdmin(false)
      setDbRoleLoading(false)
      return
    }

    let cancelled = false
    setDbRoleLoading(true)

    void getTelegramUserRole(userId)
      .then((role) => {
        if (!cancelled) setDbIsAdmin(role === 'admin')
      })
      .finally(() => {
        if (!cancelled) setDbRoleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isReady, userId])

  if (!isReady || (typeof userId === 'number' && dbRoleLoading)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  const isAllowedTelegram = typeof userId === 'number' && allowedIds.has(userId)
  const isAllowedWeb = !userId && webPassword.length > 0 && webAuthed
  const isAllowedDbAdmin = typeof userId === 'number' && dbIsAdmin

  const isAllowed = isAllowedTelegram || isAllowedWeb || isAllowedDbAdmin

  if (!isAllowed) {
    if (!userId && webPassword.length > 0) {
      return (
        <div className="px-4 pt-6 pb-28">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ورود ادمین (تست وب)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                برای تست داخل مرورگر، پسورد ادمین را وارد کن.
              </p>
              <div className="mt-4">
                <Input
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value)
                    setPwError(null)
                  }}
                  type="password"
                  placeholder="پسورد"
                />
                {pwError && <div className="text-red-400 text-xs mt-2">{pwError}</div>}
                <Button
                  type="button"
                  className="w-full mt-3"
                  onClick={() => {
                    if (pw.trim() !== webPassword) {
                      setPwError('پسورد اشتباه است')
                      return
                    }
                    try {
                      localStorage.setItem('admin_web_authed', '1')
                      window.location.reload()
                    } catch {
                      setPwError('مرورگر اجازه ذخیره‌سازی نمی‌دهد')
                    }
                  }}
                >
                  ورود
                </Button>
              </div>
              <div className="mt-4">
                <Button asChild type="button" variant="secondary">
                  <Link to="/">بازگشت به خانه</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="px-4 pt-6 pb-28">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">دسترسی غیرمجاز</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-6">
              این بخش فقط برای ادمین فعال است.
            </p>
            <p className="text-muted-foreground text-xs mt-3">
              Telegram ID: {String(userId ?? 'نامشخص')}
            </p>
            <div className="mt-4">
              <Button asChild type="button" variant="secondary">
                <Link to="/">بازگشت به خانه</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminGate
