-- Restrict Realtime channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive only public broadcasts/presence and topics relevant to them
DROP POLICY IF EXISTS "auth users read realtime" ON realtime.messages;
CREATE POLICY "auth users read realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- realtime-notif is the global incidents channel; safe (incidents are readable to all auth users via RLS)
  (realtime.topic() = 'realtime-notif')
);

DROP POLICY IF EXISTS "auth users write realtime" ON realtime.messages;
CREATE POLICY "auth users write realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = 'realtime-notif')
);