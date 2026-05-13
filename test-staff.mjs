/**
 * Test Staff Functionality
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body, headers: res.headers, ok: res.ok };
}

async function run() {
  console.log("1. Admin Login...");
  const adminLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "Pass@123" }),
  });
  if (adminLogin.status !== 200) throw new Error("Admin login failed");
  const adminCookie = (adminLogin.headers.get("set-cookie") ?? "").split(";")[0];

  console.log("2. Fetching Shops...");
  const shopsRes = await api("/api/admin/shops", { headers: { Cookie: adminCookie } });
  const shops = shopsRes.body?.shops ?? [];
  if (shops.length === 0) throw new Error("No shops found");
  const shopId = shops[0].id;

  console.log("3. Creating Staff User...");
  const staffUsername = `staff_${Date.now()}`;
  const staffRes = await api(`/api/admin/shops/${shopId}/staff`, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ username: staffUsername, password: "Pass@123", name: "Test Staff" }),
  });
  if (staffRes.status !== 201) throw new Error("Staff creation failed: " + JSON.stringify(staffRes.body));
  const staffId = staffRes.body.staff?.id;

  console.log("4. Staff Login...");
  const staffLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: staffUsername, password: "Pass@123" }),
  });
  if (staffLogin.status !== 200) throw new Error("Staff login failed: " + JSON.stringify(staffLogin.body));
  const staffCookie = (staffLogin.headers.get("set-cookie") ?? "").split(";")[0];
  console.log("   Redirect path:", staffLogin.body.redirectPath);

  console.log("5. Testing Allowed API (GET /api/shop/items)...");
  const itemsRes = await api("/api/shop/items", { headers: { Cookie: staffCookie } });
  if (itemsRes.status !== 200) throw new Error("GET items failed: " + JSON.stringify(itemsRes.body));
  console.log("   Success! Got", itemsRes.body.items?.length, "items.");

  console.log("6. Testing Forbidden API (GET /api/shop/reports)...");
  const reportsRes = await api("/api/shop/reports", { headers: { Cookie: staffCookie } });
  if (reportsRes.status !== 401 && reportsRes.status !== 403) {
    throw new Error("GET reports should be forbidden, got: " + reportsRes.status);
  }
  console.log("   Success! Blocked from reports with status", reportsRes.status);

  console.log("7. Cleaning up (Deleting Staff User)...");
  const delRes = await api(`/api/admin/shops/${shopId}/staff?staffId=${staffId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  if (delRes.status !== 200) throw new Error("Staff deletion failed");

  console.log("\n✅ Staff functionality works perfectly!");
}

run().catch(console.error);
