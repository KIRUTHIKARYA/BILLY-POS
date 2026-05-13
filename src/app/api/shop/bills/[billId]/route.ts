import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBillDetail, cancelBill } from "@/services/bill-service";

type RouteContext = { params: Promise<{ billId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { billId } = await context.params;
  const bill = await getBillDetail(session.shopId, billId);
  if (!bill) return NextResponse.json({ message: "Bill not found." }, { status: 404 });
  return NextResponse.json({ bill });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { billId } = await context.params;
  const body = (await request.json()) as { action: string };

  if (body.action === "cancel") {
    const result = await cancelBill(session.shopId, billId);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
