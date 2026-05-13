import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { hash } from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  password: z.string().min(6),
  name: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await params;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, name, role, created_at")
    .eq("shop_id", shopId)
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ staff: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await params;
  const body = (await request.json()) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { username, password, name } = parsed.data;

  // Check username uniqueness
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Username already taken." }, { status: 409 });
  }

  // Enforce max_staff
  const [{ data: sub }, { count }] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("max_staff").eq("shop_id", shopId).maybeSingle(),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("role", "staff")
  ]);

  const maxStaff = sub?.max_staff ?? 1;
  if (count !== null && count >= maxStaff) {
    return NextResponse.json({ message: `Staff limit reached for this plan (Max: ${maxStaff}). Please upgrade your plan.` }, { status: 403 });
  }

  const password_hash = await hash(password, 10);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({ username, password_hash, name, role: "staff", shop_id: shopId })
    .select("id, username, name, role, created_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ staff: data }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { shopId } = await params;
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");

  if (!staffId) return NextResponse.json({ message: "staffId required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", staffId)
    .eq("shop_id", shopId)
    .eq("role", "staff"); // Safety: only delete staff, never shop owner

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
