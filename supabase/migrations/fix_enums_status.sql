-- Fix visits status
UPDATE visits SET status = 'Ativo' WHERE status = 'active';
UPDATE visits SET status = 'Concluído' WHERE status = 'completed';
UPDATE visits SET status = 'Cancelado' WHERE status = 'cancelled';

ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE visits ADD CONSTRAINT visits_status_check CHECK (status IN ('Ativo', 'Concluído', 'Cancelado'));

-- Fix lockers status
UPDATE lockers SET status = 'Livre' WHERE status = 'free';
UPDATE lockers SET status = 'Ocupado' WHERE status = 'occupied';
UPDATE lockers SET status = 'Manutenção' WHERE status = 'maintenance';

ALTER TABLE lockers DROP CONSTRAINT IF EXISTS lockers_status_check;
ALTER TABLE lockers ADD CONSTRAINT lockers_status_check CHECK (status IN ('Livre', 'Ocupado', 'Manutenção'));

-- Fix computadores status
UPDATE computadores SET status = 'Livre' WHERE status = 'free';
UPDATE computadores SET status = 'Em Uso' WHERE status IN ('Em uso', 'EmUso', 'in_use', 'occupied');

ALTER TABLE computadores DROP CONSTRAINT IF EXISTS computadores_status_check;
ALTER TABLE computadores ADD CONSTRAINT computadores_status_check CHECK (status IN ('Livre', 'Em Uso', 'Excedido', 'Manutenção'));

