-- لینک پک یک‌جای تمام قسمت‌های یک انیمه (اجرای دستی در Supabase SQL Editor)
ALTER TABLE anime ADD COLUMN IF NOT EXISTS episode_pack_title text;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS episode_pack_link text;
