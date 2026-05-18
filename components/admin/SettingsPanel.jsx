"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const TOGGLES = [
  { key: "email_on_request", label: "Email me on access requests" },
  { key: "email_on_new_email", label: "Email me when a new email verifies" },
  { key: "email_on_link_open", label: "Email me when a personal link is opened" },
  { key: "email_on_link_open_every", label: "…every session (off = first session only)" },
  { key: "email_on_session_end", label: "Email me a session summary when a viewer leaves" },
];

export default function SettingsPanel({ adminEmails = [] }) {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings); setSaved(d.settings); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function setField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const dirty = settings && saved && JSON.stringify(settings) !== JSON.stringify(saved);

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
      setSaved(data.settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading…</div>;
  if (!settings) return <div className="empty-state">Couldn&rsquo;t load settings.</div>;

  return (
    <div>
      <div className="section">
        <h2>Access mode</h2>
        <label className="field-row--block">
          <input
            type="radio"
            name="access"
            checked={settings.public_access}
            onChange={() => setField("public_access", true)}
            style={{ marginTop: 4 }}
          />
          <div>
            <div className="field-row__title">Public (verify email)</div>
            <div className="field-row__sub">
              Anyone can request access; a 6-digit code is emailed and they continue.
            </div>
          </div>
        </label>
        <label className="field-row--block" style={{ marginTop: 10 }}>
          <input
            type="radio"
            name="access"
            checked={!settings.public_access}
            onChange={() => setField("public_access", false)}
            style={{ marginTop: 4 }}
          />
          <div>
            <div className="field-row__title">Approval required</div>
            <div className="field-row__sub">
              Requests show up in the Approvals tab. Each approval emails a magic link.
            </div>
          </div>
        </label>
      </div>

      <div className="section">
        <h2>Notifications</h2>
        {TOGGLES.map((f) => (
          <label key={f.key} className="field-row">
            <input
              type="checkbox"
              checked={!!settings[f.key]}
              onChange={(e) => setField(f.key, e.target.checked)}
            />
            <span>{f.label}</span>
          </label>
        ))}
        <div className="field-row" style={{ marginTop: 6 }}>
          <span>Min gap between same-trigger emails (seconds)</span>
          <input
            type="number"
            min={0}
            max={3600}
            value={settings.notification_min_gap_seconds}
            onChange={(e) => setField("notification_min_gap_seconds", Number(e.target.value) || 0)}
            className="input input--small"
          />
        </div>
      </div>

      <div className="section">
        <h2>Display</h2>
        <div className="field-row">
          <span>Free-preview slide count</span>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.free_slide_count}
            onChange={(e) => setField("free_slide_count", Number(e.target.value) || 5)}
            className="input input--small"
          />
        </div>
      </div>

      <div className="section">
        <h2>Admin allowlist</h2>
        <div className="field-row__sub" style={{ lineHeight: 1.7 }}>
          {adminEmails.length > 0 ? (
            <>
              From <code>GP_EMAIL</code>:
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {adminEmails.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </>
          ) : (
            <>No admin emails configured in <code>GP_EMAIL</code>.</>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 12 }}>
        {dirty ? <span className="row__muted" style={{ fontSize: 12 }}>Unsaved changes</span> : null}
        <button onClick={save} disabled={saving || !dirty} className="btn btn--primary">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
