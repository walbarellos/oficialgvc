-- Run this in Supabase SQL Editor to restore the broken FKs
ALTER TABLE visits ADD CONSTRAINT fk_visits_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE;
ALTER TABLE computadores ADD CONSTRAINT fk_computadores_visitante FOREIGN KEY (usuario_id) REFERENCES visitors(id) ON DELETE SET NULL;
ALTER TABLE lockers ADD CONSTRAINT fk_lockers_visitante FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;
-- Inform PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
