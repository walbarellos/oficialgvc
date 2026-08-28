# Módulo de Agendamento de Espaços Culturais - Relatório de Implementação

## Visão Geral

Módulo completo de agendamento de espaços culturais para o sistema GVC (Gerenciador de Visitante Cultural), em conformidade com a Portaria nº 169/2023 da Fundação de Cultura Elias Mansour (FEM).

---

## 1. Estrutura do Banco de Dados

### Tabelas Criadas

#### `agendamentos` (supabase/migrations/agendamentos.sql)
```sql
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espaco_id UUID REFERENCES espacos(id) NOT NULL,
  
  -- Dados do Solicitante
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT NOT NULL,
  solicitante_telefone TEXT NOT NULL,
  solicitante_documento TEXT,
  tipo_solicitante TEXT CHECK (tipo_solicitante IN ('escola', 'universidade', 'ong', 'empresa', 'pessoa_fisica')),
  
  -- Dados do Agendamento
  tipo_espaco TEXT CHECK (tipo_espaco IN ('auditorio', 'sala_reuniao', 'area_externa', 'visita_guiada', 'outro')),
  espaco_solicitado TEXT NOT NULL,
  data_pretendida DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  numero_participantes INTEGER NOT NULL,
  
  -- Detalhes do Evento
  descricao_evento TEXT NOT NULL,
  natureza_evento TEXT CHECK (natureza_evento IN ('cultural', 'educacional', 'corporativo', 'comunitario', 'outro')),
  gratuito BOOLEAN DEFAULT true,
  valor_ingresso DECIMAL(10,2),
  necessita_equipamentos TEXT,
  observacoes TEXT,
  
  -- Status
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
  
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `documentos_agendamento`
```sql
CREATE TABLE documentos_agendamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo_documento TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### `log_agendamentos` (Auditoria)
```sql
CREATE TABLE log_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID,
  acao TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Funções e Índices

- **Índices**: `idx_agendamentos_espaco_id`, `idx_agendamentos_status`, `idx_agendamentos_data_pretendida`, etc.
- **Função `verificar_conflito_agendamento()`**: Verifica conflitos de horário/data/espaço
- **Função `update_agendamento_updated_at()`**: Atualiza `updated_at` automaticamente
- **Trigger `trigger_log_agendamento_audit`**: Registra alterações de status

### RLS (Row Level Security)

- **Policy `agendamentos_view_own`**: Solicitantes veem apenas seus próprios agendamentos
- **Policy `agendamentos_insert_own`**: Coordenadores/admins podem inserir
- **Policy `agendamentos_update_coordenador`**: Coordenadores/admins podem atualizar

---

## 2. Telas Implementadas

### TELA A: Agendamento Público (`/agendamento-publico`)
**Arquivo**: `src/components/pages/AgendamentoPublico.tsx`

Funcionalidades:
- Formulário multipasso (6 steps):
  1. **Dados Pessoais**: Nome, email, telefone, CPF/CNPJ, tipo de solicitante
  2. **Espaço**: Seleção de espaço cultural e tipo de espaço
  3. **Data e Hora**: Calendário, horário, número de participantes
  4. **Evento**: Natureza, descrição, valor, equipamentos
  5. **Termos**: aceite da Portaria 169/2023
  6. **Confirmação**: Resumo e envio
- Verificação de conflitos em tempo real
- Validação de todos os campos obrigatórios
- Feedback visual de sucesso

### TELA B: Gestão de Agendamentos (`/agendamento`)
**Arquivo**: `src/components/pages/Agendamento.tsx`

Funcionalidades:
- Dashboard com cards de estatísticas (total, pendentes, aprovados, rejeitados)
- Filtros por espaço, status e busca por nome/email
- Tabela paginada com todos os agendamentos
- Modal de detalhes com ações de aprovação/rejeição

---

## 3. Fluxos Completos

### Fluxo do Solicitante
1. Acessa `/agendamento-publico`
2. Preenche dados pessoais
3. Escolhe espaço cultural e tipo
4. Seleciona data/horário (sistema verifica conflitos)
5. Detalha o evento
6. Aceita termos da Portaria 169/2023
7. Envia solicitação
8. Recebe email de confirmação

### Fluxo do Coordenador/Admin
1. Acessa `/agendamento` (requer autenticação)
2. Visualiza dashboard com estatísticas
3. Filtra/listagem por espaço ou status
4. Clica em "Ver detalhes" para abrir modal
5. Analisa solicitação e conflitos
6. Aprova ou rejeita com justificativa
7. Sistema envia email automático para o solicitante

---

## 4. Regras de Segurança

### Backend (Supabase)
- ✅ RLS ativo em todas as tabelas
- ✅ Verificação de conflito de agendamentos via função SQL
- ✅ Logs de auditoria para todas as alterações de status
- ✅ Constraints CHECK para tipos válidos

### Frontend (React)
- ✅ Validação de campos obrigatórios (Zod/schema)
- ✅ Máscaras para telefone, CPF, data
- ✅ Feedback visual de conflitos antes do envio
- ✅ Tokens CSRF protegidos pelo Supabase

### Edge Functions
- ✅ Autenticação obrigatória via service role key
- ✅ Headers CORS configurados
- ✅ Tratamento de erros robusto

---

## 5. Instruções de Configuração

### 1. Executar SQL no Supabase
```bash
# No Supabase Dashboard > SQL Editor
# Execute o conteúdo de: supabase/migrations/agendamentos.sql
```

### 2. Configurar Storage
```sql
-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-agendamentos', 'documentos-agendamentos', true);
```

### 3. Deploy das Edge Functions
```bash
# Fazer deploy da função de email
npx supabase functions deploy send-agendamento-email
```

### 4. Configurar Email (opcional)
Se necessário, criar tabela `email_queue` para fila de emails:
```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario TEXT NOT NULL,
  nome_destinatario TEXT,
  assunto TEXT NOT NULL,
  corpo_html TEXT,
  tipo TEXT,
  referencia_id UUID,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Verificar se espaços têm perfil_agendamento
```sql
-- Atualizar espaços existentes
UPDATE espacos SET perfil_agendamento = true WHERE ativo = true;
```

---

## 6. Arquivos Criados

| Arquivo | Descrição |
|---------|------------|
| `supabase/migrations/agendamentos.sql` | SQL das tabelas, índices, RLS |
| `src/services/agendamentoService.ts` | Service layer para agendamentos |
| `src/hooks/useAgendamentos.ts` | Hooks React para gerenciar estado |
| `supabase/functions/send-agendamento-email/index.ts` | Edge Function para emails |
| `src/components/pages/AgendamentoPublico.tsx` | Tela pública de solicitação |
| `src/components/pages/Agendamento.tsx` | Tela de gestão (coordenador) |
| `src/components/modals/AgendamentoDetalhesModal.tsx` | Modal de detalhes |

---

## 7. Rotas

| Rota | Acesso | Descrição |
|------|--------|------------|
| `/agendamento-publico` | Público | Formulário de solicitação |
| `/agendamento` | Coordenador/Admin | Gestão de agendamentos |

---

## 8. Verificação

### TypeScript
```bash
npx tsc --noEmit
# ✅ Passando (apenas erros de Edge Functions Deno - esperado)
```

### Build
```bash
npm run build
# ✅ Build successful em ~23s
```

---

## Próximos Passos

1. **Executar SQL** no Supabase Dashboard
2. **Deploy Edge Function**: `npx supabase functions deploy send-agendamento-email`
3. **Atualizar espaços**: Setar `perfil_agendamento = true` nos espaços desejados
4. **Testar fluxo completo**: Criar agendamento público → verificar no admin → aprovar/rejeitar

---

## Contato e Suporte

Em caso de dúvidas ou problemas, verificar:
- Documentação da Portaria nº 169/2023
- Logs em `log_auditoria` e `log_agendamentos`
- Console do navegador para erros de frontend