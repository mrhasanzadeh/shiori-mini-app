import { shioriFetch } from '../lib/shioriApi'
import type { TelegramUserPayload } from './supabaseUsers'

export const registerTelegramUserVisit = async (user: TelegramUserPayload): Promise<void> => {
  if (!user?.id) return

  await shioriFetch('/telegram-users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_user_id: user.id,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? null,
      username: user.username?.trim() || null,
      language_code: user.language_code ?? null,
      photo_url: user.photo_url ?? null,
      is_premium: user.is_premium ?? false,
    }),
  })
}
