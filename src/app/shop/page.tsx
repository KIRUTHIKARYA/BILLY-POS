import { LogoutButton } from "@/components/logout-button";
import { ShopDashboardClient } from "@/components/shop-dashboard-client";
import { requireSession } from "@/lib/session";

export default async function ShopPage() {
  const session = await requireSession(["shop", "staff"]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 flex flex-col">
      <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-black/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
            <span className="text-xl font-black text-white leading-none tracking-tighter">B</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">BILLY POS</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
              {session.username}
              {session.role === "staff" && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">Staff</span>}
              <span className="opacity-50">|</span>
              <span className="opacity-70">Shop {session.shopId?.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
            {session.username.charAt(0).toUpperCase()}
          </div>
          <LogoutButton />
        </div>
      </header>

      <ShopDashboardClient role={session.role} />
    </main>
  );
}
