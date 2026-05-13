"use client";

import { useEffect } from "react";
import type { Bill, BillItem } from "@/types/bill";

type Props = {
  bill: Bill & { items: BillItem[] };
  shopName?: string;
  onClose: () => void;
};

export function PrintReceipt({ bill, shopName = "BILLY POS", onClose }: Props) {
  // Auto-trigger print dialog when component mounts
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  const cgst = Math.round((Number(bill.gst_amount) / 2) * 100) / 100;
  const sgst = cgst;
  const hasGst = Number(bill.gst_rate) > 0;
  const taxable = Math.round((Number(bill.subtotal) - Number(bill.discount)) * 100) / 100;
  const breakdown = bill.payment_breakdown as Record<string, number> | null | undefined;

  function shareWhatsApp() {
    const lines = [
      `*${shopName}*`,
      `Bill: ${bill.bill_number}`,
      bill.customer_name ? `Customer: ${bill.customer_name}` : "",
      `Date: ${new Date(bill.created_at).toLocaleString("en-IN")}`,
      "---",
      ...(bill.items?.map((li) => `${li.item_name} x${li.quantity} = ₹${Number(li.line_total).toFixed(2)}`) ?? []),
      "---",
      hasGst ? `GST (${bill.gst_rate}%): ₹${Number(bill.gst_amount).toFixed(2)}` : "",
      `*Total: ₹${Number(bill.total).toFixed(2)}*`,
      breakdown ? Object.entries(breakdown).map(([k, v]) => `${k.toUpperCase()}: ₹${v.toFixed(2)}`).join(" + ") : `Payment: ${bill.payment_method.toUpperCase()}`,
      "",
      "Thank you! Powered by BILLY POS",
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  }

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Toolbar — hidden on print */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 print:hidden">
            <h3 className="font-semibold text-sm">Receipt Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
              >
                📲 WhatsApp
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-md bg-black px-3 py-1.5 text-xs text-white hover:bg-black/80"
              >
                🖨 Print
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-black/20 px-3 py-1.5 text-xs hover:bg-black/5"
              >
                Close
              </button>
            </div>
          </div>

          {/* Receipt body — visible on screen and print */}
          <div
            id="print-receipt"
            className="p-5 font-mono text-xs text-black"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Header */}
            <div className="text-center mb-3">
              <p className="text-base font-bold">{shopName}</p>
              <p className="text-[10px] text-black/50">Tax Invoice</p>
            </div>

            <div className="border-t border-dashed border-black/30 my-2" />

            {/* Bill meta */}
            <div className="space-y-0.5 mb-2">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold">{bill.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(bill.created_at).toLocaleString("en-IN")}</span>
              </div>
              {bill.customer_name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{bill.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="uppercase">
                  {bill.payment_method === "split" && breakdown
                    ? Object.entries(breakdown).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(" + ")
                    : bill.payment_method}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-black/30 my-2" />

            {/* Items */}
            <table className="w-full text-[11px] mb-1">
              <thead>
                <tr className="border-b border-black/20">
                  <th className="text-left py-0.5">Item</th>
                  <th className="text-right py-0.5">Qty</th>
                  <th className="text-right py-0.5">Rate</th>
                  <th className="text-right py-0.5">Amt</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((li, i) => (
                  <tr key={li.id ?? i}>
                    <td className="py-0.5 max-w-[100px] truncate">{li.item_name}</td>
                    <td className="text-right py-0.5">{Number(li.quantity)}</td>
                    <td className="text-right py-0.5">{Number(li.unit_price).toFixed(2)}</td>
                    <td className="text-right py-0.5">{Number(li.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black/30 my-2" />

            {/* Totals */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{Number(bill.subtotal).toFixed(2)}</span>
              </div>
              {Number(bill.discount) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-₹{Number(bill.discount).toFixed(2)}</span>
                </div>
              )}
              {hasGst && (
                <>
                  <div className="flex justify-between text-black/60">
                    <span>Taxable Value</span>
                    <span>₹{taxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST ({(Number(bill.gst_rate) / 2).toFixed(1)}%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({(Number(bill.gst_rate) / 2).toFixed(1)}%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {Number(bill.extra_charges) > 0 && (
                <div className="flex justify-between">
                  <span>Extra Charges</span>
                  <span>₹{Number(bill.extra_charges).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-black my-2" />

            <div className="flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span>₹{Number(bill.total).toFixed(2)}</span>
            </div>

            {hasGst && (
              <p className="text-[10px] text-black/50 mt-1">
                Total includes GST of ₹{Number(bill.gst_amount).toFixed(2)}
              </p>
            )}

            <div className="border-t border-dashed border-black/30 my-3" />

            <p className="text-center text-[10px] text-black/50">
              Thank you for your visit!
            </p>
            <p className="text-center text-[10px] text-black/30 mt-0.5">
              Powered by BILLY POS
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
