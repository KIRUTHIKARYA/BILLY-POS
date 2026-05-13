import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import type { Item } from "@/types/item";

// ---------------------------------------------------------------------------
// List items for a shop
// ---------------------------------------------------------------------------

export async function listItems(shopId: string, includeInactive = false): Promise<Item[]> {
  let query = supabaseAdmin
    .from("items")
    .select("*")
    .eq("shop_id", shopId)
    .order("category")
    .order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Item[];
}

// ---------------------------------------------------------------------------
// Get distinct categories for a shop
// ---------------------------------------------------------------------------

export async function listCategories(shopId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("items")
    .select("category")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (!data) return [];
  const cats = new Set((data as Array<{ category: string }>).map((r) => r.category));
  return Array.from(cats).sort();
}

// ---------------------------------------------------------------------------
// Create item
// ---------------------------------------------------------------------------

export const createItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().min(1, "Category is required"),
  price: z.number().nonnegative("Price must be >= 0"),
  barcode: z.string().trim().nullable().optional(),
  stock_quantity: z.number().optional().default(0),
  low_stock_limit: z.number().optional().default(10),
});

export async function createItem(
  shopId: string,
  input: { name: string; category: string; price: number; barcode?: string | null; stock_quantity?: number; low_stock_limit?: number },
): Promise<{ ok: true; item: Item } | { ok: false; message: string }> {
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid." };

  const { data, error } = await supabaseAdmin
    .from("items")
    .insert({ shop_id: shopId, ...parsed.data })
    .select("*")
    .single<Item>();

  if (error || !data) return { ok: false, message: error?.message ?? "Failed to create item." };
  return { ok: true, item: data };
}

// ---------------------------------------------------------------------------
// Update item
// ---------------------------------------------------------------------------

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  price: z.number().nonnegative().optional(),
  barcode: z.string().trim().nullable().optional(),
  stock_quantity: z.number().optional(),
  low_stock_limit: z.number().optional(),
  is_active: z.boolean().optional(),
});

export async function updateItem(
  shopId: string,
  itemId: string,
  input: { name?: string; category?: string; price?: number; barcode?: string | null; stock_quantity?: number; low_stock_limit?: number; is_active?: boolean },
): Promise<{ ok: boolean; message?: string }> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid." };

  const { error } = await supabaseAdmin
    .from("items")
    .update(parsed.data)
    .eq("id", itemId)
    .eq("shop_id", shopId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete item (hard delete)
// ---------------------------------------------------------------------------

export async function deleteItem(
  shopId: string,
  itemId: string,
): Promise<{ ok: boolean; softDeleted?: boolean; message?: string }> {
  // Try hard delete first
  const { error } = await supabaseAdmin
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("shop_id", shopId);

  // If FK violation (item used in bills), soft-delete instead
  if (error) {
    const { error: softErr } = await supabaseAdmin
      .from("items")
      .update({ is_active: false })
      .eq("id", itemId)
      .eq("shop_id", shopId);
    if (softErr) return { ok: false, message: softErr.message };
    return { ok: true, softDeleted: true };
  }

  return { ok: true };
}
