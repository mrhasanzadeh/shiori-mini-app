import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { getTelegramInitData } from '../lib/telegramRequestHeaders'
import { formatSupabaseError } from './supabaseAnime'

export type UserNotificationRow = {
  id: string
  kind: string
  title: string
  message: string
  href: string | null
  anime_id: string | null
  episode_number: number | null
  is_read: boolean
  created_at: string
}

export type NotificationPreferences = {
  notify_new_episode: boolean
  notify_telegram_dm: boolean
}

export type EpisodeReleaseNotifyResult = {
  ok: boolean
  campaign_id?: string
  inbox_created?: number
  telegram_candidates?: number
  telegram_sent?: number
  telegram_errors?: Array<{ chat_id: number; message: string }>
  error?: string
}

export type NotificationCampaignRow = {
  id: string
  kind: string
  anime_id: string | null
  anime_title: string | null
  episode_number: number | null
  title: string
  message: string
  recipient_count: number
  telegram_sent_count: number
  created_at: string
}

const requireInitData = (): string => {
  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('Telegram initData یافت نشد — مینی‌اپ را فقط از داخل Telegram باز کنید')
  }
  return initData
}

const mapNotificationRow = (row: Record<string, unknown>): UserNotificationRow => ({
  id: String(row.id),
  kind: String(row.kind ?? 'new_episode'),
  title: String(row.title ?? ''),
  message: String(row.message ?? ''),
  href: row.href != null ? String(row.href) : null,
  anime_id: row.anime_id != null ? String(row.anime_id) : null,
  episode_number:
    typeof row.episode_number === 'number'
      ? row.episode_number
      : row.episode_number != null
        ? Number(row.episode_number)
        : null,
  is_read: Boolean(row.is_read),
  created_at: String(row.created_at ?? new Date().toISOString()),
})

export const getMyNotifications = async (): Promise<UserNotificationRow[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase.rpc('get_my_notifications', {
    p_init_data: requireInitData(),
    p_limit: 50,
  })

  if (error) {
    throw new Error(formatSupabaseError(error))
  }

  if (!Array.isArray(data)) return []
  return data.map((row) => mapNotificationRow(row as Record<string, unknown>))
}

export const markMyNotificationRead = async (notificationId: string): Promise<void> => {
  if (!hasSupabaseConfig) return

  const { error } = await supabase.rpc('mark_my_notification_read', {
    p_init_data: requireInitData(),
    p_notification_id: notificationId,
  })

  if (error) throw new Error(formatSupabaseError(error))
}

export const markAllMyNotificationsRead = async (): Promise<void> => {
  if (!hasSupabaseConfig) return

  const { error } = await supabase.rpc('mark_all_my_notifications_read', {
    p_init_data: requireInitData(),
  })

  if (error) throw new Error(formatSupabaseError(error))
}

export const getMyNotificationPreferences = async (): Promise<NotificationPreferences> => {
  if (!hasSupabaseConfig) {
    return { notify_new_episode: true, notify_telegram_dm: true }
  }

  const { data, error } = await supabase.rpc('get_my_notification_preferences', {
    p_init_data: requireInitData(),
  })

  if (error) throw new Error(formatSupabaseError(error))

  const row = (data ?? {}) as Record<string, unknown>
  return {
    notify_new_episode: row.notify_new_episode !== false,
    notify_telegram_dm: row.notify_telegram_dm !== false,
  }
}

export const updateMyNotificationPreferences = async (
  prefs: Partial<NotificationPreferences>
): Promise<void> => {
  if (!hasSupabaseConfig) return

  const current = await getMyNotificationPreferences()

  const { error } = await supabase.rpc('update_my_notification_preferences', {
    p_init_data: requireInitData(),
    p_notify_new_episode: prefs.notify_new_episode ?? current.notify_new_episode,
    p_notify_telegram_dm: prefs.notify_telegram_dm ?? current.notify_telegram_dm,
  })

  if (error) throw new Error(formatSupabaseError(error))
}

export const formatNotificationTime = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.floor((now - then) / 60_000)
  if (diffMin < 1) return 'همین الان'
  if (diffMin < 60) return `${diffMin} دقیقه پیش`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ساعت پیش`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} روز پیش`
}
