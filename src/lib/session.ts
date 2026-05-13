import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, verifySession } from "@/lib/session-crypto";
import type { AppRole, SessionPayload } from "@/types/auth";

const SESSION_COOKIE = "billy_session";

/** Read and cryptographically verify the session cookie. Returns null if missing or tampered. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  // Verify HMAC signature — rejects any tampered or hand-crafted cookies
  return verifySession<SessionPayload>(raw);
}

/** Write a signed session cookie */
export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

/** Clear the session cookie */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession(allowedRoles: AppRole[]) {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    redirect("/login");
  }
  return session;
}

export const sessionCookieName = SESSION_COOKIE;
