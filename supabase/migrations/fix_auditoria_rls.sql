-- ============================================
-- CORREÇÃO RLS - Tabela auditoria
-- Permitir que a aplicação registre logs para todos os usuários
-- ============================================

-- Remover política limitante anterior
DROP POLICY IF EXISTS "Admin can manage auditoria" ON auditoria;

-- Apenas Administradores e Coordenadores podem LER o log de auditoria
CREATE POLICY "Staff can view auditoria" ON auditoria
  FOR SELECT
  TO authenticated
  USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador')
  );

-- TODOS os usuários autenticados podem INSERIR logs (necessário para registrar ações de funcionários/monitores)
CREATE POLICY "All authenticated users can insert auditoria" ON auditoria
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NINGUÉM pode alterar ou deletar logs (imutabilidade de auditoria)
-- (ausência de políticas UPDATE/DELETE já garante isso, mas para documentar explicitamente:)
-- DROP POLICY IF EXISTS "No updates on auditoria" ON auditoria;
-- DROP POLICY IF EXISTS "No deletes on auditoria" ON auditoria;
