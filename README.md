# Shiori Mini App

Telegram Mini App for browsing and managing an anime catalog (Persian UI, RTL).

## Features

- Catalog: home, search, anime detail, studios, translators
- Weekly schedule (AniList API, mapped to local catalog when possible)
- Favorites (persisted locally + Supabase-backed detail)
- Admin panel: anime CRUD, genres, studios, translators, file download stats, file packs for bot deep-links

## Tech stack

| Layer | Stack |
|-------|--------|
| UI | React 18, TypeScript, Vite, Tailwind CSS |
| Components | Radix / shadcn-style (`src/components/ui/`) |
| Platform | `@twa-dev/sdk` (Telegram Web App) |
| State | Zustand (`persist` for favorites, lists, theme) |
| Backend | Supabase (Postgres + client SDK) |
| Schedule | AniList GraphQL (`src/utils/api.ts`) |

## Getting started

```bash
npm install
cp .env.example .env   # fill Supabase + optional admin vars
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Lint / format:

```bash
npm run lint
npm run format
```

## Environment variables

See `.env.example`. Typed in `src/vite-env.d.ts`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_ANIME_IMAGE_COLUMN` | No | Image column on `anime` (default: `cover_image`) |
| `VITE_ADMIN_TELEGRAM_IDS` | No | Comma-separated Telegram user IDs for admin |
| `VITE_ADMIN_WEB_PASSWORD` | No | Browser-only admin password (dev) |
| `VITE_TELEGRAM_BOT_USERNAME` | No | Bot username for pack deep-links |

## Project structure

```
src/
├── App.tsx                 # Routes (user + /admin/*)
├── components/
│   ├── Layout.tsx          # Shell, bottom nav, admin sidebar
│   ├── AdminGate.tsx       # Admin auth
│   ├── admin/              # Shared admin UI (AdminCrudUi)
│   └── ui/                 # shadcn-style primitives
├── pages/                  # Route pages
├── services/
│   ├── supabaseAnime.ts    # Anime, episodes, genres, studios, translators
│   ├── supabaseFiles.ts    # File download stats
│   └── supabasePacks.ts    # File packs for Telegram bot
├── store/                  # Zustand stores
├── hooks/                  # useTelegramApp, useAnime, …
├── utils/
│   ├── api.ts              # App-level data (catalog, schedule)
│   └── theme.ts
└── lib/supabase.ts         # Supabase client
```

## Database

Schema used by the app is documented in **`docs/schema.md`**.

**SQL migration order:** [`docs/SQL_MIGRATIONS.md`](docs/SQL_MIGRATIONS.md)

**Deploy:** [`docs/DEPLOY.md`](docs/DEPLOY.md)

Security (before production):

- **`docs/rls.md`** — Supabase RLS policies and test checklist
- **`docs/admin-auth.md`** — admin gate (Telegram ID / web password)

Setup notes: **`SUPABASE_SETUP.md`**. The older **`docs/database-simple-schema.md`** describes an obsolete single-table design.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Vite dev server |
| `build` | `tsc` + production bundle |
| `lint` / `lint:fix` | ESLint |
| `format` | Prettier on `src/**/*.{ts,tsx,css}` |
| `preview` | Serve production build locally |

## License

MIT — see [LICENSE](LICENSE) if present.
