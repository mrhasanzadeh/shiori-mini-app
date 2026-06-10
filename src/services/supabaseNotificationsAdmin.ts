import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { readStoredPortalSession } from '../lib/adminPortalSessionStorage'
import { formatSupabaseError } from './supabaseAnime'
import type {
  EpisodeReleaseNotifyResult,
  NotificationCampaignRow,
} from './supabaseNotifications'

export const notifyEpisodeReleaseAdmin = async (payload: {
  animeId: string
  episodeNumber: number
  sendTelegram?: boolean
}): Promise<EpisodeReleaseNotifyResult> => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  const portalToken = readStoredPortalSession()?.token
  if (!portalToken) {
    throw new Error('نشست ادمین یافت نشد — دوباره وارد شوید')
  }

  const { data, error } = await supabase.functions.invoke('notify-episode-release', {
    body: {
      portalToken,
      animeId: payload.animeId,
      episodeNumber: payload.episodeNumber,
      sendTelegram: payload.sendTelegram !== false,
      miniAppBaseUrl: window.location.origin,
    },
  })

  if (error) {
    throw new Error(error.message || 'خطا در ارسال اعلان')
  }

  const result = (data ?? {}) as EpisodeReleaseNotifyResult
  if (result.error) {
    throw new Error(result.error)
  }
  if (!result.ok) {
    throw new Error('پاسخ نامعتبر از سرور اعلان')
  }

  return result
}

export const listNotificationCampaignsAdmin = async (): Promise<NotificationCampaignRow[]> => {
  if (!hasSupabaseConfig) return []

  const portalToken = readStoredPortalSession()?.token
  if (!portalToken) {
    throw new Error('نشست ادمین یافت نشد')
  }

  const { data, error } = await supabase.rpc('admin_list_notification_campaigns', {
    p_portal_token: portalToken,
    p_limit: 50,
  })

  if (error) {
    throw new Error(formatSupabaseError(error))
  }

  if (!Array.isArray(data)) return []

  return data.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      kind: String(r.kind ?? 'new_episode'),
      anime_id: r.anime_id != null ? String(r.anime_id) : null,
      anime_title: r.anime_title != null ? String(r.anime_title) : null,
      episode_number:
        typeof r.episode_number === 'number'
          ? r.episode_number
          : r.episode_number != null
            ? Number(r.episode_number)
            : null,
      title: String(r.title ?? ''),
      message: String(r.message ?? ''),
      recipient_count: Number(r.recipient_count) || 0,
      telegram_sent_count: Number(r.telegram_sent_count) || 0,
      created_at: String(r.created_at ?? ''),
    }
  })
}
