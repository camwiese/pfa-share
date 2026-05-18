import { createClient, createServiceClient } from "./supabase/server";
import { getAdminEmails } from "./admin";
import { isDemoMode } from "./demoData";

// Server-only helper. Returns { email, isGP, service } when the request is
// from an authenticated admin, or { error, status } on failure. In dev with
// LOCAL_DEV_ADMIN_BYPASS=true, returns a synthetic admin viewer; if Supabase
// isn't configured, marks the call as demo so endpoints fall back to canned
// data.

export async function requireAdmin() {
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  const adminEmails = getAdminEmails();

  if (bypass) {
    const email = adminEmails[0] || "dev@example.com";
    if (isDemoMode()) {
      return { email, isGP: true, service: null, demo: true };
    }
    try {
      return { email, isGP: true, service: createServiceClient() };
    } catch (err) {
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
