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

  if (loading) return <div className="empty-state">Loading…</div>;
  if (requests.length === 0) return <div className="empty-state">No pending requests.</div>;

  return (
    <div className="row-list">
      {requests.map((r) => (
        <div
          key={r.id}
          className="row row--static"
          style={{ gridTemplateColumns: "1.6fr 1fr 200px" }}
        >
          <span className="row__primary">{r.email}</span>
          <span className="row__muted">{formatRelative(r.requested_at)}</span>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => act(r.id, "approve")}
              disabled={!!busy[r.id]}
              className="btn btn--primary btn--small"
            >
              {busy[r.id] === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => act(r.id, "deny")}
              disabled={!!busy[r.id]}
              className="btn btn--ghost btn--small"
            >
              {busy[r.id] === "deny" ? "Denying…" : "Deny"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
