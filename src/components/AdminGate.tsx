import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { useAdminAccess } from '../hooks/useAdminAccess'
import {
  canAccessAdminRoute,
  isWebAdminPasswordEnabled,
} from '@/lib/adminAccess'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  children: ReactNode
  /** Only full admins (not moderators) */
  requireFullAdmin?: boolean
}

const AdminGate = ({ children, requireFullAdmin = false }: Props) => {
  const { user } = useTelegramApp()
  const access = useAdminAccess()
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)

  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  const webPasswordEnabled = isWebAdminPasswordEnabled()
  const userId = user?.id

  if (!access.isReady || access.roleLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  const isAllowed = canAccessAdminRoute(access, requireFullAdmin)

  if (!isAllowed) {
    if (!userId && webPasswordEnabled) {
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
              {requireFullAdmin
                ? 'این بخش فقط برای ادمین کامل در دسترس است.'
                : 'این بخش فقط برای تیم ادمین فعال است.'}
            </p>
            {access.isModerator && requireFullAdmin ? (
              <p className="text-muted-foreground mt-2 text-xs">
                نقش شما «مدیر محتوا» است و به مدیریت کاربران دسترسی ندارید.
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs mt-3">
              Telegram ID: {String(userId ?? 'نامشخص')}
            </p>
            <div className="mt-4">
              <Button asChild type="button" variant="secondary">
                <Link to={access.isStaff ? '/admin' : '/'}>
                  {access.isStaff ? 'بازگشت به داشبورد' : 'بازگشت به خانه'}
                </Link>
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
