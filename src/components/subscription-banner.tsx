"use client";

import { useEffect, useState, useMemo } from "react";

type SubStatus =
  | { ok: true; plan: string; expires_at: string; flags: { billing_enabled: boolean; inventory_enabled: boolean; reports_enabled: boolean } }
  | { ok: false; reason: string; message: string };

export function SubscriptionBanner() {
  const [status, setStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    fetch("/api/shop/subscription")
      .then((r) => r.json())
      .then((d) => setStatus(d as SubStatus))
      .catch(() => null);
  }, []);

  const daysLeft = useMemo(() => {
    if (!status || !status.ok) return null;
    return Math.ceil((new Date(status.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [status]);

  if (!status) return null;

  // All good, show subtle plan info + expiry warning if within 7 days
  if (status.ok) {
    if (daysLeft === null || daysLeft > 7) return null; // No banner needed

    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
        <span className="text-amber-500">⚠️</span>
        <span className="text-amber-800">
          Subscription expires in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>
          {" "}({new Date(status.expires_at).toLocaleDateString()}). Contact admin to renew.
        </span>
      </div>
    );
  }

  // Blocked / expired / no sub
  const icon = status.reason === "blocked" ? "🚫" : status.reason === "expired" ? "⏰" : "📋";
  const color =
    status.reason === "blocked"
      ? "border-red-300 bg-red-50 text-red-800"
      : "border-amber-300 bg-amber-50 text-amber-800";

  return (
    <div className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${color}`}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-semibold mb-0.5">
          {status.reason === "blocked" ? "Shop Blocked" : status.reason === "expired" ? "Subscription Expired" : "No Subscription"}
        </p>
        <p className="text-xs opacity-80">{status.message}</p>
      </div>
    </div>
  );
}
