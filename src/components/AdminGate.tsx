import { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { useAdminAccess } from '../hooks/useAdminAccess'
import {
  ADMIN_LOGIN_PATH,
  canAccessAdminRoute,
  isWebAdminOnlyMode,
} from '@/lib/adminAccess'
import { isTelegramMiniApp } from '@/lib/telegramEnv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  children: ReactNode
  /** Only full admins (not moderators) */
  requireFullAdmin?: boolean
}

const buildLoginRedirect = (pathname: string, search: string): string => {
  const next = encodeURIComponent(`${pathname}${search}`)
  return `${ADMIN_LOGIN_PATH}?next=${next}`
}

const AdminGate = ({ children, requireFullAdmin = false }: Props) => {
  const { user } = useTelegramApp()
  const access = useAdminAccess()
  const location = useLocation()

  const webOnlyMode = isWebAdminOnlyMode()
  const inTelegramMiniApp = isTelegramMiniApp()
  const userId = user?.id
  const canUseWebLogin = !inTelegramMiniApp

  if (!access.isReady || access.roleLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  const isAllowed = canAccessAdminRoute(access, requireFullAdmin)

  if (!isAllowed) {
    if (webOnlyMode && inTelegramMiniApp) {
      const adminUrl = `${window.location.origin}${ADMIN_LOGIN_PATH}`

      return (
        <div className="px-4 pt-6 pb-28">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">پنل ادمین — فقط وب</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                مدیریت محتوا از داخل مینی‌اپ در دسترس نیست. پنل ادمین را در مرورگر وب باز کن.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button type="button" className="w-full" onClick={() => WebApp.openLink(adminUrl)}>
                  باز کردن در مرورگر
                </Button>
                <Button asChild type="button" variant="secondary">
                  <Link to="/">بازگشت به خانه</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (canUseWebLogin) {
      return (
        <Navigate
          to={buildLoginRedirect(location.pathname, location.search)}
          replace
        />
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
            {!webOnlyMode ? (
              <p className="text-muted-foreground text-xs mt-3">
                Telegram ID: {String(userId ?? 'نامشخص')}
              </p>
            ) : null}
            <div className="mt-4 flex gap-2">
              {access.isStaff ? (
                <Button asChild type="button" variant="secondary">
                  <Link to="/admin">بازگشت به داشبورد</Link>
                </Button>
              ) : (
                <Button asChild type="button" variant="secondary">
                  <Link to="/">بازگشت به خانه</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminGate
