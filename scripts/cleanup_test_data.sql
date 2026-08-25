DO $$
BEGIN
    -- 1. Limpa computadores e armários falsos
    DELETE FROM computadores WHERE numero LIKE 'PC-TESTE-%';
    DELETE FROM lockers WHERE numero = '99'; -- Considerando que o 99 foi o usado para teste

    -- 2. Limpa agendamentos dos visitantes de teste
    DELETE FROM agendamentos WHERE visitante_id IN (SELECT id FROM visitors WHERE full_name LIKE '[TESTE]%');

    -- 3. Limpa visitas ativas e passadas
    DELETE FROM visits WHERE nome LIKE '[TESTE]%';

    -- 4. Limpa os visitantes do banco de dados
    DELETE FROM visitors WHERE full_name LIKE '[TESTE]%';

    -- 5. Limpa a auditoria gerada
    DELETE FROM auditoria WHERE detalhes LIKE '[TESTE]%';
END $$;
