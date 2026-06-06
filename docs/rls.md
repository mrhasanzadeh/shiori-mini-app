# Supabase RLS policies

The mini app uses **`VITE_SUPABASE_ANON_KEY`** in the browser. Row Level Security (RLS) is the primary data boundary — not `AdminGate` (see [admin-auth.md](./admin-auth.md)).

Apply policies in the Supabase SQL Editor or via migrations in your Supabase project (not stored in this repo).

## Threat model (summary)

| Actor | Can reach | Should access |
|-------|-----------|---------------|
| Public user (Mini App) | Catalog, episodes, subtitles, studios, translators | **SELECT** on public tables only |
| Telegram admin (Mini App) | Same anon key + UI gate | **SELECT/INSERT/UPDATE/DELETE** on admin tables |
| Bot / backend service | service role key (never in this repo) | Full access as needed |

If RLS allows writes with the anon key, anyone who inspects the bundle can mutate data.

---

## Enable RLS

```sql
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE translators ENABLE ROW LEVEL SECURITY;
ALTER TABLE translator_anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_pack_items ENABLE ROW LEVEL SECURITY;
```

---

## Public read (catalog)

Minimum for the user-facing app:

```sql
-- Catalog
CREATE POLICY "Public read anime" ON anime FOR SELECT USING (true);
CREATE POLICY "Public read genres" ON genres FOR SELECT USING (true);
CREATE POLICY "Public read anime_genres" ON anime_genres FOR SELECT USING (true);
CREATE POLICY "Public read studios" ON studios FOR SELECT USING (true);
CREATE POLICY "Public read anime_studios" ON anime_studios FOR SELECT USING (true);
CREATE POLICY "Public read episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "Public read subtitles" ON subtitles FOR SELECT USING (true);
CREATE POLICY "Public read subtitle_packs" ON subtitle_packs FOR SELECT USING (true);
CREATE POLICY "Public read translators" ON translators FOR SELECT USING (true);
CREATE POLICY "Public read translator_anime" ON translator_anime FOR SELECT USING (true);

-- File stats (read-only in admin UI; adjust if files must stay private)
CREATE POLICY "Public read files" ON files FOR SELECT USING (true);
CREATE POLICY "Public read file_packs" ON file_packs FOR SELECT USING (true);
CREATE POLICY "Public read file_pack_items" ON file_pack_items FOR SELECT USING (true);
```

> **Production tip:** If `files` should not be public, replace with `USING (is_active = true)` or restrict to authenticated/service role only.

---

## Admin write policies

`AdminGate` only hides routes in the UI. For production, prefer one of:

1. **Service role** via a small backend/Edge Function for admin mutations (best).
2. **Authenticated Supabase users** with JWT claims (e.g. `auth.jwt() ->> 'role' = 'admin'`).
3. **Temporary dev-only:** allow all writes with anon key (not recommended for production).

Example (JWT claim — requires Supabase Auth setup):

```sql
CREATE POLICY "Admin write anime" ON anime
  FOR ALL
  USING (auth.jwt() ->> 'app_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'app_role' = 'admin');
```

Repeat for other admin-managed tables.

---

## Manual test checklist

Run in Supabase SQL Editor as **anon** (or from the app with DevTools):

### Public reads

- [ ] Home loads featured anime (`anime` SELECT)
- [ ] Search returns paginated results
- [ ] Anime detail loads episodes + subtitles
- [ ] Studio / translator pages load linked anime
- [ ] Schedule → click title mapped via `anilist_id` opens local detail
- [ ] Admin file download stats page loads `files` rows

### Writes blocked (production)

With anon key only, these should **fail** unless you intentionally opened writes:

- [ ] `INSERT INTO anime ...` from SQL Editor (anon)
- [ ] Admin save anime from browser without proper policy
- [ ] Delete genre / studio from admin

### Admin path (your chosen model)

- [ ] Admin can create/edit anime when using service role or admin JWT
- [ ] Non-admin cannot mutate catalog tables

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Empty catalog in app, data exists in dashboard | RLS enabled, no SELECT policy |
| Episodes load, subtitles empty | Missing policy on `subtitles` (see dev warning in `fetchAnimeById`) |
| Admin UI works but data unchanged | RLS blocks write; check Supabase logs |
| `getAllAnime` warning in console (dev) | Run public read policy on `anime` |

---

## Related docs

- [schema.md](./schema.md) — tables and columns
- [admin-auth.md](./admin-auth.md) — Telegram ID / web password gate
- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) — project setup
