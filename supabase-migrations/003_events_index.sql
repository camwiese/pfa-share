-- Indexes on the events table to keep the notification-dedup + idle-close
-- + heating-up queries on log(n) as the table grows.
--
-- Hot query shapes that benefit:
--   1. lib/notifications.shouldSend(): WHERE kind='notify_sent' AND created_at >= ?
--      AND payload->>triggerKey = ?
--   2. lib/closeIdle (via the cron + lazy sweep): never touches events directly,
--      but every closed session inserts (session_id, kind='session_end').
--   3. maybeNotifyHeatingUp(): WHERE kind='notify_sent'
--      AND payload->>triggerKey = 'heating-up:<linkId>'
--
-- The composite (kind, created_at DESC) covers (1) and most dedup lookups.
-- The expression index on payload->>triggerKey closes the loop on (3) —
-- without it, the planner falls back to a seq scan after filtering by kind.
--
-- Idempotent: IF NOT EXISTS guards every index.

CREATE INDEX IF NOT EXISTS idx_events_kind_created_at
  ON events (kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_trigger_key
  ON events ((payload->>'triggerKey'))
  WHERE kind = 'notify_sent';

-- Sessions are joined by link_id for the per-link aggregates in
-- LinksTable and SessionDrawer. Existing schema doesn't have an
-- index on this — add it now while we're touching migrations.
CREATE INDEX IF NOT EXISTS idx_sessions_link_id
  ON sessions (link_id)
  WHERE link_id IS NOT NULL;
