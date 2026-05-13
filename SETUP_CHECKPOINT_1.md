# Checkpoint 1 Setup and Verification

This project has the authentication and tenant-safe data scaffold for Checkpoint 1.

## 1) Configure environment

Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) Create schema and seed data in Supabase

Run these files in Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

Seed credentials:

- Admin login: `admin` / `Pass@123`
- Shop login: `shopdemo` / `Pass@123`

## 3) Start app

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4) Checkpoint 1 acceptance tests

1. Login with admin user and verify redirect to `/admin`.
2. Login with shop user and verify redirect to `/shop`.
3. Access `/admin` with shop user session and confirm redirect protection.
4. Access `/shop` with admin session and confirm redirect protection.
5. Set `shops.is_blocked=true` for demo shop and verify shop login is denied.
6. Set `subscriptions.expires_at` to yesterday and verify shop login is denied.

## 5) Troubleshooting: "Invalid username or password"

If login fails with correct `admin` / `Pass@123` or `shopdemo` / `Pass@123`, the demo password hashes in the database may be wrong (early seed used a bad hash).

**Option A:** In Supabase SQL Editor, open and run [`supabase/fix-demo-passwords.sql`](supabase/fix-demo-passwords.sql) (same SQL as below).

**Option B:** Paste and run:

```sql
update users
set password_hash = '$2b$10$w2lEUCPYGIxud6nXgNLhjuielMtEViYZFinHRWPwURPWfphVCFXXS'
where username in ('admin', 'shopdemo');
```

That hash matches password `Pass@123`. Then try logging in again.

**Option C:** Re-run [`supabase/seed.sql`](supabase/seed.sql) — it now uses the correct hash and `ON CONFLICT ... DO UPDATE` so passwords refresh.

With `npm run dev`, check the terminal: password mismatch or Supabase errors are logged in development.

### Still stuck?

1. Restart dev server after editing `.env.local` (`Ctrl+C`, then `npm run dev` from the `billy-pos` folder).
2. Open **[http://localhost:3000/api/auth/db-check](http://localhost:3000/api/auth/db-check)** (dev only).  
   - `hasServiceRoleKey` must be **true**.  
   - `usersQueryOk` must be **true**.  
   - `sampleRows` should list `admin` / `shopdemo`. If `sampleRows` is empty, seed/fix SQL did not run on **this** Supabase project.
3. Try signing in again; on failure the login form may show a **debug** box (development only) with the failing step (`users_query`, `password`, `subscriptions_query`, etc.).

## 6) Notes

- Auth now checks:
  - user active status
  - shop blocked status (shop role)
  - subscription expiry (shop role)
- This completes the core Checkpoint 1 security baseline.
