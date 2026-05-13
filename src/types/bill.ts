export type PaymentMethod = "cash" | "upi" | "card" | "split";
export type BillStatus = "draft" | "held" | "paid" | "cancelled";

export type BillItem = {
  id: string;
  bill_id: string;
  item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
};

export type Bill = {
  id: string;
  shop_id: string;
  bill_number: string;
  customer_name?: string | null;
  subtotal: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  extra_charges: number;
  total: number;
  payment_method: PaymentMethod;
  payment_breakdown?: Record<string, number> | null;
  status: BillStatus;
  created_by: string;
  created_at: string;
  items?: BillItem[];
};

/** Cart item used in the billing screen (client-side only) */
export type CartItem = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

/** Payload sent to create a bill */
export type CreateBillInput = {
  items: Array<{
    item_id: string;
    item_name: string;
    unit_price: number;
    quantity: number;
  }>;
  customer_name?: string;
  discount: number;
  gst_rate: number;
  extra_charges: number;
  payment_method: PaymentMethod;
  payment_breakdown?: Record<string, number>;
};
