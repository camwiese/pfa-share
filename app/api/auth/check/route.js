import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { getAdminEmails } from "../../../../lib/admin";
import { getDummyAuthEmail } from "../../../../lib/dummyAuth";

export async function GET() {
  // Dummy mode: trust the signed cookie.
  const dummyEmail = await getDummyAuthEmail();
  if (dummyEmail) {
    const adminEmails = getAdminEmails();
    return NextResponse.json({
      verified: true,
      email: dummyEmail,
      isAdmin: adminEmails.includes(dummyEmail),
    });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ verified: false, email: null, isAdmin: false });
    }

    const email = user.email.toLowerCase();
    const adminEmails = getAdminEmails();
    if (adminEmails.includes(email)) {
      return NextResponse.json({ verified: true, email, isAdmin: true });
    }

    const service = createServiceClient();
    const { data: allowed } = await service
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    return NextResponse.json({
      verified: !!allowed,
      email,
      isAdmin: false,
    });
  } catch (err) {
    console.error("[auth/check] error:", err?.message);
    return NextResponse.json({ verified: false, email: null, isAdmin: false }, { status: 200 });
  }
}
