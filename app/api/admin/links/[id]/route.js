import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/requireAdmin";

export async function PATCH(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body = {};
  try { body = await request.json(); } catch {}

  const patch = {};
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.note === "string") patch.note = body.note.trim() || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  const { data, error } = await auth.service
    .from("links")
    .update(patch)
    .eq("id", id)
    .select("id, token, name, note, is_active, expires_at, view_count, last_viewed_at, created_at, created_by")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ("is_active" in patch) {
    await auth.service.from("events").insert({
      session_id: null,
      kind: "link_toggle",
      payload: { link_id: id, is_active: patch.is_active },
    });
  }

  return NextResponse.json({ link: data });
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await auth.service.from("links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
