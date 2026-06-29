# Shiori

Telegram Mini App for browsing and managing an anime catalog (Persian UI, RTL). Also works as a **web profile** (email login) outside Telegram.

## Features

- Catalog: home, search, anime detail, studios, translators
- Weekly schedule (AniList API, mapped to local catalog)
- User list (favorites + watch progress)
- Notifications inbox + Telegram DM preferences
- Link web account → Telegram (merge lists)

## Tech stack

| Layer | Stack |
|-------|--------|
| UI | React 18, TypeScript, Vite, Tailwind CSS |
| Platform | `@twa-dev/sdk` (Telegram Web App) |
| State | TanStack Query + Zustand |
| Backend | **shiori-api** (NestJS + Postgres) |
| Schedule | AniList GraphQL (`src/utils/api.ts`) |

Admin panel: **`shiori-admin`** (separate repo).

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_SHIORI_API_URL
npm run dev
```

Also run **shiori-api** locally (`http://localhost:4001`) and point `VITE_SHIORI_API_URL` at it.

```bash
npm run build        # production (API-only when VITE_SHIORI_API_URL is in .env)
npm run build:api    # same — explicit production mode
npm run preview
```

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SHIORI_API_URL` | **Yes** | REST API base (no trailing slash) |
| `VITE_TELEGRAM_BOT_USERNAME` | No | Bot username for deep-links / link-telegram |

## Architecture

```
src/services/
├── shioriCatalog.ts      # catalog via API
├── shioriUserList.ts     # favorites / progress via API
└── shioriAppAuth.ts      # Telegram initData auth
```

## Deploy

Self-hosted only — Docker image on GHCR (`docker-publish.yml`) or static `dist/` behind nginx. See [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
docker pull ghcr.io/<owner>/shiori:latest
docker run -d -p 8080:80 ghcr.io/<owner>/shiori:latest
```

## Related

- `shiori-api` — backend + cron
- `shiori-admin` — staff panel
- SQL migrations in `sql/` and `api.shiori.cloud/scripts/sql/`

## License

MIT
