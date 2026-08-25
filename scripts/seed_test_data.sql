DO $$
DECLARE
    v_espaco_id UUID;
    v_visitor1 UUID := gen_random_uuid();
    v_visitor2 UUID := gen_random_uuid();
    v_visitor3 UUID := gen_random_uuid();
    v_visit1 UUID := gen_random_uuid();
BEGIN
    -- 1. Pega o primeiro espaço cultural ativo do banco para associar os dados
    SELECT id INTO v_espaco_id FROM espacos WHERE ativo = true LIMIT 1;
    
    IF v_espaco_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum espaço ativo encontrado para injetar dados.';
    END IF;

    -- 2. CADASTRO DE VISITANTES (Brazucas e Estrangeiros)
    INSERT INTO visitors (id, full_name, cpf, passport, is_foreigner, category)
    VALUES 
    (v_visitor1, '[TESTE] Ana Silva', '999.999.999-01', NULL, false, 'Pesquisador'),
    (v_visitor2, '[TESTE] John Doe (Gringo)', NULL, 'USA-9999', true, 'Turista Estrangeiro'),
    (v_visitor3, '[TESTE] Carlos Sousa', '999.999.999-02', NULL, false, 'general');

    -- 3. AGENDAMENTO
    -- Um agendamento para o futuro para aparecer na aba de agendamentos
    INSERT INTO agendamentos (
        espaco_id, solicitante_nome, solicitante_email, solicitante_telefone, 
        tipo_solicitante, tipo_espaco, espaco_solicitado, data_pretendida, 
        horario_inicio, horario_fim, numero_participantes, descricao_evento, natureza_evento, status
    )
    VALUES (
        v_espaco_id, '[TESTE] Carlos Sousa', 'teste@teste.com', '999999999', 
        'pessoa_fisica', 'auditorio', 'Auditório Principal', current_date + interval '2 days', 
        '14:00', '16:00', 50, 'Estudo Dirigido', 'cultural', 'aprovado'
    );

    -- 4. RELATÓRIOS (Visitas Passadas Concluídas)
    -- Inserindo visitas de dias anteriores para gerar gráficos e relatórios
    INSERT INTO visits (visitor_id, nome, espaco_id, checkin, checkout, status, perfil, local)
    VALUES 
    (v_visitor1, '[TESTE] Ana Silva', v_espaco_id, now() - interval '2 days', now() - interval '2 days' + interval '2 hours', 'Concluído', 'Pesquisador', 'Acervo Histórico'),
    (v_visitor2, '[TESTE] John Doe (Gringo)', v_espaco_id, now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 'Concluído', 'Turista Estrangeiro', 'Exposição de Arte');

    -- 5. CHECK-IN ATIVO COM ARMÁRIO
    -- Carlos está no espaço AGORA
    INSERT INTO visits (id, visitor_id, nome, espaco_id, checkin, status, perfil, local, armario)
    VALUES (v_visit1, v_visitor3, '[TESTE] Carlos Sousa', v_espaco_id, now(), 'Ativo', 'general', 'Telecentro', '99');

    -- 6. LOCKERS (Armários) E TELECENTRO (Computadores)
    -- Simulando a ocupação física no Telecentro e do armário
    INSERT INTO computadores (numero, status, usuario_id, usuario_nome, horario_inicio, horario_limite, espaco_id)
    VALUES (1, 'Em Uso', v_visitor3, '[TESTE] Carlos Sousa', now(), now() + interval '1 hour', v_espaco_id);

    INSERT INTO lockers (number, status, visitor_id, visitor_name, espaco_id)
    VALUES (1, 'Ocupado', v_visitor3, '[TESTE] Carlos Sousa', v_espaco_id);

    -- 7. AUDITORIA
    -- Registra o que aconteceu para o painel de auditoria
    INSERT INTO auditoria (usuario, acao, detalhes, entidade_id)
    VALUES ('Sistema', 'criou_usuario', '[TESTE] Dados simulados foram injetados no sistema para homologação.', v_espaco_id::TEXT);

END $$;
