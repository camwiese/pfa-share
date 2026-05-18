import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { getAdminEmails } from "../../../../lib/admin";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";
import { isAnyAdmin } from "../../../../lib/adminAuth";
import { notifyAccessRequest, notifyNewEmail } from "../../../../lib/notifications";
import { geoFromHeaders } from "../../../../lib/geo";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEDUP_WINDOW_MS = 90_000;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[request-otp] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  const normalizedEmail = normalizeEmail(email);
  const adminEmails = getAdminEmails();

  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    console.error("[request-otp] createServiceClient failed:", err?.message);
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  const isGp = adminEmails.includes(normalizedEmail);
  const isPartner = !isGp && await isAnyAdmin(normalizedEmail);

  if (!isGp && !isPartner) {
    const { data: allowed, error: allowedError } = await serviceClient
      .from("allowed_emails")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (allowedError) {
      console.error("[request-otp] allowed_emails query failed:", allowedError.message);
      return NextResponse.json(
        { error: { message: "Service temporarily unavailable" } },
        { status: 503 }
      );
    }

    if (!allowed) {
      // Check access mode from settings.
      const { data: settings } = await serviceClient
        .from("settings")
        .select("public_access")
        .eq("id", 1)
        .maybeSingle();

      const publicAccess = settings?.public_access !== false;

      if (!publicAccess) {
        // Approval mode: insert a pending access_request and tell the client.
        try {
          await serviceClient
            .from("access_requests")
            .insert({ email: normalizedEmail, status: "pending" });
        } catch (err) {
          console.error("[request-otp] access_requests insert failed:", err?.message);
        }
        // Fire admin notification (best-effort, swallow errors).
        notifyAccessRequest({ email: normalizedEmail, geo: geoFromHeaders(request.headers) }).catch(() => {});
        return NextResponse.json({ requires_approval: true });
      }

      // Public mode: auto-approve and continue with OTP.
      try {
        await serviceClient.from("allowed_emails").insert({
          email: normalizedEmail,
          source: "auto_approved",
          invited_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[request-otp] Failed to auto-add to allowed_emails:", err?.message);
      }
      // Fire "new email verified" admin notification (best-effort).
      notifyNewEmail({ email: normalizedEmail, geo: geoFromHeaders(request.headers) }).catch(() => {});
    }
  }

  // Deduplicate rapid OTP requests.
  try {
    const { data: recentSend } = await serviceClient
      .from("otp_attempts")
      .select("created_at")
      .eq("email", normalizedEmail)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSend) {
      const sentAt = new Date(recentSend.created_at).getTime();
      if (Date.now() - sentAt < DEDUP_WINDOW_MS) {
        return NextResponse.json({
          deduplicated: true,
          message: "Code already sent. Please check your inbox.",
        });
      }
    }
  } catch (err) {
    console.error("[request-otp] Dedup check failed, proceeding:", err?.message);
  }

  const otpBody = { email: normalizedEmail };

  const supabaseUrl = SUPABASE_URL.replace(/\/$/, "");
  const otpUrl = `${supabaseUrl}/auth/v1/otp`;

  let supabaseRes;
  let supabaseData = {};
  try {
    supabaseRes = await fetch(otpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(otpBody),
    });
    supabaseData = await supabaseRes.json().catch(() => ({}));
  } catch (err) {
    console.error("[request-otp] Supabase fetch failed:", err?.message || err);
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  let status = "sent";
  let errorMessage = null;

  if (!supabaseRes.ok) {
    const msg = supabaseData?.msg || supabaseData?.error_description || supabaseData?.message || "Unknown error";
    const errorCode = supabaseData?.error || supabaseData?.error_code || supabaseData?.code || "";
    const isRateLimit =
      supabaseRes.status === 429 ||
      errorCode === "over_email_send_rate_limit" ||
      String(msg).toLowerCase().includes("rate limit");
    status = isRateLimit ? "rate_limited" : "error";
    errorMessage = isRateLimit
      ? "Too many attempts. Please wait a minute and try again."
      : msg;
  }

  try {
    const otpServiceClient = createServiceClient();
    await otpServiceClient.from("otp_attempts").insert({
      email: otpBody.email,
      status,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error("[request-otp] Failed to log OTP attempt:", err?.message || err);
  }

  if (!supabaseRes.ok) {
    return NextResponse.json(
      { error: { message: errorMessage } },
      { status: supabaseRes.status }
    );
  }

  return NextResponse.json(supabaseData);
}
