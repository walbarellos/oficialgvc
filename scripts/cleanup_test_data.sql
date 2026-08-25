DO $$
BEGIN
    -- 1. Limpa computadores e armários falsos
    DELETE FROM computadores WHERE usuario_nome LIKE '[TESTE]%';
    DELETE FROM lockers WHERE visitor_name LIKE '[TESTE]%';

    -- 2. Limpa agendamentos
    DELETE FROM agendamentos WHERE solicitante_nome LIKE '[TESTE]%';

    -- 3. Limpa visitas ativas e passadas
    DELETE FROM visits WHERE nome LIKE '[TESTE]%';

    -- 4. Limpa os visitantes do banco de dados
    DELETE FROM visitors WHERE full_name LIKE '[TESTE]%';

    -- 5. Limpa a auditoria gerada
    DELETE FROM auditoria WHERE detalhes LIKE '[TESTE]%';
END $$;
