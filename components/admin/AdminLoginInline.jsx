"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeInput from "../CodeInput";

export default function AdminLoginInline() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "code") verifiedRef.current = false;
  }, [step]);

  async function submitEmail(e) {
    e.preventDefault();
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
      if (!res.ok) {
        setError(data?.error?.message || data?.error || "Couldn't send code.");
        return;
      }
      setStep("code");
      setDigits(["", "", "", "", "", ""]);
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
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      verifiedRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">Admin sign-in</h1>
        <p className="admin-login__sub">
          {step === "email"
            ? "Enter your admin email. We'll send a 6-digit code."
            : `Enter the code we sent to ${email}.`}
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
              className="input"
            />
            <button type="submit" disabled={busy} className="btn btn--primary">
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <CodeInput
              value={digits}
              onChange={setDigits}
              onComplete={verifyCode}
              disabled={busy}
            />
            {busy ? (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--admin-ink-muted)" }}>
                Verifying…
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setDigits(["", "", "", "", "", ""]);
                setError("");
              }}
              className="btn btn--text"
              style={{ justifySelf: "center" }}
            >
              Use a different email
            </button>
          </div>
        )}

        {error ? <div className="admin-login__error">{error}</div> : null}
      </div>
    </div>
  );
}
