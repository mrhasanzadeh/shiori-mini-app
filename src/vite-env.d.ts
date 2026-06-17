/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ANIME_IMAGE_COLUMN?: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
  readonly VITE_OMDB_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
