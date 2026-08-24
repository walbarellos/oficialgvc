-- =====================================================
-- MÓDULO DE AGENDAMENTO DE ESPAÇOS CULTURAIS
-- Portaria nº 169/2023 - Fundação de Cultura Elias Mansour
-- =====================================================

-- =====================================================
-- TABELA: agendamentos
-- =====================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espaco_id UUID REFERENCES espacos(id) NOT NULL,
  
  -- Dados do Solicitante
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT NOT NULL,
  solicitante_telefone TEXT NOT NULL,
  solicitante_documento TEXT,
  tipo_solicitante TEXT NOT NULL CHECK (tipo_solicitante IN ('escola', 'universidade', 'ong', 'empresa', 'pessoa_fisica')),
  
  -- Dados do Agendamento
  tipo_espaco TEXT NOT NULL CHECK (tipo_espaco IN ('auditorio', 'sala_reuniao', 'area_externa', 'visita_guiada', 'outro')),
  espaco_solicitado TEXT NOT NULL,
  data_pretendida DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  numero_participantes INTEGER NOT NULL,
  
  -- Detalhes do Evento
  descricao_evento TEXT NOT NULL,
  natureza_evento TEXT NOT NULL CHECK (natureza_evento IN ('cultural', 'educacional', 'corporativo', 'comunitario', 'outro')),
  gratuito BOOLEAN DEFAULT true,
  valor_ingresso DECIMAL(10,2),
  necessita_equipamentos TEXT,
  observacoes TEXT,
  
  -- Status e Controle
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
  
  -- Termos
  termo_aceito BOOLEAN DEFAULT false,
  termo_aceito_em TIMESTAMP,
  responsabhilidade_evento BOOLEAN DEFAULT false,
  danos_patrimonio BOOLEAN DEFAULT false,
  respeito_lotacao BOOLEAN DEFAULT false,
  autorizo_divulgacao BOOLEAN DEFAULT false,
  
  -- Documentos
  documento_anexo_url TEXT,
  
  -- Resposta do Coordenador
  resposta_coordenador TEXT,
  coordenador_id UUID REFERENCES auth.users(id),
  respondido_em TIMESTAMP,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: documentos_agendamento
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos_agendamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo_documento TEXT CHECK (tipo_documento IN ('termo_assinado', 'comprovante', 'outro')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_agendamentos_espaco_id ON agendamentos(espaco_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_pretendida ON agendamentos(data_pretendida);
CREATE INDEX IF NOT EXISTS idx_agendamentos_solicitante_email ON agendamentos(solicitante_email);
CREATE INDEX IF NOT EXISTS idx_agendamentos_created_at ON agendamentos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documentos_agendamento_id ON documentos_agendamento(agendamento_id);

-- =====================================================
-- FUNÇÃO: verificar conflito de agendamento
-- =====================================================
CREATE OR REPLACE FUNCTION verificar_conflito_agendamento(
  p_espaco_id UUID,
  p_data DATE,
  p_inicio TIME,
  p_fim TIME,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflito_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflicto_count
  FROM agendamentos
  WHERE espaco_id = p_espaco_id
    AND data_pretendida = p_data
    AND status NOT IN ('rejeitado', 'cancelado')
    AND (
      (horario_inicio <= p_inicio AND horario_fim > p_inicio)
      OR (horario_inicio < p_fim AND horario_fim >= p_fim)
      OR (horario_inicio >= p_inicio AND horario_fim <= p_fim)
    )
    AND (p_exclude_id IS NULL OR id != p_exclude_id);

  RETURN conflicto_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Tabela: agendamentos
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Policy: Solicitantes veem apenas seus próprios agendamentos
CREATE POLICY "agendamentos_view_own" ON agendamentos FOR SELECT
  USING (
    solicitante_email = auth.jwt()->>'email'
    OR espaco_id IN (
      SELECT id FROM espacos 
      WHERE espaco_id IN (
        SELECT coalesce(espaco_id::text, 'todos') 
        FROM auth.users 
        WHERE auth_uid = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth_uid = auth.uid() 
      AND (perfil = 'administrador' OR perfil = 'coordenador')
    )
  );

-- Policy: Coordenadores_INSERT para seus espaços
CREATE POLICY "agendamentos_insert_own" ON agendamentos FOR INSERT
  WITH CHECK (
    solicitante_email = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth_uid = auth.uid() 
      AND (perfil = 'administrador' OR perfil = 'coordenador')
    )
  );

-- Policy: Coordenadores UPDATE para seus espaços
CREATE POLICY "agendamentos_update_coordenador" ON agendamentos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth_uid = auth.uid() 
      AND (perfil = 'administrador' OR perfil = 'coordenador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth_uid = auth.uid() 
      AND (perfil = 'administrador' OR perfil = 'coordenador')
    )
  );

-- Tabela: documentos_agendamento
ALTER TABLE documentos_agendamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_view_agendamento" ON documentos_agendamento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agendamentos a 
      WHERE a.id = agendamento_id 
      AND a.solicitante_email = auth.jwt()->>'email'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth_uid = auth.uid() 
      AND (perfil = 'administrador' OR perfil = 'coordenador')
    )
  );

-- =====================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_agendamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agendamento_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_agendamento_updated_at();

-- =====================================================
-- LOG DE AUDITORIA (via trigger)
-- =====================================================
CREATE TABLE IF NOT EXISTS log_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID,
  acao TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_agendamento_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD IS NOT NULL THEN
    INSERT INTO log_agendamentos (agendamento_id, acao, usuario_id, dados_anteriores, dados_novos)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'aprovado' THEN 'aprovacao'
        WHEN NEW.status = 'rejeitado' THEN 'rejeicao'
        WHEN NEW.status = 'cancelado' THEN 'cancelamento'
        ELSE 'atualizacao'
      END,
      NEW.coordenador_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_agendamento_audit
  AFTER UPDATE ON agendamentos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_agendamento_audit();