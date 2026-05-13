import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminStats, listShops } from "@/services/shop-service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [stats, shops] = await Promise.all([getAdminStats(), listShops()]);
  return NextResponse.json({ stats, shops });
}
