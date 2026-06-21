import { getAppSessionHeaders } from './appSessionStorage'
import { getTelegramInitData } from './telegramRequestHeaders'

const rawBase = String(import.meta.env.VITE_SHIORI_API_URL ?? '').trim()

export const shioriApiBaseUrl = rawBase.replace(/\/$/, '')

export const isShioriApiEnabled = (): boolean => Boolean(shioriApiBaseUrl)

const buildHeaders = (extra?: HeadersInit): HeadersInit => {
  const headers = new Headers(extra)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const initData = getTelegramInitData()
  if (initData) headers.set('x-telegram-init-data', initData)

  for (const [key, value] of Object.entries(getAppSessionHeaders())) {
    headers.set(key, value)
  }

  return headers
}

export async function shioriFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!shioriApiBaseUrl) {
    throw new Error(
      'VITE_SHIORI_API_URL تنظیم نشده. در .env آدرس shiori-api را قرار دهید (مثلاً http://localhost:4001).'
    )
  }

  const url = `${shioriApiBaseUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: buildHeaders(init?.headers),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }

  const text = await res.text()
  if (!text.trim()) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
