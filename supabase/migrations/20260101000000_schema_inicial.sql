-- ====================================================================
-- COMPLETO - BANCO DE DADOS GVC - SUPABASE MIGRATION
-- ====================================================================
-- Execute todas as instruções em sequência no PostgreSQL destino
-- ====================================================================

-- ====================================================================
-- 1. TABELAS BASE
-- ====================================================================

-- VISITORS (Visitantes)
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    cpf TEXT,
    passport TEXT,
    is_foreigner BOOLEAN DEFAULT false,
    gender TEXT DEFAULT 'masculino',
    birth_date DATE,
    email TEXT,
    phone TEXT,
    address TEXT,
    category TEXT DEFAULT 'general',
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- USUARIOS (usuários do sistema)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    perfil TEXT NOT NULL,
    espaco_id UUID,
    espaco_nome TEXT DEFAULT 'Todos os Espaços',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ESPACOS (espaços culturais)
CREATE TABLE IF NOT EXISTS espacos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    endereco TEXT,
    municipio TEXT,
    horario_funcionamento TEXT DEFAULT 'Seg-Sex: 8h-18h, Sáb: 8h-12h',
    capacidade_visitantes INTEGER DEFAULT 100,
    mensagem_boas_vindas TEXT,
    tempo_limite_excedido INTEGER DEFAULT 4,
    ativo BOOLEAN DEFAULT true,
    perfil_armarios BOOLEAN DEFAULT true,
    perfil_telecentro BOOLEAN DEFAULT false,
    perfil_agendamento BOOLEAN DEFAULT false,
    total_armarios INTEGER DEFAULT 20,
    total_computadores INTEGER DEFAULT 10,
    tempo_limite_computador INTEGER DEFAULT 20,
    capacidade_agendamento INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    has_auditorio BOOLEAN DEFAULT false,
    qtd_auditorio INTEGER DEFAULT 0,
    has_sala_estudos BOOLEAN DEFAULT false,
    qtd_sala_estudos INTEGER DEFAULT 0,
    has_teatro BOOLEAN DEFAULT false,
    qtd_teatro INTEGER DEFAULT 0,
    has_filmoteca BOOLEAN DEFAULT false,
    qtd_filmoteca INTEGER DEFAULT 0,
    has_espaco_aberto BOOLEAN DEFAULT false,
    qtd_espaco_aberto INTEGER DEFAULT 0,
    has_visita_guiada BOOLEAN DEFAULT false,
    qtd_visita_guiada INTEGER DEFAULT 0
);

-- VISITS (registros de visita)
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID,
    nome TEXT NOT NULL,
    perfil TEXT DEFAULT 'general',
    local TEXT DEFAULT 'Entrada Principal',
    espaco_id UUID,
    checkin TIMESTAMPTZ DEFAULT now(),
    checkout TIMESTAMPTZ,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluído', 'Cancelado')),
    armario TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- COMPUTADORES (telecentro)
CREATE TABLE IF NOT EXISTS computadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL,
    status TEXT DEFAULT 'Livre' CHECK (status IN ('Livre', 'Em Uso', 'Excedido', 'Manutenção')),
    usuario_id UUID,
    usuario_nome TEXT,
    horario_inicio TIMESTAMPTZ,
    horario_limite TIMESTAMPTZ,
    espaco_id UUID,
    espaco_nome TEXT
);

-- LOCKERS (armários)
CREATE TABLE IF NOT EXISTS lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'Livre' CHECK (status IN ('Livre', 'Ocupado', 'Manutenção')),
    visitor_id UUID,
    visitor_name TEXT,
    espaco_id UUID,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- AUDITORIA (log de auditoria)
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario TEXT NOT NULL,
    usuario_id UUID,
    perfil TEXT DEFAULT 'desconhecido',
    acao TEXT NOT NULL,
    detalhes TEXT,
    entidade_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CONFIGURACOES (configurações do sistema)
CREATE TABLE IF NOT EXISTS configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'sistema',
    institution_name TEXT,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 2. TABELAS DE AGENDAMENTO
-- ====================================================================

-- AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    espaco_id UUID REFERENCES espacos(id),
    auth_uid UUID, -- ID do usuário logado que criou o agendamento (se houver)
    solicitante_nome TEXT NOT NULL,
    solicitante_email TEXT NOT NULL,
    solicitante_telefone TEXT NOT NULL,
    solicitante_documento TEXT,
    tipo_solicitante TEXT NOT NULL,
    tipo_espaco TEXT NOT NULL,
    espaco_solicitado TEXT NOT NULL,
    data_pretendida DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    numero_participantes INTEGER NOT NULL,
    descricao_evento TEXT NOT NULL,
    natureza_evento TEXT NOT NULL,
    gratuito BOOLEAN DEFAULT true,
    valor_ingresso NUMERIC,
    necessita_equipamentos TEXT,
    observacoes TEXT,
    status TEXT DEFAULT 'pendente',
    protocolo TEXT UNIQUE,
    termo_aceito BOOLEAN DEFAULT false,
    termo_aceito_em TIMESTAMP,
    responsabhilidade_evento BOOLEAN DEFAULT false,
    danos_patrimonio BOOLEAN DEFAULT false,
    respeito_lotacao BOOLEAN DEFAULT false,
    autorizo_divulgacao BOOLEAN DEFAULT false,
    documento_anexo_url TEXT,
    resposta_coordenador TEXT,
    coordenador_id UUID,
    respondido_em TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    termo_compromisso_assinado BOOLEAN DEFAULT false,
    termo_compromisso_data TIMESTAMP,
    termo_compromisso_ip TEXT,
    razao_social TEXT,
    nome_instituicao TEXT,
    secretaria_governo TEXT,
    unidade_governo TEXT,
    assinatura_id TEXT,
    ip_confirmacao TEXT,
    user_agent TEXT,
    CHECK (tipo_solicitante IN ('escola', 'universidade', 'ong', 'empresa', 'pessoa_fisica', 'pessoa_juridica', 'governo')),
    CHECK (tipo_espaco IN ('auditorio', 'sala_reuniao', 'sala_estudos', 'teatro', 'filmoteca', 'espaco_aberto', 'area_externa', 'visita_guiada', 'outro')),
    CHECK (natureza_evento IN ('cultural', 'educacional', 'corporativo', 'comunitario', 'outro')),
    CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado'))
);

-- AGENDAMENTOS_RASCUNHO (rascunho temporário)
CREATE TABLE IF NOT EXISTS agendamentos_rascunho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    CONSTRAINT agendamentos_rascunho_session_id_key UNIQUE (session_id),
    session_id TEXT NOT NULL,
    solicitante_nome TEXT,
    solicitante_email TEXT,
    solicitante_telefone TEXT,
    solicitante_documento TEXT,
    tipo_solicitante TEXT,
    razao_social TEXT,
    nome_instituicao TEXT,
    secretaria_governo TEXT,
    unidade_governo TEXT,
    espaco_id UUID,
    tipo_espaco TEXT,
    espaco_solicitado TEXT,
    data_pretendida TEXT,
    horario_inicio TEXT,
    horario_fim TEXT,
    numero_participantes INTEGER,
    descricao_evento TEXT,
    natureza_evento TEXT,
    gratuito BOOLEAN DEFAULT true,
    valor_ingresso TEXT,
    necessita_equipamentos TEXT,
    observacoes TEXT,
    termo_aceito BOOLEAN DEFAULT false,
    responsabhilidade_evento BOOLEAN DEFAULT false,
    danos_patrimonio BOOLEAN DEFAULT false,
    respeito_lotacao BOOLEAN DEFAULT false,
    autorizo_divulgacao BOOLEAN DEFAULT false,
    termo_compromisso_assinado BOOLEAN DEFAULT false,
    termo_compromisso_data TIMESTAMP,
    termo_compromisso_ip TEXT,
    current_step INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- DOCUMENTOS_AGENDAMENTO (anexos)
CREATE TABLE IF NOT EXISTS documentos_agendamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    url_arquivo TEXT NOT NULL,
    tipo_documento TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- LOG_AGENDAMENTOS (audit log)
