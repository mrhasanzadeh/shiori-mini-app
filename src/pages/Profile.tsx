import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClockIcon, FavouriteIcon, UserIcon } from 'hugeicons-react'
import { ChevronLeft } from 'lucide-react'
import { useAppAuth } from '../hooks/useAppAuth'
import { useUserAnimeList } from '../hooks/useUserAnimeList'
import { useNotifications } from '../hooks/useNotifications'
import { ProfileAuthPanel } from '../components/ProfileAuthPanel'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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

const ProfileGuestSkeleton = () => (
  <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center pb-24">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-400/30 border-t-primary-400" />
  </div>
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
      <div className="h-16 rounded-xl bg-muted" />
    </div>
    <div className="mx-4 mt-6 h-32 rounded-2xl bg-muted" />
  </div>
)

const Profile = () => {
  const { user, isReady, isAuthenticated, inTelegram, login, register, logout } = useAppAuth()
  const { stats } = useUserAnimeList()
  const {
    unreadCount,
    preferences,
    preferencesLoading,
    updatePreferences,
    updatingPreferences,
  } = useNotifications()
  const [avatarFailed, setAvatarFailed] = useState(false)

  const displayName = user?.displayName ?? 'کاربر'

  const initials = useMemo(() => getInitials(displayName), [displayName])
  const username =
    user?.source === 'telegram' && user.username ? `@${user.username}` : user?.email ?? null
  const avatarUrl =
    user?.photoUrl && !avatarFailed ? user.photoUrl : null
  const favoritesCount = stats.animeCount
  const avgRatingLabel =
    stats.averageRating != null ? toPersianNumber(stats.averageRating.toFixed(1)) : '—'

  if (!isReady) {
    return !inTelegram && !isAuthenticated ? <ProfileGuestSkeleton /> : <ProfileSkeleton />
  }

  const showPersonal = inTelegram || isAuthenticated

  if (!showPersonal && !inTelegram) {
    return (
      <ProfileAuthPanel
        layout="page"
        login={login}
        register={register}
        onSuccess={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="pb-24 bg-background text-foreground">
      {/* Hero — logged-in / Telegram */}
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
            <p className="text-sm text-muted-foreground mt-1 text-left">{username}</p>
          )}

          {user?.isPremium && (
            <span className="mt-2 inline-flex items-center rounded-full border border-primary-400/30 bg-primary-400/10 px-2.5 py-0.5 text-[11px] font-medium text-primary-400">
              Telegram Premium
            </span>
          )}
        </div>
      </div>

      {/* Stats — فعالیت تماشا */}
      <div className="mx-4 mt-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">فعالیت تماشا</h2>
        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/my-list"
            className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center active:scale-[0.98] transition-transform"
          >
            <p className="text-base font-bold text-foreground tabular-nums">
              {toPersianNumber(favoritesCount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-4">انیمه</p>
          </Link>
          <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">
              {toPersianNumber(stats.episodesWatched)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-4">قسمت دیده</p>
          </div>
          <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">{avgRatingLabel}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-4">میانگین امتیاز</p>
          </div>
        </div>
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
          hint={
            favoritesCount > 0
              ? `${toPersianNumber(favoritesCount)} انیمه · ${toPersianNumber(stats.episodesWatched)} قسمت`
              : 'لیست خالی است'
          }
        />
        <MenuItem
          to="/notifications"
          icon={<AlarmClockIcon className="w-5 h-5" />}
          label="اعلان‌ها"
          hint={unreadCount > 0 ? `${toPersianNumber(unreadCount)} پیام جدید` : 'همه خوانده شده'}
          badge={unreadCount}
        />
      </div>

      <div className="px-4 pt-5 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">تنظیمات اعلان</h2>
      </div>

      <div className="mx-4 rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 text-right">
            <Label htmlFor="notify-new-episode" className="text-sm font-medium text-foreground">
              قسمت جدید انیمه‌های لیست
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">inbox داخل مینی‌اپ</p>
          </div>
          <Switch
            id="notify-new-episode"
            checked={preferences?.notify_new_episode ?? true}
            disabled={preferencesLoading || updatingPreferences}
            onCheckedChange={(checked) => {
              void updatePreferences({ notify_new_episode: checked })
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 text-right">
            <Label htmlFor="notify-telegram-dm" className="text-sm font-medium text-foreground">
              پیام Telegram
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">وقتی مینی‌اپ بسته است</p>
          </div>
          <Switch
            id="notify-telegram-dm"
            checked={preferences?.notify_telegram_dm ?? true}
            disabled={preferencesLoading || updatingPreferences}
            onCheckedChange={(checked) => {
              void updatePreferences({ notify_telegram_dm: checked })
            }}
          />
        </div>
      </div>

      {!inTelegram && user?.canLinkTelegram && (
        <div className="mx-4 mt-5 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-4">
          <p className="text-sm font-medium text-foreground">ادغام با Telegram</p>
          <p className="text-xs text-muted-foreground mt-1 leading-6">
            به‌زودی می‌توانید حساب وب را به Telegram وصل کنید تا لیست و اعلان‌ها یکی شوند.
          </p>
        </div>
      )}

      {!inTelegram && isAuthenticated && (
        <div className="mx-4 mt-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => void logout()}>
            خروج از حساب
          </Button>
        </div>
      )}

      {/* About — logged-in only */}
      <div className="mx-4 mt-5 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
          <img src={logo} alt="" className="w-8 h-8 shrink-0" />
          <span className="text-sm font-semibold text-foreground">درباره شیوری</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground leading-7">
            {inTelegram
              ? 'شیوری یک مینی‌اپ تلگرامی برای دنبال کردن انیمه‌هاست — علاقه‌مندی‌ها، برنامه پخش هفتگی و اعلان‌های جدید را یک‌جا مدیریت کن.'
              : 'حساب وب شیوری — لیست شخصی و اعلان‌ها هم‌گام با کاتالوگ انیمه.'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-4">نسخه {APP_VERSION}</p>
        </div>
      </div>
    </div>
  )
}

export default Profile
