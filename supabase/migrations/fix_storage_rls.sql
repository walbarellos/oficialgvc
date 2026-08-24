-- ============================================
-- CORREÇÃO RLS - Storage
-- Tornar o bucket 'documentos-agendamentos' privado e proteger arquivos
-- ============================================

-- Atualiza o bucket para não ser público
UPDATE storage.buckets
SET public = false
WHERE id = 'documentos-agendamentos';

-- Política para permitir que usuários autenticados (staff) leiam os arquivos
CREATE POLICY "Staff can view documentos-agendamentos" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'documentos-agendamentos' AND 
  (SELECT perfil FROM public.usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario')
);

-- Política para permitir que o sistema (via service_role ou usuário final no momento do agendamento) faça upload
-- Como o agendamento é público, precisamos permitir inserção anônima OU via Edge Function.
-- O upload ocorre no cliente antes de submeter o formulário? 
-- Se ocorre no cliente (LoginPublico.tsx), precisamos permitir INSERT anônimo.
CREATE POLICY "Anyone can upload documentos-agendamentos" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'documentos-agendamentos'
);
