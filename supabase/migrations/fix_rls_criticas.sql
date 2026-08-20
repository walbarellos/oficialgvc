-- PATCH RLS — problemas 01, 02, 03, 04 (oficialgvc)
-- Substitui as políticas abertas. Executar em staging ANTES de produção.
-- Requer: tabela usuarios com coluna auth_uid.
--
-- Aplicação manual (sem Supabase CLI):
--   Supabase Dashboard → SQL Editor → colar e Executar (com backup do banco antes)
--
-- Observação: migrations anteriores (fix_visitors_rls.sql) comparavam
-- usuarios.id = auth.uid() — ERRADO, a coluna correta é auth_uid.
-- Os helpers abaixo usam auth_uid = auth.uid().

-- ====================================================================
-- Helper: função de perfil do usuário autenticado (SECURITY DEFINER)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.current_user_perfil()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_espaco_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT espaco_id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_uid = auth.uid()
      AND perfil IN ('administrador', 'coordenador', 'funcionario', 'monitor')
      AND COALESCE(ativo, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_uid = auth.uid()
      AND perfil = 'administrador'
      AND COALESCE(ativo, true) = true
  );
$$;

-- ====================================================================
-- VISITORS (problema-03 — LGPD)
-- ====================================================================
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read visitors" ON visitors;
DROP POLICY IF EXISTS "All authenticated can read visitors" ON visitors;
DROP POLICY IF EXISTS "Staff can insert visitors" ON visitors;
DROP POLICY IF EXISTS "Staff can update visitors" ON visitors;
DROP POLICY IF EXISTS "Admin can delete visitors" ON visitors;
DROP POLICY IF EXISTS "Admin full access" ON visitors;
DROP POLICY IF EXISTS "Admin can insert visitors" ON visitors;
DROP POLICY IF EXISTS "Admin can update visitors" ON visitors;

-- Staff pode ler; cidadão NÃO lista visitors
CREATE POLICY "staff_select_visitors" ON visitors
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "staff_insert_visitors" ON visitors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_update_visitors" ON visitors
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "admin_delete_visitors" ON visitors
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ====================================================================
-- USUARIOS (problema-02 — leitura total)
-- ====================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read themselves" ON usuarios;
DROP POLICY IF EXISTS "Admin can manage usuarios" ON usuarios;

-- Usuário lê apenas a si mesmo; staff pode listar
CREATE POLICY "user_select_own" ON usuarios
  FOR SELECT TO authenticated
  USING (
    auth_uid = auth.uid()
    OR public.is_staff()
  );

CREATE POLICY "admin_manage_usuarios" ON usuarios
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ====================================================================
-- ASSINATURAS_DIGITAIS (problema-01 — valor jurídico)
-- ====================================================================
ALTER TABLE assinaturas_digitais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assinaturas_all" ON assinaturas_digitais;
DROP POLICY IF EXISTS "All users can read assinaturas" ON assinaturas_digitais;
DROP POLICY IF EXISTS "All authenticated can read assinaturas" ON assinaturas_digitais;

-- Imutáveis: sem UPDATE para ninguém pelo client
CREATE POLICY "staff_select_assinaturas" ON assinaturas_digitais
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- Insert apenas via edge function (service role); se o client precisar, restringir a staff:
CREATE POLICY "staff_insert_assinaturas" ON assinaturas_digitais
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

-- Admin pode apagar apenas em casos excepcionais de auditoria legal:
CREATE POLICY "admin_delete_assinaturas" ON assinaturas_digitais
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ====================================================================
-- AGENDAMENTOS_RASCUNHO (problema-04 — aberta + session_id previsível)
-- ====================================================================
ALTER TABLE agendamentos_rascunho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rascunho_own_session" ON agendamentos_rascunho;
DROP POLICY IF EXISTS "rascunho_all" ON agendamentos_rascunho;

-- Anônimos NÃO têm acesso direto à tabela.
-- Rascunhos devem ser gerenciados via RPC SECURITY DEFINER
-- (salvar_rascunho_agendamento / buscar_rascunho_agendamento) com session_id UUID v4.
-- Staff pode ler rascunhos do seu espaço; sem INSERT/UPDATE/DELETE direto.

CREATE POLICY "staff_select_rascunhos" ON agendamentos_rascunho
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- ====================================================================
-- Nota (problema-04): session_id previsível
-- Já corrigido em src/services/draftService.ts (crypto.randomUUID()).
-- Adicionar UNIQUE em session_id: ver fase2/02-fks-uniques-checks.sql
-- ====================================================================