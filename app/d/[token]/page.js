import { redirect } from "next/navigation";
import { createServiceClient } from "../../../lib/supabase/server";
import DeckPanels from "../../../components/DeckPanels";
import Deck from "../../../components/Deck";
import TrackerMount from "../../../components/TrackerMount";
import "../../styles/deck.css";

export const dynamic = "force-dynamic";

// The page itself only validates the token. Session creation, cookie issuance,
// view_count bump, and the "link opened" email all happen inside the init
// Route Handler — Next.js 16 disallows cookies().set() from a Server Component,
// so any cookie-writing side effect has to live there.

export default async function PersonalLinkPage({ params }) {
  const { token } = await params;
  // Stale, missing, inactive, or expired tokens fall through to the public
  // preview deck instead of a hard "disabled" page.
  if (!token) redirect("/");

  let service;
  try {
    service = createServiceClient();
  } catch {
    redirect("/");
  }

  const { data: link } = await service
    .from("links")
    .select("id, token, name, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) redirect("/");
  if (!link.is_active) redirect("/");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    redirect("/");
  }

  return (
    <>
      <main>
        <DeckPanels />
      </main>
      <Deck startIndex={0} />
      <TrackerMount
        initEndpoint={`/api/d/${encodeURIComponent(token)}/init`}
        trackEndpoint={`/api/d/${encodeURIComponent(token)}/track`}
      />
    </>
  );
}
