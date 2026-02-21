-- برای جدول anime که از قبل دارید — فقط فیلدهای جدید اضافه می‌شود
-- در Supabase: SQL Editor → Paste → Run

ALTER TABLE anime ADD COLUMN IF NOT EXISTS episodes   int4;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS studio     text;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS season     text;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS end_date   text;
