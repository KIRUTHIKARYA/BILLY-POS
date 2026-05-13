/**
 * BILLY POS — Smoke Test Suite
 * 
 * Tests all critical flows end-to-end against a running server.
 * Run with: node smoke-test.mjs [base_url]
 * 
 * Example: node smoke-test.mjs http://localhost:3000
 * 
 * Exit code 0 = all passed, 1 = failures found.
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
const failures = [];

// ── Helpers ─────────────────────────────────────────────────────────────────

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}${detail ? `: ${detail}` : ""}`);
    failed++;
    failures.push(name);
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body, headers: res.headers, ok: res.ok };
}

// Session cookie jar (simple)
let sessionCookie = "";

async function authedApi(path, options = {}) {
  return api(path, {
    ...options,
    headers: { ...(options.headers ?? {}), Cookie: sessionCookie },
  });
}

// ── Test suites ──────────────────────────────────────────────────────────────

async function testHealth() {
  console.log("\n📋 Health Check");
  const r = await api("/api/health");
  assert("GET /api/health returns 200", r.status === 200);
  assert("DB check passes", r.body?.checks?.database?.ok === true, JSON.stringify(r.body?.checks));
  assert("Env check passes", r.body?.checks?.env?.ok === true);
}

async function testUnauthRedirects() {
  console.log("\n🔒 Unauthenticated Access");
  const r1 = await api("/api/shop/bills");
  assert("GET /api/shop/bills without session → 401", r1.status === 401);
  const r2 = await api("/api/shop/items");
  assert("GET /api/shop/items without session → 401", r2.status === 401);
  const r3 = await api("/api/admin/shops");
  assert("GET /api/admin/shops without session → 401", r3.status === 401);
}

async function testAdminLogin() {
  console.log("\n🔑 Admin Login");
  const r = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "Pass@123" }),
  });
  assert("Admin login → 200", r.status === 200, JSON.stringify(r.body));
  assert("Admin redirectPath is /admin", r.body?.redirectPath === "/admin");

  // Save cookie
  const setCookie = r.headers.get("set-cookie") ?? "";
  sessionCookie = setCookie.split(";")[0] ?? "";
  assert("Session cookie set", sessionCookie.includes("billy_session"));
}

async function testAdminDashboard() {
  console.log("\n🏢 Admin Dashboard");
  const r = await authedApi("/api/admin/shops");
  assert("GET /api/admin/shops → 200", r.status === 200, JSON.stringify(r.body));
  assert("Response has stats", typeof r.body?.stats?.total === "number");
  assert("Response has shops array", Array.isArray(r.body?.shops));
}

async function testCrossTenantBlocked() {
  console.log("\n🛡️ Cross-Tenant Isolation (admin cannot access shop APIs)");
  const r = await authedApi("/api/shop/bills");
  assert("Admin cannot access /api/shop/bills → 401", r.status === 401);
  const r2 = await authedApi("/api/shop/items");
  assert("Admin cannot access /api/shop/items → 401", r2.status === 401);
}

async function testAdminLogout() {
  console.log("\n🚪 Admin Logout");
  const r = await authedApi("/api/auth/logout", { method: "POST" });
  assert("Logout → 200", r.status === 200);
  sessionCookie = ""; // clear in-memory cookie
  // After logout, admin APIs should be blocked
  const r2 = await authedApi("/api/admin/shops");
  assert("Post-logout admin API → 401", r2.status === 401);
}

async function testShopLogin() {
  console.log("\n🔑 Shop Login");
  const r = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "shopdemo", password: "Pass@123" }),
  });
  assert("Shop login → 200", r.status === 200, JSON.stringify(r.body));
  assert("Shop redirectPath is /shop", r.body?.redirectPath === "/shop");

  const setCookie = r.headers.get("set-cookie") ?? "";
  sessionCookie = setCookie.split(";")[0] ?? "";
  assert("Session cookie set", sessionCookie.includes("billy_session"));
}

async function testSubscriptionEnforcement() {
  console.log("\n📋 Subscription Enforcement");
  const r = await authedApi("/api/shop/subscription");
  assert("GET /api/shop/subscription → 200", r.status === 200);
  assert("Subscription is active (ok=true)", r.body?.ok === true, JSON.stringify(r.body));
  assert("billing_enabled is true", r.body?.flags?.billing_enabled === true);
}

let createdItemId = "";

async function testItemCRUD() {
  console.log("\n🛒 Item CRUD");
  // Create
  const create = await authedApi("/api/shop/items", {
    method: "POST",
    body: JSON.stringify({ name: "Smoke Test Item", category: "Test", price: 99.99 }),
  });
  assert("POST /api/shop/items → 201", create.status === 201, JSON.stringify(create.body));
  createdItemId = create.body?.item?.id ?? "";
  assert("Created item has id", Boolean(createdItemId));

  // List
  const list = await authedApi("/api/shop/items");
  assert("GET /api/shop/items → 200", list.status === 200);
  const found = (list.body?.items ?? []).some((i) => i.id === createdItemId);
  assert("Created item appears in list", found);

  // Update
  const update = await authedApi(`/api/shop/items/${createdItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: "Smoke Test Item Updated", price: 49.99 }),
  });
  assert("PATCH /api/shop/items/:id → 200", update.status === 200);
}

let createdBillId = "";

async function testBillingFlow() {
  console.log("\n💰 Billing Flow");
  if (!createdItemId) { console.log("  ⏭️  Skipped (no item id)"); return; }

  const r = await authedApi("/api/shop/bills", {
    method: "POST",
    body: JSON.stringify({
      items: [{ item_id: createdItemId, item_name: "Smoke Test Item", unit_price: 49.99, quantity: 2 }],
      discount: 5,
      extra_charges: 0,
      payment_method: "cash",
    }),
  });
  assert("POST /api/shop/bills → 201", r.status === 201, JSON.stringify(r.body));

  const bill = r.body?.bill;
  createdBillId = bill?.id ?? "";
  assert("Bill has id", Boolean(createdBillId));
  assert("Bill subtotal correct (2 × 49.99 = 99.98)", Number(bill?.subtotal) === 99.98);
  assert("Bill total correct (99.98 − 5 = 94.98)", Number(bill?.total) === 94.98);
  assert("Bill status is paid", bill?.status === "paid");

  // List bills
  const list = await authedApi("/api/shop/bills");
  assert("GET /api/shop/bills → 200", list.status === 200);
  const found = (list.body?.bills ?? []).some((b) => b.id === createdBillId);
  assert("Created bill appears in history", found);

  // Get detail
  const detail = await authedApi(`/api/shop/bills/${createdBillId}`);
  assert("GET /api/shop/bills/:id → 200", detail.status === 200);
  assert("Bill detail has items array", Array.isArray(detail.body?.bill?.items));
}

async function testHoldResume() {
  console.log("\n⏸️  Hold / Resume");
  if (!createdItemId) { console.log("  ⏭️  Skipped (no item id)"); return; }

  const hold = await authedApi("/api/shop/bills/held", {
    method: "POST",
    body: JSON.stringify({
      items: [{ item_id: createdItemId, item_name: "Smoke Test Item", unit_price: 49.99, quantity: 1 }],
      discount: 0, extra_charges: 0, payment_method: "upi", label: "SMOKE-HOLD",
    }),
  });
  assert("POST /api/shop/bills/held → 201", hold.status === 201, JSON.stringify(hold.body));
  const heldId = hold.body?.bill?.id ?? "";
  assert("Held bill has id", Boolean(heldId));

  // List held
  const list = await authedApi("/api/shop/bills/held");
  assert("GET /api/shop/bills/held → 200", list.status === 200);
  const found = (list.body?.held ?? []).some((b) => b.id === heldId);
  assert("Held bill appears in list", found);

  // Resume
  const resume = await authedApi(`/api/shop/bills/held/${heldId}`, { method: "POST" });
  assert("POST /api/shop/bills/held/:id (resume) → 200", resume.status === 200);
  assert("Resumed bill has items", Array.isArray(resume.body?.bill?.items));

  // Confirm removed from held
  const list2 = await authedApi("/api/shop/bills/held");
  const stillHeld = (list2.body?.held ?? []).some((b) => b.id === heldId);
  assert("Resumed bill removed from held list", !stillHeld);
}

async function testReports() {
  console.log("\n📊 Reports");
  const r = await authedApi("/api/shop/reports?days=30");
  assert("GET /api/shop/reports → 200", r.status === 200, JSON.stringify(r.body));
  assert("Summary has today stats", typeof r.body?.summary?.today?.total === "number");
  assert("Daily array present", Array.isArray(r.body?.daily));
  assert("Payments array present", Array.isArray(r.body?.payments));
}

async function testCleanup() {
  console.log("\n🧹 Cleanup");
  // Cancel bill first (FK: bill_items reference item)
  if (createdBillId) {
    const r = await authedApi(`/api/shop/bills/${createdBillId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "cancel" }),
    });
    assert("Cancel test bill → 200", r.status === 200);
  }
  // Now safe to delete the item (may soft-delete if it has bill history)
  if (createdItemId) {
    const r = await authedApi(`/api/shop/items/${createdItemId}`, { method: "DELETE" });
    assert("DELETE test item → 200", r.status === 200);
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function runAll() {
  console.log(`\n🚀 BILLY POS Smoke Tests — ${BASE_URL}`);
  console.log("━".repeat(50));

  await testHealth();
  await testUnauthRedirects();
  await testAdminLogin();
  await testAdminDashboard();
  await testCrossTenantBlocked();
  await testAdminLogout();
  await testShopLogin();
  await testSubscriptionEnforcement();
  await testItemCRUD();
  await testBillingFlow();
  await testHoldResume();
  await testReports();
  await testCleanup();

  console.log("\n" + "━".repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.error("\n❌ Failed tests:");
    failures.forEach((f) => console.error(`  • ${f}`));
    process.exit(1);
  } else {
    console.log("\n✅ All smoke tests passed!");
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
