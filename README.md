# Shiori Mini App

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
| `VITE_SUPABASE_URL` | No | Legacy fallback only |
| `VITE_SUPABASE_ANON_KEY` | No | Legacy fallback only |

## Architecture

```
src/services/
├── catalogSource.ts      # → shioriCatalog (API) or supabaseAnime
├── userDataSource.ts     # → shiori* (API) or supabase*
└── shioriAppAuth.ts      # web login + link-telegram
```

When `VITE_SHIORI_API_URL` is set at build time, `@supabase/supabase-js` is excluded from the bundle (~200KB saved). Legacy Supabase modules load only if the API URL is unset at runtime.

## Related

- `shiori-api` — backend + cron
- `shiori-admin` — staff panel
- Legacy SQL docs in `docs/` (schema migrated to Postgres, not Supabase-specific)

## License

MIT
