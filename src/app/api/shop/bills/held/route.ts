import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { holdBill, listHeldBills } from "@/services/bill-service";
import type { CreateBillInput } from "@/types/bill";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const held = await listHeldBills(session.shopId);
  return NextResponse.json({ held });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateBillInput & { label?: string };
  const result = await holdBill(session.shopId, session.userId, body, body.label);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ bill: result.bill }, { status: 201 });
}
