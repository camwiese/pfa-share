import { createClient, createServiceClient } from "../../lib/supabase/server";
import { getAdminEmails } from "../../lib/admin";
import { redirect } from "next/navigation";
import DeckPanels, { PANEL_COUNT } from "../../components/DeckPanels";
import Deck from "../../components/Deck";
import TrackerMount from "../../components/TrackerMount";
import "../styles/deck.css";

export const dynamic = "force-dynamic";

async function getViewerEmail() {
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (bypass) return (getAdminEmails()[0] || "dev@example.com");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    const adminEmails = getAdminEmails();
    if (adminEmails.includes(email)) return email;
    const service = createServiceClient();
    const { data: allowed } = await service
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    return allowed ? email : null;
  } catch {
    return null;
  }
}

export default async function DeckPage({ searchParams }) {
  const email = await getViewerEmail();
  if (!email) redirect("/");

  const sp = await searchParams;
  const startRaw = Number.parseInt(sp?.slide ?? "0", 10);
  const startIndex = Number.isFinite(startRaw) ? Math.max(0, Math.min(PANEL_COUNT - 1, startRaw)) : 0;

  return (
    <>
      <main>
        <DeckPanels />
      </main>
      <Deck startIndex={startIndex} />
      <TrackerMount initEndpoint="/api/track/init" trackEndpoint="/api/track" />
    </>
  );
}
