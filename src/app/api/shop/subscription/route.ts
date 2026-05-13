import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { enforceSubscription } from "@/services/subscription-service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const status = await enforceSubscription(session.shopId);
  return NextResponse.json(status);
}
