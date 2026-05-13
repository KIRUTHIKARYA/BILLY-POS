import { NextResponse } from "next/server";
import { authenticateUser } from "@/services/auth-service";
import { setSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  // Fix 1.2 — Rate limiting: 5 attempts per 15 min per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateResult = checkRateLimit(ip);
  if (!rateResult.ok) {
    logger.warn("[login] Rate limit exceeded", { ip, resetAt: rateResult.resetAt });
    return NextResponse.json(
      { message: `Too many login attempts. Try again in ${rateResult.retryAfterSecs} seconds.` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { username?: string; password?: string };
  const authResult = await authenticateUser({
    username: body.username ?? "",
    password: body.password ?? "",
  });

  if (!authResult.ok) {
    const resp: { message: string; debug?: Record<string, unknown> } = {
      message: authResult.message,
    };
    if (process.env.NODE_ENV === "development" && authResult.debug) {
      resp.debug = authResult.debug;
    }
    return NextResponse.json(resp, { status: 401 });
  }

  // Fix 1.1 — Write HMAC-signed session cookie
  await setSession(authResult.session);

  logger.info("[login] Successful login", { username: body.username, role: authResult.session.role });

  const redirectPath = authResult.session.role === "admin" ? "/admin" : "/shop";
  return NextResponse.json({ redirectPath });
}
