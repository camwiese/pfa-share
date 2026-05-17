-- ============================================================================
-- PFA deck gating + analytics — initial schema
-- Run this once against a fresh Supabase project.
-- ============================================================================

-- AUTH GATING TABLES (mirror WSV so auth code transplants cleanly)
CREATE TABLE allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('admin_added', 'request_approved', 'auto_approved')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by TEXT,
  invited_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  response_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'rate_limited', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partner_admins (
  email TEXT PRIMARY KEY,
  name TEXT,
  notify_on_own_invites BOOLEAN NOT NULL DEFAULT true,
  can_edit_content BOOLEAN NOT NULL DEFAULT false,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DECK-SPECIFIC TABLES
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);
CREATE INDEX idx_links_token ON links(token);
CREATE INDEX idx_links_last_viewed_at ON links(last_viewed_at DESC NULLS LAST);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  viewer_email TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tick_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  slide_dwells JSONB NOT NULL DEFAULT '{}',
  max_slide_reached SMALLINT NOT NULL DEFAULT 0,
  device JSONB NOT NULL DEFAULT '{}',
  geo JSONB NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  fp_hash TEXT,
  summary_sent_at TIMESTAMPTZ,
  is_bot BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_sessions_link_id ON sessions(link_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_last_tick_at ON sessions(last_tick_at DESC);
CREATE INDEX idx_sessions_fp_hash ON sessions(fp_hash);
CREATE INDEX idx_sessions_viewer_email ON sessions(viewer_email);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_access BOOLEAN NOT NULL DEFAULT true,
  email_on_request BOOLEAN NOT NULL DEFAULT true,
  email_on_new_email BOOLEAN NOT NULL DEFAULT true,
  email_on_link_open BOOLEAN NOT NULL DEFAULT true,
  email_on_link_open_every BOOLEAN NOT NULL DEFAULT true,
  email_on_session_end BOOLEAN NOT NULL DEFAULT true,
  free_slide_count SMALLINT NOT NULL DEFAULT 5,
  notification_min_gap_seconds INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS: deny anon + authenticated; service-role bypasses RLS.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'allowed_emails','access_requests','otp_attempts','partner_admins',
    'links','sessions','events','settings'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Deny anon" ON %I FOR ALL TO anon USING (false) WITH CHECK (false)', t);
    EXECUTE format('CREATE POLICY "Deny authenticated" ON %I FOR ALL TO authenticated USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;

-- Seed admin allowlist (so the GP can log in without a manual step):
INSERT INTO allowed_emails (email, source)
VALUES ('camwiese@gmail.com', 'admin_added')
ON CONFLICT (email) DO NOTHING;
