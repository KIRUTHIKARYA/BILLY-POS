import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session-crypto";
import type { SessionPayload } from "@/types/auth";

const protectedPagePaths = ["/admin", "/shop"];

// Mutating API methods that need CSRF protection
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── Fix 1.5: CSRF origin check for all mutating API requests ────────────
  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Allow requests with no origin (server-to-server, curl, Postman in dev)
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { message: "Forbidden: cross-origin request rejected." },
            { status: 403 },
          );
        }
      } catch {
        // Malformed Origin header — reject
        return NextResponse.json({ message: "Forbidden." }, { status: 403 });
      }
    }
  }

  // ── Page route protection ────────────────────────────────────────────────
  if (!protectedPagePaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const raw = request.cookies.get("billy_session")?.value;
  if (!raw) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fix 1.1: verify HMAC signature — rejects forged or tampered cookies
  const session = await verifySession<SessionPayload>(raw);

  if (!session) {
    // Cookie present but signature invalid — clear it and redirect to login
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("billy_session");
    return res;
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  // staff and shop both use the /shop interface
  if (pathname.startsWith("/shop") && session.role !== "shop" && session.role !== "staff") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/shop/:path*", "/api/:path*"],
};
