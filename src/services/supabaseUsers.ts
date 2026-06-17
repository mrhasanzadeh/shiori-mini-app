import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { getTelegramInitData } from '../lib/telegramRequestHeaders'

type TelegramUserPayload = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export type { TelegramUserPayload }

export const registerTelegramUserVisit = async (user: TelegramUserPayload): Promise<void> => {
  if (!hasSupabaseConfig || !user?.id) return

  const initData = getTelegramInitData()
  if (!initData) return

  const { error: rpcError } = await supabase.rpc('register_telegram_user_visit', {
    p_telegram_user_id: user.id,
    p_first_name: user.first_name ?? '',
    p_last_name: user.last_name ?? null,
    p_username: user.username?.trim() || null,
    p_language_code: user.language_code ?? null,
    p_photo_url: user.photo_url ?? null,
    p_is_premium: user.is_premium ?? false,
    p_init_data: initData,
  })

  if (!rpcError) return

  if (import.meta.env.DEV) console.warn('registerTelegramUserVisit rpc:', rpcError.message)

  const { data, error: edgeError } = await supabase.functions.invoke('telegram-user-list', {
    body: {
      action: 'register',
      initData,
      telegram_user_id: user.id,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? null,
      username: user.username?.trim() || null,
      language_code: user.language_code ?? null,
      photo_url: user.photo_url ?? null,
      is_premium: user.is_premium ?? false,
    },
  })

  if (edgeError && import.meta.env.DEV) {
    console.warn('registerTelegramUserVisit edge:', edgeError.message)
  }

  const payload = data as { error?: string; reason?: string } | null
  if (payload?.error && import.meta.env.DEV) {
    console.warn('registerTelegramUserVisit edge:', payload.error, payload.reason ?? '')
  }
}
