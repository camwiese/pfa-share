"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatRelative } from "../../lib/format";

export default function ApprovalsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  function refresh() {
    setLoading(true);
    fetch("/api/admin/approvals")
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function act(id, action) {
    setBusy((b) => ({ ...b, [id]: action }));
    try {
      const res = await fetch(`/api/admin/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(action === "approve" ? "Approved" : "Denied");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Network error");
    } finally {
      setBusy((b) => { const c = { ...b }; delete c[id]; return c; });
    }
  }

  if (loading) return <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>;
  if (requests.length === 0) return <div style={{ color: "#7b8e80", fontSize: 13 }}>No pending requests.</div>;

  return (
    <div style={{ display: "grid", gap: 6, fontFamily: "Inter, system-ui, sans-serif" }}>
      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 200px",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            border: "1px solid #eee9dc",
            background: "#fff",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 500 }}>{r.email}</span>
          <span style={{ color: "#7b8e80" }}>{formatRelative(r.requested_at)}</span>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => act(r.id, "approve")}
              disabled={!!busy[r.id]}
              style={btnPrimary(busy[r.id] === "approve")}
            >
              {busy[r.id] === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => act(r.id, "deny")}
              disabled={!!busy[r.id]}
              style={btnSecondary(busy[r.id] === "deny")}
            >
              {busy[r.id] === "deny" ? "Denying…" : "Deny"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const btnPrimary = (busy) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 12px",
  border: 0,
  background: "#3a473f",
  color: "#fcfbf8",
  borderRadius: 6,
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.7 : 1,
});
const btnSecondary = (busy) => ({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 12px",
  border: "1px solid #dedad0",
  background: "#fff",
  color: "#33403a",
  borderRadius: 6,
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.7 : 1,
});
