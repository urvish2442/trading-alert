export const SESSION_COOKIE_NAME = "trading_alert_session";
export const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

const DEFAULT_SECRET = "development_auth_secret_minimum_16_chars";

function getAuthSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

function toBase64Url(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(usage) {
  const secret = getAuthSecret();
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

/**
 * Creates an HMAC-SHA256 signed session token using Web Crypto (Edge & Node compatible)
 * @param {{ _id?: any, id?: string, email: string, role?: string }} user
 * @returns {Promise<string>}
 */
export async function createSessionToken(user) {
  const encoder = new TextEncoder();
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role || "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getCryptoKey("sign");
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload)
  );
  const signature = toBase64Url(signatureBuffer);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token using Web Crypto
 * @param {string} token
 * @returns {Promise<{ userId: string, email: string, role: string, exp: number } | null>}
 */
export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const key = await getCryptoKey("verify");

    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(encodedPayload)
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload)));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for session cookie
 */
export const sessionCookieOptions = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_EXPIRY_SECONDS,
};
