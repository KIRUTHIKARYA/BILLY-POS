import { hash } from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  AdminStats,
  CreateShopInput,
  PlanName,
  Shop,
  ShopDetail,
  Subscription,
  ShopUser,
} from "@/types/shop";

// ---------------------------------------------------------------------------
// Admin dashboard stats
// ---------------------------------------------------------------------------

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date().toISOString();

  const { data: shops, error } = await supabaseAdmin
    .from("shops")
    .select("id, is_blocked");

  if (error || !shops) {
    return { total: 0, active: 0, blocked: 0, expired: 0 };
  }

  const shopIds = shops.map((s: { id: string }) => s.id);

  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("shop_id, expires_at")
    .in("shop_id", shopIds.length ? shopIds : ["__none__"]);

  const subMap = new Map<string, string>();
  for (const sub of subs ?? []) {
    subMap.set(
      (sub as { shop_id: string; expires_at: string }).shop_id,
      (sub as { shop_id: string; expires_at: string }).expires_at,
    );
  }

  let blocked = 0;
  let expired = 0;
  let active = 0;

  for (const shop of shops as Array<{ id: string; is_blocked: boolean }>) {
    if (shop.is_blocked) {
      blocked++;
      continue;
    }
    const expiresAt = subMap.get(shop.id);
    if (!expiresAt || new Date(expiresAt).getTime() < new Date(now).getTime()) {
      expired++;
    } else {
      active++;
    }
  }

  return { total: shops.length, active, blocked, expired };
}

// ---------------------------------------------------------------------------
// List all shops with subscription + shop user
// ---------------------------------------------------------------------------

