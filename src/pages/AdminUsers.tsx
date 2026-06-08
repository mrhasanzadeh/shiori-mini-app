import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Crown,
  Pencil,
  Search,
  Shield,
  UserCircle2,
  Users,
  UserCheck,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TelegramUserEditor } from '@/components/admin/TelegramUserEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  APP_USER_ROLE_LABELS,
  APP_USER_ROLES,
  roleBadgeVariant,
  type AppUserRole,
} from '@/constants/userRoles'
import { cn } from '@/lib/utils'
import * as usersService from '../services/supabaseUsers'

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const formatNumber = (n: number) => n.toLocaleString('fa-IR')

type SortKey = NonNullable<usersService.GetTelegramUsersParams['sortBy']>
type RoleFilter = AppUserRole | 'all'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'last_seen_at', label: 'آخرین بازدید' },
  { key: 'first_seen_at', label: 'اولین ورود' },
  { key: 'username', label: 'یوزرنیم' },
  { key: 'app_role', label: 'نقش' },
  { key: 'visit_count', label: 'تعداد بازدید' },
  { key: 'favorites_count', label: 'علاقه‌مندی‌ها' },
  { key: 'first_name', label: 'نام' },
]

const displayName = (user: usersService.TelegramUserRow) => {
  const parts = [user.first_name, user.last_name].filter(Boolean)
  return parts.join(' ').trim() || 'کاربر'
}

