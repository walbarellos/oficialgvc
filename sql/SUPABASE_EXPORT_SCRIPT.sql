-- ====================================================================
-- SCRIPT COMPLETO PARA EXPORTAR ESTRUTURA E DADOS DO SUPABASE GVC
-- Execute este script no SQL Editor do Supabase Dashboard
-- ====================================================================

-- ====================================================================
-- 1. EXPORTAR ESTRUTURA DAS TABELAS
-- ====================================================================

-- Tabelas existentes:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Colunas de cada tabela:
SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ====================================================================
-- 2. POLÍTICAS RLS
-- ====================================================================
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ====================================================================
-- 3. ÍNDICES
-- ====================================================================
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ====================================================================
-- 4. FUNÇÕES
-- ====================================================================
SELECT proname, prosrc 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname NOT LIKE 'pg_%'
ORDER BY proname;