CREATE TABLE IF NOT EXISTS log_agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id UUID,
    acao TEXT NOT NULL,
    usuario_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 3. ASSINATURAS DIGITAIS
-- ====================================================================

CREATE TABLE IF NOT EXISTS assinaturas_digitais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES visitors(id),
    nome_assinante VARCHAR(255) NOT NULL,
    cpf_assinante VARCHAR(14) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    documento_id UUID,
    documento_hash TEXT NOT NULL,
    data_hora TIMESTAMPTZ DEFAULT now(),
    data_hora_brasilia VARCHAR(50),
    ip_publico VARCHAR(45) NOT NULL,
    user_agent TEXT,
    browser_fingerprint JSONB,
    cpf_validado BOOLEAN DEFAULT false,
    cpf_status VARCHAR(50),
    termo_conteudo TEXT,
    termo_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 4. ÍNDICES
-- ====================================================================

-- agendamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_espaco_id ON agendamentos(espaco_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_pretendida ON agendamentos(data_pretendida);
CREATE INDEX IF NOT EXISTS idx_agendamentos_solicitante_email ON agendamentos(solicitante_email);
CREATE INDEX IF NOT EXISTS idx_agendamentos_created_at ON agendamentos(created_at DESC);

-- visits
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_espaco_id ON visits(espaco_id);
CREATE INDEX IF NOT EXISTS idx_visits_checkin ON visits(checkin DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- visitors
CREATE INDEX IF NOT EXISTS idx_visitors_cpf ON visitors(cpf);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);

-- espacos
CREATE INDEX IF NOT EXISTS idx_espacos_ativo ON espacos(ativo);
CREATE INDEX IF NOT EXISTS idx_espacos_perfil_agendamento ON espacos(perfil_agendamento);
CREATE INDEX IF NOT EXISTS idx_espacos_perfil_telecentro ON espacos(perfil_telecentro);

-- lockers
CREATE INDEX IF NOT EXISTS idx_lockers_espaco_id ON lockers(espaco_id);
CREATE INDEX IF NOT EXISTS idx_lockers_status ON lockers(status);

-- computadores
CREATE INDEX IF NOT EXISTS idx_computadores_espaco_id ON computadores(espaco_id);
CREATE INDEX IF NOT EXISTS idx_computadores_status ON computadores(status);

-- assinaturas_digitais
CREATE INDEX IF NOT EXISTS idx_assinaturas_cpf ON assinaturas_digitais(cpf_assinante);
CREATE INDEX IF NOT EXISTS idx_assinaturas_documento ON assinaturas_digitais(tipo_documento, documento_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data ON assinaturas_digitais(data_hora);
CREATE INDEX IF NOT EXISTS idx_assinaturas_hash ON assinaturas_digitais(documento_hash);

-- ====================================================================
-- 5. FUNÇÕES
-- ====================================================================

-- Dropar funções existentes antes de recriar (para evitar erro de return type)
DROP FUNCTION IF EXISTS verificar_conflito_agendamento(uuid, date, time, time, uuid) CASCADE;
DROP FUNCTION IF EXISTS update_agendamento_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_agendamento_audit() CASCADE;
DROP FUNCTION IF EXISTS prevent_duplicate_checkin() CASCADE;
DROP FUNCTION IF EXISTS prevent_double_checkin() CASCADE;
DROP FUNCTION IF EXISTS log_usuario_changes() CASCADE;
DROP FUNCTION IF EXISTS salvar_rascunho_agendamento(TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS buscar_rascunho_agendamento(TEXT) CASCADE;
DROP FUNCTION IF EXISTS limpar_rascunho_agendamento(TEXT) CASCADE;

-- Verificar conflito de agendamento
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
    SELECT COUNT(*) INTO conflito_count
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
    RETURN conflito_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_agendamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log de auditoria de agendamentos
CREATE OR REPLACE FUNCTION log_agendamento_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
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

-- Prevenir check-in duplicado (60 min)
CREATE OR REPLACE FUNCTION prevent_duplicate_checkin()
RETURNS TRIGGER AS $$
DECLARE
    visita_existente UUID;
BEGIN
    SELECT id INTO visita_existente
    FROM visits
    WHERE visitor_id = NEW.visitor_id
        AND espaco_id = NEW.espaco_id
        AND status = 'Ativo'
        AND checkin > NOW() - INTERVAL '60 minutes'
    LIMIT 1;
    
    IF visita_existente IS NOT NULL THEN
        RAISE EXCEPTION 'Visitante já possui check-in ativo nos últimos 60 minutos';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevenir double check-in
CREATE OR REPLACE FUNCTION prevent_double_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM visits 
        WHERE visitor_id = NEW.visitor_id 
        AND espaco_id = NEW.espaco_id
        AND status = 'Ativo'
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Visitante já possui um check-in ativo neste espaço.';
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Log de alterações de usuário
CREATE OR REPLACE FUNCTION log_usuario_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD IS NOT NULL THEN
        INSERT INTO auditoria (usuario, perfil, acao, detalhes, entidade_id)
        VALUES (
            COALESCE(NEW.nome, OLD.nome),
            COALESCE(NEW.perfil, OLD.perfil),
            CASE
                WHEN TG_OP = 'INSERT' THEN 'criacao_usuario'
                WHEN TG_OP = 'UPDATE' THEN 'atualizacao_usuario'
                WHEN TG_OP = 'DELETE' THEN 'remocao_usuario'
            END,
            CASE
                WHEN TG_OP = 'INSERT' THEN 'Novo usuário criado'
                WHEN TG_OP = 'UPDATE' THEN 'Dados alterados'
                WHEN TG_OP = 'DELETE' THEN 'Usuário removido'
            END,
            COALESCE(NEW.id::text, OLD.id::text)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rascunho de agendamento
DROP FUNCTION IF EXISTS salvar_rascunho_agendamento(TEXT, JSONB);
CREATE OR REPLACE FUNCTION salvar_rascunho_agendamento(
  p_session_id TEXT,
  p_dados JSONB
)
RETURNS UUID AS $
DECLARE
  v_id UUID;
  v_existing UUID;
BEGIN
  -- Verificar se já existe rascunho para esta session
  SELECT id INTO v_existing
  FROM agendamentos_rascunho
  WHERE session_id = p_session_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Atualizar
    UPDATE agendamentos_rascunho
    SET 
      solicitante_nome = p_dados->>'solicitante_nome',
      solicitante_email = p_dados->>'solicitante_email',
      solicitante_telefone = p_dados->>'solicitante_telefone',
      solicitante_documento = p_dados->>'solicitante_documento',
      tipo_solicitante = p_dados->>'tipo_solicitante',
      razao_social = p_dados->>'razao_social',
      nome_instituicao = p_dados->>'nome_instituicao',
      espaco_id = NULLIF(p_dados->>'espaco_id', '')::UUID,
      tipo_espaco = p_dados->>'tipo_espaco',
      espaco_solicitado = p_dados->>'espaco_solicitado',
      data_pretendida = p_dados->>'data_pretendida',
      horario_inicio = p_dados->>'horario_inicio',
      horario_fim = p_dados->>'horario_fim',
      numero_participantes = (p_dados->>'numero_participantes')::INTEGER,
      descricao_evento = p_dados->>'descricao_evento',
      natureza_evento = p_dados->>'natureza_evento',
      gratuito = (p_dados->>'gratuito')::BOOLEAN,
      valor_ingresso = p_dados->>'valor_ingresso',
      necessita_equipamentos = p_dados->>'necessita_equipamentos',
      observacoes = p_dados->>'observacoes',
      termo_aceito = (p_dados->>'termo_aceito')::BOOLEAN,
      responsabhilidade_evento = (p_dados->>'responsabhilidade_evento')::BOOLEAN,
      danos_patrimonio = (p_dados->>'danos_patrimonio')::BOOLEAN,
      respeito_lotacao = (p_dados->>'respeito_lotacao')::BOOLEAN,
      autorizo_divulgacao = (p_dados->>'autorizo_divulgacao')::BOOLEAN,
      termo_compromisso_assinado = (p_dados->>'termo_compromisso_assinado')::BOOLEAN,
      termo_compromisso_data = NULLIF(p_dados->>'termo_compromisso_data', '')::TIMESTAMP,
      termo_compromisso_ip = p_dados->>'termo_compromisso_ip',
      current_step = (p_dados->>'current_step')::INTEGER,
      updated_at = NOW()
    WHERE id = v_existing
    RETURNING id INTO v_id;
  ELSE
    -- Criar novo
    INSERT INTO agendamentos_rascunho (
      session_id,
      solicitante_nome,
      solicitante_email,
      solicitante_telefone,
      solicitante_documento,
      tipo_solicitante,
      razao_social,
      nome_instituicao,
      espaco_id,
      tipo_espaco,
      espaco_solicitado,
      data_pretendida,
      horario_inicio,
      horario_fim,
      numero_participantes,
      descricao_evento,
      natureza_evento,
      gratuito,
      valor_ingresso,
      necessita_equipamentos,
      observacoes,
      termo_aceito,
      responsabhilidade_evento,
      danos_patrimonio,
      respeito_lotacao,
      autorizo_divulgacao,
      termo_compromisso_assinado,
      termo_compromisso_data,
      termo_compromisso_ip,
      current_step
    ) VALUES (
      p_session_id,
      p_dados->>'solicitante_nome',
      p_dados->>'solicitante_email',
      p_dados->>'solicitante_telefone',
      p_dados->>'solicitante_documento',
      p_dados->>'tipo_solicitante',
      p_dados->>'razao_social',
      p_dados->>'nome_instituicao',
      NULLIF(p_dados->>'espaco_id', '')::UUID,
      p_dados->>'tipo_espaco',
      p_dados->>'espaco_solicitado',
      p_dados->>'data_pretendida',
      p_dados->>'horario_inicio',
      p_dados->>'horario_fim',
      (p_dados->>'numero_participantes')::INTEGER,
      p_dados->>'descricao_evento',
      p_dados->>'natureza_evento',
      (p_dados->>'gratuito')::BOOLEAN,
      p_dados->>'valor_ingresso',
      p_dados->>'necessita_equipamentos',
      p_dados->>'observacoes',
      (p_dados->>'termo_aceito')::BOOLEAN,
      (p_dados->>'responsabhilidade_evento')::BOOLEAN,
      (p_dados->>'danos_patrimonio')::BOOLEAN,
      (p_dados->>'respeito_lotacao')::BOOLEAN,
      (p_dados->>'autorizo_divulgacao')::BOOLEAN,
      (p_dados->>'termo_compromisso_assinado')::BOOLEAN,
      NULLIF(p_dados->>'termo_compromisso_data', '')::TIMESTAMP,
      p_dados->>'termo_compromisso_ip',
      (p_dados->>'current_step')::INTEGER
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$ LANGUAGE plpgsql;

-- Buscar rascunho
CREATE OR REPLACE FUNCTION buscar_rascunho_agendamento(p_session_id TEXT)
RETURNS SETOF agendamentos_rascunho AS $
BEGIN
  RETURN QUERY
  SELECT * FROM agendamentos_rascunho
  WHERE session_id = p_session_id
  ORDER BY updated_at DESC
  LIMIT 1;
END;
$ LANGUAGE plpgsql;

-- Limpar rascunho
CREATE OR REPLACE FUNCTION limpar_rascunho_agendamento(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM agendamentos_rascunho WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 6. TRIGGERS
-- ====================================================================

CREATE TRIGGER trigger_update_agendamento_updated_at
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION update_agendamento_updated_at();

CREATE TRIGGER trigger_log_agendamento_audit
    AFTER UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION log_agendamento_audit();

CREATE TRIGGER trigger_prevent_duplicate_checkin
    BEFORE INSERT ON visits
    FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_checkin();

CREATE TRIGGER trigger_prevent_double_checkin
    BEFORE INSERT ON visits
    FOR EACH ROW EXECUTE FUNCTION prevent_double_checkin();

-- ====================================================================
-- 7. POLÍTICAS RLS (Row Level Security)
-- ====================================================================

-- VISITORS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read visitors" ON visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert visitors" ON visitors FOR INSERT TO authenticated WITH CHECK (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
);
CREATE POLICY "Staff can update visitors" ON visitors FOR UPDATE TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
);
CREATE POLICY "Admin can delete visitors" ON visitors FOR DELETE TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
);

-- USUARIOS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read themselves" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage usuarios" ON usuarios FOR ALL TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
);

-- ESPACOS
ALTER TABLE espacos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All can read espacos" ON espacos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage espacos" ON espacos FOR ALL TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
);

-- VISITS
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage visits" ON visits FOR ALL TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
);

-- AGENDAMENTOS
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agendamentos_view_own" ON agendamentos;
CREATE POLICY "agendamentos_view_own" ON agendamentos FOR SELECT USING (
    auth_uid = auth.uid()
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario', 'monitor'))
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND perfil = 'administrador')
);

