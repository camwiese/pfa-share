"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const FIELDS = [
  { key: "email_on_request", label: "Email me on access requests", group: "notifications" },
  { key: "email_on_new_email", label: "Email me when a new email verifies", group: "notifications" },
  { key: "email_on_link_open", label: "Email me when a personal link is opened", group: "notifications" },
  { key: "email_on_link_open_every", label: "…every session (off = first session only)", group: "notifications" },
  { key: "email_on_session_end", label: "Email me a session summary when a viewer leaves", group: "notifications" },
];

export default function SettingsPanel({ adminEmails = [] }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  function setField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Couldn't save");
        return;
      }
      setSettings(data.settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 22, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Section title="Access mode">
        <label style={radioRow}>
          <input
            type="radio"
            name="access"
            checked={settings.public_access}
            onChange={() => setField("public_access", true)}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Public (verify email)</div>
            <div style={{ fontSize: 12, color: "#7b8e80" }}>
              Anyone can request access; a 6-digit code is emailed and they continue.
            </div>
          </div>
        </label>
        <label style={radioRow}>
          <input
            type="radio"
            name="access"
            checked={!settings.public_access}
            onChange={() => setField("public_access", false)}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Approval required</div>
            <div style={{ fontSize: 12, color: "#7b8e80" }}>
              Requests show up in the Approvals tab. Each approval emails a magic link.
            </div>
          </div>
        </label>
      </Section>

      <Section title="Notifications">
        {FIELDS.map((f) => (
          <label key={f.key} style={checkboxRow}>
            <input
              type="checkbox"
              checked={!!settings[f.key]}
              onChange={(e) => setField(f.key, e.target.checked)}
            />
            <span>{f.label}</span>
          </label>
        ))}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: 13 }}>Min gap (seconds)</span>
          <input
            type="number"
            min={0}
            max={3600}
            value={settings.notification_min_gap_seconds}
            onChange={(e) => setField("notification_min_gap_seconds", Number(e.target.value) || 0)}
            style={smallInput}
          />
        </div>
      </Section>

      <Section title="Display">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>Free-preview slide count</span>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.free_slide_count}
            onChange={(e) => setField("free_slide_count", Number(e.target.value) || 5)}
            style={smallInput}
          />
        </div>
      </Section>

      <Section title="Admin allowlist">
        <div style={{ fontSize: 13, color: "#7b8e80", lineHeight: 1.6 }}>
          {adminEmails.length > 0 ? (
            <>
              <div style={{ marginBottom: 4 }}>From <code>GP_EMAIL</code>:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {adminEmails.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </>
          ) : (
            <div>No admin emails configured in <code>GP_EMAIL</code>.</div>
          )}
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={save} disabled={saving} style={primaryBtn(saving)}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dedad0", borderRadius: 10, padding: 16 }}>
      <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 16, margin: "0 0 10px" }}>
        {title}
      </h2>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

const radioRow = { display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" };
const checkboxRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#33403a", cursor: "pointer" };
const smallInput = {
  fontSize: 13,
  padding: "6px 10px",
  border: "1px solid #dedad0",
  borderRadius: 6,
  width: 80,
};
const primaryBtn = (saving) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 16px",
  border: 0,
  borderRadius: 8,
  background: "#3a473f",
  color: "#fcfbf8",
  cursor: saving ? "default" : "pointer",
  opacity: saving ? 0.7 : 1,
});
