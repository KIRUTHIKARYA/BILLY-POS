import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import type { Bill, BillItem, CreateBillInput, PaymentMethod } from "@/types/bill";

// ---------------------------------------------------------------------------
// Totals engine – pure function, also usable client-side
// ---------------------------------------------------------------------------

export function computeTotals(
  lineItems: Array<{ unitPrice: number; quantity: number }>,
  discount: number,
  extraCharges: number,
  gstRate = 0,
) {
  const subtotal = lineItems.reduce(
    (sum, li) => sum + Math.round(li.unitPrice * li.quantity * 100) / 100,
    0,
  );
  const taxable = Math.max(Math.round((subtotal - discount) * 100) / 100, 0);
  const gstAmount = Math.round(taxable * (gstRate / 100) * 100) / 100;
  const total = Math.round((taxable + gstAmount + extraCharges) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxable,
    gstAmount,
    total: Math.max(total, 0),
  };
}

// ---------------------------------------------------------------------------
// Generate next bill number for a shop
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Generate next bill number for a shop (atomic-safe with retry)
// ---------------------------------------------------------------------------

async function nextBillNumber(shopId: string): Promise<string> {
  // Fix 1.4: filter to only real sequential bills (B-prefixed, paid or cancelled)
  // This prevents HOLD-xxx labels from corrupting the numeric sequence
  const { data } = await supabaseAdmin
    .from("bills")
    .select("bill_number")
    .eq("shop_id", shopId)
    .in("status", ["paid", "cancelled"])
    .like("bill_number", "B%")
    .order("bill_number", { ascending: false })
    .limit(1);

  const last = (data as Array<{ bill_number: string }> | null)?.[0]?.bill_number;
  const seq = last ? parseInt(last.replace(/\D/g, ""), 10) + 1 : 1;
  return `B${String(seq).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Create bill (with retry on bill_number unique conflict — Fix 1.3)
// ---------------------------------------------------------------------------

const createBillSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.string(),
        item_name: z.string().min(1),
        unit_price: z.number().nonnegative(),
        quantity: z.number().positive(),
      }),
    )
    .min(1, "Cart cannot be empty"),
  customer_name: z.string().trim().optional(),
  discount: z.number().nonnegative(),
  gst_rate: z.number().min(0).max(100).default(0),
  extra_charges: z.number().nonnegative(),
  payment_method: z.enum(["cash", "upi", "card", "split"]),
  payment_breakdown: z.record(z.string(), z.number()).optional(),
});

export async function createBill(
  shopId: string,
  userId: string,
  input: CreateBillInput,
): Promise<{ ok: true; bill: Bill } | { ok: false; message: string }> {
  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;
  const { subtotal, gstAmount, total } = computeTotals(
    d.items.map((i) => ({ unitPrice: i.unit_price, quantity: i.quantity })),
    d.discount,
    d.extra_charges,
    d.gst_rate,
  );

  // Fix 1.3: retry up to 5 times if bill_number collides (concurrent requests)
  const MAX_RETRIES = 5;
  let bill: Bill | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const billNumber = await nextBillNumber(shopId);

    const { data: inserted, error: billErr } = await supabaseAdmin
      .from("bills")
      .insert({
        shop_id: shopId,
        bill_number: billNumber,
        customer_name: d.customer_name ?? null,
        subtotal,
        discount: d.discount,
        gst_rate: d.gst_rate,
        gst_amount: gstAmount,
        extra_charges: d.extra_charges,
        total,
        payment_method: d.payment_method,
        payment_breakdown: d.payment_breakdown,
        status: "paid",
        created_by: userId,
      })
      .select("*")
      .single<Bill>();

    if (billErr) {
      // 23505 = unique_violation — bill_number already taken, retry
      if (billErr.code === "23505" && attempt < MAX_RETRIES) continue;
      return { ok: false, message: billErr.message };
    }

    bill = inserted;
    break;
  }

  if (!bill) {
    return { ok: false, message: "Failed to assign a unique bill number. Please try again." };
  }

  // Find or create generic custom item if needed
  const hasCustomItems = d.items.some((i) => i.item_id.startsWith("custom-"));
  let genericCustomItemId = "";
  if (hasCustomItems) {
    const { data: generic } = await supabaseAdmin.from("items").select("id").eq("shop_id", shopId).eq("name", "Custom Item").maybeSingle();
    if (generic) {
      genericCustomItemId = generic.id;
    } else {
      const { data: newGeneric } = await supabaseAdmin.from("items").insert({ shop_id: shopId, name: "Custom Item", category: "Other", price: 0 }).select("id").single();
      if (newGeneric) genericCustomItemId = newGeneric.id;
    }
  }

  // Insert bill items
  const billItems = d.items.map((li) => ({
    bill_id: bill!.id,
    item_id: li.item_id.startsWith("custom-") ? genericCustomItemId : li.item_id,
    item_name: li.item_name,
    unit_price: li.unit_price,
    quantity: li.quantity,
    line_total: Math.round(li.unit_price * li.quantity * 100) / 100,
  }));

  const { error: itemsErr } = await supabaseAdmin.from("bill_items").insert(billItems);

  if (itemsErr) {
    await supabaseAdmin.from("bills").delete().eq("id", bill.id);
    return { ok: false, message: itemsErr.message };
  }

  // Auto Stock Reduction & Inventory Logging
  for (const li of d.items) {
    if (li.item_id.startsWith("custom-")) continue;
    
    const { data: itemData } = await supabaseAdmin
      .from("items")
      .select("stock_quantity")
      .eq("id", li.item_id)
      .single();
      
    if (itemData) {
      const currentStock = Number(itemData.stock_quantity || 0);
      const newStock = currentStock - li.quantity; // Allow negative to show oversell, or Math.max(0, ...)
      
      await supabaseAdmin
        .from("items")
        .update({ stock_quantity: newStock })
        .eq("id", li.item_id);
        
      await supabaseAdmin.from("inventory_logs").insert({
        shop_id: shopId,
        item_id: li.item_id,
        action_type: "sold",
        quantity_change: -li.quantity,
        notes: `Sold in bill ${bill.bill_number}`,
        created_by: userId
      });
    }
  }

  return { ok: true, bill };
}


// ---------------------------------------------------------------------------
// List bills for a shop (recent first)
// ---------------------------------------------------------------------------

export async function listBills(
  shopId: string,
  limit = 50,
): Promise<Bill[]> {
  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Bill[];
}

// ---------------------------------------------------------------------------
// Get bill detail with items
// ---------------------------------------------------------------------------

export async function getBillDetail(
  shopId: string,
  billId: string,
): Promise<(Bill & { items: BillItem[] }) | null> {
  const { data: bill, error } = await supabaseAdmin
    .from("bills")
    .select("*")
    .eq("id", billId)
    .eq("shop_id", shopId)
    .maybeSingle<Bill>();

  if (error || !bill) return null;

  const { data: items } = await supabaseAdmin
    .from("bill_items")
    .select("*")
    .eq("bill_id", bill.id)
    .order("created_at");

  return { ...bill, items: (items as BillItem[]) ?? [] };
}

// ---------------------------------------------------------------------------
// Cancel bill
// ---------------------------------------------------------------------------

export async function cancelBill(
  shopId: string,
  billId: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabaseAdmin
    .from("bills")
    .update({ status: "cancelled" })
    .eq("id", billId)
    .eq("shop_id", shopId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Hold bill (save cart state as a held bill)
// ---------------------------------------------------------------------------

export async function holdBill(
  shopId: string,
  userId: string,
  input: CreateBillInput,
  label?: string,
): Promise<{ ok: true; bill: Bill } | { ok: false; message: string }> {
  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;
  const { subtotal, total } = computeTotals(
    d.items.map((i) => ({ unitPrice: i.unit_price, quantity: i.quantity })),
    d.discount,
    d.extra_charges,
  );

  // Ensure unique billNumber for held bills to prevent collisions like 'Bill 1'
  const safeLabel = label ? label.replace(/[^a-zA-Z0-9 ]/g, "").trim() : "HOLD";
  const uniqueSuffix = Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).substring(2, 4).toUpperCase();
  const billNumber = `HOLD-${safeLabel}-${uniqueSuffix}`;

  const { data: bill, error: billErr } = await supabaseAdmin
    .from("bills")
    .insert({
      shop_id: shopId,
      bill_number: billNumber,
      subtotal,
      discount: d.discount,
      extra_charges: d.extra_charges,
      total,
      payment_method: d.payment_method,
      payment_breakdown: d.payment_breakdown,
      status: "held",
      created_by: userId,
    })
    .select("*")
    .single<Bill>();

  if (billErr || !bill) {
    return { ok: false, message: billErr?.message ?? "Failed to hold bill." };
  }

  // Find or create generic custom item if needed
  const hasCustomItems = d.items.some((i) => i.item_id.startsWith("custom-"));
  let genericCustomItemId = "";
  if (hasCustomItems) {
    const { data: generic } = await supabaseAdmin.from("items").select("id").eq("shop_id", shopId).eq("name", "Custom Item").maybeSingle();
    if (generic) {
      genericCustomItemId = generic.id;
    } else {
      const { data: newGeneric } = await supabaseAdmin.from("items").insert({ shop_id: shopId, name: "Custom Item", category: "Other", price: 0 }).select("id").single();
      if (newGeneric) genericCustomItemId = newGeneric.id;
    }
  }

  const billItems = d.items.map((li) => ({
    bill_id: bill.id,
    item_id: li.item_id.startsWith("custom-") ? genericCustomItemId : li.item_id,
    item_name: li.item_name,
    unit_price: li.unit_price,
    quantity: li.quantity,
    line_total: Math.round(li.unit_price * li.quantity * 100) / 100,
  }));

  const { error: itemsErr } = await supabaseAdmin.from("bill_items").insert(billItems);
  if (itemsErr) {
    await supabaseAdmin.from("bills").delete().eq("id", bill.id);
    return { ok: false, message: itemsErr.message };
  }

  return { ok: true, bill };
}

// ---------------------------------------------------------------------------
// List held bills for a shop
// ---------------------------------------------------------------------------

export async function listHeldBills(shopId: string): Promise<(Bill & { items: BillItem[] })[]> {
  const { data: bills, error } = await supabaseAdmin
    .from("bills")
    .select("*")
    .eq("shop_id", shopId)
    .eq("status", "held")
    .order("created_at", { ascending: false });

  if (error || !bills) return [];

  const billIds = (bills as Bill[]).map((b) => b.id);
  if (billIds.length === 0) return [];

  const { data: allItems } = await supabaseAdmin
    .from("bill_items")
    .select("*")
    .in("bill_id", billIds);

  const itemMap = new Map<string, BillItem[]>();
  for (const item of (allItems as BillItem[]) ?? []) {
    const existing = itemMap.get(item.bill_id) ?? [];
    existing.push(item);
    itemMap.set(item.bill_id, existing);
  }

  return (bills as Bill[]).map((b) => ({ ...b, items: itemMap.get(b.id) ?? [] }));
}

// ---------------------------------------------------------------------------
// Resume held bill (delete from held, return items for cart)
// ---------------------------------------------------------------------------

export async function resumeHeldBill(
  shopId: string,
  billId: string,
): Promise<{ ok: true; bill: Bill & { items: BillItem[] } } | { ok: false; message: string }> {
  const detail = await getBillDetail(shopId, billId);
  if (!detail) return { ok: false, message: "Held bill not found." };
  if (detail.status !== "held") return { ok: false, message: "Bill is not held." };

  // Delete the held bill (cascade deletes bill_items)
  await supabaseAdmin.from("bills").delete().eq("id", billId).eq("shop_id", shopId);

  return { ok: true, bill: detail };
}

// ---------------------------------------------------------------------------
// Delete held bill (discard)
// ---------------------------------------------------------------------------

export async function deleteHeldBill(
  shopId: string,
  billId: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabaseAdmin
    .from("bills")
    .delete()
    .eq("id", billId)
    .eq("shop_id", shopId)
    .eq("status", "held");

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
