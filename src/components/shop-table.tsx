"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ShopDetail } from "@/types/shop";
import { 
  MoreVertical, Shield, User, CreditCard, Calendar, CheckCircle2, 
  XCircle, AlertCircle, ExternalLink, Key, BarChart3, ShoppingCart, Users, Store
} from "lucide-react";

type Props = {
  shops: ShopDetail[];
  onRefresh: () => void;
  onViewBills: (shopId: string, shopName: string) => void;
  onManageStaff: (shopId: string, shopName: string) => void;
};

export function ShopTable({ shops, onRefresh, onViewBills, onManageStaff }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<ShopDetail | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [planTarget, setPlanTarget] = useState<ShopDetail | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("starter");

  // Fix: Calculate now once to avoid purity issues in render
  const now = useMemo(() => Date.now(), []);

  async function callShopApi(shopId: string, body: Record<string, unknown>) {
    setBusy(shopId);
    setError("");
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json()) as { message?: string };
        setError(j.message ?? "Action failed.");
      } else {
        onRefresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  const handleImpersonate = async (shop: ShopDetail) => {
    setBusy(shop.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/shops/${shop.id}/impersonate`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json() as { message?: string };
        throw new Error(j.message ?? "Impersonate failed");
      }
      router.push("/shop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
      setBusy(null);
    }
  };

  async function handleBlock(shop: ShopDetail) {
    await callShopApi(shop.id, { action: shop.is_blocked ? "unblock" : "block" });
  }

  async function handlePasswordReset() {
    if (!resetTarget) return;
    await callShopApi(resetTarget.id, { action: "reset_password", password: newPassword });
    setResetTarget(null);
    setNewPassword("");
  }

  async function handlePlanUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!planTarget) return;
    const fd = new FormData(e.currentTarget);
    await callShopApi(planTarget.id, {
      action: "update_plan",
      plan_name: fd.get("plan_name"),
      custom_price: fd.get("custom_price"),
      expires_at: new Date(fd.get("expires_at") as string).toISOString(),
      billing_enabled: fd.get("billing_enabled") === "on",
      inventory_enabled: fd.get("inventory_enabled") === "on",
      reports_enabled: fd.get("reports_enabled") === "on",
    });
    setPlanTarget(null);
  }

  if (shops.length === 0) {
    return (
      <div className="bg-[#161616] border border-white/5 rounded-3xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
          <Store className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-lg font-bold mb-1">No shops found</h3>
        <p className="text-sm text-white/40">Get started by creating your first shop profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-sm text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Password reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black">Reset Password</h3>
                <p className="text-xs font-bold text-white/40 uppercase">User: @{resetTarget.shopUser?.username ?? "—"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500/50 text-white"
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="flex gap-4 pt-2">
                <button
                  onClick={handlePasswordReset}
                  disabled={busy === resetTarget.id || newPassword.length < 6}
                  className="flex-1 bg-amber-500 text-black font-black py-3 rounded-xl disabled:opacity-50 transition-all hover:bg-amber-400"
                >
                  {busy === resetTarget.id ? "Saving..." : "Reset Password"}
                </button>
                <button
                  onClick={() => { setResetTarget(null); setNewPassword(""); }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-xs font-bold uppercase py-3 rounded-xl transition-all text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan update modal */}
      {planTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="w-full max-w-lg bg-[#161616] border border-white/10 rounded-[2rem] p-8 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-500 border border-lime-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black">Edit Subscription</h3>
                <p className="text-xs font-bold text-white/40 uppercase">Shop: {planTarget.name}</p>
              </div>
            </div>

            <form onSubmit={handlePlanUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Select Plan</label>
                  <select
                    name="plan_name"
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 appearance-none text-white"
                  >
                    <option value="starter">Starter (₹999)</option>
                    <option value="standard">Standard (₹1,999)</option>
                    <option value="pro">Pro (₹3,999)</option>
                    <option value="elite">Elite (Custom)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Expiry Date</label>
                  <input
                    name="expires_at"
                    type="date"
                    defaultValue={planTarget.subscription?.expires_at?.slice(0, 10) ?? ""}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 text-white"
                  />
                </div>
              </div>
              
              {selectedPlan === "elite" && (
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Custom Price (₹/mo)</label>
                  <input name="custom_price" type="number" min="0" required defaultValue={planTarget.subscription?.custom_price ?? 0} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 text-white" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Module Access</label>
                <div className="grid grid-cols-3 gap-4">
                  {(
                    [
                      ["billing_enabled", "Billing"],
                      ["inventory_enabled", "Inventory"],
                      ["reports_enabled", "Reports"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 bg-black/40 border border-white/10 p-4 rounded-2xl cursor-pointer hover:border-lime-500/30 transition-all group">
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={Boolean(planTarget.subscription?.[key as keyof typeof planTarget.subscription])}
                        className="h-4 w-4 rounded border-white/20 bg-transparent text-lime-500 focus:ring-lime-500"
                      />
                      <span className="text-xs font-bold group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={busy === planTarget.id}
                  className="flex-1 bg-lime-500 text-black font-black py-4 rounded-2xl disabled:opacity-50 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(132,204,22,0.3)]"
                >
                  {busy === planTarget.id ? "Saving..." : "Update Subscription"}
                </button>
                <button
                  type="button"
                  onClick={() => setPlanTarget(null)}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-xs font-bold uppercase py-4 rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#161616]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-5">Shop Details</th>
              <th className="px-6 py-5">Plan Status</th>
              <th className="px-6 py-5">Modules</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {shops.map((shop) => {
              const sub = shop.subscription;
              const isExpired = sub && new Date(sub.expires_at).getTime() < now;
              
              const status = shop.is_blocked ? "Blocked" : isExpired ? "Expired" : sub ? "Active" : "No Plan";
              const colorClasses = shop.is_blocked 
                ? "text-rose-500 bg-rose-500/10 border-rose-500/20" 
                : isExpired 
                  ? "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                  : sub 
                    ? "text-lime-500 bg-lime-500/10 border-lime-500/20" 
                    : "text-white/40 bg-white/5 border-white/10";
              const StatusIcon = shop.is_blocked ? XCircle : isExpired ? AlertCircle : sub ? CheckCircle2 : Shield;

              return (
                <tr key={shop.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 font-black group-hover:border-lime-500/30 group-hover:text-lime-500 transition-all relative overflow-hidden">
                         {shop.name[0].toUpperCase()}
                         {sub?.plan_name === 'elite' && <div className="absolute top-0 right-0 w-3 h-3 bg-lime-500 blur-[4px] rounded-full -mr-1 -mt-1" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-tight mb-1">{shop.name}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{shop.shop_type}</span>
                           <span className="w-1 h-1 rounded-full bg-white/10" />
                           <span className="text-[10px] font-bold text-white/40 leading-none">@{shop.shopUser?.username}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                     <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest mb-2 bg-black/20 ${colorClasses}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status}
                     </div>
                     {sub && (
                       <p className="text-[10px] font-bold text-white/30 flex items-center gap-1.5 ml-1">
                          <Calendar className="w-3 h-3" />
                          Expires {new Date(sub.expires_at).toLocaleDateString()}
                       </p>
                     )}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex gap-2">
                      {sub?.billing_enabled && <div title="Billing Enabled" className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500"><CreditCard className="w-4 h-4" /></div>}
                      {sub?.inventory_enabled && <div title="Inventory Enabled" className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500"><Shield className="w-4 h-4" /></div>}
                      {sub?.reports_enabled && <div title="Reports Enabled" className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500"><BarChart3 className="w-4 h-4" /></div>}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleImpersonate(shop)} disabled={busy === shop.id} className="p-2.5 rounded-xl bg-white text-black hover:bg-lime-500 transition-all disabled:opacity-50" title="Login As Shop Owner">
                         <ExternalLink className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setPlanTarget(shop); setSelectedPlan(shop.subscription?.plan_name ?? "starter"); }} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-lime-500/50 hover:text-lime-500 transition-all" title="Edit Subscription">
                         <CreditCard className="w-4 h-4" />
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-1" />
                      <button onClick={() => onViewBills(shop.id, shop.name)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:text-blue-400 transition-all" title="Audit Bills">
                         <ShoppingCart className="w-4 h-4" />
                      </button>
                      <button onClick={() => onManageStaff(shop.id, shop.name)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:text-purple-400 transition-all" title="Manage Staff">
                         <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => setResetTarget(shop)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:text-amber-400 transition-all" title="Reset Password">
                         <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleBlock(shop)} disabled={busy === shop.id} className={`p-2.5 rounded-xl border transition-all ${shop.is_blocked ? 'bg-lime-500/10 border-lime-500/20 text-lime-500 hover:bg-lime-500/20' : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'}`} title={shop.is_blocked ? "Unblock Shop" : "Block Shop"}>
                         <Shield className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Placeholder for when not hovered to maintain layout */}
                    <div className="flex justify-end group-hover:hidden">
                       <MoreVertical className="w-5 h-5 text-white/20" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
