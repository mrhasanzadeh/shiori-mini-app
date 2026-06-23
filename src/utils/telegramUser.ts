import type { TelegramUserPayload } from '@/types/telegramUser'

type UnsafeTelegramUser = {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

const normalizeUsername = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().replace(/^@+/, '')
  return trimmed.length > 0 ? trimmed : undefined
}

const parseUsernameFromInitData = (initData: string): string | undefined => {
  if (!initData.trim()) return undefined

  try {
    const params = new URLSearchParams(initData)
    const raw = params.get('user')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { username?: string }
    return normalizeUsername(parsed.username)
  } catch {
    return undefined
  }
}

/** Telegram user with username fallback from signed initData string */
export const buildTelegramUserPayload = (
  unsafeUser: UnsafeTelegramUser | null | undefined,
  initData?: string
): TelegramUserPayload | null => {
  if (!unsafeUser || typeof unsafeUser.id !== 'number') return null

  const username =
    normalizeUsername(unsafeUser.username) ??
    (initData ? parseUsernameFromInitData(initData) : undefined)

  return {
    id: unsafeUser.id,
    first_name: unsafeUser.first_name ?? '',
    last_name: unsafeUser.last_name,
    username,
    language_code: unsafeUser.language_code,
    photo_url: unsafeUser.photo_url,
    is_premium: unsafeUser.is_premium,
  }
}
