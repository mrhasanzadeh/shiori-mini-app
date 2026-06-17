export const APP_SESSION_KEY = 'shiori_app_session'

export type AppSession = {
  token: string
  userId: number
  displayName: string
  email: string | null
  expiresAt: string
  canLinkTelegram?: boolean
}

export const readStoredAppSession = (): AppSession | null => {
  try {
    const raw = localStorage.getItem(APP_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AppSession
    if (!parsed?.token || !parsed?.expiresAt || typeof parsed.userId !== 'number') {
      return null
    }

    const expiresMs = Date.parse(parsed.expiresAt)
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      localStorage.removeItem(APP_SESSION_KEY)
      return null
    }

    return {
      token: String(parsed.token),
      userId: parsed.userId,
      displayName: String(parsed.displayName ?? '').trim() || 'کاربر',
      email: parsed.email != null ? String(parsed.email) : null,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export const writeStoredAppSession = (session: AppSession): void => {
  localStorage.setItem(APP_SESSION_KEY, JSON.stringify(session))
}

export const clearStoredAppSession = (): void => {
  try {
    localStorage.removeItem(APP_SESSION_KEY)
  } catch {
    // ignore
  }
}

export const getAppSessionHeaders = (): Record<string, string> => {
  const token = readStoredAppSession()?.token?.trim()
  if (!token) return {}
  return { 'x-app-session-token': token }
}
