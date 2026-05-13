"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bill, BillItem } from "@/types/bill";
import { PrintReceipt } from "@/components/print-receipt";
import { useToast } from "@/components/toast-provider";

export function BillHistory() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<(Bill & { items: BillItem[] }) | null>(null);
  const [printBill, setPrintBill] = useState<(Bill & { items: BillItem[] }) | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/bills");
      const data = (await res.json()) as { bills: Bill[] };
      setBills(data.bills);
    } catch {
      setError("Failed to load bill history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchBills(); }, [fetchBills]);

  // Client-side search filter
  const filtered = bills.filter((b) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      b.bill_number.toLowerCase().includes(s) ||
      (b.customer_name ?? "").toLowerCase().includes(s) ||
      b.payment_method.toLowerCase().includes(s) ||
      String(b.total).includes(s)
    );
  });

  async function showDetail(billId: string) {
    try {
      const res = await fetch(`/api/shop/bills/${billId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { bill: Bill & { items: BillItem[] } };
      setDetail(data.bill);
    } catch { setError("Failed to load bill details."); }
  }

  async function handlePrint(billId: string) {
    try {
      const res = await fetch(`/api/shop/bills/${billId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { bill: Bill & { items: BillItem[] } };
      setDetail(null);
      setPrintBill(data.bill);
    } catch { setError("Failed to load bill for printing."); }
  }

  async function cancelBill(billId: string) {
    if (!confirm("Cancel this bill? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/shop/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) {
        setDetail(null);
        toast("Bill cancelled.");
        await fetchBills();
      }
    } catch { setError("Cancel failed."); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Bill History</h2>
        <button onClick={fetchBills} className="text-xs text-black/40 hover:text-black">↺ Refresh</button>
      </div>

      {/* Search */}
      <input
        className="input mb-3"
        placeholder="Search bill number, customer, amount…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {/* Print modal */}
      {printBill && <PrintReceipt bill={printBill} onClose={() => setPrintBill(null)} />}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold">Bill {detail.bill_number}</h3>
                {detail.customer_name && <p className="text-xs text-black/50">{detail.customer_name}</p>}
                <p className="text-xs text-black/50">{new Date(detail.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${detail.status === "paid" ? "bg-green-100 text-green-700" : detail.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                {detail.status}
              </span>
            </div>

            <table className="w-full text-sm mb-4">
              <thead className="text-xs text-black/50 border-b border-black/10">
                <tr>
                  <th className="text-left py-1.5">Item</th>
                  <th className="text-right py-1.5">Price</th>
                  <th className="text-right py-1.5">Qty</th>
                  <th className="text-right py-1.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {detail.items?.map((li) => (
                  <tr key={li.id}>
                    <td className="py-1.5">{li.item_name}</td>
                    <td className="py-1.5 text-right text-black/60">₹{Number(li.unit_price).toFixed(2)}</td>
                    <td className="py-1.5 text-right">{Number(li.quantity)}</td>
                    <td className="py-1.5 text-right font-medium">₹{Number(li.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-sm border-t border-black/10 pt-3">
              <div className="flex justify-between text-black/60"><span>Subtotal</span><span>₹{Number(detail.subtotal).toFixed(2)}</span></div>
              {Number(detail.discount) > 0 && <div className="flex justify-between text-black/60"><span>Discount</span><span>−₹{Number(detail.discount).toFixed(2)}</span></div>}
              {Number(detail.gst_rate) > 0 && (
                <>
                  <div className="flex justify-between text-black/60"><span>CGST ({(Number(detail.gst_rate) / 2).toFixed(1)}%)</span><span>₹{(Number(detail.gst_amount) / 2).toFixed(2)}</span></div>
                  <div className="flex justify-between text-black/60"><span>SGST ({(Number(detail.gst_rate) / 2).toFixed(1)}%)</span><span>₹{(Number(detail.gst_amount) / 2).toFixed(2)}</span></div>
                </>
              )}
              {Number(detail.extra_charges) > 0 && <div className="flex justify-between text-black/60"><span>Extra charges</span><span>+₹{Number(detail.extra_charges).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-black/10"><span>Total</span><span>₹{Number(detail.total).toFixed(2)}</span></div>
              <p className="text-xs text-black/40 uppercase">{detail.payment_method}</p>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => handlePrint(detail.id)} className="flex-1 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80">🖨 Print</button>
              <button onClick={() => setDetail(null)} className="flex-1 rounded-md border border-black/20 px-4 py-2 text-sm">Close</button>
              {detail.status === "paid" && (
                <button onClick={() => cancelBill(detail.id)} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-black/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-2xl mb-2">🧾</p>
          <p className="text-sm text-black/50">{search ? "No bills match your search." : "No bills yet. Create your first bill."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-medium text-black/60">
              <tr>
                <th className="px-4 py-3">Bill #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((bill) => (
                <tr key={bill.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-mono font-medium">{bill.bill_number}</td>
                  <td className="px-4 py-3 text-black/60 text-xs">{bill.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-black/60 text-xs">{new Date(bill.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{Number(bill.total).toFixed(2)}</td>
                  <td className="px-4 py-3 uppercase text-xs">{bill.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bill.status === "paid" ? "bg-green-100 text-green-700" : bill.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <button onClick={() => showDetail(bill.id)} className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5">View</button>
                    <button onClick={() => handlePrint(bill.id)} className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5">🖨</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
