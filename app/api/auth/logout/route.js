import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { DUMMY_COOKIE_NAME } from "../../../../lib/dummyAuth";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth/logout] error:", err?.message);
  }
  const res = NextResponse.json({ success: true });
  // Clear the dummy-auth cookie too (no-op if it wasn't set).
  res.cookies.set(DUMMY_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
