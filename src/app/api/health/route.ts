import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * GET /api/health
 * Returns system health: DB connectivity, env vars, version.
 * Used by deployment pipelines and uptime monitors.
 */
export async function GET() {
  const start = Date.now();

  const checks: Record<string, { ok: boolean; latency_ms?: number; message?: string }> = {};

  // Check env vars
  checks.env = {
    ok: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    message: !process.env.NEXT_PUBLIC_SUPABASE_URL ? "Missing NEXT_PUBLIC_SUPABASE_URL" : undefined,
  };

  // Check DB connectivity
  const dbStart = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    checks.database = {
      ok: !error,
      latency_ms: Date.now() - dbStart,
      message: error?.message,
    };
  } catch (err) {
    checks.database = { ok: false, latency_ms: Date.now() - dbStart, message: String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  if (!allOk) {
    logger.error("Health check failed", { checks });
  }

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      total_latency_ms: Date.now() - start,
      checks,
    },
    { status },
  );
}
