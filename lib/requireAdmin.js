import { createClient, createServiceClient } from "./supabase/server";
import { getAdminEmails } from "./admin";
import { isDemoMode } from "./demoData";
import { getDummyAuthEmail } from "./dummyAuth";

// Server-only helper. Returns { email, isGP, service } when the request is
// from an authenticated admin, or { error, status } on failure.
//
// Three short-circuit paths:
//   LOCAL_DEV_ADMIN_BYPASS=true (dev only) → auto-login as the first admin
//   AUTH_DUMMY_MODE=true → read the signed dummy-auth cookie set by verify-otp
//   isDemoMode() → no Supabase available; return demo:true so endpoints
//                  fall back to canned data
//
// Otherwise: hit Supabase Auth and check GP_EMAIL.

export async function requireAdmin() {
  const adminEmails = getAdminEmails();
  const localBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (localBypass) {
    const email = adminEmails[0] || "dev@example.com";
    if (isDemoMode()) return { email, isGP: true, service: null, demo: true };
    try {
      return { email, isGP: true, service: createServiceClient() };
    } catch {
      return { error: "Service unavailable", status: 503 };
    }
  }

  // Dummy auth mode: trust the signed cookie set by verify-otp.
  const dummyEmail = await getDummyAuthEmail();
  if (dummyEmail) {
    if (!adminEmails.includes(dummyEmail)) {
      return { error: "Forbidden", status: 403 };
    }
    if (isDemoMode()) return { email: dummyEmail, isGP: true, service: null, demo: true };
    try {
      return { email: dummyEmail, isGP: true, service: createServiceClient() };
    } catch {
      return { error: "Service unavailable", status: 503 };
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase() || null;
    if (!email) return { error: "Unauthorized", status: 401 };
    if (!adminEmails.includes(email)) return { error: "Forbidden", status: 403 };
    return { email, isGP: true, service: createServiceClient() };
  } catch (err) {
    return { error: "Service unavailable", status: 503 };
  }
}
