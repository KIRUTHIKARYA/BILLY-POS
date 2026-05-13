import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBill, listBills } from "@/services/bill-service";
import { enforceSubscription } from "@/services/subscription-service";
import type { CreateBillInput } from "@/types/bill";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await getSession();
  if (!session || !["shop", "staff"].includes(session.role) || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sub = await enforceSubscription(session.shopId, "billing_enabled");
  if (!sub.ok) {
    return NextResponse.json({ message: sub.message }, { status: 403 });
  }

  const bills = await listBills(session.shopId);
  return NextResponse.json({ bills });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["shop", "staff"].includes(session.role) || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Server-side subscription enforcement — blocks expired/disabled shops
  const sub = await enforceSubscription(session.shopId, "billing_enabled");
  if (!sub.ok) {
    return NextResponse.json({ message: sub.message }, { status: 403 });
  }

  const body = (await request.json()) as CreateBillInput;
  const result = await createBill(session.shopId, session.userId, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ bill: result.bill }, { status: 201 });
}
