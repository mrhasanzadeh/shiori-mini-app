-- فقط برای وقتی جدول anime از قبل ساخته شده و داده دارید ولی در اپ چیزی نمی‌بینید.
-- در Supabase برو به: SQL Editor → این را Paste کن → Run

-- روشن کردن RLS روی جدول anime
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;

-- حذف policy قبلی با همین نام (اگر بود)
DROP POLICY IF EXISTS "Allow public read" ON anime;

-- اجازهٔ خواندن برای همه (از جمله اپ با کلید anon)
CREATE POLICY "Allow public read" ON anime
  FOR SELECT
  USING (true);

-- بعد از اجرا، صفحهٔ اپ را یک بار رفرش کنید.
