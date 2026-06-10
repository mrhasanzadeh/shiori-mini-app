-- زمان‌بندی هفتگی sync-external-scores
-- پیش‌نیاز: Edge Function deploy شده + Secrets تنظیم شده
--
-- 1) supabase functions deploy sync-external-scores
-- 2) Dashboard → Edge Functions → sync-external-scores → Secrets:
--    CRON_SECRET, OMDB_API_KEY (اختیاری)
-- 3) Dashboard → Integrations → Cron → Create job
--    (تب Schedules داخل Edge Functions دیگر وجود ندارد)
--    نوع: HTTP request یا Supabase Edge Function
--    Cron: 0 3 * * 0  (یکشنبه 03:00 UTC)
--    URL: https://olscbzxwcddwumxispst.supabase.co/functions/v1/sync-external-scores?limit=30
--    Headers: Authorization: Bearer YOUR_ANON_KEY
--             x-cron-secret: YOUR_CRON_SECRET
--
--    یا SQL آماده: sql/archive/supabase-cron-job-sync-external-scores.sql
--
-- یا pg_cron (اگر در پروژه فعال است):

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- SELECT cron.unschedule('sync-external-scores-weekly')
-- WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-external-scores-weekly');

-- SELECT cron.schedule(
--   'sync-external-scores-weekly',
--   '0 3 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-external-scores?limit=30',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_ANON_KEY',
--       'x-cron-secret', 'YOUR_CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- تست دستی (curl):
-- curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-external-scores?limit=5" \
--   -H "Authorization: Bearer YOUR_ANON_KEY" \
--   -H "x-cron-secret: YOUR_CRON_SECRET"

-- RPC (باید از sql/bootstrap/supabase-sync-external-scores-cron.sql اجرا شده باشد):
-- update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
