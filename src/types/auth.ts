export type AppRole = "admin" | "shop" | "staff";

export type SessionPayload = {
  userId: string;
  shopId: string | null;
  role: AppRole;
  username: string;
  displayName?: string;
};
