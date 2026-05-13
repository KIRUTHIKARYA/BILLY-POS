"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartItem } from "@/types/bill";
import type { Item } from "@/types/item";
import { PrintReceipt } from "@/components/print-receipt";
import { useToast } from "@/components/toast-provider";
import { CameraScanner } from "@/components/camera-scanner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = { id: string; label: string; items: CartItem[]; customerName: string; paymentMethod: "cash" | "upi" | "card" | "split"; discount: number; gstRate: number; extra: number; splitBreakdown: { cash: number; upi: number } };
type HeldBill = { id: string; label: string; items: CartItem[]; total: number };
type PrintableBill = Parameters<typeof PrintReceipt>[0]["bill"];

function makeFreshTab(n: number): Tab {
  return { id: crypto.randomUUID(), label: `Bill ${n}`, items: [], customerName: "", paymentMethod: "cash", discount: 0, gstRate: 0, extra: 0, splitBreakdown: { cash: 0, upi: 0 } };
}

function computeTotals(items: CartItem[], discount: number, extra: number, gstRate: number) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  const taxable = Math.max(Math.round((subtotal - discount) * 100) / 100, 0);
  const gstAmount = Math.round(taxable * (gstRate / 100) * 100) / 100;
  const total = Math.max(Math.round((taxable + gstAmount + extra) * 100) / 100, 0);
  return { subtotal, gstAmount, total };
}

const STORAGE_KEY = "billy_billing_state_v3";
const FREQ_KEY = "billy_item_freq_v1";

