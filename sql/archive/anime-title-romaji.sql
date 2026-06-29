-- عنوان روماجی انیمه (اختیاری) — برای جستجو در پنل و نمایش در جزئیات
ALTER TABLE anime ADD COLUMN IF NOT EXISTS title_romaji text;
