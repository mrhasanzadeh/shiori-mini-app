-- Cron هفتگی برای sync-external-scores
-- ⚠️ Schedules داخل Edge Functions نیست — از pg_cron استفاده می‌شود.
-- Dashboard: Integrations → Cron (یا Database → Extensions)
--
-- قبل از اجرا جایگزین کنید:
--   YOUR_ANON_KEY     = VITE_SUPABASE_ANON_KEY از .env
--   YOUR_CRON_SECRET  = محتوای .env.cron.local

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- حذف job قبلی (اگر بود)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-external-scores-weekly';

SELECT cron.schedule(
  'sync-external-scores-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://olscbzxwcddwumxispst.supabase.co/functions/v1/sync-external-scores?limit=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- بررسی:
-- SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'sync-external-scores-weekly';
