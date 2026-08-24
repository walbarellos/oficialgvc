CREATE OR REPLACE FUNCTION prevent_double_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM visits 
        WHERE visitor_id = NEW.visitor_id 
        AND espaco_id = NEW.espaco_id
        AND status = 'Ativo'
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Visitante já possui um check-in ativo neste espaço.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
