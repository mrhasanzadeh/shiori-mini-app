-- ============================================
-- ساختار ساده: فقط یک جدول برای انیمه
-- این فایل را در Supabase: SQL Editor اجرا کنید
-- ============================================

-- اگر جدول anime از قبل دارید و می‌خواهید از نو شروع کنید،
-- اول جدول قدیمی را بکاپ بگیرید یا حذف کنید (دقت کنید داده از بین می‌رود):
-- DROP TABLE IF EXISTS anime CASCADE;

-- جدول ساده انیمه (بدون هیچ رابطه و جدول دیگر)
CREATE TABLE IF NOT EXISTS anime (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  cover_image   text,
  synopsis      text,
  format        text,
  average_score numeric(3,2),
  episodes      int4,
  studio        text,
  season        text,
  start_date    text,
  end_date      text,
  created_at    timestamptz DEFAULT now()
);

-- توضیح ستون‌ها:
-- id          = شناسه یکتا (uuid)
-- title       = عنوان انیمه
-- cover_image = آدرس تصویر جلد (URL)
-- synopsis    = خلاصه داستان
-- format      = نوع / وضعیت (مثلاً TV، MOVIE، OVA)
-- average_score = امتیاز (مثلاً ۸.۵)
-- episodes    = تعداد قسمت‌ها
-- studio      = استودیو
-- season      = فصل پخش (مثلاً زمستان ۱۴۰۳)
-- start_date  = تاریخ شروع پخش
-- end_date    = تاریخ پایان پخش
-- created_at  = زمان اضافه شدن

-- اجازهٔ خواندن برای اپ (با کلید anon)
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON anime;
CREATE POLICY "Allow public read" ON anime FOR SELECT USING (true);

-- مثال درج یک رکورد تست:
-- INSERT INTO anime (title, cover_image, synopsis, format, average_score, episodes, studio, season, start_date, end_date)
-- VALUES (
--   'عنوان انیمه',
--   'https://example.com/image.jpg',
--   'خلاصه داستان...',
--   'TV',
--   8.5,
--   12,
--   'استودیو نمونه',
--   'زمستان ۱۴۰۳',
--   '1402/10',
--   '1403/01'
-- );