DROP POLICY IF EXISTS "agendamentos_insert_own" ON agendamentos;
CREATE POLICY "agendamentos_insert_own" ON agendamentos FOR INSERT WITH CHECK (
    auth_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND (
        (espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario'))
        OR perfil = 'administrador'
      )
    )
);

DROP POLICY IF EXISTS "agendamentos_update_coordenador" ON agendamentos;
CREATE POLICY "agendamentos_update_coordenador" ON agendamentos FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_uid = auth.uid()
      AND (
        (espaco_id = agendamentos.espaco_id AND perfil IN ('coordenador', 'funcionario'))
        OR perfil = 'administrador'
      )
    )
);

DROP POLICY IF EXISTS "Coordenadores_INSERT" ON agendamentos;
DROP POLICY IF EXISTS "Admin_ALL" ON agendamentos;

-- ASSINATURAS DIGITAIS
ALTER TABLE assinaturas_digitais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin total access assinaturas" ON assinaturas_digitais FOR ALL USING (true) WITH CHECK (true);

-- AUDITORIA
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage auditoria" ON auditoria FOR ALL USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
);

-- CONFIGURACOES
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage config" ON configuracoes FOR ALL USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) = 'administrador'
);

-- LOCKERS
ALTER TABLE lockers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage lockers" ON lockers FOR ALL TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
);

