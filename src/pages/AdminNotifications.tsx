import { useCallback, useEffect, useState } from 'react'
import { Bell, Film, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listNotificationCampaignsAdmin } from '../services/supabaseNotificationsAdmin'
import type { NotificationCampaignRow } from '../services/supabaseNotifications'

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const AdminNotifications = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationCampaignRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listNotificationCampaignsAdmin()
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            اعلان‌ها
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تاریخچهٔ ارسال — انتشار قسمت از صفحهٔ ویرایش انیمه انجام می‌شود.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
          به‌روزرسانی
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground leading-7">
        <p className="text-foreground font-medium mb-1">نحوهٔ ارسال</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            <Link to="/admin/anime" className="text-primary hover:underline">
              ویرایش انیمه
            </Link>{' '}
            → تب رسانه → قسمت‌ها
          </li>
          <li>روی «اعلان» کنار هر قسمت بزنید</li>
          <li>
            inbox برای کاربرانی که انیمه را در لیست دارند + پیام Telegram (اگر در پروفایل فعال
            باشد)
          </li>
        </ol>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>هنوز اعلانی ارسال نشده</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-border bg-card/40 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{row.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{row.message}</p>
                </div>
                <Badge variant="secondary">قسمت {row.episode_number ?? '—'}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {row.anime_id && row.anime_title && (
                  <Link
                    to={`/admin/anime/${encodeURIComponent(row.anime_id)}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Film className="w-3.5 h-3.5" />
                    {row.anime_title}
                  </Link>
                )}
                <span>inbox: {row.recipient_count.toLocaleString('fa-IR')} نفر</span>
                <span>Telegram: {row.telegram_sent_count.toLocaleString('fa-IR')} نفر</span>
                <span>{formatDateTime(row.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminNotifications
