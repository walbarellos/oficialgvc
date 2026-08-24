-- ============================================
-- CORREÇÃO RLS - Tabela auditoria
-- Apenas visualização pela UI, inserção blindada via Edge Function (Service Role)
-- ============================================

-- Remover qualquer política de INSERT pré-existente (evita client-side spoofing)
DROP POLICY IF EXISTS "All authenticated users can insert auditoria" ON auditoria;
DROP POLICY IF EXISTS "Admin can manage auditoria" ON auditoria;

-- Apenas Administradores e Coordenadores podem LER o log de auditoria
CREATE POLICY "Staff can view auditoria" ON auditoria
  FOR SELECT
  TO authenticated
  USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador')
  );

-- O INSERT ocorre EXCLUSIVAMENTE via Edge Function usando o service_role.
-- Não declarar política de INSERT garante o default deny para a role 'authenticated'.