-- COMPUTADORES
ALTER TABLE computadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage computers" ON computadores FOR ALL TO authenticated USING (
    (SELECT perfil FROM usuarios WHERE auth_uid = auth.uid()) IN ('administrador', 'coordenador', 'funcionario', 'monitor')
);

-- AGENDAMENTOS_RASCUNHO
ALTER TABLE agendamentos_rascunho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session can manage draft" ON agendamentos_rascunho FOR ALL USING (true);

-- ====================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ====================================================================
-- Execute este script no PostgreSQL destino (local ou cloud)
-- Para migração de dados, use COPY ou pg_dump com --data-only
-- ====================================================================-- ==========================================
-- TABELA EMAIL_QUEUE
-- Fila para envio de emails via Edge Function
-- ==========================================
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario TEXT NOT NULL,
    nome_destinatario TEXT NOT NULL,
    assunto TEXT NOT NULL,
    corpo_html TEXT NOT NULL,
    tipo TEXT NOT NULL,
    referencia_id UUID,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
    erro_mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    enviado_at TIMESTAMPTZ
);

-- Ativar RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Impedir acesso direto ao cliente (apenas service_role pode operar na fila)
-- Nenhuma política pública ou autenticada de SELECT/INSERT é criada
ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario_id UUID;
DROP TRIGGER IF EXISTS trigger_log_usuario_changes ON usuarios;
CREATE TRIGGER trigger_log_usuario_changes
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION log_usuario_changes();
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
CREATE OR REPLACE FUNCTION prevent_double_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM visits 
        WHERE visitor_id = NEW.visitor_id 
        AND espaco_id = NEW.espaco_id
        AND status = 'Ativo'
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Visitante já possui um check-in ativo neste espaço.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
