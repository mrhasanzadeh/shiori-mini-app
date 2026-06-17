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

const toSession = (payload: AuthResponse): AppSession => ({
  token: payload.token,
  userId: payload.user_id,
  displayName: payload.display_name,
  email: payload.email,
  expiresAt: payload.expires_at,
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
    }>('/app-auth/session')

    const session: AppSession = {
      token: stored.token,
      userId: payload.user_id,
      displayName: payload.display_name,
      email: payload.email,
      expiresAt: payload.expires_at,
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
