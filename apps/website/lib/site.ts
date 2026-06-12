export const siteConfig = {
  name: 'شیوری',
  description: 'دانلود انیمه با زیرنویس فارسی — کاتالوگ انیمه‌های شیوری',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  imageColumn: process.env.NEXT_PUBLIC_ANIME_IMAGE_COLUMN ?? 'cover_image',
}
