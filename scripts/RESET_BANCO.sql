-- ============================================================
-- GVC - SCRIPT DE RESET DO BANCO DE DADOS
-- ============================================================
-- Execute no SQL Editor do Supabase antes de entregar o
-- sistema ao órgão. Remove todos os dados de teste,
-- mantendo: espaços culturais, usuários do sistema e
-- configurações dos espaços.
--
-- ⚠️ ATENÇÃO: Operação IRREVERSÍVEL.
-- Faça um backup no painel do Supabase antes de executar.
-- (Settings → Database → Backups)
-- ============================================================

BEGIN;

-- 1. Libera todos os computadores do Telecentro
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

SELECT 'Banco zerado! Sistema pronto para entrega ao órgão.' AS status;
