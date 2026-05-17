import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/requireAdmin";

const FIELDS = [
  "public_access",
  "email_on_request",
  "email_on_new_email",
  "email_on_link_open",
  "email_on_link_open_every",
  "email_on_session_end",
  "free_slide_count",
  "notification_min_gap_seconds",
];

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.service
    .from("settings")
    .select(FIELDS.join(", ") + ", updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data || null });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body = {};
  try { body = await request.json(); } catch {}

  const patch = {};
  for (const k of FIELDS) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await auth.service
    .from("settings")
    .update(patch)
    .eq("id", 1)
    .select(FIELDS.join(", ") + ", updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
