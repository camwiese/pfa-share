import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/requireAdmin";
import { generateToken } from "../../../../lib/nanoid";

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const status = url.searchParams.get("status") || "all"; // all | active | disabled

  let query = auth.service
    .from("links")
    .select("id, token, name, note, is_active, expires_at, created_by, created_at, view_count, last_viewed_at")
    .order("last_viewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (status === "active") query = query.eq("is_active", true);
  if (status === "disabled") query = query.eq("is_active", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = q
    ? (data || []).filter((l) => l.name?.toLowerCase().includes(q) || l.token?.toLowerCase().includes(q))
    : (data || []);

  return NextResponse.json({ links: filtered });
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body = {};
  try { body = await request.json(); } catch {}
  const name = (body.name || "").trim();
  const note = (body.note || "").trim() || null;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // Retry on token collision (very rare with 30-bit space).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken();
    const { data, error } = await auth.service
      .from("links")
      .insert({ token, name, note, created_by: auth.email })
      .select("id, token, name, note, is_active, created_at")
      .single();

    if (!error && data) {
      await auth.service.from("events").insert({
        session_id: null,
        kind: "link_create",
        payload: { link_id: data.id, name },
      });
      return NextResponse.json({ link: data, url: `${baseUrl}/d/${data.token}` });
    }

    // Collision (unique constraint) → retry. Anything else → fail.
    if (!error?.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not generate unique token" }, { status: 500 });
}
