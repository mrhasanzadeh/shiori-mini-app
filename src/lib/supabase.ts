import { createClient } from '@supabase/supabase-js'
import { getPortalRequestHeaders } from '@/lib/adminPortalSessionStorage'
import { getTelegramRequestHeaders } from '@/lib/telegramRequestHeaders'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url'
)

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.error('Supabase: VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در فایل .env تنظیم کنید.')
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

  // Edge Functions receive initData in JSON body — skip custom headers to avoid CORS preflight blocks
  if (url.includes('/functions/v1/')) {
    return init
  }

  const extra = { ...getTelegramRequestHeaders(), ...getPortalRequestHeaders() }
  if (Object.keys(extra).length === 0) return init

  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value)
  }

  return { ...init, headers }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (input, init) => fetch(input, mergeRequestHeaders(input, init)),
  },
})

export type SupabaseClientType = typeof supabase
