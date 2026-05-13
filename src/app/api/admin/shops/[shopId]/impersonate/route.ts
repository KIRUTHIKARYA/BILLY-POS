import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await params;

  // Find the primary shop user
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, username, role")
    .eq("shop_id", shopId)
    .eq("role", "shop")
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ message: "Shop user not found." }, { status: 404 });
  }

  // Create new session payload acting as this shop owner
  await setSession({
    userId: user.id,
    shopId: shopId,
    username: user.username,
    role: user.role as "shop",
  });

  return NextResponse.json({ ok: true });
}