function getFreq(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(FREQ_KEY) ?? "{}") as Record<string, number>; } catch { return {}; }
}
function incFreq(itemId: string) {
  const f = getFreq(); f[itemId] = (f[itemId] ?? 0) + 1;
  try { localStorage.setItem(FREQ_KEY, JSON.stringify(f)); } catch {}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BillingScreen() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Tab[];
    } catch {}
    return [makeFreshTab(1)];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { const ts = JSON.parse(saved) as Tab[]; return ts[0]?.id ?? ""; }
    } catch {}
    return "";
  });
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabLabel, setEditingTabLabel] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [rushMode, setRushMode] = useState(false);
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const [printBill, setPrintBill] = useState<PrintableBill | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();

  // Active tab
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch {}
  }, [tabs]);

  // ---------------------------------------------------------------------------
  // Load items
  // ---------------------------------------------------------------------------
  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/items");
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[] };
      setItems(data.items);
      const cats = ["All", ...Array.from(new Set(data.items.map((i) => i.category)))];
      setCategories(cats);
    } catch {}
  }, []);

  // Load held bills
  const loadHeld = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/bills/held");
      if (!res.ok) return;
      const data = (await res.json()) as { held: Array<{ id: string; bill_number: string; items: Array<{ item_id: string; item_name: string; unit_price: number; quantity: number; line_total: number }>; total: number }> };
      setHeld(data.held.map((h) => ({
        id: h.id,
        label: h.bill_number.replace(/^HOLD-/, "").replace(/-[A-Z0-9]{4}$/, ""),
        total: h.total,
        items: h.items.map((li) => ({ itemId: li.item_id, name: li.item_name, unitPrice: li.unit_price, quantity: li.quantity, lineTotal: li.line_total })),
      })));
    } catch {}
  }, []);

  useEffect(() => { void loadItems(); void loadHeld(); }, [loadItems, loadHeld]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        // If they press Enter while not in the barcode field, maybe don't auto pay if they are editing something
        return;
      }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "n" || e.key === "N") addTab();
      if (e.key === "r" || e.key === "R") setRushMode((v) => !v);
      if (e.key === "Enter" && active && active.items.length > 0) void handlePay();
      
      // Auto-focus barcode scanner if user types numbers/characters outside inputs
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    processBarcode(barcodeInput.trim());
    setBarcodeInput("");
  }

  function processBarcode(code: string) {
    const scanned = items.find((i) => i.barcode === code);
    if (scanned) {
      addItem(scanned);
      // Optional sound or quick notification
    } else {
      toast(`Barcode ${code} not found. Add it in Items tab.`, "error");
    }
  }

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------
  function addTab() {
    const n = tabs.length + 1;
    const t = makeFreshTab(n);
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
  }

  function closeTab(id: string) {
    if (tabs.length === 1) { setTabs([makeFreshTab(1)]); return; }
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs[idx + 1] ?? tabs[idx - 1];
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setActiveId(next?.id ?? "");
  }

  function updateActive(patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));
  }

  // ---------------------------------------------------------------------------
  // Cart operations
  // ---------------------------------------------------------------------------
  function addItem(item: Item) {
    if (!active) return;
    incFreq(item.id);
    const existing = active.items.find((i) => i.itemId === item.id);
    let newItems: CartItem[];
    if (existing) {
      newItems = active.items.map((i) =>
        i.itemId === item.id ? { ...i, quantity: i.quantity + 1, lineTotal: Math.round((i.unitPrice * (i.quantity + 1)) * 100) / 100 } : i,
      );
    } else {
      newItems = [...active.items, { itemId: item.id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: item.price }];
    }
    updateActive({ items: newItems });
  }

  function addCustomItem() {
    const price = parseFloat(customPrice);
    if (!customName.trim() || isNaN(price) || price <= 0) { toast("Enter a valid name and price.", "error"); return; }
    const ci: CartItem = { itemId: `custom-${Date.now()}`, name: customName.trim(), unitPrice: price, quantity: 1, lineTotal: price };
    updateActive({ items: [...(active?.items ?? []), ci] });
    setCustomName(""); setCustomPrice(""); setShowCustom(false);
    toast(`"${ci.name}" added.`);
  }

  function changeQty(itemId: string, delta: number) {
    if (!active) return;
    const newItems = active.items
      .map((i) => i.itemId === itemId ? { ...i, quantity: i.quantity + delta, lineTotal: Math.round(i.unitPrice * (i.quantity + delta) * 100) / 100 } : i)
      .filter((i) => i.quantity > 0);
    updateActive({ items: newItems });
  }

  // ---------------------------------------------------------------------------
  // Hold / Resume
  // ---------------------------------------------------------------------------
  async function holdBill() {
    if (!active || active.items.length === 0) { toast("Cart is empty.", "error"); return; }
    try {
      const res = await fetch("/api/shop/bills/held", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: active.items.map((i) => ({ item_id: i.itemId, item_name: i.name, unit_price: i.unitPrice, quantity: i.quantity })),
          discount: active.discount, gst_rate: active.gstRate, extra_charges: active.extra,
          payment_method: active.paymentMethod, label: active.label,
        }),
      });
      if (!res.ok) { const j = await res.json() as {message:string}; toast(j.message, "error"); return; }
      toast(`"${active.label}" held.`);
      closeTab(activeId);
      await loadHeld();
    } catch { toast("Failed to hold bill.", "error"); }
  }

  async function resumeBill(heldId: string) {
    try {
      const res = await fetch(`/api/shop/bills/held/${heldId}`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json() as { bill: { bill_number: string; items: Array<{ item_id: string; item_name: string; unit_price: number; quantity: number; line_total: number }> } };
      const tab: Tab = {
        id: crypto.randomUUID(), label: data.bill.bill_number,
        items: data.bill.items.map((li) => ({ itemId: li.item_id, name: li.item_name, unitPrice: li.unit_price, quantity: li.quantity, lineTotal: li.line_total })),
        customerName: "", paymentMethod: "cash", discount: 0, gstRate: 0, extra: 0, splitBreakdown: { cash: 0, upi: 0 },
      };
      setTabs((prev) => [...prev, tab]); setActiveId(tab.id);
      setShowHeld(false); await loadHeld();
      toast(`"${tab.label}" resumed.`);
    } catch { toast("Failed to resume bill.", "error"); }
  }

  async function discardHeld(heldId: string) {
    try {
      await fetch(`/api/shop/bills/held/${heldId}`, { method: "DELETE" });
      await loadHeld(); toast("Held bill discarded.");
    } catch { toast("Discard failed.", "error"); }
  }

  // ---------------------------------------------------------------------------
  // Pay
  // ---------------------------------------------------------------------------
  async function handlePay() {
    if (!active || active.items.length === 0 || payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    try {
      const res = await fetch("/api/shop/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: active.items.map((i) => ({ item_id: i.itemId, item_name: i.name, unit_price: i.unitPrice, quantity: i.quantity })),
          customer_name: active.customerName.trim() || undefined,
          discount: active.discount, gst_rate: active.gstRate, extra_charges: active.extra,
          payment_method: active.paymentMethod,
          payment_breakdown: active.paymentMethod === "split" ? active.splitBreakdown : undefined,
        }),
      });
      const data = await res.json() as { bill?: PrintableBill; message?: string };
      if (!res.ok) { toast(data.message ?? "Payment failed.", "error"); return; }

      toast(`Bill ${data.bill?.bill_number ?? ""} paid! ✓`);

      if (autoPrint && data.bill) {
        // Fetch full bill with items for print
        const detailRes = await fetch(`/api/shop/bills/${data.bill.id}`);
        const detailData = await detailRes.json() as { bill: PrintableBill };
        setPrintBill(detailData.bill);
      }

      closeTab(activeId);
    } catch { toast("Network error. Try again.", "error"); }
    finally { payingRef.current = false; setPaying(false); }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const filteredItems = items.filter((item) => {
    const catMatch = activeCat === "All" || item.category === activeCat;
    const searchMatch = !search.trim() || item.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  // Rush mode: top 8 most-billed items by local frequency
  const displayItems = rushMode ? [...items].sort((a, b) => {
    // Read only when rush mode is actually active to avoid slow render
    const f = typeof window !== "undefined" ? getFreq() : {};
    return (f[b.id] ?? 0) - (f[a.id] ?? 0);
  }).slice(0, 8) : filteredItems;

  const { subtotal, gstAmount, total } = computeTotals(active?.items ?? [], active?.discount ?? 0, active?.extra ?? 0, active?.gstRate ?? 0);
  const cgst = Math.round(gstAmount / 2 * 100) / 100;
  const isSplit = active?.paymentMethod === "split";
  const splitSum = isSplit ? (active?.splitBreakdown.cash ?? 0) + (active?.splitBreakdown.upi ?? 0) : 0;
  const splitRemainder = isSplit ? Math.max(Math.round((total - splitSum) * 100) / 100, 0) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">

      {/* Camera modal */}
      {showCamera && (
        <CameraScanner 
          onScan={(code) => {
            processBarcode(code);
            setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* Print modal */}
      {printBill && <PrintReceipt bill={printBill as PrintableBill & { items: NonNullable<PrintableBill["items"]> }} onClose={() => setPrintBill(null)} />}

      {/* Custom item modal */}
      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold mb-3">Custom Item</h3>
            <div className="space-y-2">
              <input className="input" placeholder="Item name" value={customName} onChange={(e) => setCustomName(e.target.value)} autoFocus />
              <input className="input" placeholder="Price (₹)" type="number" min="0" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomItem()} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addCustomItem} className="flex-1 rounded-md bg-black py-2 text-sm text-white">Add</button>
              <button onClick={() => setShowCustom(false)} className="flex-1 rounded-md border border-black/20 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Held bills modal */}
      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Held Bills</h3>
              <button onClick={() => setShowHeld(false)} className="text-black/40 hover:text-black text-lg leading-none">×</button>
            </div>
            {held.length === 0 ? <p className="text-sm text-black/40 text-center py-4">No held bills.</p> : (
              <div className="space-y-2">
                {held.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2.5">
                    <div>
                      <p className="font-medium text-sm">{h.label}</p>
                      <p className="text-xs text-black/50">{h.items.length} items · ₹{Number(h.total).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => resumeBill(h.id)} className="rounded bg-black px-2 py-1 text-xs text-white">Resume</button>
                      <button onClick={() => discardHeld(h.id)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">Discard</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEFT PANEL: Items ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Tab bar (Top) */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 border-b border-slate-200">
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex items-center gap-1.5 rounded-t-xl px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                t.id === activeId ? "border-emerald-600 bg-white text-emerald-700 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] -translate-y-0.5" : "border-transparent bg-slate-50 hover:bg-slate-100 text-slate-500"
              }`}
            >
              {/* Double-click to rename tab */}
              {editingTabId === t.id ? (
                <input
                  autoFocus
                  value={editingTabLabel}
                  onChange={(e) => setEditingTabLabel(e.target.value)}
                  onBlur={() => {
                    if (editingTabLabel.trim()) {
                      setTabs((prev) => prev.map((tab) => tab.id === t.id ? { ...tab, label: editingTabLabel.trim() } : tab));
                    }
                    setEditingTabId(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none w-24 text-sm text-center"
                />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); setEditingTabId(t.id); setEditingTabLabel(t.label); }}>{t.label}</span>
              )}
              {t.items.length > 0 && <span className={`text-[10px] rounded-full px-2 py-0.5 ml-1 ${t.id === activeId ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{t.items.length}</span>}
              <span onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} className="ml-2 opacity-50 hover:opacity-100 text-lg leading-none">×</span>
            </div>
          ))}
          <button onClick={addTab} className="rounded-lg border-2 border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 hover:border-black/40 transition-colors font-bold">+</button>
          
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button 
              onClick={() => { void loadHeld(); setShowHeld(true); }} 
              className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all transform active:translate-y-1 active:shadow-none shadow-[0_4px_0_0_rgba(0,0,0,0.1)] ${held.length > 0 ? "border-amber-500 bg-amber-50 text-amber-700 shadow-[0_4px_0_0_rgba(245,158,11,0.3)]" : "border-black/20 bg-white"}`}
            >
              📋 {held.length > 0 ? `${held.length} Held` : "Held"}
            </button>
            <button 
              onClick={() => setRushMode((v) => !v)} 
              className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all transform active:translate-y-1 active:shadow-none ${rushMode ? "border-blue-600 bg-blue-600 text-white shadow-[0_4px_0_0_rgba(37,99,235,0.4)]" : "border-black/20 bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.1)]"}`}
            >
              ⚡ Rush
            </button>
          </div>
        </div>

        {/* Content Area (Sidebar + Grid) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
          
          {/* Horizontal Categories (Mobile Only) */}
          {!rushMode && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 shrink-0 no-scrollbar">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all border-2 ${
                    activeCat === c 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" 
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Vertical Categories Sidebar (Desktop Only) */}
          {!rushMode && (
            <div className="hidden lg:flex w-[140px] shrink-0 flex-col gap-2 overflow-y-auto pr-2 border-r border-slate-100">
              <form onSubmit={handleBarcodeSubmit} className="mb-2 w-full flex flex-col gap-2">
                <input
                  ref={barcodeRef}
                  autoFocus
                  className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 transition-all font-bold placeholder-emerald-400"
                  placeholder="📠 Scan..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!document.activeElement || document.activeElement.tagName === "BODY" || document.activeElement.tagName === "DIV") {
                        barcodeRef.current?.focus();
                      }
                    }, 100);
                  }}
                />
                <button type="button" onClick={() => setShowCamera(true)} className="w-full rounded-xl bg-emerald-600 text-white text-xs font-bold py-2 hover:bg-emerald-500 shadow-sm flex items-center justify-center gap-1">
                  📷 Camera
                </button>
              </form>

              <input
                ref={searchRef}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all mb-2"
                placeholder="Search (/)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {categories.map((c) => {
                const icon = c === "All" ? "🍽️" : c.toLowerCase().includes("beverage") || c.toLowerCase().includes("tea") ? "☕" : c.toLowerCase().includes("snack") ? "🍪" : "🏷️";
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={`flex items-center gap-2 w-full text-left rounded-xl px-3 py-3 text-sm font-bold transition-all border-2 ${
                      activeCat === c 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm transform -translate-y-0.5" 
                        : "border-transparent bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="truncate">{c}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Item grid area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile Scan/Search Bar (Mobile Only) */}
            <div className="lg:hidden flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button onClick={() => setShowCamera(true)} className="w-12 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white">
                📷
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-20">
              {rushMode && <p className="text-sm text-blue-600 font-bold mb-4 uppercase tracking-wider flex items-center gap-2">⚡ Rush Mode Active</p>}
              
              <div className={`grid gap-3 ${rushMode ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"}`}>
          {displayItems.map((item) => {
            const inCart = active?.items.find((i) => i.itemId === item.id);
            return (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className={`relative flex flex-col rounded-xl border bg-white p-3 text-center transition-all active:scale-95 hover:shadow-md ${inCart ? "border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,1)]" : "border-slate-200 hover:border-slate-300"}`}
              >
                {inCart && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white font-bold shadow-sm">
                    {inCart.quantity}
                  </span>
                )}
                <div className="flex-1 flex flex-col justify-center mb-2">
                  <p className="font-bold text-sm text-slate-800 leading-tight">{item.name}</p>
                </div>
                <p className="text-sm font-black text-emerald-600">₹{item.price.toFixed(2)}</p>
              </button>
            );
          })}
          {/* Custom item button */}
          <button
            onClick={() => setShowCustom(true)}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center hover:border-slate-400 hover:bg-slate-100 transition-colors flex flex-col justify-center items-center"
          >
            <p className="font-bold text-sm text-slate-500">+ Custom</p>
            <p className="text-xs text-slate-400 mt-0.5">One-off item</p>
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* ── RIGHT PANEL: Cart ─────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 flex flex-col gap-3 lg:min-h-0">

        {/* Customer name */}
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium placeholder-slate-400"
          placeholder="Customer name (optional)"
          value={active?.customerName ?? ""}
          onChange={(e) => updateActive({ customerName: e.target.value })}
        />

        {/* Cart items */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            Checkout ({active?.items.length ?? 0})
          </div>
          {!active?.items.length ? (
            <div className="px-3 py-10 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">🛒</span>
              <p className="text-xs font-medium text-slate-400">Cart is empty.<br/>Tap items to add.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {active.items.map((ci) => (
                <div key={ci.itemId} className="flex items-center gap-2 px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{ci.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                    <button onClick={() => changeQty(ci.itemId, -1)} className="h-6 w-6 flex items-center justify-center rounded-md text-emerald-600 font-bold hover:bg-white hover:shadow-sm transition-all">−</button>
                    <span className="w-6 text-center text-xs font-bold text-slate-700">{ci.quantity}</span>
                    <button onClick={() => changeQty(ci.itemId, 1)} className="h-6 w-6 flex items-center justify-center rounded-md text-emerald-600 font-bold hover:bg-white hover:shadow-sm transition-all">+</button>
                  </div>
                  <div className="w-16 flex flex-col items-end shrink-0">
                    <span className="text-sm font-bold text-slate-800">₹{ci.lineTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={() => changeQty(ci.itemId, -ci.quantity)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {/* Totals */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          {/* Discount */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500">Discount (₹)</label>
            <input type="number" min="0" step="1" className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs text-right font-medium focus:border-emerald-500 outline-none" value={active?.discount ?? 0} onChange={(e) => updateActive({ discount: Math.max(0, Number(e.target.value)) })} />
          </div>
          {/* GST */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500">GST (%)</label>
            <select className="w-20 rounded-md border border-slate-200 px-1 py-1 text-xs font-medium focus:border-emerald-500 outline-none" value={active?.gstRate ?? 0} onChange={(e) => updateActive({ gstRate: Number(e.target.value) })}>
              <option value={0}>None</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>
          {/* Extra */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500">Extra (₹)</label>
            <input type="number" min="0" step="1" className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs text-right font-medium focus:border-emerald-500 outline-none" value={active?.extra ?? 0} onChange={(e) => updateActive({ extra: Math.max(0, Number(e.target.value)) })} />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm font-medium text-slate-500"><span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span></div>
            {(active?.gstRate ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-xs font-medium text-emerald-600"><span>CGST ({((active?.gstRate ?? 0) / 2).toFixed(1)}%)</span><span>₹{cgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs font-medium text-emerald-600"><span>SGST ({((active?.gstRate ?? 0) / 2).toFixed(1)}%)</span><span>₹{cgst.toFixed(2)}</span></div>
              </>
            )}
            <div className="flex justify-between font-black text-xl text-slate-800 pt-1"><span>Total</span><span className="text-emerald-600">₹{total.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-4 gap-2 text-xs font-bold">
          {(["cash", "upi", "card", "split"] as const).map((m) => (
            <button key={m} onClick={() => updateActive({ paymentMethod: m })} className={`rounded-xl border py-2.5 uppercase transition-all ${active?.paymentMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{m}</button>
          ))}
        </div>

        {/* Split payment breakdown */}
        {isSplit && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Split Payment — Total ₹{total.toFixed(2)}</p>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">Cash (₹)</label>
              <input
                type="number" min="0" step="1" max={total}
                className="w-24 rounded-md border border-indigo-200 px-2 py-1.5 text-xs text-right font-medium focus:border-indigo-500 outline-none"
                value={active?.splitBreakdown.cash ?? 0}
                onChange={(e) => updateActive({ splitBreakdown: { ...active!.splitBreakdown, cash: Math.max(0, Number(e.target.value)) } })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">UPI (₹)</label>
              <input
                type="number" min="0" step="1" max={total}
                className="w-24 rounded-md border border-indigo-200 px-2 py-1.5 text-xs text-right font-medium focus:border-indigo-500 outline-none"
                value={active?.splitBreakdown.upi ?? 0}
                onChange={(e) => updateActive({ splitBreakdown: { ...active!.splitBreakdown, upi: Math.max(0, Number(e.target.value)) } })}
              />
            </div>
            {splitRemainder > 0 && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg text-center">Remaining: ₹{splitRemainder.toFixed(2)}</p>
            )}
            {splitRemainder === 0 && splitSum > 0 && (
              <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg text-center">✓ Fully Balanced</p>
            )}
          </div>
        )}

        {/* Auto Print Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 mt-1">
          <label className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2" htmlFor="autoprint">
            🖨️ Auto-Print Receipt
          </label>
          <button
            id="autoprint"
            type="button"
            role="switch"
            aria-checked={autoPrint}
            onClick={() => setAutoPrint(!autoPrint)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPrint ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPrint ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Pay + Hold */}
        <div className="flex gap-2 pt-1 pb-1">
          <button
            onClick={() => void handlePay()}
            disabled={!active?.items.length || paying}
            className="flex-1 rounded-2xl bg-emerald-600 py-3.5 text-base font-black text-white transition-all transform active:translate-y-1 active:shadow-none shadow-[0_5px_0_0_#059669] hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[0_5px_0_0_#059669]"
          >
            {paying ? "Processing…" : `Pay (₹${total.toFixed(2)})`}
          </button>
          <button 
            onClick={() => void holdBill()} 
            title="Hold bill" 
            className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 font-bold px-4 py-3.5 text-sm transition-all transform active:translate-y-1 active:shadow-none shadow-[0_5px_0_0_#d1fae5] hover:bg-emerald-100"
          >
            Hold
          </button>
          <button 
            onClick={() => updateActive({ items: [] })} 
            title="Clear bill" 
            className="rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-600 font-bold px-4 py-3.5 text-sm transition-all transform active:translate-y-1 active:shadow-none shadow-[0_5px_0_0_#ffe4e6] hover:bg-rose-100"
          >
            Clear
          </button>
        </div>

        {/* Keyboard hints */}
        <p className="text-[10px] text-black/25 text-center">/ Search · N New tab · R Rush · Enter Pay</p>
      </div>
    </div>
  );
}
