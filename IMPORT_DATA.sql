-- ====================================================================
-- SCRIPT DE IMPORTAÇÃO DE DADOS - GVC
-- ====================================================================
-- Execute no banco de dados destino (Supabase novo ou local)
-- ====================================================================

-- ====================================================================
-- AUDITORIA
-- ====================================================================
INSERT INTO auditoria (id, usuario, perfil, acao, detalhes, entidade_id, created_at) VALUES
('9b034ac5-60b3-454c-95f1-2b8c2b4a2757', 'admin@exemplo.com', 'administrador', 'criou_espaco', 'Criou novo espaço cultural BPE ADONAY BARBOSA', '315c0b2f-8e6b-4148-b21c-2123cbdec803', '2026-05-02 06:06:39.973063+00'),
('da86c864-ecf0-4140-bccc-e30b1acdc0ad', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: mon***', '00000000-0000-0000-0000-000000000001', '2026-05-02 14:52:20.755609+00'),
('cb1aee31-e621-42f0-91af-5a0c15104fb8', 'admin@exemplo.com', 'administrador', 'criou_espaco', 'Criou novo espaço cultural BPE DA FLORESTA', '69624d99-e661-4906-848e-18c0f28b8bf9', '2026-05-02 15:13:20.683509+00'),
('cc04957d-c127-42ad-87b5-df88f06e4448', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: bru***', '670d1f2e-0542-4b7e-9bc5-28153ceb012a', '2026-05-02 15:57:24.048795+00'),
('cf25427d-739d-4562-a3bc-dc6841010a18', 'admin@exemplo.com', 'administrador', 'criou_usuario', 'Criou usuário Bruno (funcionario) de forma segura', '670d1f2e-0542-4b7e-9bc5-28153ceb012a', '2026-05-02 15:57:24.267727+00'),
('022d26ab-f711-4a02-bb7b-0ab4f96cf176', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: fer***', '48b686aa-ae52-4cca-87f2-ffe6c59d6def', '2026-05-03 04:00:00.022141+00'),
('08bdf421-8ed3-4943-9721-23e293a91623', 'sistema', 'sistema', 'excluiu_usuario', 'Conta removida, ID original: 00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-04 16:10:17.490906+00'),
('3041629b-a01e-4402-8423-0e240c53fd7b', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: tes***', '1e0afd1e-2654-41f7-a1f9-564a65d23dc5', '2026-05-04 17:23:15.102556+00'),
('c6002301-baf5-436d-aa4a-e43e54971669', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: edu***', 'fc485ce2-e04e-4982-bcd9-9f0be4e17143', '2026-05-05 19:40:39.422844+00'),
('73e387fa-ffe0-4474-a170-cc63b2263c65', 'sistema', 'sistema', 'criou_usuario', 'Conta DB criada para e-mail: sam***', '888da117-9462-4d8e-91d0-862679d6bdaa', '2026-05-05 20:08:58.313818+00');

-- ====================================================================
-- AGENDAMENTOS
-- ====================================================================
INSERT INTO agendamentos (id, espaco_id, solicitante_nome, solicitante_email, status, data_pretendida, created_at) VALUES
('4f099b0d-7460-4a48-8a5d-c54f8e708a14', '1dfc77aa-8ad0-4307-a14c-e6428430d36d', 'teste', 'teste@exemplo.com', 'aprovado', '2026-05-08', '2026-05-04 20:00:02.490633+00'),
('ad49c4b0-2ef7-46cf-8647-82209ecee979', '1dfc77aa-8ad0-4307-a14c-e6428430d36d', 'teste', 'teste@exemplo.com', 'rejeitado', '2026-05-08', '2026-05-04 20:05:41.388563+00'),
('a96180de-97b5-4c70-ac4f-d9bcfc9cd13c', '1dfc77aa-8ad0-4307-a14c-e6428430d36d', 'teste', 'teste@exemplo.com', 'aprovado', '2026-05-07', '2026-05-04 20:15:03.892221+00'),
('0b5698d3-2b8b-4b08-a336-aecff8e1d8ef', '1dfc77aa-8ad0-4307-a14c-e6428430d36d', 'teste', 'teste@exemplo.com', 'pendente', '2026-05-08', '2026-05-06 21:51:30.993284+00');

-- ====================================================================
-- INSTRUÇÕES
-- ====================================================================
-- 1. Execute este script no banco destino
-- 2. Os IDs são mantidos para preservar relações
-- 3. Para usuários, você pode precisar configurar auth_uid manualmente
--    (depende se o Supabase novo tem os mesmos usuários de auth)
-- ====================================================================