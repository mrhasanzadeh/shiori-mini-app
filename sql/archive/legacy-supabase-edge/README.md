# Legacy Supabase artifacts

These files are **not used at runtime** by the mini app or dash anymore.
Data access goes through `api.shiori.cloud` + Postgres (`shiori-cloud`).

## Contents

- `supabase/` — former Edge Functions (`telegram-user-list`, `sync-external-scores`, …)
- `SUPABASE_SETUP.md` — old setup guide
- `../` (parent `sql/archive/`) — SQL migrations originally applied in Supabase SQL Editor

Keep for historical reference when reading old schema/RLS decisions.
