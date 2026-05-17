"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { formatDuration, formatRelative } from "../../lib/format";
import LinkDrawer from "./LinkDrawer";
import SharingDot from "./SharingDot";
import { sharingSignal } from "../../lib/sharingSignal";

export default function LinksTable() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [signalsByLink, setSignalsByLink] = useState({});
  const inputRef = useRef(null);

  const refresh = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    fetch(`/api/admin/links?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setLinks(d.links || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q, status]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute sharing signal per link from its sessions (best-effort, single fetch).
  useEffect(() => {
    if (links.length === 0) return;
    let mounted = true;
    (async () => {
      const out = {};
      for (const l of links.slice(0, 20)) {
        const res = await fetch(`/api/admin/sessions?link_id=${l.id}&limit=50&days=365`).then((r) => r.ok ? r.json() : null);
        if (!res || !mounted) continue;
        out[l.id] = sharingSignal(res.sessions || []);
      }
      if (mounted) setSignalsByLink(out);
    })();
    return () => { mounted = false; };
  }, [links]);

  useEffect(() => {
    function onKey(e) {
      if (creating) return;
      const target = e.target;
      const inField = target?.matches?.("input, textarea");
      if (!inField && (e.key === "/" || e.key === "n")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (inField && e.key === "Escape") {
        e.preventDefault();
        target.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

  async function createLink(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Could not create link");
        return;
      }
      try {
        await navigator.clipboard.writeText(data.url);
        toast.success(`Copied: ${data.url} · ${data.link.name}`);
      } catch {
        toast.success(`Created. URL: ${data.url}`);
      }
      setName("");
      setNote("");
      inputRef.current?.focus();
      refresh();
    } catch (err) {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(link, next) {
    setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_active: next } : l));
    const res = await fetch(`/api/admin/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      refresh();
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <form
        onSubmit={createLink}
        style={{
          display: "grid",
          gap: 8,
          padding: 14,
          background: "#fff",
          border: "1px solid #dedad0",
          borderRadius: 10,
          marginBottom: 18,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipient name… (press Enter to create)"
          style={inputStyle}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Private note (optional)"
          rows={2}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={creating || !name.trim()} style={primaryBtn(creating)}>
            {creating ? "Creating…" : "Create link"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          style={{ ...inputStyle, maxWidth: 240 }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "active", "disabled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                border: `1px solid ${status === s ? "#3a473f" : "#dedad0"}`,
                background: status === s ? "#3a473f" : "#fff",
                color: status === s ? "#fcfbf8" : "#33403a",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>
      ) : links.length === 0 ? (
        <div style={{ color: "#7b8e80", fontSize: 13 }}>No links yet. Create one above.</div>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          {links.map((l) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1.4fr 1fr 60px 80px 1fr 70px",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                border: "1px solid #eee9dc",
                borderRadius: 6,
                background: l.is_active ? "#fff" : "#f4f4f3",
                fontSize: 13,
              }}
            >
              <SharingDot signal={signalsByLink[l.id]} />
              <button onClick={() => setOpenId(l.id)} style={linkBtn}>
                <strong>{l.name}</strong>
                {l.note ? <div style={{ color: "#7b8e80", fontSize: 11, marginTop: 2 }}>{l.note}</div> : null}
              </button>
              <div style={{ color: "#7b8e80", fontFamily: "monospace", fontSize: 12 }}>{l.token}</div>
              <div>{l.view_count || 0}</div>
              <div style={{ color: "#7b8e80" }}>{formatRelative(l.last_viewed_at)}</div>
              <div style={{ color: "#7b8e80", fontSize: 12 }}>{formatRelative(l.created_at)}</div>
              <label style={{ justifySelf: "end", fontSize: 12, color: "#7b8e80" }}>
                <input
                  type="checkbox"
                  checked={l.is_active}
                  onChange={(e) => toggleActive(l, e.target.checked)}
                />
                {l.is_active ? " Active" : " Off"}
              </label>
            </div>
          ))}
        </div>
      )}

      <LinkDrawer
        linkId={openId}
        onClose={() => setOpenId(null)}
        onAfterChange={refresh}
      />
    </div>
  );
}

const inputStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  padding: "10px 12px",
  border: "1px solid #dedad0",
  borderRadius: 6,
  outline: "none",
  background: "#fff",
  color: "#33403a",
};
const primaryBtn = (busy) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  border: 0,
  borderRadius: 6,
  background: "#3a473f",
  color: "#fcfbf8",
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.7 : 1,
});
const linkBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  background: "transparent",
  border: 0,
  textAlign: "left",
  cursor: "pointer",
  color: "#33403a",
  padding: 0,
};
