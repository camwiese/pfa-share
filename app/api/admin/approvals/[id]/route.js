import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/requireAdmin";
import { demo } from "../../../../../lib/demoData";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body = {};
  try { body = await request.json(); } catch {}
  const action = body.action;
  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (auth.demo) {
    const r = demo.actOnApproval(id, action);
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const { data: req, error: readErr } = await auth.service
    .from("access_requests")
    .select("id, email, status")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = req.email.toLowerCase();

  if (action === "deny") {
    await auth.service.from("access_requests").update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.email,
    }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  // Approve: add to allowed_emails, mark request approved, send magic-link OTP.
  await auth.service.from("allowed_emails").upsert(
    { email, source: "request_approved", invited_by_email: auth.email },
    { onConflict: "email" }
  );

  await auth.service.from("access_requests").update({
    status: "approved",
    reviewed_at: new Date().toISOString(),
    reviewed_by: auth.email,
  }).eq("id", id);

  // Send OTP to the approved email (best-effort, swallow errors).
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const baseUrl = SUPABASE_URL.replace(/\/$/, "");
      await fetch(`${baseUrl}/auth/v1/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.warn("[approvals] OTP send failed:", err?.message);
    }
  }

  return NextResponse.json({ ok: true });
}
