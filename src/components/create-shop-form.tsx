"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Store, User, Phone, Mail, MapPin, Tag, CreditCard, Calendar, Shield, Key } from "lucide-react";

export function CreateShopForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("starter");

  // Expiry default: 30 days from today
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const body = {
      name: fd.get("name"),
      owner_name: fd.get("owner_name"),
      phone: fd.get("phone") || undefined,
      email: fd.get("email") || undefined,
      address: fd.get("address") || undefined,
      gst_number: fd.get("gst_number") || undefined,
      shop_registration_number: fd.get("shop_registration_number") || undefined,
      shop_type: fd.get("shop_type"),
      plan_name: fd.get("plan_name"),
      custom_price: fd.get("custom_price") ? Number(fd.get("custom_price")) : undefined,
      expires_at: new Date(fd.get("expires_at") as string).toISOString(),
      billing_enabled: fd.get("billing_enabled") === "on",
      inventory_enabled: fd.get("inventory_enabled") === "on",
      reports_enabled: fd.get("reports_enabled") === "on",
      username: fd.get("username"),
      password: fd.get("password"),
    };

    try {
      const res = await fetch("/api/admin/shops/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json()) as { message?: string };
        setError(j.message ?? "Failed to create shop.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-black text-black hover:bg-lime-400 transition-all shadow-[0_0_20px_rgba(132,204,22,0.2)] active:scale-95"
      >
        <Plus className="w-4 h-4" />
        New Shop
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="w-full max-w-2xl bg-[#161616] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-lime-500/10 flex items-center justify-center text-lime-500 border border-lime-500/20">
                    <Store className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black">Register New Shop</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Platform Onboarding</p>
                 </div>
              </div>
              <button onClick={() => { setOpen(false); setError(""); }} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-sm text-rose-400 mb-6">
                <span className="text-xl">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-8">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-lime-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-lime-500" /> Basic Information
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Store className="w-3 h-3" /> Shop Name *
                    </label>
                    <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="Demo Tea Shop" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <User className="w-3 h-3" /> Owner Name *
                    </label>
                    <input name="owner_name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Phone className="w-3 h-3" /> Phone
                    </label>
                    <input name="phone" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="9xxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Mail className="w-3 h-3" /> Email
                    </label>
                    <input type="email" name="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="owner@shop.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <MapPin className="w-3 h-3" /> Address
                    </label>
                    <input name="address" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="123 Main St, City" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Tag className="w-3 h-3" /> Shop Type *
                    </label>
                    <input name="shop_type" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="tea_shop / grocery…" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Shield className="w-3 h-3" /> GST Number
                    </label>
                    <input name="gst_number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="22AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-lime-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-lime-500" /> Subscription Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <CreditCard className="w-3 h-3" /> Select Plan *
                    </label>
                    <select 
                      name="plan_name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 appearance-none"
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                    >
                      <option value="starter">Starter</option>
                      <option value="standard">Standard</option>
                      <option value="pro">Pro</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Calendar className="w-3 h-3" /> Expiry Date *
                    </label>
                    <input name="expires_at" type="date" required defaultValue={defaultExpiry} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 appearance-none" />
                  </div>
                  {selectedPlan === "elite" && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                         <CreditCard className="w-3 h-3" /> Custom Elite Price (₹/mo)
                      </label>
                      <input name="custom_price" type="number" min="0" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="9999" />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {(
                    [
                      ["billing_enabled", "Billing"],
                      ["inventory_enabled", "Inventory"],
                      ["reports_enabled", "Reports"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl cursor-pointer hover:border-lime-500/30 transition-all group">
                      <input type="checkbox" name={key} defaultChecked={key === "billing_enabled"} className="h-4 w-4 rounded border-white/20 bg-transparent text-lime-500 focus:ring-lime-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-lime-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-lime-500" /> Security Credentials
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <User className="w-3 h-3" /> Username *
                    </label>
                    <input name="username" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50 font-mono" placeholder="shop_demo" pattern="[a-z0-9_]+" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 pl-1">
                       <Key className="w-3 h-3" /> Password *
                    </label>
                    <input name="password" type="password" required minLength={6} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-500/50" placeholder="Min 6 chars" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-[#161616] py-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-lime-500 text-black font-black py-4 rounded-2xl disabled:opacity-50 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(132,204,22,0.3)]"
                >
                  {busy ? "Registering..." : "Complete Registration"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setError(""); }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest py-4 rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
