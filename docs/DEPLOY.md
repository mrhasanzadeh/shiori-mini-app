# Deploy — Shiori Mini App

## پیش‌نیاز

- Node 20+
- `.env` production با `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`
- **بدون** `VITE_ADMIN_WEB_PASSWORD` در build نهایی (فقط dev)
- `VITE_ADMIN_TELEGRAM_IDS` = IDهای ادمین واقعی

## Build

```bash
npm ci
npm run lint
npm run build
```

خروجی در پوشه `dist/` — SPA استاتیک.

## میزبانی (Telegram Mini App)

Mini App به **HTTPS** نیاز دارد. گزینه‌های رایج:

| سرویس | نکته |
|--------|------|
| Cloudflare Pages | `dist` + redirect `_redirects` یا `_routes.json` برای SPA |
| Vercel / Netlify | Framework: Vite، build: `npm run build`، output: `dist` |
| Vercel SPA | فایل `vercel.json` در root — همه مسیرها به `index.html` |
| GitHub Pages | `base` در `vite.config.ts` را روی نام repo تنظیم کنید |
| VPS + nginx | فایل‌های `dist` + `try_files $uri /index.html` |

### SPA fallback

همه مسیرها (`/admin`, `/anime/:id`, …) باید به `index.html` برگردند.

مثال nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## BotFather

1. Bot → Bot Settings → Menu Button → Configure → URL مینی‌اپ
2. URL = آدرس HTTPS deploy شده

## Supabase (قبل از launch)

SQLها را **به ترتیب** در [`docs/SQL_MIGRATIONS.md`](./SQL_MIGRATIONS.md) اجرا کنید.

حداقل production:

1. `supabase-rls-production.sql`
2. `supabase-sync-external-scores-cron.sql` + deploy Edge Function
3. `supabase-cron-sync-external-scores.sql` → Cron از **Integrations → Cron** یا SQL `supabase-cron-job-sync-external-scores.sql`

## CI

- **CI** (`.github/workflows/ci.yml`): lint + build روی PR/push
- **Artifact** (`.github/workflows/build-artifact.yml`): فایل `dist` برای دانلود دستی

## چک‌لیست بعد از deploy

- [ ] Home و Search لود می‌شوند
- [ ] Admin با Telegram ID یا نقش DB باز می‌شود
- [ ] web password در production کار نمی‌کند
- [ ] Favorite sync و popular slider درست است
- [ ] Cron امتیاز خارجی (اختیاری) لاگ دارد

## Related

- [admin-auth.md](./admin-auth.md)
- [security-phase1.md](./security-phase1.md)
- [rls.md](./rls.md)
- [schema.md](./schema.md)
