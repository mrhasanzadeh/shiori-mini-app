# SQL archive — دیگر اجرا نکنید

این فایل‌ها **جایگزین شده** با `supabase-rls-security-phase2-post-migration.sql` و/یا `supabase-consolidated-reapply.sql`.

| فایل | جایگزین |
| --- | --- |
| `supabase-rls-security-phase2-verify-fix.sql` | post-migration § verify HMAC |
| `supabase-fix-telegram-list-init-data.sql` | post-migration § list RPC |
| `supabase-fix-user-anime-list-upsert.sql` | post-migration § upsert |
| `supabase-fix-telegram-init-debug.sql` | post-migration § debug messages |
| `supabase-fix-telegram-init-decode.sql` | post-migration § initData decode |
| `supabase-fix-vault-token-audit.sql` | post-migration § vault trim |
| `supabase-rls-security-admin-users-fix.sql` | post-migration § admin overview |
| `supabase-rls-security-phase2-edge.sql` | post-migration § register internal |
| `supabase-admin-portal-auth-fix-crypt.sql` | `supabase-admin-panel-features.sql` (search_path + pgcrypto) |

برای به‌روزرسانی دیتابیس موجود، فقط **`supabase-consolidated-reapply.sql`** (root) را اجرا کنید — دادهٔ کاتالوگ/لیست کاربر پاک نمی‌شود.
