# BILLY POS — Release Runbook

## Deployment Pipeline

### 1. Prerequisites
- Node.js 20+
- Supabase project created and schema applied (`supabase/schema.sql`)
- Seed data applied (`supabase/seed.sql`)
- Vercel account connected to GitHub repo

### 2. Environment Variables (set in Vercel dashboard)
| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |

### 3. Deploy to Vercel
```bash
# Option A: Vercel CLI
npx vercel --prod

# Option B: Push to main branch (auto-deploy via GitHub integration)
git push origin main
```

### 4. Verify deployment
```bash
# Run smoke tests against production
node smoke-test.mjs https://your-deployment.vercel.app
```

---

## Smoke Tests

Run at any time against local or production:

```bash
# Local
node smoke-test.mjs http://localhost:3000

# Production
node smoke-test.mjs https://your-deployment.vercel.app
```

**Covers:** Health check · Auth · Cross-tenant isolation · Item CRUD · Billing flow · Totals math · Hold/Resume · Reports

---

## Health Monitoring

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | System health — returns 200 OK or 503 Degraded |

Point your uptime monitor (UptimeRobot, Better Uptime, etc.) at `/api/health`.

**Expected response:**
```json
{
  "status": "ok",
  "checks": {
    "env": { "ok": true },
    "database": { "ok": true, "latency_ms": 45 }
  }
}
```

---

## Backup & Restore

### Backup (Supabase)
1. Go to **Supabase Dashboard → Database → Backups**
2. Daily backups are automatic on Pro plan
3. For manual export: **Database → Backups → Download**

### Restore drill
```sql
-- Run in Supabase SQL Editor to verify data integrity
SELECT COUNT(*) FROM shops;
SELECT COUNT(*) FROM users WHERE role = 'shop';
SELECT COUNT(*) FROM bills WHERE status = 'paid';
SELECT SUM(total) FROM bills WHERE status = 'paid';
```

### Emergency password reset
If a shop loses login access, run in Supabase SQL Editor:
```sql
-- Reset password to Pass@123 (bcrypt hash)
UPDATE users
SET password_hash = '$2b$10$w2lEUCPYGIxud6nXgNLhjuielMtEViYZFinHRWPwURPWfphVCFXXS'
WHERE username = 'the_shop_username';
```

---

## Pilot Validation Checklist

Run through this with the first real shop before go-live:

### Admin flow
- [ ] Create new shop with Starter plan
- [ ] Verify shop user can log in with provisioned credentials
- [ ] Block the shop → verify login is denied
- [ ] Unblock the shop → verify login works again
- [ ] Update plan to Pro → verify feature flags change
- [ ] Reset shop password → verify new password works

### Shop flow
- [ ] Add 5+ items across 2+ categories
- [ ] Create a bill with 3+ items
- [ ] Apply a discount, verify total is correct
- [ ] Complete payment with Cash, UPI, and Card
- [ ] Hold a bill, serve another customer, resume the held bill
- [ ] Open 3 simultaneous bill tabs
- [ ] Verify bill appears in history with correct total
- [ ] View bill detail — line items must match cart
- [ ] Cancel a bill — verify status changes to cancelled
- [ ] Check Reports tab — today's total must match manual count

### Tenant isolation
- [ ] Log in as shop A — confirm shop B's items are not visible
- [ ] Log in as shop B — confirm shop A's bills are not visible
- [ ] Admin cannot access shop billing APIs (confirmed by smoke tests)

---

## Operational Logs

Logs are emitted as structured JSON to stdout (captured by Vercel automatically):

```json
{"level":"error","message":"[auth] Supabase users lookup failed","context":{"code":"PGRST..."},"timestamp":"2026-05-12T..."}
```

View logs in: **Vercel Dashboard → Deployments → Functions → Logs**

---

## P0/P1 Defect Status

| ID | Description | Status |
|---|---|---|
| — | No open P0/P1 defects | ✅ Clear |

---

## Known Limitations (Non-MVP Backlog)
- WhatsApp receipt sending not yet implemented
- Offline mode not supported — requires internet connection
- Staff hierarchy (cashier vs manager) deferred to v2
- Advanced analytics deferred to v2
