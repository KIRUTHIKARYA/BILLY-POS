import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { enforceSubscription } from "@/services/subscription-service";
import { getDailyReport, getPaymentBreakdown, getReportSummary, getTopItems, getHourlySales } from "@/services/report-service";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "shop" || !session.shopId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sub = await enforceSubscription(session.shopId, "reports_enabled");
  if (!sub.ok) {
    return NextResponse.json({ message: sub.message, reason: sub.reason }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 90);

  const [summary, daily, payments, topItems, hourly] = await Promise.all([
    getReportSummary(session.shopId),
    getDailyReport(session.shopId, days),
    getPaymentBreakdown(session.shopId, days),
    getTopItems(session.shopId, days),
    getHourlySales(session.shopId, days),
  ]);

  return NextResponse.json({ summary, daily, payments, topItems, hourly });
}

