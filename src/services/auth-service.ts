import { compare } from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { SessionPayload } from "@/types/auth";

const isDev = process.env.NODE_ENV === "development";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(6).transform((value) => value.trim()),
});

type LoginInput = z.infer<typeof loginSchema>;

type UserRow = {
  id: string;
  shop_id: string | null;
  username: string;
  password_hash: string;
  role: "admin" | "shop" | "staff";
  is_active: boolean;
};

type ShopStatusRow = {
  is_blocked: boolean;
};

type SubscriptionStatusRow = {
  expires_at: string;
};

export type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; message: string; debug?: Record<string, unknown> };

export async function authenticateUser(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid username or password.",
      ...(isDev ? { debug: { step: "validation", issues: parsed.error.flatten() } } : {}),
    };
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, shop_id, username, password_hash, role, is_active")
    .eq("username", parsed.data.username)
    .maybeSingle<UserRow>();

  if (error) {
    logger.error("[auth] Supabase users lookup failed", { message: error.message, code: error.code });
    return {
      ok: false,
      message: "Invalid username or password.",
      ...(isDev
        ? {
            debug: {
              step: "users_query",
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            },
          }
        : {}),
    };
  }

  if (!data || !data.is_active) {
    return {
      ok: false,
      message: "Invalid username or password.",
      ...(isDev
        ? {
            debug: {
              step: "users_row",
              reason: !data ? "no_matching_user" : "inactive_user",
              usernameLookedUp: parsed.data.username,
            },
          }
        : {}),
    };
  }

  const passwordMatches = await compare(parsed.data.password, data.password_hash.trim());

  if (!passwordMatches) {
    logger.warn("[auth] Password mismatch", { username: parsed.data.username });
    return {
      ok: false,
      message: "Invalid username or password.",
      ...(isDev ? { debug: { step: "password", reason: "bcrypt_mismatch" } } : {}),
    };
  }

  if (data.role === "shop" || data.role === "staff") {
    if (!data.shop_id) {
      return { ok: false, message: "Shop account is not mapped correctly." };
    }

    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("is_blocked")
      .eq("id", data.shop_id)
      .maybeSingle<ShopStatusRow>();

    if (shopError || !shopData) {
      return {
        ok: false,
        message: "Shop is unavailable. Contact admin.",
        ...(isDev
          ? { debug: { step: "shops_query", message: shopError?.message, code: shopError?.code } }
          : {}),
      };
    }

    if (shopData.is_blocked) {
      return { ok: false, message: "This shop is currently blocked by admin." };
    }

    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("expires_at")
      .eq("shop_id", data.shop_id)
      .maybeSingle<SubscriptionStatusRow>();

    if (subscriptionError || !subscriptionData) {
      return {
        ok: false,
        message: "No active subscription found for this shop.",
        ...(isDev
          ? {
              debug: {
                step: "subscriptions_query",
                message: subscriptionError?.message,
                code: subscriptionError?.code,
              },
            }
          : {}),
      };
    }

    if (new Date(subscriptionData.expires_at).getTime() < Date.now()) {
      return { ok: false, message: "Subscription expired. Please renew from admin panel." };
    }
  }

  return {
    ok: true,
    session: {
      userId: data.id,
      shopId: data.shop_id,
      role: data.role,
      username: data.username,
    },
  };
}
