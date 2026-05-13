import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { enforceSubscription } from "@/services/subscription-service";

const rowSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  price: z.number().nonnegative(),
});

const bulkSchema = z.object({
  items: z.array(rowSchema).min(1).max(500),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sub = await enforceSubscription(session.shopId, "billing_enabled");
  if (!sub.ok) return NextResponse.json({ message: sub.message }, { status: 403 });

  const body = (await request.json()) as unknown;
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 },
    );
  }

  const rows = parsed.data.items.map((item) => ({
    shop_id: session.shopId!,
    name: item.name.trim(),
    category: item.category.trim(),
    price: item.price,
    is_active: true,
  }));

  const { data, error } = await supabaseAdmin
    .from("items")
    .insert(rows)
    .select("id");

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 });
}
