import { supabaseAdmin } from "@/lib/supabase";

export type SubscriptionStatus =
  | { ok: true; flags: { billing_enabled: boolean; inventory_enabled: boolean; reports_enabled: boolean }; plan: string; expires_at: string }
  | { ok: false; reason: "blocked" | "no_subscription" | "expired" | "feature_disabled"; message: string };

/**
 * Full server-side subscription enforcement.
 * Call this at the start of any shop API route that requires a feature.
 */
export async function enforceSubscription(
  shopId: string,
  requiredFeature?: "billing_enabled" | "inventory_enabled" | "reports_enabled",
): Promise<SubscriptionStatus> {
  // Check shop blocked status
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("is_blocked")
    .eq("id", shopId)
    .maybeSingle<{ is_blocked: boolean }>();

  if (!shop) return { ok: false, reason: "no_subscription", message: "Shop not found." };
  if (shop.is_blocked) {
    return { ok: false, reason: "blocked", message: "This shop has been blocked by admin. Contact support." };
  }

  // Check subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_name, expires_at, billing_enabled, inventory_enabled, reports_enabled")
    .eq("shop_id", shopId)
    .maybeSingle<{
      plan_name: string;
      expires_at: string;
      billing_enabled: boolean;
      inventory_enabled: boolean;
      reports_enabled: boolean;
    }>();

  if (!sub) {
    return { ok: false, reason: "no_subscription", message: "No subscription found. Contact admin." };
  }

  if (new Date(sub.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      reason: "expired",
      message: `Subscription expired on ${new Date(sub.expires_at).toLocaleDateString()}. Contact admin to renew.`,
    };
  }

  if (requiredFeature && !sub[requiredFeature]) {
    const featureNames: Record<string, string> = {
      billing_enabled: "Billing",
      inventory_enabled: "Inventory",
      reports_enabled: "Reports",
    };
    return {
      ok: false,
      reason: "feature_disabled",
      message: `${featureNames[requiredFeature] ?? requiredFeature} is not enabled on your plan. Contact admin.`,
    };
  }

  return {
    ok: true,
    flags: {
      billing_enabled: sub.billing_enabled,
      inventory_enabled: sub.inventory_enabled,
      reports_enabled: sub.reports_enabled,
    },
    plan: sub.plan_name,
    expires_at: sub.expires_at,
  };
}
