import DeckPanels from "../components/DeckPanels";
import PublicDeck from "../components/PublicDeck";
import { createServiceClient } from "../lib/supabase/server";
import { parseVariant } from "../constants/variants";
import "./styles/deck.css";

export const dynamic = "force-dynamic";

async function getFreeSlideCount() {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("settings")
      .select("free_slide_count")
      .eq("id", 1)
      .maybeSingle();
    return data?.free_slide_count ?? 5;
  } catch {
    return 5;
  }
}

export default async function HomePage({ searchParams }) {
  const sp = await searchParams;
  const variant = parseVariant(sp?.v);
  const freeCount = await getFreeSlideCount();
  return (
    <>
      <main>
        <DeckPanels count={freeCount} variant={variant} />
        <div id="gated-mount" />
      </main>
      <PublicDeck freeCount={freeCount} variant={variant} />
    </>
  );
}
