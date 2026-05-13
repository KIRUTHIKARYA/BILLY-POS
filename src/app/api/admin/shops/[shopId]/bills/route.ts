import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { Bill } from "@/types/bill";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await params;

  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ bills: data as Bill[] });
}
