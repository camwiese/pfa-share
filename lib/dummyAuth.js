// Dummy auth mode: short-circuits the OTP flow so any 6-digit code is
// accepted. Used while Supabase Auth SMTP is still being wired to Resend
// (or whenever you want to click around without real email delivery).
//
// Set AUTH_DUMMY_MODE=true in env to enable. When off, the regular Supabase
// path runs unchanged.

import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "dev-only-not-secret";
export const DUMMY_COOKIE_NAME = "pfa_dummy_auth";

export const DUMMY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export function isDummyAuthMode() {
  return process.env.AUTH_DUMMY_MODE === "true";
}

export function signDummyAuth({ email }) {
  const payload = { email, ts: Date.now() };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

export function verifyDummyAuth(cookieValue) {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const [b64, sig] = cookieValue.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
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

// Server-side helper: returns the verified email if dummy mode is on AND a
// valid signed cookie is set. Otherwise null. Centralizes the check so every
// auth checkpoint (admin layout, deck page, gated panels, etc.) uses the
// same pattern.
export async function getDummyAuthEmail() {
  if (!isDummyAuthMode()) return null;
  const ck = await cookies();
  const dummy = verifyDummyAuth(ck.get(DUMMY_COOKIE_NAME)?.value);
  return dummy?.email?.toLowerCase() || null;
}
