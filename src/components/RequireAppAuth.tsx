import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UserIcon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { ProfileAuthPanel } from './ProfileAuthPanel'
import { useAppAuth } from '../hooks/useAppAuth'

type RequireAppAuthProps = {
  children: ReactNode
  title?: string
  description?: string
}

/** On web, blocks personal features until the user logs in. Telegram passes through. */
export const RequireAppAuth = ({
  children,
  title = 'برای این بخش وارد شوید',
  description = 'علاقه‌مندی‌ها و اعلان‌های شخصی در نسخه وب نیاز به ورود دارند.',
}: RequireAppAuthProps) => {
  const { isReady, isAuthenticated, inTelegram, login, register } = useAppAuth()

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (inTelegram || isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-28 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-6 max-w-sm mx-auto">{description}</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/profile">رفتن به پروفایل برای ورود</Link>
        </Button>
      </div>
      <ProfileAuthPanel login={login} register={register} />
    </div>
  )
}
