"use client";

import { useCallback, useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { 
  LayoutDashboard, ShoppingBag, BarChart3, Users, MessageSquare, 
  Star, Settings, HelpCircle, Bell, Moon, RefreshCw, Globe, 
  Search, LogOut, Plus, MoreVertical, TrendingUp, DollarSign,
  Briefcase, ShoppingCart, UserPlus, ArrowUpRight, Mail, Phone
} from "lucide-react";
import { ShopTable } from "@/components/shop-table";
import { CreateShopForm } from "@/components/create-shop-form";
import type { AdminStats, ShopDetail } from "@/types/shop";
import type { Bill } from "@/types/bill";
import { useToast } from "@/components/toast-provider";
import { useRouter } from "next/navigation";

type AdminData = { stats: AdminStats; shops: ShopDetail[] };
type StaffUser = { id: string; username: string; name: string; role: string; created_at: string };

const AUTO_REFRESH_SECS = 30;

export function AdminDashboardClient({ username }: { username: string }) {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "shops" | "analytics">("overview");

  // Bills viewer
  const [billsShop, setBillsShop] = useState<{ id: string; name: string } | null>(null);
  const [shopBills, setShopBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  // Staff manager
  const [staffShop, setStaffShop] = useState<{ id: string; name: string } | null>(null);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ username: "", name: "", password: "" });
  const [staffBusy, setStaffBusy] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load data.");
      setData((await res.json()) as AdminData);
      setLastRefreshed(new Date());
      setCountdown(AUTO_REFRESH_SECS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { void fetchData(); return AUTO_REFRESH_SECS; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchData]);

  const expiringShops = (data?.shops ?? []).filter((s) => {
    if (!s.subscription?.expires_at) return false;
    const daysLeft = Math.ceil((new Date(s.subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 7;
  });

  async function openBills(shopId: string, shopName: string) {
    setBillsShop({ id: shopId, name: shopName });
    setBillsLoading(true);
    try {
      const res = await fetch(`/api/admin/shops/${shopId}/bills`);
      const d = (await res.json()) as { bills: Bill[] };
      setShopBills(d.bills);
    } catch { toast("Failed to load bills.", "error"); }
    finally { setBillsLoading(false); }
  }

  async function openStaff(shopId: string, shopName: string) {
    setStaffShop({ id: shopId, name: shopName });
    setStaffLoading(true);
    try {
      const res = await fetch(`/api/admin/shops/${shopId}/staff`);
      const d = (await res.json()) as { staff: StaffUser[] };
      setStaffList(d.staff);
    } catch { toast("Failed to load staff.", "error"); }
    finally { setStaffLoading(false); }
  }

  async function createStaff() {
    if (!staffShop) return;
    setStaffBusy(true);
    try {
      const res = await fetch(`/api/admin/shops/${staffShop.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      const d = await res.json() as { message?: string };
      if (!res.ok) { toast(d.message ?? "Failed.", "error"); return; }
      toast(`Staff "@${staffForm.username}" created.`);
      setShowAddStaff(false);
      setStaffForm({ username: "", name: "", password: "" });
      await openStaff(staffShop.id, staffShop.name);
    } catch { toast("Network error.", "error"); }
    finally { setStaffBusy(false); }
  }

  async function deleteStaff(staffId: string, username: string) {
    if (!staffShop || !confirm(`Remove @${username} from this shop?`)) return;
    try {
      await fetch(`/api/admin/shops/${staffShop.id}/staff?staffId=${staffId}`, { method: "DELETE" });
      toast(`@${username} removed.`);
      await openStaff(staffShop.id, staffShop.name);
    } catch { toast("Delete failed.", "error"); }
  }

  const stats = data?.stats;

  const mrr = data?.shops.reduce((sum, shop) => {
    if (shop.is_blocked) return sum;
    const plan = shop.subscription?.plan_name;
    if (plan === "starter") return sum + 999;
    if (plan === "standard") return sum + 1999;
    if (plan === "pro") return sum + 3999;
    if (plan === "elite") return sum + (shop.subscription?.custom_price ?? 0);
    return sum;
  }, 0) ?? 0;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen relative z-10 text-white">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-white/5 bg-[#111111]/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen p-6 overflow-y-auto shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-500 font-bold border border-lime-500/30">
            {username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate">{username}</h4>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Platform Admin</p>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-lime-500/50 transition-colors text-white"
            placeholder="Search..."
          />
        </div>

        <div className="space-y-6 flex-1">
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 pl-3">Dashboards</p>
            <div className="space-y-1">
              {[
                { id: "overview", icon: LayoutDashboard, label: "Overview" },
                { id: "shops", icon: ShoppingBag, label: "Shops" },
                { id: "analytics", icon: BarChart3, label: "Analytics" },
                { id: "customers", icon: Users, label: "Customers" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === item.id 
                      ? "bg-lime-500 text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]" 
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 pl-3">Settings</p>
            <div className="space-y-1">
              {[
                { icon: MessageSquare, label: "Messages" },
                { icon: Star, label: "Reviews" },
                { icon: Settings, label: "Settings" },
                { icon: HelpCircle, label: "Help Centre" },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="mt-8 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 bg-[#111111]/30 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-white/40">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboards</span>
            <span>/</span>
            <span className="text-white">Overview</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 border-r border-white/10 pr-6">
               <button className="text-white/50 hover:text-white transition-colors"><Moon className="w-4 h-4" /></button>
               <button onClick={() => void fetchData()} className="text-white/50 hover:text-white transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
               <button className="text-white/50 hover:text-white transition-colors relative">
                 <Bell className="w-4 h-4" />
                 <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#111111]" />
               </button>
               <button className="text-white/50 hover:text-white transition-colors"><Globe className="w-4 h-4" /></button>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/40 mr-2">Today</span>
                <MoreVertical className="w-4 h-4 text-white/40" />
             </div>
          </div>
        </header>

        <main className="p-8 space-y-8 overflow-y-auto flex-1">
          {/* Expiry Alert */}
          {expiringShops.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3 text-sm text-amber-400">
              <span className="text-xl">⚠️</span>
              <p><strong>{expiringShops.length} shops</strong> expiring soon: {expiringShops.map(s => s.name).join(", ")}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
             <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
             <div className="flex items-center gap-3">
               <span className="text-xs text-white/40 font-semibold tracking-widest uppercase">Auto-refresh: {countdown}s</span>
               <CreateShopForm />
             </div>
          </div>

          {activeTab === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Net revenue", value: `₹${mrr.toLocaleString()}`, trend: "0.4%", icon: DollarSign, color: "text-white" },
                  { label: "ARR", value: `₹${(mrr * 12).toLocaleString()}`, trend: "32%", icon: TrendingUp, color: "text-white" },
                  { label: "Quarterly goal", value: "71%", trend: "Goal: ₹1.1M", icon: Briefcase, color: "text-white" },
                  { label: "Total Orders", value: stats?.total ?? "0", trend: "11%", icon: ShoppingCart, color: "text-white" },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#161616] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{stat.label}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-black mb-1">{loading ? "..." : stat.value}</h3>
                          <p className="text-[10px] font-bold text-lime-500 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {stat.trend} vs last month
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:text-lime-500 group-hover:border-lime-500/30 group-hover:bg-lime-500/5 transition-all">
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Charts Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Overview Donut */}
                <div className="lg:col-span-2 bg-[#161616] border border-white/5 p-8 rounded-[2rem] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold">Sales Overview</h3>
                    <MoreVertical className="w-5 h-5 text-white/30" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                     <div className="h-64 relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={(() => {
                               const dist = data?.shops.reduce((acc, shop) => {
                                 const plan = shop.subscription?.plan_name ?? "None";
                                 acc[plan] = (acc[plan] || 0) + 1;
                                 return acc;
                               }, {} as Record<string, number>) ?? {};
                               return Object.entries(dist).map(([name, value]) => ({ name, value }));
                             })()}
                             cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} stroke="none"
                             dataKey="value"
                           >
                             {data?.shops.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={["#84cc16", "#10b981", "#065f46", "#365314"][index % 4]} />
                             ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <p className="text-4xl font-black">{data?.shops.length ?? 0}</p>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Shops</p>
                       </div>
                     </div>
                     <div className="space-y-6">
                        <div className="bg-lime-500/5 border border-lime-500/10 p-5 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-lime-500 flex items-center justify-center text-black font-bold">₹</div>
                              <div>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Number of Sales</p>
                                <p className="text-xl font-black">₹{mrr.toLocaleString()}</p>
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           {[
                             { label: "Starter", value: `₹${(data?.shops.filter(s => s.subscription?.plan_name === 'starter').length ?? 0) * 999}`, color: "bg-lime-500" },
                             { label: "Standard", value: `₹${(data?.shops.filter(s => s.subscription?.plan_name === 'standard').length ?? 0) * 1999}`, color: "bg-emerald-500" },
                             { label: "Pro", value: `₹${(data?.shops.filter(s => s.subscription?.plan_name === 'pro').length ?? 0) * 3999}`, color: "bg-emerald-800" },
                             { label: "Elite", value: "Custom", color: "bg-lime-900" },
                           ].map((plan, i) => (
                             <div key={i} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${plan.color}`} />
                                <div className="min-w-0">
                                   <p className="text-[10px] font-bold text-white/40 uppercase truncate">{plan.label}</p>
                                   <p className="text-xs font-bold truncate">{plan.value}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>

                {/* Small stats and area chart */}
                <div className="space-y-6 flex flex-col">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#161616] border border-white/5 p-6 rounded-3xl">
                         <div className="w-8 h-8 rounded-full bg-lime-500/10 flex items-center justify-center text-lime-500 mb-4">
                            <UserPlus className="w-4 h-4" />
                         </div>
                         <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">New Shops</p>
                         <p className="text-2xl font-black">{data?.shops.filter(s => new Date(s.created_at).getTime() > Date.now() - 7 * 86400000).length ?? 0}</p>
                         <p className="text-[10px] font-bold text-rose-500">-8% last week</p>
                      </div>
                      <div className="bg-[#161616] border border-white/5 p-6 rounded-3xl">
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                            <ArrowUpRight className="w-4 h-4" />
                         </div>
                         <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Profit</p>
                         <p className="text-2xl font-black">₹{(mrr * 0.4).toLocaleString()}</p>
                         <p className="text-[10px] font-bold text-lime-500">+42% weekly</p>
                      </div>
                   </div>

                   <div className="bg-[#161616] border border-white/5 p-8 rounded-[2rem] flex-1">
                      <div className="flex items-center justify-between mb-4">
                         <div>
                            <h3 className="text-lg font-bold">Total Profit</h3>
                            <p className="text-[10px] font-bold text-white/40 uppercase">Performance trend</p>
                         </div>
                         <p className="text-xl font-black text-lime-500">₹{(mrr * 0.4).toLocaleString()}</p>
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={[
                             { v: 4000 }, { v: 3000 }, { v: 5000 }, { v: 4500 }, { v: 7000 }, { v: 6500 }, { v: 8000 }
                           ]}>
                              <defs>
                                 <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                                   <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke="#84cc16" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                           </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Recent Shops list table */}
                 <div className="lg:col-span-2 bg-[#161616] border border-white/5 p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-lg font-bold">Recent Shops</h3>
                       <MoreVertical className="w-5 h-5 text-white/30" />
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5">
                                <th className="pb-4 pl-2">Name</th>
                                <th className="pb-4 text-center">Status</th>
                                <th className="pb-4 text-right pr-2">Total Value</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {(data?.shops.slice(0, 5) ?? []).map((shop, i) => (
                               <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                  <td className="py-4 pl-2">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 font-bold border border-white/10 group-hover:border-lime-500/30 group-hover:text-lime-500 transition-all">
                                           {shop.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                           <p className="text-sm font-bold">{shop.name}</p>
                                           <p className="text-[10px] text-white/40">{shop.shop_type}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-4 text-center">
                                     <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${shop.is_blocked ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-lime-500/10 text-lime-500 border border-lime-500/20'}`}>
                                        {shop.is_blocked ? 'Blocked' : 'Active'}
                                     </span>
                                  </td>
                                  <td className="py-4 text-right pr-2 font-bold text-sm">
                                     ₹{mrr.toLocaleString()}
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* Premium plan promo */}
                 <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 p-8 rounded-[2rem] border border-white/10 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Globe className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                       <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest mb-6">
                          <TrendingUp className="w-3 h-3 text-lime-500" /> Premium Plans
                       </div>
                       <h3 className="text-4xl font-black mb-4">₹9,999 <span className="text-sm font-bold text-white/40">/ Per Month</span></h3>
                       <p className="text-sm text-white/60 mb-8 leading-relaxed">Improve your platform reach, view and analyze all global shop profits and losses in real-time with BILLY Elite.</p>
                    </div>
                    <button className="w-full py-4 bg-lime-500 text-black font-black rounded-2xl shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:scale-[1.02] transition-all">Get Started</button>
                 </div>
              </div>
            </>
          )}

          {activeTab === "shops" && (
            <div className="bg-[#161616] border border-white/5 p-8 rounded-[2rem]">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">Shop Management</h3>
                  <button onClick={() => void fetchData()} className="text-xs border border-white/10 rounded-xl px-4 py-2 hover:bg-white/5 flex items-center gap-2">
                     <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
               </div>
               {loading ? (
                 <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
                 </div>
               ) : (
                 <ShopTable
                   shops={data?.shops ?? []}
                   onRefresh={fetchData}
                   onViewBills={(shopId, shopName) => void openBills(shopId, shopName)}
                   onManageStaff={(shopId, shopName) => void openStaff(shopId, shopName)}
                 />
               )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-[#161616] border border-white/5 p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold mb-8">Plan Distribution</h3>
                  <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={(() => {
                                 const dist = data?.shops.reduce((acc, shop) => {
                                    const plan = shop.subscription?.plan_name ?? "None";
                                    acc[plan] = (acc[plan] || 0) + 1;
                                    return acc;
                                 }, {} as Record<string, number>) ?? {};
                                 return Object.entries(dist).map(([name, value]) => ({ name: name.toUpperCase(), value }));
                              })()}
                              cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} stroke="none"
                              dataKey="value"
                              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                           >
                              {data?.shops.map((_, index) => (
                                 <Cell key={`cell-${index}`} fill={["#84cc16", "#10b981", "#0ea5e9", "#6366f1", "#f43f5e"][index % 5]} />
                              ))}
                           </Pie>
                           <RechartsTooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-[#161616] border border-white/5 p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold mb-8">Shop Categories</h3>
                  <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={(() => {
                                 const dist = data?.shops.reduce((acc, shop) => {
                                    const type = shop.shop_type || "Unknown";
                                    acc[type] = (acc[type] || 0) + 1;
                                    return acc;
                                 }, {} as Record<string, number>) ?? {};
                                 return Object.entries(dist).map(([name, value]) => ({ name, value }));
                              })()}
                              cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} stroke="none"
                              dataKey="value"
                              label={({ name }) => `${name}`}
                           >
                              {data?.shops.map((_, index) => (
                                 <Cell key={`cell-${index}`} fill={["#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b"][index % 5]} />
                              ))}
                           </Pie>
                           <RechartsTooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
      <aside className="hidden xl:flex w-80 border-l border-white/5 bg-[#111111]/30 backdrop-blur-xl flex-col sticky top-0 h-screen p-8 overflow-y-auto shrink-0">
         <div className="space-y-12">
            {/* Notifications */}
            <div>
               <h3 className="text-sm font-bold mb-6">Notifications</h3>
               <div className="space-y-6">
                  {[
                    { label: "New shops registered.", time: "Just now", icon: UserPlus, color: "bg-lime-500" },
                    { label: "High volume orders detected.", time: "12 hours ago", icon: ShoppingBag, color: "bg-emerald-500" },
                    { label: "Platform update complete.", time: "Yesterday", icon: RefreshCw, color: "bg-indigo-500" },
                  ].map((n, i) => (
                    <div key={i} className="flex gap-4">
                       <div className={`w-8 h-8 rounded-full ${n.color} flex items-center justify-center text-black shrink-0`}>
                          <n.icon className="w-4 h-4" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-white/80 leading-tight mb-1">{n.label}</p>
                          <p className="text-[10px] text-white/30 font-bold">{n.time}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Activities */}
            <div>
               <h3 className="text-sm font-bold mb-6">Activities</h3>
               <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                  {[
                    { title: "Changed global pricing.", time: "Just now", color: "bg-lime-500" },
                    { title: "177 new products added.", time: "47 minutes ago", color: "bg-emerald-500" },
                    { title: "Staff @admin updated roles.", time: "Yesterday", color: "bg-white/40" },
                  ].map((a, i) => (
                    <div key={i} className="relative">
                       <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#111111] ${a.color}`} />
                       <p className="text-xs font-bold text-white/80 mb-1">{a.title}</p>
                       <p className="text-[10px] text-white/30 font-bold">{a.time}</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* Contacts */}
            <div>
               <h3 className="text-sm font-bold mb-6">Regional Managers</h3>
               <div className="space-y-4">
                  {[
                    { name: "Daniel Craig", email: "daniel@billy.com", icon: "👨‍💼" },
                    { name: "Kate Morrison", email: "kate@billy.com", icon: "👩‍💼" },
                    { name: "Nataniel Donovan", email: "nat@billy.com", icon: "👨‍💻", active: true },
                  ].map((c, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${c.active ? 'bg-lime-500 border-lime-500 text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]' : 'bg-white/5 border-white/5 text-white'}`}>
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xl ${c.active ? 'bg-black/10' : 'bg-white/5'}`}>{c.icon}</div>
                          <div>
                             <p className="text-[10px] font-bold">{c.name}</p>
                          </div>
                       </div>
                       {c.active && (
                         <div className="flex gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            <Phone className="w-3.5 h-3.5" />
                         </div>
                       )}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {billsShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="w-full max-w-4xl bg-[#161616] border border-white/10 rounded-[2rem] p-8 shadow-2xl max-h-[90vh] flex flex-col text-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Bills — {billsShop.name}</h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Audit log (Read-only)</p>
              </div>
              <button onClick={() => setBillsShop(null)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">×</button>
            </div>
            {billsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center"><RefreshCw className="animate-spin mb-4" /><p className="text-xs font-bold text-white/40">Loading bills...</p></div>
            ) : (
              <div className="overflow-y-auto flex-1 rounded-2xl border border-white/5">
                <table className="w-full text-left">
                  <thead className="bg-white/5 sticky top-0 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Bill #</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Total</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {shopBills.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-mono font-bold text-xs text-lime-500">{b.bill_number}</td>
                        <td className="px-6 py-4 text-xs font-bold">{b.customer_name || "—"}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-white/40">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black">₹{Number(b.total).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${b.status === "paid" ? "bg-lime-500/10 text-lime-500" : "bg-rose-500/10 text-rose-500"}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {staffShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="w-full max-w-xl bg-[#161616] border border-white/10 rounded-[2rem] p-8 shadow-2xl max-h-[90vh] flex flex-col text-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Staff — {staffShop.name}</h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Manage cashier access</p>
              </div>
              <button onClick={() => { setStaffShop(null); setShowAddStaff(false); }} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">×</button>
            </div>

            {showAddStaff ? (
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-8 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest">New Staff Member</h4>
                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 text-white" placeholder="Username" value={staffForm.username} onChange={(e) => setStaffForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} />
                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 text-white" placeholder="Display name" value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} />
                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 text-white" type="password" placeholder="Password" value={staffForm.password} onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))} />
                <div className="flex gap-4 pt-2">
                  <button onClick={createStaff} disabled={staffBusy} className="flex-1 bg-lime-500 text-black font-black py-3 rounded-xl disabled:opacity-50 transition-all">{staffBusy ? "Creating..." : "Create"}</button>
                  <button onClick={() => setShowAddStaff(false)} className="flex-1 border border-white/10 hover:bg-white/5 text-xs font-bold uppercase py-3 rounded-xl transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddStaff(true)} className="mb-8 w-full rounded-2xl border-2 border-dashed border-white/10 py-4 text-sm font-bold text-white/30 hover:border-lime-500/30 hover:text-lime-500 transition-all">
                + Add Staff Member
              </button>
            )}

            <div className="overflow-y-auto flex-1 space-y-3">
              {staffLoading ? (
                <p className="text-center text-xs font-bold text-white/40">Loading staff...</p>
              ) : (
                staffList.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 border border-white/10 px-5 py-4 rounded-2xl group hover:border-lime-500/30 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-500 font-black">{s.name?.[0] ?? "S"}</div>
                       <div>
                          <p className="text-sm font-bold">{s.name}</p>
                          <p className="text-[10px] font-bold text-white/40 uppercase">@{s.username}</p>
                       </div>
                    </div>
                    <button onClick={() => deleteStaff(s.id, s.username)} className="text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-all">Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
