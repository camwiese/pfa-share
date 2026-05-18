import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/requireAdmin";
import { demo } from "../../../../../lib/demoData";

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (auth.demo) {
    const result = demo.getSession(id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  }

  const { data: session, error } = await auth.service
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let link = null;
  let linkStats = null;
  if (session.link_id) {
    const { data } = await auth.service
      .from("links")
      .select("id, token, name, note, is_active, view_count, last_viewed_at, created_at")
      .eq("id", session.link_id)
      .maybeSingle();
    link = data || null;

    const { data: linkSessions } = await auth.service
      .from("sessions")
      .select("id, fp_hash, total_seconds, is_bot")
      .eq("link_id", session.link_id);
    if (linkSessions) {
      const real = linkSessions.filter((s) => !s.is_bot);
      linkStats = {
        visitors: new Set(real.map((s) => s.fp_hash).filter(Boolean)).size,
        sessions: real.length,
        totalSeconds: real.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0),
      };
    }
  }

  let related = [];
  if (session.fp_hash) {
    const { data } = await auth.service
      .from("sessions")
      .select("id, link_id, started_at, total_seconds, geo, device")
      .eq("fp_hash", session.fp_hash)
      .neq("id", id)
      .order("started_at", { ascending: false })
      .limit(20);
    related = data || [];
  }

  const { data: events } = await auth.service
    .from("events")
    .select("id, kind, payload, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return NextResponse.json({ session, link, linkStats, related, events: events || [] });
}
