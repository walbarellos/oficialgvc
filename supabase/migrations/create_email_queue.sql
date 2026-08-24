-- ==========================================
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
