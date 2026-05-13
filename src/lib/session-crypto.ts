/**
 * HMAC-SHA256 session signing using Web Crypto API (Edge-compatible).
 *
 * Cookie format:  base64url(payload) + "." + base64url(HMAC signature)
 *
 * The HMAC covers the base64url-encoded payload string, so tampering
 * with either part will fail verification.
 */

const ALG = { name: "HMAC", hash: "SHA-256" } as const;

function b64uEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64uDecode(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALG,
    false,
    ["sign", "verify"],
  );
}

/** Sign a plain-object payload → signed token string */
export async function signSession<T extends object>(payload: T): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set.");

  const encoded = b64uEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const sigBuf = await crypto.subtle.sign(ALG.name, key, new TextEncoder().encode(encoded));
  return `${encoded}.${b64uEncode(new Uint8Array(sigBuf))}`;
}

/** Verify and decode a signed token → payload, or null if invalid/tampered */
export async function verifySession<T extends object>(token: string): Promise<T | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const encoded = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);

  try {
    const key = await getKey(secret);
    const sigBytes = b64uDecode(sigB64);
    const valid = await crypto.subtle.verify(
      ALG.name,
      key,
      sigBytes,
      new TextEncoder().encode(encoded),
    );
    if (!valid) return null;

    const payloadBytes = new Uint8Array(b64uDecode(encoded));
    return JSON.parse(new TextDecoder().decode(payloadBytes)) as T;
  } catch {
    return null;
  }
}
