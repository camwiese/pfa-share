import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/requireAdmin";
import { demo } from "../../../../lib/demoData";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.demo) {
    return NextResponse.json({ requests: demo.listApprovals() });
  }

  const { data, error } = await auth.service
    .from("access_requests")
    .select("id, email, requested_at, status, reviewed_at, reviewed_by")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}
