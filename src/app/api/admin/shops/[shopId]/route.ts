import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { setShopBlocked, updateShopPlan, resetShopPassword } from "@/services/shop-service";

type RouteContext = { params: Promise<{ shopId: string }> };

/** PATCH /api/admin/shops/[shopId]
 * Body can contain any combination of:
 *   { action: "block" | "unblock" }
 *   { action: "update_plan", plan_name, expires_at, billing_enabled, inventory_enabled, reports_enabled }
 *   { action: "reset_password", password }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action as string;

  if (action === "block" || action === "unblock") {
    const result = await setShopBlocked(shopId, action === "block");
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_plan") {
    const result = await updateShopPlan(shopId, {
      plan_name: body.plan_name as "starter" | "standard" | "pro" | "elite",
      custom_price: body.custom_price ? Number(body.custom_price) : undefined,
      expires_at: body.expires_at as string,
      billing_enabled: Boolean(body.billing_enabled),
      inventory_enabled: Boolean(body.inventory_enabled),
      reports_enabled: Boolean(body.reports_enabled),
    });
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_password") {
    const result = await resetShopPassword(shopId, String(body.password ?? ""));
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
