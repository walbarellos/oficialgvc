BEGIN;
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
      END IF;
  END
  $$;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE computadores;
ALTER PUBLICATION supabase_realtime ADD TABLE lockers;
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE espacos;
