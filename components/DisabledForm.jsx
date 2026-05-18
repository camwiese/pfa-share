"use client";

import { useState } from "react";

export default function DisabledForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok && !data.requires_approval && !data.deduplicated) {
        setState("error");
        setErr(data?.error?.message || data?.error || "Couldn't send a code.");
        return;
      }
      setState("sent");
    } catch (e) {
      setState("error");
      setErr("Network error. Try again.");
    }
  }

  if (state === "sent") {
    return (
      <p style={{ fontSize: 14, color: "#33403a", margin: 0 }}>
        Thanks &mdash; we&rsquo;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 15,
          padding: "12px 14px",
          border: "1px solid #dedad0",
          borderRadius: 8,
          background: "#fff",
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={state === "sending"}
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 14px",
          border: 0,
          borderRadius: 8,
          background: "#8e2832",
          color: "#f1ece1",
          cursor: state === "sending" ? "default" : "pointer",
          opacity: state === "sending" ? 0.7 : 1,
        }}
      >
        {state === "sending" ? "Sending…" : "Request access"}
      </button>
      {err ? (
        <div style={{ color: "#a84642", fontSize: 13 }}>{err}</div>
      ) : null}
    </form>
  );
}
