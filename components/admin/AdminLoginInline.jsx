"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginInline() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    } catch {
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
    } catch {
      setError("Network error. Try again.");
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
            : `Enter the code we just sent to ${email}.`}
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
              className="input"
              style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: 18 }}
            />
            <button type="submit" disabled={busy} className="btn btn--primary">
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="btn btn--text"
              style={{ justifySelf: "center" }}
            >
              Use a different email
            </button>
          </form>
        )}

        {error ? <div className="admin-login__error">{error}</div> : null}
      </div>
    </div>
  );
}
