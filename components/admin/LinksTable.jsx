"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [statsByLink, setStatsByLink] = useState({});
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

  useEffect(() => {
    if (links.length === 0) return;
    let mounted = true;
    (async () => {
      const sig = {};
      const stats = {};
      for (const l of links.slice(0, 20)) {
        const res = await fetch(`/api/admin/sessions?link_id=${l.id}&limit=50&days=365`).then((r) => r.ok ? r.json() : null);
        if (!res || !mounted) continue;
        const ss = res.sessions || [];
        sig[l.id] = sharingSignal(ss);
        const real = ss.filter((s) => !s.is_bot);
        stats[l.id] = {
          totalSeconds: real.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0),
          visitors: new Set(real.map((s) => s.fp_hash).filter(Boolean)).size,
        };
      }
      if (mounted) {
        setSignalsByLink(sig);
        setStatsByLink(stats);
      }
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
    } catch {
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

  async function copyUrl(token, name) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/d/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Copied · ${name}`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  const TABLE_COLS = "16px 1.4fr 92px 60px 60px 70px 1fr 50px";

  return (
    <div>
      <form onSubmit={createLink} className="section">
        <div style={{ display: "grid", gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Recipient name… (press Enter to create)"
            className="input"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private note (optional)"
            rows={2}
            className="textarea"
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={creating || !name.trim()} className="btn btn--primary">
              {creating ? "Creating…" : "Create link"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="input"
          style={{ maxWidth: 260 }}
        />
        <div className="chip-group">
          {["all", "active", "disabled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`chip${status === s ? " is-active" : ""}`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : links.length === 0 ? (
        <div className="empty-state">No links yet. Create one above.</div>
      ) : (
        <>
          <div className="table-head" style={{ gridTemplateColumns: TABLE_COLS }}>
            <span></span>
            <span>Recipient</span>
            <span>Token</span>
            <span>Visitors</span>
            <span>Sessions</span>
            <span>Time</span>
            <span>Last seen</span>
            <span style={{ textAlign: "right" }}>Active</span>
          </div>
          <div className="row-list">
            {links.map((l) => {
              const stats = statsByLink[l.id];
              return (
                <div
                  key={l.id}
                  className={`row${!l.is_active ? " row--inactive" : ""}`}
                  style={{ gridTemplateColumns: TABLE_COLS }}
                  onClick={() => setOpenId(l.id)}
                >
                  <SharingDot signal={signalsByLink[l.id]} />
                  <div>
                    <div className="row__primary">{l.name}</div>
                    {l.note ? <div className="row__muted" style={{ fontSize: 11, marginTop: 2 }}>{l.note}</div> : null}
                  </div>
                  <button
                    className="row__mono icon-btn"
                    onClick={(e) => { e.stopPropagation(); copyUrl(l.token, l.name); }}
                    title="Copy URL"
                    style={{ fontFamily: "ui-monospace, monospace", padding: "3px 8px" }}
                  >
                    /d/{l.token}
                  </button>
                  <div>{stats?.visitors ?? "—"}</div>
                  <div>{l.view_count || 0}</div>
                  <div className="row__muted">{stats ? formatDuration(stats.totalSeconds) : "—"}</div>
                  <div className="row__muted">{formatRelative(l.last_viewed_at)}</div>
                  <label
                    className="switch"
                    style={{ justifySelf: "end" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={l.is_active}
                      onChange={(e) => toggleActive(l, e.target.checked)}
                    />
                    <span className="switch__track">
                      <span className="switch__thumb" />
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </>
      )}

      <LinkDrawer
        linkId={openId}
        onClose={() => setOpenId(null)}
        onAfterChange={refresh}
      />
    </div>
  );
}
