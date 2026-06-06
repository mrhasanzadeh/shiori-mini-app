import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClockIcon, FavouriteIcon, UserIcon } from 'hugeicons-react'
import { ChevronLeft } from 'lucide-react'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { useAnimeStore } from '../store/animeStore'
import { useNotificationsStore } from '../store/notificationsStore'
import logo from '../assets/images/shiori-logo.svg'

const APP_VERSION = '۱.۰.۰'

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const getInitials = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return 'ک'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`
  }
  return trimmed.charAt(0)
}

type MenuItemProps = {
  to: string
  icon: ReactNode
  label: string
  hint?: string
  badge?: number
}

const MenuItem = ({ to, icon, label, hint, badge }: MenuItemProps) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
      {icon}
    </span>
    <span className="flex-1 min-w-0 text-right">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
    </span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="min-w-6 h-6 px-1.5 flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">
        {badge > 99 ? '۹۹+' : toPersianNumber(badge)}
      </span>
    )}
    <ChevronLeft className="w-4 h-4 text-muted-foreground/60 shrink-0" aria-hidden />
  </Link>
)

const ProfileSkeleton = () => (
  <div className="pb-24 animate-pulse">
    <div className="relative h-44">
      <div className="absolute inset-x-0 top-0 h-full bg-muted/60" />
      <div className="relative z-10 pt-24 flex flex-col items-center">
        <div className="w-24 h-24 rounded-2xl bg-muted border-4 border-background" />
        <div className="h-6 w-36 bg-muted rounded mt-4" />
        <div className="h-4 w-24 bg-muted rounded mt-2" />
      </div>
    </div>
    <div className="mx-4 mt-6 grid grid-cols-2 gap-2">
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-16 rounded-xl bg-muted" />
    </div>
    <div className="mx-4 mt-6 h-32 rounded-2xl bg-muted" />
  </div>
)

const Profile = () => {
  const { user, isReady } = useTelegramApp()
  const favoriteAnime = useAnimeStore((s) => s.favoriteAnime)
  const unreadCount = useNotificationsStore((s) => s.notifications.filter((n) => !n.isRead).length)
  const [avatarFailed, setAvatarFailed] = useState(false)

  const displayName = useMemo(() => {
    if (!user) return 'کاربر'
    const parts = [user.first_name, user.last_name].filter(Boolean)
    return parts.join(' ').trim() || 'کاربر'
  }, [user])

  const initials = useMemo(() => getInitials(displayName), [displayName])
  const username = user?.username ? `@${user.username}` : null
  const avatarUrl = user?.photo_url && !avatarFailed ? user.photo_url : null
  const favoritesCount = favoriteAnime.length

  if (!isReady) return <ProfileSkeleton />

  return (
    <div className="pb-24 bg-background text-foreground">
      {/* Hero — extends under transparent app header */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-44 overflow-hidden">
          {avatarUrl ? (
            <>
              <img
                src={avatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-50"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-primary-400/30 via-primary-400/10 to-background" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-400/20 via-transparent to-transparent" />
            </>
          )}
        </div>

        <div className="relative z-10 pt-24 px-4 pb-2 flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-background bg-muted shadow-lg ring-2 ring-primary-400/30">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-400/15">
                {initials ? (
                  <span className="text-2xl font-bold text-primary-400">{initials}</span>
                ) : (
                  <UserIcon className="w-10 h-10 text-muted-foreground/50" />
                )}
              </div>
            )}
          </div>

          <h1 className="text-lg font-bold text-foreground mt-3 text-center line-clamp-2 px-2">
            {displayName}
          </h1>

          {username && (
            <p className="text-sm text-muted-foreground mt-1 dir-ltr">{username}</p>
          )}

          {user?.is_premium && (
            <span className="mt-2 inline-flex items-center rounded-full border border-primary-400/30 bg-primary-400/10 px-2.5 py-0.5 text-[11px] font-medium text-primary-400">
              Telegram Premium
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/my-list"
          className="rounded-xl border border-border bg-card/60 py-3 px-3 text-center active:scale-[0.98] transition-transform"
        >
          <p className="text-base font-bold text-foreground">{toPersianNumber(favoritesCount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">انیمه ذخیره‌شده</p>
        </Link>
        <Link
          to="/notifications"
          className="rounded-xl border border-border bg-card/60 py-3 px-3 text-center active:scale-[0.98] transition-transform"
        >
          <p className="text-base font-bold text-foreground">{toPersianNumber(unreadCount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">اعلان خوانده‌نشده</p>
        </Link>
      </div>

      {/* Quick access */}
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">دسترسی سریع</h2>
      </div>

      <div className="mx-4 rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        <MenuItem
          to="/my-list"
          icon={<FavouriteIcon className="w-5 h-5 text-red-500" />}
          label="علاقه‌مندی‌ها"
          hint={favoritesCount > 0 ? `${toPersianNumber(favoritesCount)} انیمه` : 'لیست خالی است'}
        />
        <MenuItem
          to="/notifications"
          icon={<AlarmClockIcon className="w-5 h-5" />}
          label="اعلان‌ها"
          hint={unreadCount > 0 ? `${toPersianNumber(unreadCount)} پیام جدید` : 'همه خوانده شده'}
          badge={unreadCount}
        />
      </div>

      {/* About */}
      <div className="mx-4 mt-5 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
          <img src={logo} alt="" className="w-8 h-8 shrink-0" />
          <span className="text-sm font-semibold text-foreground">درباره شیوری</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground leading-7">
            شیوری یک مینی‌اپ تلگرامی برای دنبال کردن انیمه‌هاست — علاقه‌مندی‌ها، برنامه پخش هفتگی
            و اعلان‌های جدید را یک‌جا مدیریت کن.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-4">نسخه {APP_VERSION}</p>
        </div>
      </div>
    </div>
  )
}

export default Profile
