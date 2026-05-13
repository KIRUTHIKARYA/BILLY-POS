"use client";

import { useCallback, useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import type { DailyReport, PaymentBreakdown, ReportSummary } from "@/services/report-service";

type ReportData = {
  summary: ReportSummary;
  daily: DailyReport[];
  payments: PaymentBreakdown[];
};

// ── CSV export helper ──────────────────────────────────────────────────────
function downloadCSV(daily: DailyReport[], days: number) {
  const header = "Date,Bills,Revenue (₹),Cancelled";
  const rows = [...daily]
    .reverse()
    .map((d) => `${d.date},${d.bill_count},${d.paid_total.toFixed(2)},${d.cancelled_count}`);
  const total = daily.reduce((s, d) => s + d.paid_total, 0);
  const totalBills = daily.reduce((s, d) => s + d.bill_count, 0);
  const totalCancelled = daily.reduce((s, d) => s + d.cancelled_count, 0);
  rows.push(`TOTAL,${totalBills},${total.toFixed(2)},${totalCancelled}`);

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `billy-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shop/reports?days=${days}`);
      if (res.status === 403) {
        const j = (await res.json()) as { message: string };
        setError(j.message);
        return;
      }
      if (!res.ok) throw new Error("Failed to load reports.");
      setData((await res.json()) as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  if (loading) return (
    <div className="space-y-4">
      {[80, 60, 100, 45].map((h, i) => (
        <div key={i} className={`h-${h > 70 ? "20" : "10"} rounded-lg bg-black/5 animate-pulse`} />
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold mb-2">Reports Not Available</h2>
        <p className="text-sm text-black/60 max-w-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, daily, payments } = data;
  const maxTotal = Math.max(...daily.map((d) => d.paid_total), 1);

  // Payment method icons
  const methodIcon: Record<string, string> = { cash: "💵", upi: "📱", card: "💳", split: "⚡" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="font-semibold text-lg">Reports</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-black/20 px-2 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {daily.length > 0 && (
            <button
              onClick={() => downloadCSV(daily, days)}
              className="flex items-center gap-1.5 rounded-md border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 transition-colors"
            >
              ⬇ Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Today",      count: summary.today.bill_count,      total: summary.today.total,      bg: "bg-gradient-to-br from-blue-500 to-blue-600", shadow: "shadow-blue-500/20" },
          { label: "This Week",  count: summary.this_week.bill_count,  total: summary.this_week.total,  bg: "bg-gradient-to-br from-indigo-500 to-indigo-600", shadow: "shadow-indigo-500/20" },
          { label: "This Month", count: summary.this_month.bill_count, total: summary.this_month.total, bg: "bg-gradient-to-br from-purple-500 to-purple-600", shadow: "shadow-purple-500/20" },
          { label: "All Time",   count: summary.all_time.bill_count,   total: summary.all_time.total,   bg: "bg-gradient-to-br from-slate-800 to-slate-900", shadow: "shadow-slate-500/20" },
        ].map(({ label, count, total, bg, shadow }) => (
          <div key={label} className={`rounded-2xl text-white p-5 shadow-lg ${bg} ${shadow} relative overflow-hidden`}>
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
              <p className="text-3xl font-black tracking-tight">₹{total.toFixed(2)}</p>
              <p className="text-sm font-medium text-white/70 mt-2">{count} bill{count !== 1 ? "s" : ""}</p>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
        ))}
      </div>

      {/* Main Revenue Chart (Area) */}
      <div>
        <h3 className="text-lg font-bold mb-4 text-slate-800">Revenue Trend ({days}d)</h3>
        {daily.length === 0 ? (
          <div className="text-center py-16 border border-slate-100 rounded-2xl bg-slate-50">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-slate-400">No sales in this period.</p>
          </div>
        ) : (
          <div className="h-80 border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...daily].reverse()}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(val: string) => val.slice(5)} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val}`} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area type="monotone" dataKey="paid_total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Payment breakdown Pie Chart */}
      {payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Payment Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payments.map(p => ({ name: p.method.toUpperCase(), value: p.total }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent = 0 }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {payments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${Number(value).toFixed(2)}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Payment Stats</h3>
            <div className="space-y-4">
              {payments.map((p, i) => {
                const colors = ["bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500"];
                const max = Math.max(...payments.map(x => x.total));
                return (
                  <div key={p.method}>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                      <span className="uppercase flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${colors[i % 4]}`} /> {methodIcon[p.method] ?? "💰"} {p.method}
                      </span>
                      <span>₹{p.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${colors[i % 4]} h-2 rounded-full transition-all`} style={{ width: `${Math.max(2, (p.total / max) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{p.count} bills</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Daily table */}
      {daily.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Daily Breakdown</h3>
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left text-xs font-medium text-black/60">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Bills</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-right">Avg Bill</th>
                  <th className="px-4 py-2.5 text-right">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-2.5 font-medium">{d.date}</td>
                    <td className="px-4 py-2.5 text-right">{d.bill_count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">₹{d.paid_total.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-black/50">
                      {d.bill_count > 0 ? `₹${(d.paid_total / d.bill_count).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-black/40">{d.cancelled_count || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-black/[0.03] font-semibold text-sm border-t-2 border-black/10">
                <tr>
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right">{daily.reduce((s, d) => s + d.bill_count, 0)}</td>
                  <td className="px-4 py-2.5 text-right">₹{daily.reduce((s, d) => Math.round((s + d.paid_total) * 100) / 100, 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-black/50">
                    {(() => { const b = daily.reduce((s, d) => s + d.bill_count, 0); const t = daily.reduce((s, d) => s + d.paid_total, 0); return b > 0 ? `₹${(t / b).toFixed(2)}` : "—"; })()}
                  </td>
                  <td className="px-4 py-2.5 text-right">{daily.reduce((s, d) => s + d.cancelled_count, 0) || "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
