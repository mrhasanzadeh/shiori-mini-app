/** Build-time stub when VITE_SHIORI_API_URL is set — keeps @supabase/supabase-js out of the bundle. */

export type SupabaseClient = Record<string, never>

export const createClient = (): SupabaseClient => {
  throw new Error('Supabase is disabled in API-only builds')
}
