import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listItems, createItem } from "@/services/item-service";
import { enforceSubscription } from "@/services/subscription-service";

export async function GET() {
  const session = await getSession();
  if (!session || !["shop", "staff"].includes(session.role) || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sub = await enforceSubscription(session.shopId, "billing_enabled");
  if (!sub.ok) {
    return NextResponse.json({ message: sub.message }, { status: 403 });
  }

  const items = await listItems(session.shopId, true);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sub = await enforceSubscription(session.shopId, "billing_enabled");
  if (!sub.ok) {
    return NextResponse.json({ message: sub.message }, { status: 403 });
  }

  const body = (await request.json()) as { name: string; category: string; price: number; barcode?: string; stock_quantity?: number; low_stock_limit?: number; };
  const result = await createItem(session.shopId, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ item: result.item }, { status: 201 });
}
