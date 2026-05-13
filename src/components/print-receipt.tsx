"use client";

import { useEffect, useState } from "react";
import type { Bill, BillItem } from "@/types/bill";

type Props = {
  bill: Bill & { items: BillItem[] };
  shopName?: string;
  onClose: () => void;
};

export function PrintReceipt({ bill, shopName = "BILLY POS", onClose }: Props) {
  const [phone, setPhone] = useState("");

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
      `🧾 *${shopName}*`,
      `Bill No: ${bill.bill_number}`,
      bill.customer_name ? `Customer: ${bill.customer_name}` : "",
      `Date: ${new Date(bill.created_at).toLocaleString("en-IN")}`,
      "--------------------------------",
      ...(bill.items?.map((li) => `▪ ${li.item_name}  x${li.quantity}  ₹${Number(li.line_total).toFixed(2)}`) ?? []),
      "--------------------------------",
      hasGst ? `GST (${bill.gst_rate}%): ₹${Number(bill.gst_amount).toFixed(2)}` : "",
      `*Total: ₹${Number(bill.total).toFixed(2)}*`,
      `Payment: ${breakdown ? Object.entries(breakdown).map(([k, v]) => `${k.toUpperCase()} ₹${v.toFixed(2)}`).join(" + ") : bill.payment_method.toUpperCase()}`,
      "",
      "Thank you for visiting! 🙏",
      "Powered by *BILLY POS*"
    ].filter(Boolean).join("\n");

    const phonePath = phone.length >= 10 ? `91${phone.slice(-10)}` : "";
    window.open(`https://wa.me/${phonePath}?text=${encodeURIComponent(lines)}`, "_blank");
  }

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Toolbar — hidden on print */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 print:hidden bg-slate-50">
            <h3 className="font-bold text-sm text-slate-800">Receipt</h3>
            <div className="flex gap-2">
              <div className="flex items-center border-2 border-green-500 rounded-lg overflow-hidden bg-white shadow-sm focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1.5 border-r border-green-200">+91</span>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  placeholder="WhatsApp No." 
                  className="w-24 px-2 py-1.5 text-xs outline-none font-medium placeholder-slate-400 text-slate-700"
                />
                <button
                  onClick={shareWhatsApp}
                  className="bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.627.842 5.066 2.305 7.07L1.134 24l5.05-1.325a11.96 11.96 0 005.847 1.517h.005c6.645 0 12.029-5.383 12.029-12.031S18.676 0 12.031 0zm0 22.188a9.98 9.98 0 01-5.1-1.393l-.365-.217-3.754.985.996-3.66-.237-.377a9.97 9.97 0 01-1.526-5.495c0-5.503 4.478-9.98 9.984-9.98 2.668 0 5.171 1.04 7.054 2.923a9.97 9.97 0 012.921 7.057c0 5.504-4.478 9.982-9.984 9.982h-.003zM17.514 14.5c-.301-.151-1.782-.879-2.059-.979-.276-.1-.476-.151-.676.151-.201.302-.777.979-.953 1.18-.176.202-.352.227-.653.076-1.595-.8-2.732-1.583-3.791-3.32-.176-.301 0-.462.151-.613.136-.135.302-.352.453-.528.151-.176.202-.302.302-.503.1-.202.051-.377-.025-.528-.076-.151-.676-1.632-.927-2.235-.243-.588-.492-.508-.676-.517-.176-.008-.376-.008-.576-.008-.2 0-.527.075-.803.376-.276.302-1.054 1.03-1.054 2.513 0 1.483 1.079 2.915 1.23 3.116.151.202 2.124 3.242 5.143 4.545 2.187.943 2.879 1.018 3.996.853.811-.12 2.378-.971 2.716-1.913.338-.941.338-1.748.238-1.913-.101-.165-.377-.266-.678-.417z"/></svg>
                  Send
                </button>
              </div>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-black/80 transition-colors"
              >
                🖨 Print
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border-2 border-black/20 px-3 py-1.5 text-xs font-bold hover:bg-black/5 hover:border-black/40 transition-colors"
              >
                ✕
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
