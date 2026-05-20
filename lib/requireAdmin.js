import { cookies } from "next/headers";
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

// In-process auth cache. Each Vercel function instance keeps its own;
// admin navigation typically fires 3–5 admin API calls in quick succession
// and they all benefit from skipping the ~100ms Supabase Auth round-trip.
// Keyed by the cookie value (or "dummy:<email>") so cookie revocation is
// effective within CACHE_TTL_MS. The cached value is never the rejection
// result — only successful auths — so a 401/403 always re-checks.
const CACHE_TTL_MS = 10_000;
const authCache = new Map();

function cacheGet(key) {
  const entry = authCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    authCache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheSet(key, value) {
  // Defensive cap so the map can't grow unbounded if many different
  // cookies hit the same warm instance.
  if (authCache.size > 200) {
    const oldest = authCache.keys().next().value;
    authCache.delete(oldest);
  }
  authCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Pull the Supabase session cookie out of the request — that's the
// minimum identifier needed to cache the auth result correctly.
async function readSupabaseSessionToken() {
  try {
    const store = await cookies();
    // Supabase ssr stores the access token under several cookie names
    // depending on version (sb-<projectref>-auth-token or sb-access-token).
    // We just hash all sb- cookies together to form the cache key — any
    // change to any of them invalidates the cache.
    const sbCookies = store.getAll().filter((c) => c.name.startsWith("sb-"));
    if (sbCookies.length === 0) return null;
    return sbCookies.map((c) => `${c.name}=${c.value}`).sort().join("|");
  } catch {
    return null;
  }
}

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

  // Supabase Auth: cache the successful resolution for 10s keyed by cookie
  // bundle. Avoids hitting Supabase Auth on every admin API call within a
  // single admin-tab navigation.
  const cacheKey = await readSupabaseSessionToken();
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      // Recreate the service client — it's not serializable across calls
      // but is cheap to spin up.
      try {
        return { ...cached, service: createServiceClient() };
      } catch {
        return { error: "Service unavailable", status: 503 };
      }
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase() || null;
    if (!email) return { error: "Unauthorized", status: 401 };
    if (!adminEmails.includes(email)) return { error: "Forbidden", status: 403 };
    const result = { email, isGP: true };
    if (cacheKey) cacheSet(cacheKey, result);
    return { ...result, service: createServiceClient() };
  } catch (err) {
    return { error: "Service unavailable", status: 503 };
  }
}
