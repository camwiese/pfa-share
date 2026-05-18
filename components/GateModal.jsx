"use client";

import { useEffect, useRef, useState } from "react";
import CodeInput from "./CodeInput";

// Modal that gates the deck after the free preview. Three states:
//   email | code | approval-pending
// On verify success, calls onVerified() so the caller can fetch gated panels.

export default function GateModal({ open, onVerified, onBack }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const emailRef = useRef(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (step === "email") emailRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    if (step !== "code") verifiedRef.current = false;
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  if (!open) return null;

  async function sendCode(e) {
    e?.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data?.requires_approval) {
        setStep("approval");
        return;
      }
      if (!res.ok) {
        setError(data?.error?.message || data?.error || "Couldn't send code.");
        return;
      }
      setStep("code");
      setDigits(["", "", "", "", "", ""]);
      setResendIn(30);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(code) {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Wrong code.");
        setDigits(["", "", "", "", "", ""]);
        verifiedRef.current = false;
        return;
      }
      onVerified?.(email.trim());
    } catch {
      setError("Network error. Try again.");
      verifiedRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="gate-modal__backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        className="gate-modal__card"
        style={{
          width: "100%",
          maxWidth: 540,
          background: "#fcfbf8",
          border: "1px solid #dedad0",
          borderRadius: 2,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          fontFamily: "Inter, system-ui, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {step === "email" && (
          <>
            <h2 style={titleStyle}>Please confirm your email to continue</h2>
            <p style={subStyle}>
              Project details are confidential. Please enter your email to continue.
            </p>
            <form onSubmit={sendCode} style={{ display: "grid", gap: 10 }}>
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
          </>
        )}

        {step === "code" && (
          <>
            <h2 style={titleStyle}>
              Enter the code we sent to <span style={{ color: "#1a1612" }}>{email}</span>
            </h2>
            <p style={subStyle}>It may take a moment to arrive.</p>
            <div style={{ display: "grid", gap: 14 }}>
              <CodeInput
                value={digits}
                onChange={setDigits}
                onComplete={verifyCode}
                disabled={busy}
              />
              {busy ? (
                <div style={{ textAlign: "center", fontSize: 13, color: "#7b8e80" }}>
                  Verifying…
                </div>
              ) : null}
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => sendCode()}
                style={linkBtn}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </>
        )}

        {step === "approval" && (
          <>
            <h2 style={titleStyle}>You&rsquo;ll need an invitation to view this.</h2>
            <p style={subStyle}>
              Thanks &mdash; we&rsquo;ve received your request from <strong>{email}</strong>. We&rsquo;ll be in touch.
            </p>
          </>
        )}

        {error ? <div style={{ marginTop: 12, color: "#a84642", fontSize: 13 }}>{error}</div> : null}

        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <button onClick={onBack} style={dimLinkBtn}>← Back to slide 4</button>
        </div>
      </div>
    </div>
  );
}

const titleStyle = { fontFamily: "Fraunces, Georgia, serif", fontSize: 20, lineHeight: 1.25, margin: "0 0 8px", color: "#33403a", fontWeight: 500, wordBreak: "break-word" };
const subStyle = { fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, color: "#7b8e80", margin: "0 0 18px", lineHeight: 1.5 };
const inputStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 15,
  padding: "12px 14px",
  border: "1px solid #dedad0",
  borderRadius: 8,
  outline: "none",
  background: "#fff",
  color: "#33403a",
};
const primaryBtn = (busy) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 14px",
  border: 0,
  borderRadius: 8,
  background: "#8e2832",
  color: "#f1ece1",
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.7 : 1,
  transition: "background 120ms",
});
const linkBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 8px",
  border: 0,
  background: "transparent",
  color: "#7b8e80",
  cursor: "pointer",
  textDecoration: "underline",
};
const dimLinkBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 8px",
  border: 0,
  background: "transparent",
  color: "#9e9d92",
  cursor: "pointer",
};
