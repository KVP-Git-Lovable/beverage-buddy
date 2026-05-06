
-- Remove any prior warmup job to keep this idempotent
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'whatsapp-webhook-warmup';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'whatsapp-webhook-warmup',
  '*/2 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://aoxdosjkwqyuvccuwhzc.supabase.co/functions/v1/webhook-whatsapp?ping=1',
    headers := '{"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveGRvc2prd3F5dXZjY3V3aHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODUyOTYsImV4cCI6MjA4MjU2MTI5Nn0.KcKh1kvHtMJ0dUfgZeSwUK64vUDJZzgoXUSOzEVF5R0"}'::jsonb
  );
  $$
);
