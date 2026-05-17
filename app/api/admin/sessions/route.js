import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/requireAdmin";

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const windowDays = clamp(Number(url.searchParams.get("days") || 30), 1, 365);
  const limit = clamp(Number(url.searchParams.get("limit") || 50), 1, 200);
  const onlyLinkId = url.searchParams.get("link_id") || null;

  const since = new Date(Date.now() - windowDays * 86400_000).toISOString();

  let query = auth.service
    .from("sessions")
    .select("id, link_id, viewer_email, started_at, last_tick_at, ended_at, total_seconds, slide_dwells, max_slide_reached, device, geo, fp_hash, is_bot")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (onlyLinkId) query = query.eq("link_id", onlyLinkId);

  const { data: sessions, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linkIds = Array.from(new Set((sessions || []).map((s) => s.link_id).filter(Boolean)));
  let linksMap = {};
  if (linkIds.length > 0) {
    const { data: links } = await auth.service
      .from("links")
      .select("id, token, name")
      .in("id", linkIds);
    (links || []).forEach((l) => { linksMap[l.id] = l; });
  }

  return NextResponse.json({
    sessions: (sessions || []).map((s) => ({ ...s, link: s.link_id ? linksMap[s.link_id] : null })),
  });
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
