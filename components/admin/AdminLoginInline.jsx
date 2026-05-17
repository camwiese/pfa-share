"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, SANS, SERIF } from "../../constants/theme";

export default function AdminLoginInline() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const emailRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function submitEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || data?.error || "Could not send code.");
        return;
      }
      if (data?.deduplicated) setInfo("A code was just sent. Check your inbox.");
      setStep("code");
    } catch (err) {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    const t = code.trim();
    if (t.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Wrong code.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: COLORS.cream50,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 12px 32px rgba(60,58,52,0.08)",
        }}
      >
        <h1 style={{ fontFamily: SERIF, fontSize: 22, margin: "0 0 8px", color: COLORS.text900 }}>
          Admin sign-in
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, margin: "0 0 18px", color: COLORS.text500 }}>
          {step === "email"
            ? "Enter your admin email. We'll send a 6-digit code."
            : `Enter the 6-digit code we just sent to ${email}.`}
        </p>

        {step === "email" ? (
          <form onSubmit={submitEmail} style={{ display: "grid", gap: 10 }}>
            <input
              ref={emailRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} style={{ display: "grid", gap: 10 }}>
            <input
              ref={codeRef}
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="• • • • • •"
              style={{ ...inputStyle, fontFamily: SANS, letterSpacing: "0.4em", textAlign: "center", fontSize: 18 }}
            />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
              style={linkBtn}
            >
              Use a different email
            </button>
          </form>
        )}

        {error ? (
          <div style={{ marginTop: 12, color: COLORS.error, fontFamily: SANS, fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        {info ? (
          <div style={{ marginTop: 12, color: COLORS.text500, fontFamily: SANS, fontSize: 13 }}>
            {info}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 15,
  padding: "12px 14px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  outline: "none",
  background: COLORS.white,
  color: COLORS.text900,
};

const primaryBtn = (busy) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 14px",
  border: 0,
  borderRadius: 8,
  background: COLORS.green900,
  color: COLORS.cream50,
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.7 : 1,
});

const linkBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 8px",
  border: 0,
  background: "transparent",
  color: COLORS.text500,
  cursor: "pointer",
  textDecoration: "underline",
};
