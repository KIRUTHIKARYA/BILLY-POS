import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateItem, deleteItem } from "@/services/item-service";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    category?: string;
    price?: number;
    barcode?: string;
    stock_quantity?: number;
    low_stock_limit?: number;
    is_active?: boolean;
  };

  const result = await updateItem(session.shopId, itemId, body);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await context.params;
  const result = await deleteItem(session.shopId, itemId);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
