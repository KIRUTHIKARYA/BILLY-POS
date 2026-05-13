import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Development-only: verifies env vars are loaded and `public.users` is reachable.
 * Open http://localhost:3000/api/auth/db-check while `npm run dev` is running.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const env = {
    hasPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("username, role")
    .limit(10);

  return NextResponse.json({
    env,
    usersQueryOk: !error,
    usersError: error
      ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
      : null,
    sampleRows: data ?? [],
  });
}
