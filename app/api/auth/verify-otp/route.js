import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, token, type = "email" } = body || {};

    if (!email || !token || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: String(token).trim(),
      type: type === "email" ? "email" : "email",
    });

    if (error) {
      console.error("[verify-otp] Verification failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return response;
  } catch (err) {
    console.error("[verify-otp] Request failed:", err?.message || err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
