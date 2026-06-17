import { shioriFetch } from '../lib/shioriApi'
import {
  clearStoredAppSession,
  readStoredAppSession,
  writeStoredAppSession,
  type AppSession,
} from '../lib/appSessionStorage'

type AuthResponse = {
  ok: boolean
  token: string
  user_id: number
  display_name: string
  email: string | null
  expires_at: string
}

const toSession = (payload: AuthResponse & { can_link_telegram?: boolean }): AppSession => ({
  token: payload.token,
  userId: payload.user_id,
  displayName: payload.display_name,
  email: payload.email,
  expiresAt: payload.expires_at,
  canLinkTelegram: payload.can_link_telegram,
})

export const loginAppUser = async (email: string, password: string): Promise<AppSession> => {
  const payload = await shioriFetch<AuthResponse>('/app-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const session = toSession(payload)
  writeStoredAppSession(session)
  return session
}

export const registerAppUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<AppSession> => {
  const payload = await shioriFetch<AuthResponse>('/app-auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  })

  const session = toSession(payload)
  writeStoredAppSession(session)
  return session
}

export const verifyAppSession = async (): Promise<AppSession | null> => {
  const stored = readStoredAppSession()
  if (!stored) return null

  try {
    const payload = await shioriFetch<{
      ok: boolean
      user_id: number
      display_name: string
      email: string | null
      expires_at: string
      can_link_telegram?: boolean
    }>('/app-auth/session')

    const session: AppSession = {
      token: stored.token,
      userId: payload.user_id,
      displayName: payload.display_name,
      email: payload.email,
      expiresAt: payload.expires_at,
      canLinkTelegram: payload.can_link_telegram,
    }
    writeStoredAppSession(session)
    return session
  } catch {
    clearStoredAppSession()
    return null
  }
}

export const logoutAppUser = async (): Promise<void> => {
  const stored = readStoredAppSession()
  if (stored?.token) {
    try {
      await shioriFetch('/app-auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors on logout
    }
  }
  clearStoredAppSession()
}

export type TelegramLinkStartResponse = {
  ok: boolean
  token: string
  telegram_url: string
  expires_at: string
}

export type TelegramLinkStatus = 'pending' | 'completed' | 'expired' | 'invalid'

export const startTelegramAccountLink = async (payload?: {
  botUsername?: string
}): Promise<TelegramLinkStartResponse> =>
  shioriFetch<TelegramLinkStartResponse>('/app-auth/link-telegram/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot_username: payload?.botUsername?.trim() || undefined,
    }),
  })

export const getTelegramLinkStatus = async (
  token: string
): Promise<{ status: TelegramLinkStatus }> => {
  const qs = new URLSearchParams()
  qs.set('token', token)
  return shioriFetch<{ status: TelegramLinkStatus }>(
    `/app-auth/link-telegram/status?${qs.toString()}`
  )
}

export const completeTelegramAccountLink = async (token: string): Promise<{
  ok: boolean
  merged?: boolean
  already_completed?: boolean
}> =>
  shioriFetch('/app-auth/link-telegram/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

export const linkTelegramWithCredentials = async (payload: {
  email: string
  password: string
}): Promise<{ ok: boolean; merged?: boolean }> =>
  shioriFetch('/app-auth/link-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  })
