-- Adds the "heating up" notification controls to the settings row.
-- One email fires per link when cumulative engagement crosses either
-- threshold (default: 300s of view-time, OR 5 distinct sessions). Dedup
-- is per link forever, via the events log (kind='notify_sent',
-- payload.triggerKey = 'heating-up:<link_id>').
--
-- Safe to re-run: IF NOT EXISTS guards every column.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS email_on_heating_up BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS heating_up_time_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS heating_up_session_count INTEGER NOT NULL DEFAULT 5;
