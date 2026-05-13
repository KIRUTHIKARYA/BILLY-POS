"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@/types/item";
import { useToast } from "@/components/toast-provider";
import { CameraScanner } from "@/components/camera-scanner";

// ─── CSV parser ─────────────────────────────────────────────────────────────
function parseCSV(text: string): Array<{ name: string; category: string; price: number }> {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.toLowerCase().split(",").map((h) => h.trim()) ?? [];
  const nameIdx = header.findIndex((h) => h.includes("name"));
  const catIdx = header.findIndex((h) => h.includes("cat"));
  const priceIdx = header.findIndex((h) => h.includes("price"));

  if (nameIdx === -1 || priceIdx === -1) throw new Error("CSV must have 'name' and 'price' columns.");

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[nameIdx] ?? "",
        category: catIdx >= 0 ? (cols[catIdx] ?? "General") : "General",
        price: parseFloat(cols[priceIdx] ?? "0"),
      };
    })
    .filter((r) => r.name && !isNaN(r.price));
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Category rename state
  const [renameCat, setRenameCat] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");

  // CSV import
  const [showCSV, setShowCSV] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; category: string; price: number }>>([]);
  const [csvError, setCsvError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Category add form — prefill from existing categories
  const [addCategory, setAddCategory] = useState("");
  const [showCameraAdd, setShowCameraAdd] = useState(false);
  const [showCameraEdit, setShowCameraEdit] = useState(false);

  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/items");
      const data = (await res.json()) as { items: Item[] };
      setItems(data.items);
    } catch {
      setError("Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  // Unique categories derived from items
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/shop/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: fd.get("name"), 
          category: fd.get("category"), 
          price: parseFloat(fd.get("price") as string),
          barcode: fd.get("barcode") || null,
          stock_quantity: parseFloat(fd.get("stock_quantity") as string) || 0,
          low_stock_limit: parseFloat(fd.get("low_stock_limit") as string) || 10
        }),
      });
      if (!res.ok) { const j = await res.json() as { message?: string }; setError(j.message ?? "Failed."); }
      else { setShowAdd(false); toast("Item added."); await fetchItems(); }
    } catch { setError("Network error."); }
    finally { setBusy(false); }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/shop/items/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: fd.get("name"), 
          category: fd.get("category"), 
          price: parseFloat(fd.get("price") as string),
          barcode: fd.get("barcode") || null,
          stock_quantity: parseFloat(fd.get("stock_quantity") as string) || 0,
          low_stock_limit: parseFloat(fd.get("low_stock_limit") as string) || 10,
          is_active: fd.get("is_active") === "on" 
        }),
      });
      if (!res.ok) { const j = await res.json() as { message?: string }; setError(j.message ?? "Failed."); }
      else { setEditItem(null); toast("Item updated."); await fetchItems(); }
    } catch { setError("Network error."); }
    finally { setBusy(false); }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/shop/items/${item.id}`, { method: "DELETE" });
      if (res.ok) { toast("Item removed."); await fetchItems(); }
    } catch { setError("Delete failed."); }
    finally { setBusy(false); }
  }

  // ── Category rename ────────────────────────────────────────────────────────

  async function handleRenameCategory() {
    if (!renameCat || !renameTo.trim() || renameTo.trim() === renameCat) { setRenameCat(null); return; }
    setBusy(true);
    try {
      // Patch all items in the category
      const targets = items.filter((i) => i.category === renameCat);
      await Promise.all(targets.map((item) =>
        fetch(`/api/shop/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: renameTo.trim() }),
        }),
      ));
      toast(`Category renamed to "${renameTo.trim()}".`);
      setRenameCat(null); setRenameTo("");
      await fetchItems();
    } catch { setError("Rename failed."); }
    finally { setBusy(false); }
  }

  async function handleDeleteCategory(cat: string) {
    const count = items.filter((i) => i.category === cat).length;
    if (!confirm(`Delete all ${count} items in "${cat}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const targets = items.filter((i) => i.category === cat);
      await Promise.all(targets.map((item) =>
        fetch(`/api/shop/items/${item.id}`, { method: "DELETE" }),
      ));
      toast(`Category "${cat}" deleted.`);
      await fetchItems();
    } catch { setError("Delete failed."); }
    finally { setBusy(false); }
  }

  // ── CSV Import ─────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError(""); setCsvPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target?.result as string);
        if (rows.length === 0) { setCsvError("No valid rows found."); return; }
        setCsvPreview(rows);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Parse error.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvPreview.length) return;
    setImporting(true); setCsvError("");
    try {
      const res = await fetch("/api/shop/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: csvPreview }),
      });
      const data = await res.json() as { inserted?: number; message?: string };
      if (!res.ok) { setCsvError(data.message ?? "Import failed."); return; }
      toast(`${data.inserted ?? csvPreview.length} items imported! ✓`);
      setShowCSV(false); setCsvPreview([]); if (fileRef.current) fileRef.current.value = "";
      await fetchItems();
    } catch { setCsvError("Network error."); }
    finally { setImporting(false); }
  }

  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <h2 className="font-semibold text-lg">Items</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCSV(true)} className="rounded-md border border-black/20 px-3 py-2 text-sm hover:bg-black/5">
            📥 Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80">
            + Add Item
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {/* ── CSV Import Modal ───────────────────────────────────────────────── */}
      {showCSV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Import Items from CSV</h3>
              <button onClick={() => { setShowCSV(false); setCsvPreview([]); setCsvError(""); }} className="text-black/40 hover:text-black text-xl">×</button>
            </div>

            <div className="rounded-lg bg-black/5 p-3 text-xs text-black/60 mb-3 font-mono">
              Required columns: <strong>name</strong>, <strong>price</strong><br />
              Optional: <strong>category</strong> (defaults to &quot;General&quot;)<br />
              Example: <em>Tea,Beverages,10.00</em>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm file:rounded-md file:border file:border-black/20 file:bg-white file:px-3 file:py-1.5 file:text-sm file:mr-3 mb-3"
            />

            {csvError && <p className="text-sm text-red-600 mb-3">{csvError}</p>}

            {csvPreview.length > 0 && (
              <>
                <p className="text-sm font-medium mb-2">{csvPreview.length} items ready to import:</p>
                <div className="overflow-x-auto rounded-lg border border-black/10 mb-4 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-black/5 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {csvPreview.slice(0, 50).map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">{row.name}</td>
                          <td className="px-3 py-1.5 text-black/50">{row.category}</td>
                          <td className="px-3 py-1.5 text-right">₹{row.price.toFixed(2)}</td>
                        </tr>
                      ))}
                      {csvPreview.length > 50 && <tr><td colSpan={3} className="px-3 py-1.5 text-center text-black/40">...and {csvPreview.length - 50} more</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleImport} disabled={importing} className="w-full rounded-md bg-black py-2.5 text-sm text-white disabled:opacity-50">
                  {importing ? "Importing…" : `Import ${csvPreview.length} Items`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Item Modal ─────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 shadow-xl">
            <h3 className="font-semibold mb-4">Add New Item</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <label className="block text-sm font-medium">Name *<input name="name" required autoFocus className="input mt-1" /></label>
              <label className="block text-sm font-medium flex gap-2 items-end">
                <div className="flex-1">
                  Barcode
                  <input id="add-barcode-input" name="barcode" className="input mt-1" placeholder="Optional" />
                </div>
                <button type="button" onClick={() => setShowCameraAdd(true)} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 whitespace-nowrap mb-0.5">
                  📷 Scan
                </button>
              </label>
              <label className="block text-sm font-medium">Category *
                <input 
                  name="category" 
                  list="category-list" 
                  required 
                  placeholder="Select or type new..." 
                  className="input mt-1" 
                  autoComplete="off"
                />
                <datalist id="category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <label className="block text-sm font-medium">Price (₹) *<input name="price" type="number" step="0.01" min="0" required className="input mt-1" /></label>
              <div className="flex gap-4">
                <label className="block text-sm font-medium flex-1">Stock Qty<input name="stock_quantity" type="number" step="0.01" defaultValue={0} required className="input mt-1" /></label>
                <label className="block text-sm font-medium flex-1">Low Stock Limit<input name="low_stock_limit" type="number" step="0.01" defaultValue={10} required className="input mt-1" /></label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={busy} className="flex-1 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Adding…" : "Add Item"}</button>
                <button type="button" onClick={() => { setShowAdd(false); setAddCategory(""); }} className="flex-1 rounded-md border border-black/20 px-4 py-2 text-sm">Cancel</button>
              </div>
            </form>
          </div>
          {showCameraAdd && (
            <CameraScanner 
              onScan={(code) => {
                const el = document.getElementById("add-barcode-input") as HTMLInputElement;
                if (el) el.value = code;
                setShowCameraAdd(false);
              }} 
              onClose={() => setShowCameraAdd(false)} 
            />
          )}
        </div>
      )}

      {/* ── Edit Item Modal ────────────────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 shadow-xl">
            <h3 className="font-semibold mb-4">Edit Item</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <label className="block text-sm font-medium">Name<input name="name" defaultValue={editItem.name} className="input mt-1" /></label>
              <label className="block text-sm font-medium flex gap-2 items-end">
                <div className="flex-1">
                  Barcode
                  <input id="edit-barcode-input" name="barcode" defaultValue={editItem.barcode || ""} className="input mt-1" />
                </div>
                <button type="button" onClick={() => setShowCameraEdit(true)} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 whitespace-nowrap mb-0.5">
                  📷 Scan
                </button>
              </label>
              <label className="block text-sm font-medium">Category
                <div className="flex gap-2 mt-1">
                  <select defaultValue={editItem.category} onChange={(e) => { const el = document.querySelector<HTMLInputElement>('input[name="category"]'); if (el) el.value = e.target.value; }} className="input">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input name="category" defaultValue={editItem.category} className="input" />
                </div>
              </label>
              <label className="block text-sm font-medium">Price (₹)<input name="price" type="number" step="0.01" min="0" defaultValue={editItem.price} className="input mt-1" /></label>
              <div className="flex gap-4">
                <label className="block text-sm font-medium flex-1">Stock Qty<input name="stock_quantity" type="number" step="0.01" defaultValue={editItem.stock_quantity || 0} className="input mt-1" /></label>
                <label className="block text-sm font-medium flex-1">Low Stock Limit<input name="low_stock_limit" type="number" step="0.01" defaultValue={editItem.low_stock_limit ?? 10} className="input mt-1" /></label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="is_active" defaultChecked={editItem.is_active} className="h-4 w-4 accent-black" />Active</label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={busy} className="flex-1 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 rounded-md border border-black/20 px-4 py-2 text-sm">Cancel</button>
              </div>
            </form>
          </div>
          {showCameraEdit && (
            <CameraScanner 
              onScan={(code) => {
                const el = document.getElementById("edit-barcode-input") as HTMLInputElement;
                if (el) el.value = code;
                setShowCameraEdit(false);
              }} 
              onClose={() => setShowCameraEdit(false)} 
            />
          )}
        </div>
      )}

      {/* ── Category rename inline ─────────────────────────────────────────── */}
      {renameCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold mb-3">Rename Category</h3>
            <p className="text-xs text-black/50 mb-2">Renames all items in &ldquo;{renameCat}&rdquo;</p>
            <input className="input mb-3" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New category name" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRenameCategory()} />
            <div className="flex gap-2">
              <button onClick={handleRenameCategory} disabled={busy} className="flex-1 rounded-md bg-black py-2 text-sm text-white disabled:opacity-50">{busy ? "Renaming…" : "Rename"}</button>
              <button onClick={() => setRenameCat(null)} className="flex-1 rounded-md border border-black/20 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-black/5 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-sm text-black/50">No items yet. Add your first item or import a CSV.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="mb-6">
            {/* Category header with rename/delete controls */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase text-black/40 flex-1">{category} <span className="font-normal">({catItems.length})</span></h3>
              <button onClick={() => { setRenameCat(category); setRenameTo(category); }} className="text-[10px] text-black/30 hover:text-black/60 border border-black/10 rounded px-1.5 py-0.5">✏ Rename</button>
              <button onClick={() => handleDeleteCategory(category)} className="text-[10px] text-red-400 hover:text-red-600 border border-red-100 rounded px-1.5 py-0.5">🗑 Delete all</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catItems.map((item) => (
                <div key={item.id} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${item.is_active ? "border-black/10" : "border-dashed border-black/20 opacity-50"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-black/50">
                      ₹{Number(item.price).toFixed(2)}
                      {item.barcode ? ` • 🏷️ ${item.barcode}` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${Number(item.stock_quantity) <= Number(item.low_stock_limit) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        Stock: {Number(item.stock_quantity)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => setEditItem(item)} className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5">Edit</button>
                    <button onClick={() => handleDelete(item)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
