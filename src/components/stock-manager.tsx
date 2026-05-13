"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/types/item";
import { useToast } from "@/components/toast-provider";
import { CameraScanner } from "@/components/camera-scanner";

export function StockManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [addQty, setAddQty] = useState<number | "">("");
  const [exactQty, setExactQty] = useState<number | "">("");
  const [limitQty, setLimitQty] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const barcodeRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/items");
      const data = (await res.json()) as { items: Item[] };
      setItems(data.items);
    } catch {
      toast("Failed to load items.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const scanned = items.find((i) => i.barcode === barcodeInput.trim() || i.name.toLowerCase().includes(barcodeInput.trim().toLowerCase()));
    if (scanned) {
      setSelectedItem(scanned);
      setAddQty("");
      setExactQty(scanned.stock_quantity || 0);
      setLimitQty(scanned.low_stock_limit || 10);
      setBarcodeInput("");
    } else {
      toast("Item not found.", "error");
      setBarcodeInput("");
    }
  }

  async function handleUpdateStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || busy) return;
    
    setBusy(true);
    try {
      const finalStock = exactQty !== "" ? Number(exactQty) : (Number(selectedItem.stock_quantity || 0) + Number(addQty || 0));
      const finalLimit = limitQty !== "" ? Number(limitQty) : Number(selectedItem.low_stock_limit || 10);
      
      const res = await fetch(`/api/shop/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: finalStock, low_stock_limit: finalLimit }),
      });
      
      if (!res.ok) {
        toast("Failed to update stock.", "error");
      } else {
        toast(`Updated ${selectedItem.name}. Stock: ${finalStock}`);
        setSelectedItem(null);
        setAddQty("");
        setExactQty("");
        await fetchItems();
        barcodeRef.current?.focus();
      }
    } catch {
      toast("Network error.", "error");
    } finally {
      setBusy(false);
    }
  }

  const lowStockItems = items.filter(i => Number(i.stock_quantity) <= Number(i.low_stock_limit));

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {/* Camera modal */}
      {showCamera && (
        <CameraScanner 
          onScan={(code) => {
            const scanned = items.find((i) => i.barcode === code);
            if (scanned) {
              setSelectedItem(scanned);
              setExactQty(scanned.stock_quantity || 0);
              setLimitQty(scanned.low_stock_limit || 10);
            } else {
              toast("Item not found.", "error");
            }
            setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* LEFT: Restock Section */}
      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4">📦 Manage Stock</h2>
        
        <form onSubmit={handleBarcodeSubmit} className="mb-6 flex flex-col gap-2">
          <label className="block text-sm font-medium text-slate-600">Scan Barcode or Search Name</label>
          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              autoFocus
              className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-lg outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 transition-all font-bold placeholder-emerald-400"
              placeholder="📠 Scan..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
            <button type="button" onClick={() => setShowCamera(true)} className="px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-sm whitespace-nowrap">
              📷 Camera
            </button>
          </div>
        </form>

        {selectedItem && (
          <div className="p-5 border-2 border-emerald-500 rounded-xl bg-emerald-50 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-emerald-900">{selectedItem.name}</h3>
                <p className="text-sm text-emerald-700">Current Stock: <span className="font-black text-lg">{selectedItem.stock_quantity || 0}</span></p>
                <p className="text-xs text-emerald-600">Barcode: {selectedItem.barcode || "N/A"}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-emerald-400 hover:text-emerald-700 font-bold text-lg">×</button>
            </div>
            
            <form onSubmit={handleUpdateStock} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Add (Quick +)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border-2 border-emerald-300 px-4 py-2 font-bold text-lg outline-none focus:border-emerald-600"
                    value={addQty}
                    placeholder="+0"
                    onChange={(e) => { setAddQty(e.target.value ? Number(e.target.value) : ""); setExactQty(""); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Set Exact Stock</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border-2 border-emerald-300 px-4 py-2 font-bold text-lg outline-none focus:border-emerald-600"
                    value={exactQty}
                    onChange={(e) => { setExactQty(e.target.value ? Number(e.target.value) : ""); setAddQty(""); }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Low Stock Limit Alert Trigger</label>
                <input 
                  type="number" 
                  className="w-full rounded-lg border-2 border-emerald-300 px-4 py-2 font-bold outline-none focus:border-emerald-600"
                  value={limitQty}
                  onChange={(e) => setLimitQty(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <button disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 mt-2">
                {busy ? "Saving..." : "Save Stock & Limit"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT: Low Stock Alerts */}
      <div className="w-full lg:w-96 bg-white p-6 rounded-xl border border-rose-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 text-rose-600 flex items-center gap-2">
          🚨 Low Stock Alerts
          <span className="bg-rose-100 text-rose-700 text-xs py-0.5 px-2 rounded-full">{lowStockItems.length}</span>
        </h2>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg w-full"></div>)}
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">✅</span>
            <p className="mt-2 text-sm text-slate-500 font-medium">All items are well stocked!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 rounded-lg border border-rose-100 bg-rose-50">
                <div>
                  <p className="font-bold text-sm text-rose-900 truncate">{item.name}</p>
                  <p className="text-xs text-rose-700">Limit: {item.low_stock_limit}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-rose-600">{item.stock_quantity || 0}</span>
                  <p className="text-[10px] text-rose-400 uppercase font-bold">Left</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
