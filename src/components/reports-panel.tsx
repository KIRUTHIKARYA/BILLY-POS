"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import type { DailyReport, PaymentBreakdown, ReportSummary, TopItem, HourlyStat } from "@/services/report-service";

type ReportData = {
  summary: ReportSummary;
  daily: DailyReport[];
  payments: PaymentBreakdown[];
  topItems: TopItem[];
  hourly: HourlyStat[];
};

function downloadCSV(daily: DailyReport[], days: number) {
  const header = "Date,Bills,Revenue (₹),Cancelled";
  const rows = [...daily].reverse().map((d) => `${d.date},${d.bill_count},${d.paid_total.toFixed(2)},${d.cancelled_count}`);
  const totalBills = daily.reduce((s, d) => s + d.bill_count, 0);
  const totalRev = daily.reduce((s, d) => s + d.paid_total, 0);
  rows.push(`TOTAL,${totalBills},${totalRev.toFixed(2)},${daily.reduce((s, d) => s + d.cancelled_count, 0)}`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `billy-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

const PAYMENT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];
const ITEM_COLORS = ["#84cc16", "#10b981", "#0ea5e9", "#6366f1", "#f59e0b", "#ec4899", "#f97316", "#8b5cf6"];

function fmt(n: number) { return n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toFixed(0)}`; }

function hourLabel(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "hourly" | "daily">("overview");

  const fetchReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/shop/reports?days=${days}`);
      if (res.status === 403) { setError(((await res.json()) as { message: string }).message); return; }
      if (!res.ok) throw new Error("Failed.");
      setData(await res.json() as ReportData);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="h-72 bg-slate-100 rounded-2xl" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-lg font-bold mb-2">Reports Unavailable</h2>
      <p className="text-sm text-black/50 max-w-xs">{error}</p>
    </div>
  );

  if (!data) return null;

  const { summary, daily, payments, topItems, hourly } = data;
  const peakHour = hourly.reduce((a, b) => b.total > a.total ? b : a, hourly[0]);
  const totalRevPeriod = daily.reduce((s, d) => s + d.paid_total, 0);
  const totalBillsPeriod = daily.reduce((s, d) => s + d.bill_count, 0);
  const avgBill = totalBillsPeriod > 0 ? totalRevPeriod / totalBillsPeriod : 0;

  const summaryCards = [
    { label: "Today", count: summary.today.bill_count, total: summary.today.total, emoji: "☀️", color: "from-violet-500 to-purple-600" },
    { label: "This Week", count: summary.this_week.bill_count, total: summary.this_week.total, emoji: "📅", color: "from-blue-500 to-cyan-600" },
    { label: "This Month", count: summary.this_month.bill_count, total: summary.this_month.total, emoji: "📆", color: "from-emerald-500 to-teal-600" },
    { label: "All Time", count: summary.all_time.bill_count, total: summary.all_time.total, emoji: "🏆", color: "from-slate-700 to-slate-900" },
  ];

  const tabs = [
    { id: "overview", label: "📈 Overview" },
    { id: "items", label: "🏆 Top Items" },
    { id: "hourly", label: "🕐 Peak Hours" },
    { id: "daily", label: "📋 Daily Table" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="font-black text-xl text-slate-800">Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">{days}-day performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {daily.length > 0 && (
            <button onClick={() => downloadCSV(daily, days)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors">
              ⬇ Export
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ label, count, total, emoji, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white relative overflow-hidden`}>
            <div className="relative z-10">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-black">{fmt(total)}</p>
              <p className="text-xs text-white/60 mt-1">{count} bills</p>
            </div>
            <div className="absolute -right-3 -top-3 text-4xl opacity-20">{emoji}</div>
          </div>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Period Revenue</p>
          <p className="text-xl font-black text-slate-800 mt-1">{fmt(totalRevPeriod)}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Bill Value</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{fmt(avgBill)}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Peak Hour</p>
          <p className="text-xl font-black text-violet-600 mt-1">{peakHour ? hourLabel(peakHour.hour) : "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Revenue trend */}
          {daily.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-2xl bg-slate-50">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm text-slate-400">No sales in this period yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Revenue Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...daily].reverse()}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} dx={-8} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", fontSize: 13, fontWeight: 600 }} formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Revenue"]} labelFormatter={(l) => `📅 ${l}`} />
                    <Area type="monotone" dataKey="paid_total" stroke="#84cc16" strokeWidth={3} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment breakdown */}
          {payments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Payment Methods</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={payments.map(p => ({ name: p.method.toUpperCase(), value: p.total }))} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent = 0 }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {payments.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % 4]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `₹${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Method Breakdown</h3>
                <div className="space-y-3">
                  {payments.map((p, i) => {
                    const max = Math.max(...payments.map(x => x.total));
                    return (
                      <div key={p.method}>
                        <div className="flex justify-between text-sm font-semibold mb-1">
                          <span className="uppercase text-slate-600">{p.method}</span>
                          <span className="text-slate-800">₹{p.total.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(2, (p.total / max) * 100)}%`, background: PAYMENT_COLORS[i % 4] }} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{p.count} bills</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOP ITEMS TAB */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {topItems.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-2xl bg-slate-50">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm text-slate-400">No sales data in this period.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Top Selling Items (by quantity)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="item_name" type="category" width={100} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} formatter={(v: any, name: string) => [v, name === "total_qty" ? "Qty Sold" : "Revenue"]} />
                      <Bar dataKey="total_qty" radius={[0, 6, 6, 0]}>
                        {topItems.map((_, i) => <Cell key={i} fill={ITEM_COLORS[i % 8]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-right">Qty Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topItems.map((item, i) => (
                      <tr key={item.item_name} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold" style={{ color: ITEM_COLORS[i % 8] }}>#{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.item_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-600">{item.total_qty}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600">₹{item.total_revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* HOURLY TAB */}
      {activeTab === "hourly" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-1">Peak Hours Heatmap</h3>
            <p className="text-xs text-slate-400 mb-4">When does your shop generate the most revenue?</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly.filter(h => h.hour >= 6 && h.hour <= 23)} margin={{ bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} dx={-8} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Revenue"]} labelFormatter={(h) => `🕐 ${hourLabel(h as number)}`} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#84cc16" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {hourly.sort((a,b) => b.total - a.total).slice(0, 3).map((h, i) => (
              <div key={h.hour} className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-xs text-slate-400 font-bold uppercase">#{i + 1} Peak</p>
                <p className="text-2xl font-black text-slate-800 my-1">{hourLabel(h.hour)}</p>
                <p className="text-xs text-emerald-600 font-bold">₹{h.total.toFixed(0)}</p>
                <p className="text-[11px] text-slate-400">{h.bill_count} bills</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAILY TABLE TAB */}
      {activeTab === "daily" && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {daily.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-slate-400">No sales data in this period.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Bills</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Avg Bill</th>
                  <th className="px-4 py-3 text-right">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{d.date}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.bill_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{d.paid_total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{d.bill_count > 0 ? `₹${(d.paid_total / d.bill_count).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{d.cancelled_count || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-sm border-t-2 border-slate-100">
                <tr>
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right">{totalBillsPeriod}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">₹{totalRevPeriod.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{totalBillsPeriod > 0 ? `₹${avgBill.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-right">{daily.reduce((s, d) => s + d.cancelled_count, 0) || "—"}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
