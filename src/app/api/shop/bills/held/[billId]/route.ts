import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resumeHeldBill, deleteHeldBill } from "@/services/bill-service";

type RouteContext = { params: Promise<{ billId: string }> };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST to resume, DELETE to discard */
export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { billId } = await context.params;
  const result = await resumeHeldBill(session.shopId, billId);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  return NextResponse.json({ bill: result.bill });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { billId } = await context.params;
  const result = await deleteHeldBill(session.shopId, billId);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
