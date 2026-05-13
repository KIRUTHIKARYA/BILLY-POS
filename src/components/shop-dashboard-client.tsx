"use client";

import { useState } from "react";
import { BillingScreen } from "@/components/billing-screen";
import { ItemManager } from "@/components/item-manager";
import { StockManager } from "@/components/stock-manager";
import { BillHistory } from "@/components/bill-history";
import { ReportsPanel } from "@/components/reports-panel";
import { SubscriptionBanner } from "@/components/subscription-banner";
import type { AppRole } from "@/types/auth";

const ALL_TABS = [
  { key: "billing", label: "Billing", roles: ["shop", "staff"] },
  { key: "items",   label: "Items",   roles: ["shop"] },
  { key: "stock",   label: "Stock",   roles: ["shop"] },
  { key: "history", label: "History", roles: ["shop"] },
  { key: "reports", label: "Reports", roles: ["shop"] },
] as const;

type Tab = (typeof ALL_TABS)[number]["key"];

export function ShopDashboardClient({ role }: { role: AppRole }) {
  const visibleTabs = ALL_TABS.filter((t) => (t.roles as readonly string[]).includes(role));
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.key ?? "billing");

  return (
    <>
      <SubscriptionBanner />

      {/* Tab bar */}
      <nav className="mb-6 flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto no-scrollbar">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.key 
                ? "bg-slate-900 text-white shadow-md transform -translate-y-0.5" 
                : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "billing" && <BillingScreen />}
      {tab === "items"   && <ItemManager />}
      {tab === "stock"   && <StockManager />}
      {tab === "history" && <BillHistory />}
      {tab === "reports" && <ReportsPanel />}
    </>
  );
}