export async function listShops(): Promise<ShopDetail[]> {
  const { data: shops, error } = await supabaseAdmin
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !shops) return [];

  const shopIds = (shops as Shop[]).map((s) => s.id);

  const [{ data: subs }, { data: users }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("*")
      .in("shop_id", shopIds.length ? shopIds : ["__none__"]),
    supabaseAdmin
      .from("users")
      .select("id, shop_id, username, role, is_active, created_at")
      .eq("role", "shop")
      .in("shop_id", shopIds.length ? shopIds : ["__none__"]),
  ]);

  const subMap = new Map<string, Subscription>();
  for (const s of (subs as Subscription[]) ?? []) subMap.set(s.shop_id, s);

  const userMap = new Map<string, ShopUser>();
  for (const u of (users as ShopUser[]) ?? []) userMap.set(u.shop_id, u);

  return (shops as Shop[]).map((shop) => ({
    ...shop,
    subscription: subMap.get(shop.id) ?? null,
    shopUser: userMap.get(shop.id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Get single shop detail
// ---------------------------------------------------------------------------

export async function getShopDetail(shopId: string): Promise<ShopDetail | null> {
  const { data: shop, error } = await supabaseAdmin
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle<Shop>();

  if (error || !shop) return null;

  const [{ data: sub }, { data: user }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle<Subscription>(),
    supabaseAdmin
      .from("users")
      .select("id, shop_id, username, role, is_active, created_at")
      .eq("shop_id", shopId)
      .eq("role", "shop")
      .maybeSingle<ShopUser>(),
  ]);

  return { ...shop, subscription: sub ?? null, shopUser: user ?? null };
}

// ---------------------------------------------------------------------------
// Create shop with plan + shop user
// ---------------------------------------------------------------------------

export const createShopSchema = z.object({
  name: z.string().trim().min(2),
  owner_name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  gst_number: z.string().trim().optional(),
  shop_registration_number: z.string().trim().optional(),
  shop_type: z.string().trim().min(2),
  plan_name: z.enum(["starter", "standard", "pro", "elite"]),
  custom_price: z.number().min(0).optional(),
  expires_at: z.string().datetime({ offset: true }),
  billing_enabled: z.boolean(),
  inventory_enabled: z.boolean(),
  reports_enabled: z.boolean(),
  username: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, digits and underscores only")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(6),
});

export async function createShop(
  input: CreateShopInput,
): Promise<{ ok: true; shopId: string } | { ok: false; message: string }> {
  const parsed = createShopSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;

  // Check username uniqueness
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", d.username)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return { ok: false, message: `Username "${d.username}" is already taken.` };
  }

  // Create shop
  const { data: shopRow, error: shopErr } = await supabaseAdmin
    .from("shops")
    .insert({
      name: d.name,
      owner_name: d.owner_name,
      phone: d.phone ?? null,
      email: d.email ?? null,
      address: d.address ?? null,
      gst_number: d.gst_number ?? null,
      shop_registration_number: d.shop_registration_number ?? null,
      shop_type: d.shop_type,
      is_blocked: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (shopErr || !shopRow) {
    return { ok: false, message: shopErr?.message ?? "Failed to create shop." };
  }

  const shopId = shopRow.id;

  // Create subscription
  const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
    shop_id: shopId,
    plan_name: d.plan_name,
    custom_price: d.plan_name === "elite" ? (d.custom_price ?? 0) : 0,
    max_staff: d.plan_name === "starter" ? 1 : d.plan_name === "standard" ? 3 : 999,
    whatsapp_enabled: ["standard", "pro", "elite"].includes(d.plan_name),
    csv_export_enabled: ["pro", "elite"].includes(d.plan_name),
    expires_at: d.expires_at,
    billing_enabled: d.billing_enabled,
    inventory_enabled: d.inventory_enabled,
    reports_enabled: d.reports_enabled,
  });

  if (subErr) {
    // Rollback shop
    await supabaseAdmin.from("shops").delete().eq("id", shopId);
    return { ok: false, message: subErr.message };
  }

  // Hash password and create shop user
  const passwordHash = await hash(d.password, 10);
  const { error: userErr } = await supabaseAdmin.from("users").insert({
    shop_id: shopId,
    username: d.username,
    password_hash: passwordHash,
    role: "shop",
    is_active: true,
  });

  if (userErr) {
    await supabaseAdmin.from("shops").delete().eq("id", shopId);
    return { ok: false, message: userErr.message };
  }

  return { ok: true, shopId };
}

// ---------------------------------------------------------------------------
// Block / unblock shop
// ---------------------------------------------------------------------------

export async function setShopBlocked(
  shopId: string,
  blocked: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabaseAdmin
    .from("shops")
    .update({ is_blocked: blocked })
    .eq("id", shopId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Update feature flags + plan
// ---------------------------------------------------------------------------

export const updatePlanSchema = z.object({
  plan_name: z.enum(["starter", "standard", "pro", "elite"]),
  custom_price: z.number().min(0).optional(),
  expires_at: z.string().datetime({ offset: true }),
  billing_enabled: z.boolean(),
  inventory_enabled: z.boolean(),
  reports_enabled: z.boolean(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export async function updateShopPlan(
  shopId: string,
  input: UpdatePlanInput,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_name: d.plan_name,
      custom_price: d.plan_name === "elite" ? (d.custom_price ?? 0) : 0,
      max_staff: d.plan_name === "starter" ? 1 : d.plan_name === "standard" ? 3 : 999,
      whatsapp_enabled: ["standard", "pro", "elite"].includes(d.plan_name),
      csv_export_enabled: ["pro", "elite"].includes(d.plan_name),
      expires_at: d.expires_at,
      billing_enabled: d.billing_enabled,
      inventory_enabled: d.inventory_enabled,
      reports_enabled: d.reports_enabled,
    })
    .eq("shop_id", shopId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reset shop user password
// ---------------------------------------------------------------------------

export async function resetShopPassword(
  shopId: string,
  newPassword: string,
): Promise<{ ok: boolean; message?: string }> {
  if (newPassword.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  const passwordHash = await hash(newPassword, 10);
  const { error } = await supabaseAdmin
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("shop_id", shopId)
    .eq("role", "shop");

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Get feature flags for a shop (used server-side for feature gating)
// ---------------------------------------------------------------------------

export type FeatureFlags = {
  billing_enabled: boolean;
  inventory_enabled: boolean;
  reports_enabled: boolean;
};

export async function getShopFeatureFlags(shopId: string): Promise<FeatureFlags> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("billing_enabled, inventory_enabled, reports_enabled")
    .eq("shop_id", shopId)
    .maybeSingle<FeatureFlags>();

  return data ?? { billing_enabled: false, inventory_enabled: false, reports_enabled: false };
}
