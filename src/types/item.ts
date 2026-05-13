export type Item = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  price: number;
  barcode: string | null;
  stock_quantity: number;
  low_stock_limit: number;
  is_active: boolean;
  created_at: string;
};

export type CreateItemInput = {
  name: string;
  category: string;
  price: number;
  barcode?: string | null;
  stock_quantity?: number;
  low_stock_limit?: number;
};

export type UpdateItemInput = {
  name?: string;
  category?: string;
  price?: number;
  barcode?: string | null;
  stock_quantity?: number;
  low_stock_limit?: number;
  is_active?: boolean;
};
