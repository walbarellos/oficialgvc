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
    INSERT INTO visitors (id, full_name, cpf, passport, is_foreigner, tipo_solicitante)
    VALUES 
    (v_visitor1, '[TESTE] Ana Silva', '999.999.999-01', NULL, false, 'Pesquisador'),
    (v_visitor2, '[TESTE] John Doe (Gringo)', NULL, 'USA-9999', true, 'Turista Estrangeiro'),
    (v_visitor3, '[TESTE] Carlos Sousa', '999.999.999-02', NULL, false, 'Público Geral');

    -- 3. AGENDAMENTO
    -- Um agendamento para o futuro para aparecer na aba de agendamentos
    INSERT INTO agendamentos (visitante_id, espaco_id, data_agendamento, hora_inicio, hora_fim, status, finalidade)
    VALUES (v_visitor3, v_espaco_id, current_date + interval '2 days', '14:00', '16:00', 'confirmado', 'Estudo Dirigido');

    -- 4. RELATÓRIOS (Visitas Passadas Concluídas)
    -- Inserindo visitas de dias anteriores para gerar gráficos e relatórios
    INSERT INTO visits (visitor_id, nome, espaco_id, checkin, checkout, status, perfil, local)
    VALUES 
    (v_visitor1, '[TESTE] Ana Silva', v_espaco_id, now() - interval '2 days', now() - interval '2 days' + interval '2 hours', 'Concluído', 'Pesquisador', 'Acervo Histórico'),
    (v_visitor2, '[TESTE] John Doe (Gringo)', v_espaco_id, now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 'Concluído', 'Turista Estrangeiro', 'Exposição de Arte');

    -- 5. CHECK-IN ATIVO COM ARMÁRIO
    -- Carlos está no espaço AGORA
    INSERT INTO visits (id, visitor_id, nome, espaco_id, checkin, status, perfil, local, armario)
    VALUES (v_visit1, v_visitor3, '[TESTE] Carlos Sousa', v_espaco_id, now(), 'Ativo', 'Público Geral', 'Telecentro', '99');

    -- 6. LOCKERS (Armários) E TELECENTRO (Computadores)
    -- Simulando a ocupação física no Telecentro e do armário
    INSERT INTO computadores (numero, status, usuario_id, inicio_uso, espaco_id)
    VALUES ('PC-TESTE-99', 'ocupado', v_visitor3, now(), v_espaco_id);

    INSERT INTO lockers (numero, status, visitor_id, espaco_id, occupied_at)
    VALUES ('99', 'ocupado', v_visitor3, v_espaco_id, now())
    ON CONFLICT (espaco_id, numero) DO UPDATE 
    SET status = 'ocupado', visitor_id = EXCLUDED.visitor_id, occupied_at = EXCLUDED.occupied_at;

    -- 7. AUDITORIA
    -- Registra o que aconteceu para o painel de auditoria
    INSERT INTO auditoria (acao, detalhes, espaco_id)
    VALUES ('criou_usuario', '[TESTE] Dados simulados foram injetados no sistema para homologação.', v_espaco_id);

END $$;
