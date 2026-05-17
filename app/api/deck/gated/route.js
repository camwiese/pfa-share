import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { getAdminEmails } from "../../../../lib/admin";
import { getPanelsHtml, TOTAL_PANELS } from "../../../../lib/panelHtml";

export async function GET(request) {
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  let email = null;
  if (bypass) {
    email = (getAdminEmails()[0] || "dev@example.com").toLowerCase();
  } else {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      email = user?.email?.toLowerCase() || null;
    } catch {}
  }
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!bypass) {
    try {
      const service = createServiceClient();
      const adminEmails = getAdminEmails();
      if (!adminEmails.includes(email)) {
        const { data: allowed } = await service
          .from("allowed_emails")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
  }

  const url = new URL(request.url);
  const start = Math.max(0, Math.min(TOTAL_PANELS - 1, Number(url.searchParams.get("start") || 5)));
  const count = TOTAL_PANELS - start;
  const html = getPanelsHtml(start, count);
  return NextResponse.json({ html, start, count });
}
