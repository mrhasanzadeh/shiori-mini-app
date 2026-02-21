-- جدول قسمت‌ها: به ازای هر انیمه، هر ردیف = یک قسمت با لینک دانلود (مثلاً لینک تلگرام)
-- در Supabase: SQL Editor → اجرا کنید

-- جدول episodes به anime وصل است با anime_id
CREATE TABLE IF NOT EXISTS episodes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id      uuid NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  episode_number int4 NOT NULL,
  title         text,
  download_link text,
  UNIQUE(anime_id, episode_number)
);

-- اجازهٔ خواندن برای اپ
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON episodes;
CREATE POLICY "Allow public read" ON episodes FOR SELECT USING (true);

-- توضیح:
-- anime_id      = انیمهٔ مربوطه (از جدول anime)
-- episode_number = شماره قسمت (۱، ۲، ۳، ...)
-- title         = عنوان اختیاری (مثلاً «قسمت اول»)
-- download_link = لینکی که با کلیک روی دکمهٔ دانلود باز می‌شود (مثلاً لینک ربات تلگرام برای ارسال فایل)

-- مثال درج دو قسمت برای یک انیمه (anime_id را با id واقعی انیمه عوض کنید):
-- INSERT INTO episodes (anime_id, episode_number, title, download_link)
-- VALUES
--   ('uuid-انیمه-خودتان', 1, 'قسمت ۱', 'https://t.me/YourBot?start=get_abc123'),
--   ('uuid-انیمه-خودتان', 2, 'قسمت ۲', 'https://t.me/YourBot?start=get_def456');