const AdminUsers = () => {
  const [loading, setLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sortBy, setSortBy] = useState<SortKey>('last_seen_at')
  const [sortDir, setSortDir] =
    useState<usersService.GetTelegramUsersParams['sortDir']>('desc')

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [items, setItems] = useState<usersService.TelegramUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [overview, setOverview] = useState<usersService.TelegramUsersOverview | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<usersService.TelegramUserRow | null>(null)

  const totalPages = useMemo(() => {
    const t = Math.max(0, total)
    return Math.max(1, Math.ceil(t / pageSize))
  }, [total, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, sortBy, sortDir, roleFilter])

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const loadOverview = async () => {
    try {
      setOverviewLoading(true)
      const data = await usersService.getTelegramUsersOverview()
      setOverview(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در دریافت خلاصه کاربران'
      setError(msg)
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadList = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await usersService.getTelegramUsers({
        page,
        pageSize,
        query: debouncedQuery,
        roleFilter,
        sortBy,
        sortDir,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در دریافت لیست کاربران'
      setError(msg)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedQuery, roleFilter, sortBy, sortDir])

  useEffect(() => {
    void loadOverview()
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const onToggleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(col)
    setSortDir(col === 'first_name' || col === 'username' ? 'asc' : 'desc')
  }

  const openEditor = (user: usersService.TelegramUserRow) => {
    setSaveError(null)
    setEditingUser(user)
    setEditorOpen(true)
  }

  const handleSaveUser = async (payload: { app_role: AppUserRole; admin_notes: string | null }) => {
    if (!editingUser) return

    try {
      setSaving(true)
      setSaveError(null)
      await usersService.updateTelegramUserAdmin({
        telegram_user_id: editingUser.telegram_user_id,
        app_role: payload.app_role,
        admin_notes: payload.admin_notes,
      })
      setEditorOpen(false)
      setEditingUser(null)
      await Promise.all([loadList(), loadOverview()])
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره کاربر')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 text-start">
      <header className="space-y-1">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowRight className="h-4 w-4 shrink-0" />
          داشبورد
        </Link>
        <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 shrink-0 text-primary-400" />
          کاربران
        </h1>
        <p className="text-muted-foreground text-sm">
          مدیریت کاربران، یوزرنیم و نقش‌های دسترسی
        </p>
      </header>

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {saveError ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {saveError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="کل کاربران"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          loading={overviewLoading}
        />
        <StatCard
          label="فعال ۲۴ ساعت"
          value={overview?.activeLast24h ?? 0}
          icon={Clock}
          loading={overviewLoading}
          accent="primary"
        />
        <StatCard
          label="فعال ۷ روز"
          value={overview?.activeLast7d ?? 0}
          icon={UserCheck}
          loading={overviewLoading}
        />
        <StatCard
          label="پریمیوم"
          value={overview?.premiumUsers ?? 0}
          icon={Crown}
          loading={overviewLoading}
          accent="success"
        />
        <StatCard
          label="ادمین"
          value={overview?.adminUsers ?? 0}
          icon={Shield}
          loading={overviewLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو: نام، @username یا شناسه..."
              className="pe-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="فیلتر نقش" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نقش‌ها</SelectItem>
              {APP_USER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {APP_USER_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs lg:ms-auto">
            {loading
              ? '…'
              : debouncedQuery || roleFilter !== 'all'
                ? `${formatNumber(total)} نتیجه`
                : `${formatNumber(total)} کاربر`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sortOptions.map((opt) => {
            const active = sortBy === opt.key
            return (
              <Button
                key={opt.key}
                type="button"
                size="sm"
                variant={active ? 'default' : 'secondary'}
                className="gap-1"
                onClick={() => onToggleSort(opt.key)}
              >
                {opt.label}
                {active ? (
                  sortDir === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )
                ) : null}
              </Button>
            )
          })}
        </div>

        {!loading && items.length > 0 ? (
          <div className="text-muted-foreground hidden gap-3 px-4 text-[11px] sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
            <span>کاربر</span>
            <span>یوزرنیم</span>
            <span>نقش</span>
            <span className="text-end">عملیات</span>
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground py-12 text-center text-sm">در حال بارگذاری لیست...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="text-foreground font-medium">کاربری پیدا نشد</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {overview?.totalUsers === 0
                ? 'هنوز کاربری ثبت نشده. SQL مربوط به telegram_users را در Supabase اجرا کنید.'
                : 'فیلتر یا جستجو را تغییر دهید.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((user) => (
              <UserRow key={user.telegram_user_id} user={user} onEdit={() => openEditor(user)} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-muted-foreground text-xs">
              صفحه {formatNumber(page)} از {formatNumber(totalPages)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                بعدی
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <TelegramUserEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) setEditingUser(null)
        }}
        user={editingUser}
        saving={saving}
        onSave={handleSaveUser}
      />
    </div>
  )
}

const UsernameCell = ({ username }: { username: string | null }) => {
  if (!username) {
    return <span className="text-muted-foreground text-sm">بدون یوزرنیم</span>
  }

  return (
    <a
      href={`https://t.me/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-400 hover:text-primary-300 text-sm font-medium"
      dir="ltr"
      onClick={(e) => e.stopPropagation()}
    >
      @{username}
    </a>
  )
}

const UserRow = ({
  user,
  onEdit,
}: {
  user: usersService.TelegramUserRow
  onEdit: () => void
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const name = displayName(user)
  const avatarUrl = user.photo_url && !avatarFailed ? user.photo_url : null

  return (
    <div className="rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-muted flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <UserCircle2 className="text-muted-foreground h-7 w-7" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-foreground font-semibold">{name}</p>
              {user.is_premium ? <Badge variant="premium">پریمیوم</Badge> : null}
            </div>
            <p className="text-muted-foreground font-mono text-[11px] sm:hidden" dir="ltr">
              ID: {user.telegram_user_id}
            </p>
            <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px] sm:hidden">
              <UsernameCell username={user.username} />
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span className="hidden sm:inline">ID: {user.telegram_user_id}</span>
              <span>آخرین بازدید: {formatDateTime(user.last_seen_at)}</span>
              <span>{formatNumber(user.visit_count)} بازدید</span>
              <span>{formatNumber(user.favorites_count)} علاقه‌مندی</span>
            </div>
            {user.admin_notes ? (
              <p className="text-muted-foreground line-clamp-1 text-[11px]">
                یادداشت: {user.admin_notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="hidden sm:block">
          <UsernameCell username={user.username} />
        </div>

        <div className="flex items-center gap-2 sm:justify-center">
          <Badge variant={roleBadgeVariant(user.app_role)}>{APP_USER_ROLE_LABELS[user.app_role]}</Badge>
        </div>

        <div className="flex sm:justify-end">
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            ویرایش
          </Button>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  label: string
  value: number
  icon: typeof Users
  loading?: boolean
  accent?: 'primary' | 'success'
}) => (
  <div className="rounded-xl border bg-card px-4 py-3">
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <p
      className={cn(
        'mt-1 text-2xl font-bold tabular-nums',
        accent === 'primary' && 'text-primary-300',
        accent === 'success' && 'text-green-300'
      )}
    >
      {loading ? '…' : formatNumber(value)}
    </p>
  </div>
)

export default AdminUsers
