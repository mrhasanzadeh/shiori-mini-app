# Deploy — Shiori

Self-hosted SPA behind HTTPS (required for Telegram Mini App).

## پیش‌نیاز

- **shiori-api** روی همان سرور یا دامنه جدا (HTTPS)
- `.env` production با `VITE_SHIORI_API_URL` (بدون slash انتهایی)
- دامنه + TLS (nginx / Caddy / Cloudflare)

## گزینه ۱ — Docker (پیشنهادی)

Image از GitHub Actions روی GHCR:

```bash
docker pull ghcr.io/<owner>/shiori:latest
docker run -d --name shiori -p 8080:80 \
  ghcr.io/<owner>/shiori:latest
```

`VITE_SHIORI_API_URL` موقع **build** داخل image bake می‌شود. برای تغییر URL، repo variable `VITE_SHIORI_API_URL` را ست کنید و workflow را دوباره اجرا کنید.

## گزینه ۲ — nginx + فایل‌های استاتیک

```bash
npm ci
VITE_SHIORI_API_URL=https://api.example.com npm run build:api
# کپی dist/ به سرور
```

nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;

    root /var/www/shiori;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## BotFather

Bot Settings → Menu Button → URL مینی‌اپ = `https://app.example.com`

## Cron (API)

امتیاز خارجی از **shiori-api** (`/api/v1/cron/sync-external-scores`) — نه Postgres Edge.

## CI

| Workflow | کار |
|----------|-----|
| `ci.yml` | lint + build روی PR/push |
| `docker-publish.yml` | push image به GHCR |
| `build-artifact.yml` | artifact `dist/` (اختیاری) |

## چک‌لیست بعد از deploy

- [ ] Home و Search لود می‌شوند
- [ ] تصاویر کاver از API (`/api/v1/media/serve/...`) باز می‌شوند
- [ ] لیست من و اعلان‌ها کار می‌کنند
- [ ] link-telegram در Profile
- [ ] Mini App در Telegram با HTTPS باز می‌شود

## Related

- [shiori-api DEPLOY](https://github.com/mrhasanzadeh/shiori-api) — backend
- [admin-auth.md](./admin-auth.md) — پنل در **shiori-admin** (repo جدا)
