import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getTelegramRequestHeaders } from '@/lib/telegramRequestHeaders'
import { isShioriApiEnabled } from '@/lib/shioriApi'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url'
)

if (!hasSupabaseConfig && !isShioriApiEnabled()) {
  // eslint-disable-next-line no-console
  console.error(
    'Backend: VITE_SHIORI_API_URL یا VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY را در .env تنظیم کنید.'
  )
}

const mergeRequestHeaders = (
  input: RequestInfo | URL,
  init?: RequestInit
): RequestInit | undefined => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url

  if (url.includes('/functions/v1/')) {
    return init
  }

  const extra = { ...getTelegramRequestHeaders() }
  if (Object.keys(extra).length === 0) return init

  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value)
  }

  return { ...init, headers }
}

const createSupabaseClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (input, init) => fetch(input, mergeRequestHeaders(input, init)),
    },
  })

let supabaseClient: SupabaseClient | null = null

/** Supabase client — lazy; only used when API URL is unset. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!hasSupabaseConfig) {
      throw new Error(
        'Supabase پیکربندی نشده. VITE_SHIORI_API_URL را تنظیم کنید یا کلیدهای Supabase را در .env بگذارید.'
      )
    }
    if (!supabaseClient) supabaseClient = createSupabaseClient()
    const value = supabaseClient[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(supabaseClient) : value
  },
})

export type SupabaseClientType = typeof supabase
