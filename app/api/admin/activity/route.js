import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/requireAdmin";
import { demo } from "../../../../lib/demoData";

// Aggregated metrics for the Activity tab.
// Excludes bot sessions from headline counts.

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const live = url.searchParams.get("live") === "1";
  const days = clamp(Number(url.searchParams.get("days") || 30), 1, 365);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  if (auth.demo) {
    if (live) return NextResponse.json({ liveNowCount: demo.liveCount() });
    return NextResponse.json(demo.activity({ days }));
  }

  if (live) {
    const liveSince = new Date(Date.now() - 90_000).toISOString();
    const { count } = await auth.service
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_tick_at", liveSince)
      .eq("is_bot", false);
    return NextResponse.json({ liveNowCount: count || 0 });
  }

  const { data } = await auth.service
    .from("sessions")
    .select("id, total_seconds, fp_hash, started_at, last_tick_at, is_bot")
    .gte("started_at", since)
    .eq("is_bot", false);

  const sessions = data || [];
  const totalSessions = sessions.length;
  const totalSeconds = sessions.reduce((acc, s) => acc + (Number(s.total_seconds) || 0), 0);
  const fingerprints = new Set(sessions.map((s) => s.fp_hash).filter(Boolean));
  const liveSinceMs = Date.now() - 90_000;
  const liveNowCount = sessions.filter((s) => new Date(s.last_tick_at).getTime() >= liveSinceMs).length;

  return NextResponse.json({
    totalSessions,
    totalSeconds,
    uniqueFingerprints: fingerprints.size,
    visitors: fingerprints.size,
    liveNowCount,
    days,
    daily: buildDailySeries(sessions, days),
  });
}

function buildDailySeries(sessions, days) {
  const buckets = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    buckets[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), sessions: 0, seconds: 0 };
  }
  for (const s of sessions) {
    const key = new Date(s.started_at).toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].sessions += 1;
      buckets[key].seconds += Number(s.total_seconds) || 0;
    }
  }
  return Object.values(buckets);
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
