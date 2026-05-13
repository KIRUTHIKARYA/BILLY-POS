export type PlanName = "starter" | "standard" | "pro" | "elite";

export type Shop = {
  id: string;
  name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  shop_registration_number: string | null;
  shop_type: string;
  is_blocked: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  shop_id: string;
  plan_name: PlanName;
  custom_price: number;
  max_staff: number;
  whatsapp_enabled: boolean;
  csv_export_enabled: boolean;
  expires_at: string;
  billing_enabled: boolean;
  inventory_enabled: boolean;
  reports_enabled: boolean;
  created_at: string;
};

export type ShopUser = {
  id: string;
  shop_id: string;
  username: string;
  role: "shop";
  is_active: boolean;
  created_at: string;
};

/** Full shop view with joined subscription and user */
export type ShopDetail = Shop & {
  subscription: Subscription | null;
  shopUser: ShopUser | null;
};

/** Summary row used in admin dashboard stats */
export type AdminStats = {
  total: number;
  active: number;
  blocked: number;
  expired: number;
};

export type CreateShopInput = {
  name: string;
  owner_name: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  shop_registration_number?: string;
  shop_type: string;
  plan_name: PlanName;
  custom_price?: number;
  expires_at: string; // ISO date string
  billing_enabled: boolean;
  inventory_enabled: boolean;
  reports_enabled: boolean;
  username: string;
  password: string;
};
