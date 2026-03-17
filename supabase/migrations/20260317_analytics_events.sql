/*
  # Analytics events table for conversion funnel tracking

  Tracks user journey: page_view → search → signup_wall → signup → paywall → checkout → purchase
  All events are first-party, no cookies required, GDPR-friendly.
*/

CREATE TABLE IF NOT EXISTS analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  properties jsonb DEFAULT '{}',
  session_id text,
  referrer text,
  pathname text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) and anon can insert; no one reads from client
CREATE POLICY "Allow anon and authenticated inserts on analytics_events"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access on analytics_events"
  ON analytics_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for querying by event type and date range
CREATE INDEX idx_analytics_events_event_created ON analytics_events (event, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events (session_id, created_at);
