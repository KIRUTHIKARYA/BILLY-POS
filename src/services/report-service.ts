import { supabaseAdmin } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Daily report row
// ---------------------------------------------------------------------------

export type DailyReport = {
  date: string;         // YYYY-MM-DD
  bill_count: number;
  paid_total: number;
  cancelled_count: number;
};

// ---------------------------------------------------------------------------
// Summary stats for reports dashboard
// ---------------------------------------------------------------------------

export type ReportSummary = {
  today: { bill_count: number; total: number };
  this_week: { bill_count: number; total: number };
  this_month: { bill_count: number; total: number };
  all_time: { bill_count: number; total: number };
};

// ---------------------------------------------------------------------------
// Get daily breakdown for a shop (last N days)
// ---------------------------------------------------------------------------

export async function getDailyReport(
  shopId: string,
  days = 30,
): Promise<DailyReport[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("created_at, total, status")
    .eq("shop_id", shopId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const dayMap = new Map<
    string,
    { bill_count: number; paid_total: number; cancelled_count: number }
  >();

  for (const row of data as Array<{
    created_at: string;
    total: number;
    status: string;
  }>) {
    const date = row.created_at.slice(0, 10);
    const existing = dayMap.get(date) ?? {
      bill_count: 0,
      paid_total: 0,
      cancelled_count: 0,
    };

    if (row.status === "paid") {
      existing.bill_count++;
      existing.paid_total =
        Math.round((existing.paid_total + Number(row.total)) * 100) / 100;
    } else if (row.status === "cancelled") {
      existing.cancelled_count++;
    }

    dayMap.set(date, existing);
  }

  return Array.from(dayMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date();
  if (unit === "day") { d.setHours(0, 0, 0, 0); }
  else if (unit === "week") {
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

async function aggregateBills(
  shopId: string,
  since?: string,
): Promise<{ bill_count: number; total: number }> {
  let query = supabaseAdmin
    .from("bills")
    .select("total")
    .eq("shop_id", shopId)
    .eq("status", "paid");

  if (since) query = query.gte("created_at", since);

  const { data } = await query;
  if (!data) return { bill_count: 0, total: 0 };

  const total = (data as Array<{ total: number }>).reduce(
    (s, r) => Math.round((s + Number(r.total)) * 100) / 100,
    0,
  );
  return { bill_count: data.length, total };
}

export async function getReportSummary(shopId: string): Promise<ReportSummary> {
  const [today, thisWeek, thisMonth, allTime] = await Promise.all([
    aggregateBills(shopId, startOf("day").toISOString()),
    aggregateBills(shopId, startOf("week").toISOString()),
    aggregateBills(shopId, startOf("month").toISOString()),
    aggregateBills(shopId),
  ]);

  return {
    today,
    this_week: thisWeek,
    this_month: thisMonth,
    all_time: allTime,
  };
}

// ---------------------------------------------------------------------------
// Payment method breakdown
// ---------------------------------------------------------------------------

export type PaymentBreakdown = {
  method: string;
  count: number;
  total: number;
};

export async function getPaymentBreakdown(
  shopId: string,
  days = 30,
): Promise<PaymentBreakdown[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabaseAdmin
    .from("bills")
    .select("payment_method, total")
    .eq("shop_id", shopId)
    .eq("status", "paid")
    .gte("created_at", since.toISOString());

  if (!data) return [];

  const map = new Map<string, { count: number; total: number }>();
  for (const row of data as Array<{ payment_method: string; total: number }>) {
    const existing = map.get(row.payment_method) ?? { count: 0, total: 0 };
    existing.count++;
    existing.total = Math.round((existing.total + Number(row.total)) * 100) / 100;
    map.set(row.payment_method, existing);
  }

  return Array.from(map.entries()).map(([method, s]) => ({ method, ...s }));
}

// ---------------------------------------------------------------------------
// Top selling items
// ---------------------------------------------------------------------------

export type TopItem = {
  item_name: string;
  total_qty: number;
  total_revenue: number;
};

export async function getTopItems(
  shopId: string,
  days = 30,
  limit = 8,
): Promise<TopItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabaseAdmin
    .from("bill_items")
    .select("item_name, quantity, line_total, bills!inner(shop_id, status, created_at)")
    .eq("bills.shop_id", shopId)
    .eq("bills.status", "paid")
    .gte("bills.created_at", since.toISOString());

  if (!data) return [];

  const map = new Map<string, { total_qty: number; total_revenue: number }>();
  for (const row of data as Array<{ item_name: string; quantity: number; line_total: number }>) {
    const existing = map.get(row.item_name) ?? { total_qty: 0, total_revenue: 0 };
    existing.total_qty += row.quantity;
    existing.total_revenue = Math.round((existing.total_revenue + Number(row.line_total)) * 100) / 100;
    map.set(row.item_name, existing);
  }

  return Array.from(map.entries())
    .map(([item_name, s]) => ({ item_name, ...s }))
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Hourly sales breakdown
// ---------------------------------------------------------------------------

export type HourlyStat = {
  hour: number;  // 0-23
  bill_count: number;
  total: number;
};

export async function getHourlySales(
  shopId: string,
  days = 30,
): Promise<HourlyStat[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabaseAdmin
    .from("bills")
    .select("created_at, total")
    .eq("shop_id", shopId)
    .eq("status", "paid")
    .gte("created_at", since.toISOString());

  if (!data) return [];

  const hourMap = new Map<number, { bill_count: number; total: number }>();
  for (const row of data as Array<{ created_at: string; total: number }>) {
    const hour = new Date(row.created_at).getHours();
    const existing = hourMap.get(hour) ?? { bill_count: 0, total: 0 };
    existing.bill_count++;
    existing.total = Math.round((existing.total + Number(row.total)) * 100) / 100;
    hourMap.set(hour, existing);
  }

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    ...(hourMap.get(h) ?? { bill_count: 0, total: 0 }),
  }));
}
