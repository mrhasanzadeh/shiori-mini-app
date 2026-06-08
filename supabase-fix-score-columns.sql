-- رفع numeric field overflow هنگام sync امتیاز AniList (۰–۱۰۰)
-- اگر cron خطای overflow داد، این فایل را در SQL Editor اجرا کنید.

ALTER TABLE anime
  ALTER COLUMN average_score TYPE NUMERIC(5, 2)
  USING average_score::numeric;
