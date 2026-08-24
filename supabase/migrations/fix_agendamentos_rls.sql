-- =====================================================
-- CORREÇÃO: Política RLS de Agendamentos
-- Executar no Supabase SQL Editor
-- =====================================================

-- Verificar estrutura atual (executar primeiro)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'usuarios' 
-- AND column_name IN ('auth_uid', 'espaco_id', 'perfil');

-- =====================================================
--DROP e CREATE da política de SELECT
-- =====================================================
DROP POLICY IF EXISTS "agendamentos_view_own" ON agendamentos;

CREATE POLICY "agendamentos_view_own" ON agendamentos 
  FOR SELECT
  USING (
    -- Regra 1: Cidadão vê apenas seus próprios agendamentos
    auth_uid = auth.uid()
    
    -- Regra 2: Funcionários/Coordenadores veem agendamentos do seu espaço
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND espaco_id = agendamentos.espaco_id
      AND perfil IN ('coordenador', 'funcionario', 'monitor')
    )
    
    -- Regra 3: Administradores veem todos os agendamentos
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND perfil = 'administrador'
    )
  );

-- =====================================================
-- DROP e CREATE da política de INSERT
-- =====================================================
DROP POLICY IF EXISTS "agendamentos_insert_own" ON agendamentos;

CREATE POLICY "agendamentos_insert_own" ON agendamentos 
  FOR INSERT
  WITH CHECK (
    -- Cidadão pode criar seu próprio agendamento
    auth_uid = auth.uid()
    -- Ou admin/coordenador
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND (
        (espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario'))
        OR perfil = 'administrador'
      )
    )
  );

-- =====================================================
-- DROP e CREATE da política de UPDATE
-- =====================================================
DROP POLICY IF EXISTS "agendamentos_update_coordenador" ON agendamentos;

CREATE POLICY "agendamentos_update_coordenador" ON agendamentos 
  FOR UPDATE
  USING (
    -- Coordenadores/Admin do mesmo espaço podem atualizar
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND (
        (espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario'))
        OR perfil = 'administrador'
      )
    )
  )
  WITH CHECK (
    -- Mesmo verificação para UPDATE
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND (
        (espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario'))
        OR perfil = 'administrador'
      )
    )
  );

-- Verificar resultado
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'agendamentos';