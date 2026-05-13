import { LogoutButton } from "@/components/logout-button";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";
import { requireSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await requireSession(["admin"]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-lime-500/30 overflow-x-hidden">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-lime-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <AdminDashboardClient username={session.username} />
    </main>
  );
}
