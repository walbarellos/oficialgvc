-- ============================================
-- CORREÇÃO RLS - Tabela visitors (multi-espaço)
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Auth read visitors by space" ON visitors;
DROP POLICY IF EXISTS "Admin full access" ON visitors;
DROP POLICY IF EXISTS "All users can read visitors" ON visitors;
DROP POLICY IF EXISTS "Admin can insert visitors" ON visitors;
DROP POLICY IF EXISTS "Admin can update visitors" ON visitors;
DROP POLICY IF EXISTS "Admin can delete visitors" ON visitors;

-- 2. SELECT - TODOS os usuários autenticados podem ler
CREATE POLICY "All users can read visitors" ON visitors
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. INSERT - Administradores E Coordenadores/Funcionarios/Monitores
CREATE POLICY "Staff can insert visitors" ON visitors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
  );

-- 4. UPDATE - Administradores E Coordenadores/Funcionarios/Monitores
CREATE POLICY "Staff can update visitors" ON visitors
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
  );

-- 5. DELETE - APENAS Administradores
CREATE POLICY "Admin can delete visitors" ON visitors
  FOR DELETE
  TO authenticated
  USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
  );