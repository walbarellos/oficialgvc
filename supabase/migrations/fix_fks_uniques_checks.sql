-- PATCH Fase 2 — FKs, UNIQUE, CHECKs (oficialgvc canônico)
-- Problemas: oficialgvc 33, 37, 41, 42, 44
-- Executar em staging após backup. Ajustar nomes se o schema real divergir.
--
-- OBSERVAÇÃO IMPORTANTE:
-- As CHECK constraints de status foram COMENTADAS abaixo: a aplicação ainda
-- grava status capitalizados ('Ativo', 'Excedido', 'Concluído'). Aplicar esses
-- CHECKs exige alinhar primeiro o vocabulário no código (plano de unificação).
-- Os UNIQUE/FKs/trigger são seguros e podem ser aplicados.

BEGIN;

-- ====================================================================
-- 1. LOCKERS: UNIQUE por espaço + número; FK visitor
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lockers_espaco_numero_key'
  ) THEN
    ALTER TABLE lockers
      ADD CONSTRAINT lockers_espaco_numero_key UNIQUE (espaco_id, numero);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lockers_espaco_status ON lockers (espaco_id, status);

-- ====================================================================
-- 2. COMPUTADORES: UNIQUE por espaço + identificação
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'computadores_espaco_nome_key'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'computadores' AND column_name = 'nome'
    ) THEN
      ALTER TABLE computadores
        ADD CONSTRAINT computadores_espaco_nome_key UNIQUE (espaco_id, nome);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_computadores_espaco_status ON computadores (espaco_id, status);

-- ====================================================================
-- 3. AGENDAMENTOS_RASCUNHO: session_id UNIQUE (corrige ON CONFLICT quebrado)
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_rascunho_session_id_key'
  ) THEN
    ALTER TABLE agendamentos_rascunho
      ADD CONSTRAINT agendamentos_rascunho_session_id_key UNIQUE (session_id);
  END IF;
END $$;

-- ====================================================================
-- 4. VISITS: FKs e índice de check-in ativo
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_visitor_id_fkey'
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_visitor_id_fkey
      FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_espaco_id_fkey'
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_espaco_id_fkey
      FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Um visitante não deve ter dois check-ins ativos
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_one_active_per_visitor
  ON visits (visitor_id)
  WHERE status IN ('ativo', 'Ativo', 'active');

CREATE INDEX IF NOT EXISTS idx_visits_espaco_status ON visits (espaco_id, status);

-- ====================================================================
-- 5. Status / enums — CHECK constraints
--    COMENTADO: exige alinhar o vocabulário no código primeiro
--    (aplicação grava 'Ativo', 'Excedido', 'Concluído').
-- ====================================================================
-- visits.status
-- DO $$
-- BEGIN
--   ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
--   ALTER TABLE visits
--     ADD CONSTRAINT visits_status_check
--     CHECK (status IN ('ativo', 'finalizado', 'cancelado', 'excedido'));
-- EXCEPTION WHEN others THEN
--   RAISE NOTICE 'visits_status_check: %', SQLERRM;
-- END $$;

-- agendamentos.status
-- DO $$
-- BEGIN
--   ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
--   ALTER TABLE agendamentos
--     ADD CONSTRAINT agendamentos_status_check
--     CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'confirmado', 'concluido'));
-- EXCEPTION WHEN others THEN
--   RAISE NOTICE 'agendamentos_status_check: %', SQLERRM;
-- END $$;

-- lockers.status
-- DO $$
-- BEGIN
--   ALTER TABLE lockers DROP CONSTRAINT IF EXISTS lockers_status_check;
--   ALTER TABLE lockers
--     ADD CONSTRAINT lockers_status_check
--     CHECK (status IN ('livre', 'ocupado', 'manutencao'));
-- EXCEPTION WHEN others THEN
--   RAISE NOTICE 'lockers_status_check: %', SQLERRM;
-- END $$;

-- ====================================================================
-- 6. Typo responsabilidade (se a coluna ainda existir com typo)
--    COMENTADO: o código (e o frontend) ainda usam responsabhilidade_evento.
--    Renomear junto com o alinhamento do código.
-- ====================================================================
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'agendamentos' AND column_name = 'responsabhilidade_evento'
--   ) AND NOT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'agendamentos' AND column_name = 'responsabilidade_evento'
--   ) THEN
--     ALTER TABLE agendamentos RENAME COLUMN responsabhilidade_evento TO responsabilidade_evento;
--   END IF;
-- END $$;

-- ====================================================================
-- 7. prevent_double_checkin: NÃO usar HARD DELETE
-- ====================================================================
CREATE OR REPLACE FUNCTION prevent_double_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM visits
    WHERE visitor_id = NEW.visitor_id
      AND status IN ('ativo', 'Ativo', 'active')
      AND id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Visitante já possui check-in ativo'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_double_checkin ON visits;
CREATE TRIGGER trg_prevent_double_checkin
  BEFORE INSERT OR UPDATE OF status, visitor_id ON visits
  FOR EACH ROW
  WHEN (NEW.status IN ('ativo', 'Ativo', 'active'))
  EXECUTE FUNCTION prevent_double_checkin();

COMMIT;