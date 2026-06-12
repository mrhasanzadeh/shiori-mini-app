import { createShioriDb } from '@shiori/db'
import { siteConfig } from '@/lib/site'

let db: ReturnType<typeof createShioriDb> | null = null

export const getDb = () => {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را تنظیم کنید.')
  }
  if (!db) {
    db = createShioriDb({
      supabaseUrl: siteConfig.supabaseUrl,
      supabaseAnonKey: siteConfig.supabaseAnonKey,
      imageColumn: siteConfig.imageColumn,
    })
  }
  return db
}

export const hasDbConfig = () =>
  Boolean(siteConfig.supabaseUrl && siteConfig.supabaseAnonKey)
