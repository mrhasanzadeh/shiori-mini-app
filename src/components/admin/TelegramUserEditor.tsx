import { useEffect, useState } from 'react'
import { Crown, KeyRound, Mail, UserCircle2 } from 'lucide-react'
import { AdminEditSheet, AdminEditSheetActions } from '@/components/admin/AdminEditSheet'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  APP_USER_ROLE_LABELS,
  APP_USER_ROLES,
  roleBadgeVariant,
  type AppUserRole,
} from '@/constants/userRoles'
import type { TelegramUserRow } from '@/services/supabaseUsers'

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const formatNumber = (n: number) => n.toLocaleString('fa-IR')

const displayName = (user: TelegramUserRow) => {
  const parts = [user.first_name, user.last_name].filter(Boolean)
  return parts.join(' ').trim() || 'کاربر'
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: TelegramUserRow | null
  saving?: boolean
  isLastAdmin?: boolean
  onSave: (payload: {
    app_role: AppUserRole
    admin_notes: string | null
    username: string
    email: string | null
    password: string | null
    portal_login_enabled: boolean
  }) => void | Promise<void>
}

export const TelegramUserEditor = ({
  open,
  onOpenChange,
  user,
  saving = false,
  isLastAdmin = false,
  onSave,
}: Props) => {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [role, setRole] = useState<AppUserRole>('user')
  const [notes, setNotes] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [portalLoginEnabled, setPortalLoginEnabled] = useState(true)

  useEffect(() => {
    if (!user) return
    setRole(user.app_role)
    setNotes(user.admin_notes ?? '')
    setUsername(user.username ?? '')
    setEmail(user.email ?? '')
    setPassword('')
    setPortalLoginEnabled(user.portal_login_enabled)
    setAvatarFailed(false)
  }, [user])

  if (!user) return null

  const name = displayName(user)
  const avatarUrl = user.photo_url && !avatarFailed ? user.photo_url : null
  const canUsePortal = role === 'admin' || role === 'moderator'

  return (
    <AdminEditSheet
      open={open}
      onOpenChange={onOpenChange}
      title="ویرایش کاربر"
      footer={
        <AdminEditSheetActions
          saving={saving}
          saveLabel="ذخیره تغییرات"
          onSave={() =>
            void onSave({
              app_role: role,
              admin_notes: notes.trim() || null,
              username: username.trim().replace(/^@+/, ''),
              email: email.trim() || null,
              password: password.trim() || null,
              portal_login_enabled: portalLoginEnabled,
            })
          }
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <UserCircle2 className="text-muted-foreground h-9 w-9" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-foreground font-semibold">{name}</p>
          <p className="text-sm" dir="ltr">
            {user.username ? (
              <a
                href={`https://t.me/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                @{user.username}
              </a>
            ) : (
              <span className="text-muted-foreground">بدون یوزرنیم</span>
            )}
          </p>
          <p className="text-muted-foreground font-mono text-xs" dir="ltr">
            ID: {user.telegram_user_id}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {user.is_premium ? <Badge variant="premium">پریمیوم</Badge> : null}
            <Badge variant={roleBadgeVariant(user.app_role)}>
              {APP_USER_ROLE_LABELS[user.app_role]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 px-3 py-3 text-xs text-muted-foreground space-y-1">
        <p>اولین ورود: {formatDateTime(user.first_seen_at)}</p>
        <p>آخرین بازدید: {formatDateTime(user.last_seen_at)}</p>
        <p>
          {formatNumber(user.visit_count)} بازدید · {formatNumber(user.favorites_count)} علاقه‌مندی
          {user.language_code ? ` · زبان ${user.language_code}` : ''}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-foreground text-sm font-medium">یوزرنیم تلگرام</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username (بدون @)"
          dir="ltr"
          className="font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">
          اگر تلگرام username نفرستاد، می‌توانید دستی وارد کنید. خالی = بدون یوزرنیم.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-foreground text-sm font-medium">نقش در اپ</label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as AppUserRole)}
          disabled={isLastAdmin && user.app_role === 'admin'}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APP_USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {APP_USER_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLastAdmin && user.app_role === 'admin' ? (
          <p className="text-amber-300/90 text-xs leading-relaxed">
            این تنها ادمین سیستم است؛ تا وقتی ادمین دیگری اضافه نشود، نقشش قابل تغییر نیست.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            نقش «ادمین» یا «مدیر محتوا» برای ورود وب با ایمیل/رمز لازم است.
          </p>
        )}
      </div>

      {canUsePortal ? (
        <div className="space-y-4 rounded-xl border border-border bg-muted/15 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <KeyRound className="h-4 w-4 shrink-0 text-primary-400" />
            ورود وب پنل ادمین
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              ایمیل ورود
            </Label>
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              dir="ltr"
              className="font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-password">رمز عبور</Label>
            <Input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                user.has_portal_password ? 'برای تغییر، رمز جدید وارد کنید' : 'رمز جدید'
              }
              dir="ltr"
              className="font-mono text-sm"
              autoComplete="new-password"
            />
            {user.has_portal_password && !password ? (
              <p className="text-muted-foreground text-xs">رمز فعلی تنظیم شده — خالی بگذارید تا عوض نشود.</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="portal-enabled" className="text-sm">
                ورود وب فعال
              </Label>
              <p className="text-muted-foreground text-xs">غیرفعال = حتی با رمز هم نمی‌تواند وارد شود.</p>
            </div>
            <Switch
              id="portal-enabled"
              checked={portalLoginEnabled}
              onCheckedChange={setPortalLoginEnabled}
            />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs leading-relaxed">
          برای ورود وب، نقش را «ادمین» یا «مدیر محتوا» انتخاب کنید؛ سپس ایمیل و رمز را تنظیم کنید.
        </p>
      )}

      <div className="space-y-2">
        <label className="text-foreground text-sm font-medium">یادداشت داخلی</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="یادداشت فقط برای تیم ادمین..."
          rows={3}
        />
      </div>

      {role === 'admin' ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary-500/25 bg-primary-500/10 px-3 py-2 text-xs text-primary-200">
          <Crown className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            این کاربر دسترسی کامل پنل دارد. با ایمیل و رمز بالا می‌تواند از مرورگر وارد شود.
          </span>
        </div>
      ) : null}
    </AdminEditSheet>
  )
}
