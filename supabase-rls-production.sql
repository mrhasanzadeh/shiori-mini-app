-- RLS برای production — فاز ۱: خواندن عمومی + جداول کاربر
-- ⚠️ پنل ادمین فعلاً با anon key می‌نویسد؛ سیاست‌های write کاتالوگ در فاز ۲ (Edge Function) اضافه می‌شود.
-- این فایل را در Supabase SQL Editor اجرا کنید.

-- ─── Enable RLS ───
ALTER TABLE IF EXISTS anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anime_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anime_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subtitle_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS translators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS translator_anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS file_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS file_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_anime_list ENABLE ROW LEVEL SECURITY;

-- ─── Catalog: public read ───
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'anime', 'genres', 'anime_genres', 'studios', 'anime_studios',
    'episodes', 'subtitles', 'subtitle_packs', 'translators', 'translator_anime',
    'files', 'file_packs', 'file_pack_items'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "Public read %I" ON %I FOR SELECT USING (true)',
      t, t
    );
  END LOOP;
END $$;

-- ─── telegram_users: read only (writes via SECURITY DEFINER RPC) ───
DROP POLICY IF EXISTS "Public read telegram_users" ON telegram_users;
CREATE POLICY "Public read telegram_users"
  ON telegram_users FOR SELECT
  USING (true);

-- ─── user_anime_list (مینی‌اپ — telegram_user_id از WebApp) ───
DROP POLICY IF EXISTS "Public read user_anime_list" ON user_anime_list;
CREATE POLICY "Public read user_anime_list"
  ON user_anime_list FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert user_anime_list" ON user_anime_list;
CREATE POLICY "Public insert user_anime_list"
  ON user_anime_list FOR INSERT
  WITH CHECK (telegram_user_id IS NOT NULL);

DROP POLICY IF EXISTS "Public update user_anime_list" ON user_anime_list;
CREATE POLICY "Public update user_anime_list"
  ON user_anime_list FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Public delete user_anime_list" ON user_anime_list;
CREATE POLICY "Public delete user_anime_list"
  ON user_anime_list FOR DELETE
  USING (true);

-- ─── فاز ۲ (اختیاری — فقط اگر پنل ادمین با anon key می‌نویسد) ───
-- بدون این policies، INSERT/UPDATE/DELETE روی کاتالوگ از مرورگر block می‌شود.
-- Uncomment only if you accept anon-key admin writes (dev / pre-launch):

/*
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'anime', 'genres', 'anime_genres', 'studios', 'anime_studios',
    'episodes', 'subtitles', 'subtitle_packs', 'translators', 'translator_anime',
    'files', 'file_packs', 'file_pack_items'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anon admin write %I" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "Anon admin write %I" ON %I FOR ALL USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;
*/
