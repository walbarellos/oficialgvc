-- ============================================================
-- GVC - SCRIPT DE RESET DO BANCO DE DADOS
-- ============================================================
-- Execute no SQL Editor do Supabase
--
-- OPÇÃO A: Limpar apenas dados de TESTE (prefixo [TESTE] e dados avulsos de homologação)
-- OPÇÃO B: ZERAR TUDO (todos os dados operacionais para entrega ao órgão)
--
-- ⚠️ ATENÇÃO: Estas operações são IRREVERSÍVEIS.
-- Faça um backup pelo painel do Supabase antes de executar.
-- ============================================================


-- ============================================================
-- OPÇÃO A — LIMPAR DADOS DE TESTE/HOMOLOGAÇÃO
-- Remove apenas registros inseridos durante os testes sem
-- apagar espaços culturais, usuários do sistema ou configurações.
-- ============================================================

DO $$
DECLARE
    v_ids UUID[];
BEGIN
    -- 1. Coleta IDs dos visitantes de teste (prefixo [TESTE] e dados avulsos)
    SELECT ARRAY_AGG(id) INTO v_ids
    FROM visitors
    WHERE full_name LIKE '[TESTE]%'
       OR full_name ILIKE 'sdasd%'
       OR cpf = '99481308200'
       OR cpf IN ('99999999901', '99999999902');

    IF v_ids IS NOT NULL THEN
        -- Telecentro: libera computadores usados pelos visitantes de teste
        UPDATE computadores SET status = 'Disponível', usuario_id = NULL, usuario_nome = NULL,
            horario_inicio = NULL, horario_limite = NULL
        WHERE usuario_id = ANY(v_ids);

        -- Armários: libera armários dos visitantes de teste
        UPDATE lockers SET status = 'Disponível', visitor_id = NULL, visitor_name = NULL
        WHERE visitor_id = ANY(v_ids);

        -- Visitas: remove histórico de entradas
        DELETE FROM visits WHERE visitor_id = ANY(v_ids);

        -- Remove os visitantes
        DELETE FROM visitors WHERE id = ANY(v_ids);
    END IF;

    -- 2. Agendamentos de teste
    DELETE FROM agendamentos
    WHERE solicitante_nome LIKE '[TESTE]%'
       OR solicitante_email = 'teste@teste.com';

    -- 3. Auditoria gerada durante os testes
    DELETE FROM auditoria
    WHERE detalhes LIKE '[TESTE]%'
       OR detalhes ILIKE '%simulados%';

    RAISE NOTICE 'Dados de teste removidos com sucesso!';
END $$;


-- ============================================================
-- OPÇÃO B — ZERAR TUDO (ENTREGA AO ÓRGÃO)
-- Remove TODOS os dados operacionais, mantendo apenas:
--   - Espaços Culturais (estrutura)
--   - Usuários do sistema (recepcionistas, coordenadores, admins)
--   - Configurações dos espaços
--
-- ⚠️ DESCOMENTE as linhas abaixo para executar esta opção.
-- ============================================================

/*
BEGIN;

-- 1. Zera uso de computadores no Telecentro
UPDATE computadores
SET status = 'Disponível',
    usuario_id = NULL,
    usuario_nome = NULL,
    horario_inicio = NULL,
    horario_limite = NULL;

-- 2. Libera todos os armários
UPDATE lockers
SET status = 'Disponível',
    visitor_id = NULL,
    visitor_name = NULL;

-- 3. Apaga todo o histórico de visitas
DELETE FROM visits;

-- 4. Apaga todos os visitantes cadastrados
DELETE FROM visitors;

-- 5. Apaga todos os agendamentos
DELETE FROM agendamentos;

-- 6. Apaga todo o log de auditoria
DELETE FROM auditoria;

COMMIT;

SELECT 'Banco zerado com sucesso! Pronto para entrega.' AS resultado;
*/
