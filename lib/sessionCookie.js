// Signed cookie carrying {session_id, link_id?, kind} so the tracker
// endpoints can resolve the session without a DB lookup-by-email.
//
// HMAC-SHA256 using SESSION_SECRET. Format: base64url(payload).hex(sig)

import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-not-secret";

export function signSessionCookie(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

export function verifySessionCookie(cookieValue) {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const [b64, sig] = cookieValue.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  // Constant-time compare
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (mismatch !== 0) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "pfa_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 90, // 90 days
};
