-- Remover CHECKs antigos
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_tipo_solicitante_check;
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_tipo_espaco_check;

-- Adicionar novos CHECKs alinhados com o frontend
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_tipo_solicitante_check 
  CHECK (tipo_solicitante IN ('escola', 'universidade', 'ong', 'empresa', 'pessoa_fisica', 'pessoa_juridica', 'governo'));

ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_tipo_espaco_check 
  CHECK (tipo_espaco IN ('auditorio', 'sala_reuniao', 'sala_estudos', 'teatro', 'filmoteca', 'espaco_aberto', 'area_externa', 'visita_guiada', 'outro'));
