-- UNIQUE constraints
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_key UNIQUE (email);
ALTER TABLE usuarios ADD CONSTRAINT usuarios_auth_uid_key UNIQUE (auth_uid);

-- visitantes might have cpf (we should make it unique if not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitantes_cpf_unique ON visitantes (cpf) WHERE cpf IS NOT NULL AND cpf != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitantes_passport_unique ON visitantes (passport) WHERE passport IS NOT NULL AND passport != '';

-- Foreign Keys (with ON DELETE SET NULL or CASCADE depending on context)
-- visits
ALTER TABLE visits DROP CONSTRAINT IF EXISTS fk_visits_visitor;
ALTER TABLE visits ADD CONSTRAINT fk_visits_visitor FOREIGN KEY (visitor_id) REFERENCES visitantes(id) ON DELETE CASCADE;

ALTER TABLE visits DROP CONSTRAINT IF EXISTS fk_visits_espaco;
ALTER TABLE visits ADD CONSTRAINT fk_visits_espaco FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE CASCADE;

-- computadores
ALTER TABLE computadores DROP CONSTRAINT IF EXISTS fk_computadores_espaco;
ALTER TABLE computadores ADD CONSTRAINT fk_computadores_espaco FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE CASCADE;
ALTER TABLE computadores DROP CONSTRAINT IF EXISTS fk_computadores_visitante;
ALTER TABLE computadores ADD CONSTRAINT fk_computadores_visitante FOREIGN KEY (usuario_id) REFERENCES visitantes(id) ON DELETE SET NULL;

-- lockers
ALTER TABLE lockers DROP CONSTRAINT IF EXISTS fk_lockers_espaco;
ALTER TABLE lockers ADD CONSTRAINT fk_lockers_espaco FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE CASCADE;
ALTER TABLE lockers DROP CONSTRAINT IF EXISTS fk_lockers_visitante;
ALTER TABLE lockers ADD CONSTRAINT fk_lockers_visitante FOREIGN KEY (visitor_id) REFERENCES visitantes(id) ON DELETE SET NULL;

-- usuarios
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS fk_usuarios_espaco;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_espaco FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE SET NULL;

-- agendamentos
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS fk_agendamentos_coordenador;
ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_coordenador FOREIGN KEY (coordenador_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- log_agendamentos
ALTER TABLE log_agendamentos DROP CONSTRAINT IF EXISTS fk_log_agendamentos_agendamento;
ALTER TABLE log_agendamentos ADD CONSTRAINT fk_log_agendamentos_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE;
ALTER TABLE log_agendamentos DROP CONSTRAINT IF EXISTS fk_log_agendamentos_usuario;
ALTER TABLE log_agendamentos ADD CONSTRAINT fk_log_agendamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- agendamentos_rascunho
ALTER TABLE agendamentos_rascunho DROP CONSTRAINT IF EXISTS fk_agendamentos_rascunho_espaco;
ALTER TABLE agendamentos_rascunho ADD CONSTRAINT fk_agendamentos_rascunho_espaco FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE SET NULL;
