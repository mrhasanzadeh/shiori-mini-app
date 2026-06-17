# Shiori Mini App

Telegram Mini App for browsing and managing an anime catalog (Persian UI, RTL).

## Features

- Catalog: home, search, anime detail, studios, translators
- Weekly schedule (AniList API, mapped to local catalog when possible)
- Favorites (persisted locally + Supabase-backed detail)
- User list, notifications, weekly schedule

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
| `VITE_TELEGRAM_BOT_USERNAME` | No | Bot username for pack deep-links |

Admin panel lives in **`shiori-admin`** (separate repo).

## Project structure

```
src/
├── App.tsx                 # User routes
├── components/
│   ├── Layout.tsx          # Shell + bottom nav
│   └── ui/                 # shadcn-style primitives
├── pages/                  # Route pages
├── services/               # Supabase data layer
├── store/                  # Zustand stores
├── hooks/
├── utils/
└── lib/supabase.ts
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
