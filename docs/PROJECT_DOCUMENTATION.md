# GVC - Sistema de Gestão de Visitantes Culturais

## 1. Visão Geral do Projeto

**GVC (Gestão de Visitantes Culturais)** é um sistema completo para gerenciamento de visitantes, espaços culturais, agendamentos e check-in/check-out em equipamentos público-culturais.

### Tecnologias Principais
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Estilização**: TailwindCSS v4
- **Animações**: Motion (framer-motion)
- **Tabelas**: date-fns, xlsx, recharts, jspdf

---

## 2. Estrutura de Diretórios

```
src/
├── App.tsx                    # Componente principal com rotas
├── main.tsx                   # Entry point React
├── vite-env.d.ts              #Tipos Vite
├── types.ts                   #Interfaces e tipos globais
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx        # Cabeçalho com logout e notifications
│   │   ├── PageFooter.tsx     # Rodapé informativo
│   │   ├── Sidebar.tsx       # Menu lateral interno
│   │   └── NotificationBell.tsx  # Sino de notificações
│   │
│   ├── modais/
│   │   ├── CheckInModal.tsx  # Modal de check-in
│   │   ├── UserModal.tsx     # Modal de usuário
│   │   ├── SpaceModal.tsx   # Modal de espaço
│   │   └── ConfirmModal.tsx # Modal de confirmação
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx     # Painel principal
│   │   ├── Visitors.tsx     # Lista de visitantes
│   │   ├── Lockers.tsx      # Gerenciamento de armários
│   │   ├── Telecentro.tsx  # Controle de computadores
│   │   ├── Agendamento.tsx # Gerenciamento de agendamentos
│   │   ├── AgendamentoPublico.tsx # Formulário público de agendamento
│   │   ├── Reports.tsx      # Relatórios e-exportação
│   │   ├── Settings.tsx    # Configurações do sistema
│   │   ├── Login.tsx       # Login interno
│   │   ├── LoginPublico.tsx # Loginpúblico
│   │   ├── CadastroPublico.tsx # Cadastro público
│   │   └── TermoCompromisso.tsx # Termo de compromisso
│   │
│   ├── ui/
│   │   ├── CheckinSuccessPopup.tsx   # Popupsucesso check-in
│   │   ├── CheckinBlockedPopup.tsx     # Popupbloqueio check-in
│   │   ├── Skeleton.tsx              # Componente loading
│   │   └── States.tsx               # Estados vazios
│   │
│   ├── settings/
│   │   ├── UsersTab.tsx      # Aba de usuários
│   │   ├── SpacesTab.tsx     # Aba de espaços
│   │   └── AuditoriaTab.tsx  # Aba de auditoria
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Contexto autenticação interna
│   │   └── PublicAuthContext.tsx # Contexto autenticação pública
│   │
│   └── hooks/
│       ├── useAutoCheckout.ts      # Auto check-out
│       ├── useAgendamentos.ts    # Hookagendamentos
│       ├── useDebounce.ts        # Debounce input
│       ├── useDashboardStats.ts # Estatísticas dashboard
│       └── useSessionId.ts       # ID de sessão
│
├── services/                    # Serviços API
│   ├── authService.ts        # Autenticação
│   ├── visitorService.ts   # Visitantes
│   ├── visitService.ts    # Check-in/check-out
│   ├── spaceService.ts   # Espaços
│   ├── agendamentoService.ts # Agendamentos
│   ├── dashboardService.ts # Dashboard
│   ├── cpfService.ts    # Validação CPF Receita
│   ├── auditoria.ts    # Auditoria
��   ├── draftService.ts # Rascunhos
│   └── auditService.ts # Service auditoria
│
├── utils/                    # Utilitários
│   ├── network.ts         # Captura IP público
│   ├── crypto.ts         # Hash SHA-256
│   ├── browser.ts        # Fingerprint navegador
│   ├── datetime.ts      # Timestamp Brasil
│   ├── auditoria.ts      # Funções auditoria
│   └── utils.ts         # Utilitários gerais
│
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   ├── validators.ts   # Validadores CPF/CNPJ
│   └── utils.ts        # Utilitários lib
│
└── hooks/                   # Hooks (mais)
    ├── useAgendamentoDraft.ts # Rascunho agendamento
    ├── useRascunhoAgendamento.ts # Rascunho
    └── useAutoCheckout.ts   # Auto check-out 2
```

---

## 3. Modelo de Dados (Supabase)

### Tabelas Principais

#### `visitors` - Visitantes
```sql
id              UUID PRIMARY KEY
full_name       VARCHAR(255) NOT NULL
cpf             VARCHAR(14) UNIQUE
passport        VARCHAR(50)
is_foreigner    BOOLEAN DEFAULT false
gender          VARCHAR(20)
email           VARCHAR(255)
phone           VARCHAR(20)
category        VARCHAR(20) -- 'general', 'student', 'researcher'
photo_url       VARCHAR(500)
birth_date      DATE
address         TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```
**Políticas RLS:**
- SELECT: Todos usuários autenticados
- INSERT: Administrador, coordenador, funcionário, monitor
- UPDATE: Administrador, coordenador, funcionário, monitor
- DELETE: Apenas administrador

#### `usuarios` - Usuários do Sistema
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
senha           VARCHAR(255) -- Hash bcrypt
perfil          VARCHAR(20) NOT NULL -- 'administrador', 'coordenador', 'funcionario', 'monitor'
espaco_id       UUID REFERENCES espacos(id)
auth_uid        UUID REFERENCES auth.users(id)
ativo           BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `espacos` - Espaços Culturais
```sql
id                     UUID PRIMARY KEY
nome                   VARCHAR(255) NOT NULL
municipio               VARCHAR(100)
endereco               TEXT
total_armarios         INTEGER DEFAULT 0
ativo                 BOOLEAN DEFAULT true
perfil_armarios         BOOLEAN DEFAULT false
perfil_telecentro       BOOLEAN DEFAULT false
perfil_agendamento     BOOLEAN DEFAULT false
mensagem_boas_vindas   TEXT
horario_funcionamento   VARCHAR(50)
capacidade_visitantes  INTEGER
tempo_limite_excedido   INTEGER
total_computadores      INTEGER DEFAULT 0
tempo_limite_computador INTEGER
capacidade_agendamento INTEGER
```

#### `visits` - Registros de Visita
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
visitor_id    UUID REFERENCES visitors(id)
nome          VARCHAR(255)
perfil        VARCHAR(20)
espaco_id     UUID REFERENCES espacos(id)
checkin       TIMESTAMPTZ NOT NULL
checkout     TIMESTAMPTZ
```

#### `agendamentos` - Agendamentos de Espaços
```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Dados do Solicitante
solicitante_nome         TEXT NOT NULL
solicitante_email        TEXT NOT NULL
solicitante_telefone    TEXT NOT NULL
solicitante_documento   TEXT
tipo_solicitante        TEXT NOT NULL CHECK (tipo_solicitante IN ('escola', 'universidade', 'ong', 'empresa', 'pessoa_fisica'))

-- Dados do Agendamento
espaco_id               UUID REFERENCES espacos(id) NOT NULL
espaco_solicitado       TEXT NOT NULL
data_pretendida        DATE NOT NULL
horario_inicio         TIME NOT NULL
horario_fim            TIME NOT NULL
numero_participantes    INTEGER NOT NULL

-- Evento
descricao_evento       TEXT NOT NULL
natureza_evento        TEXT CHECK (natureza_evento IN ('cultural', 'educacional', 'corporativo', 'comunitario', 'outro'))
gratuito               BOOLEAN DEFAULT true
valor_ingresso        DECIMAL(10,2)

-- Status
status                TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado'))

-- Termos de responsabilidade
termo_aceito                    BOOLEAN DEFAULT false
responsabhilidade_evento         BOOLEAN DEFAULT false
danos_patrimonio                BOOLEAN DEFAULT false
respeito_lotacao                 BOOLEAN DEFAULT false

-- Termo de compromisso
termo_compromisso_data            TIMESTAMPTZ
termo_compromisso_ip              VARCHAR(45)
termo_compromisso_hash           TEXT

-- Resposta
resposta_coordenador              TEXT
coordenador_id                  UUID REFERENCES auth.users(id)
respondido_em                   TIMESTAMP

-- Metadados
created_at                      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at                     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Políticas RLS:**
- SELECT: Próprio solicitante + funcionários do espaço + admin
- INSERT: Próprio solicitante + admin/coordenador
- UPDATE: Coordenador/admin do mesmo espaço

**Índices:**
```sql
idx_agendamentos_espaco_id
idx_agendamentos_status
idx_agendamentos_data_pretendida
idx_agendamentos_solicitante_email
idx_agendamentos_created_at
```

#### `assinaturas_digitais` - Registro de Assinaturas Digitais
```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
visitor_id            UUID REFERENCES visitors(id)
nome_assinante         VARCHAR(255) NOT NULL
cpf_assinante         VARCHAR(14) NOT NULL
tipo_documento         VARCHAR(50) NOT NULL
documento_id          UUID
documento_hash        TEXT NOT NULL -- SHA-256
data_hora            TIMESTAMPTZ DEFAULT NOW()
data_hora_brasilia   VARCHAR(50)
ip_publico           VARCHAR(45) NOT NULL
user_agent           TEXT
browser_fingerprint JSONB
cpf_validado         BOOLEAN DEFAULT false
cpf_status           VARCHAR(50)
termo_conteudo        TEXT
termo_hash           TEXT
created_at           TIMESTAMPTZ DEFAULT NOW()
updated_at           TIMESTAMPTZ DEFAULT NOW()
```

**Índices:**
```sql
idx_assinaturas_cpf
idx_assinaturas_visitor
idx_assinaturas_documento
idx_assinaturas_data
idx_assinaturas_hash
idx_assinaturas_ip
```

#### `computadores` - Computadores do Telecentro
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
espaco_id   UUID REFERENCES espacos(id)
numero      INTEGER NOT NULL
status     VARCHAR(20) DEFAULT 'available' -- 'available', 'occupied', 'maintenance'
visitor_id UUID REFERENCES visitors(id)
assigned_at TIMESTAMPTZ
```

#### `lockers` - Armários
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
espaco_id    UUID REFERENCES espacos(id)
number      INTEGER NOT NULL
status      VARCHAR(20) DEFAULT 'available' -- 'available', 'occupied', 'maintenance'
visitor_id  UUID REFERENCES visitors(id)
assigned_at TIMESTAMPTZ
```

#### `auditoria` - Log de Auditoria
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
acao       VARCHAR(50) NOT NULL
detalhes    TEXT
entidade_id UUID
user_id    UUID
user_email VARCHAR(255)
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `documentos_agendamento` - Documentos Anexos
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE CASCADE
nome_arquivo    TEXT NOT NULL
url_arquivo    TEXT NOT NULL
tipo_documento  TEXT CHECK (tipo_documento IN ('termo_assinado', 'comprovante', 'outro'))
uploaded_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 4. Funções e Triggers do Banco

### 4.1 Verificar Conflito de Agendamento
```sql
verificar_conflito_agendamento(
  p_espaco_id UUID,
  p_data DATE,
  p_inicio TIME,
  p_fim TIME,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN
```
Verifica se há agendamento conflitante no mesmo espaço/horário.

### 4.2 Trigger de updated_at automático
```sql
CREATE TRIGGER trigger_update_agendamento_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_agendamento_updated_at();
```

### 4.3 Trigger de Auditoria de Agendamentos
```sql
CREATE TRIGGER trigger_log_agendamento_audit
  AFTER UPDATE ON agendamentos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_agendamento_audit();
```

### 4.4 Tabela de Log de Agendamentos
```sql
log_agendamentos (
  id UUID PRIMARY KEY
  agendamento_id UUID
  acao TEXT NOT NULL  -- 'aprovacao', 'rejeicao', 'cancelamento', 'atualizacao'
  usuario_id UUID
  dados_anteriores JSONB
  dados_novos JSONB
  ip_address TEXT
  created_at TIMESTAMPTZ
)
```

---

## 5. Edge Functions (Supabase)

### 5.1 public-submit-agendamento
**Path:** `supabase/functions/public-submit-agendamento/index.ts`

**Função:** Cria agendamento público via formulário

**Features:**
- Gera ID único de sessão
- Verifica conflitos via `verificar_conflito_agendamento()`
- Insere em `agendamentos`
- Registra em `auditoria`
- Retorna ID do agendamento criado

### 5.2 auto-checkout
**Path:** `supabase/functions/auto-checkout/index.ts`

**Função:** Check-out automático

**Features:**
- Executa a cada 5 minutos
- Verifica check-ins com mais de 60 min
- Atualiza checkout = NOW()
- Libera komputer/armário

### 5.3 send-agendamento-email
**Path:** `supabase/functions/send-agendamento-email/index.ts`

**Função:** Envia emails transacionais

**Templates:**
- Confirmação de agendamento
- Aprovação/rejeição
- Lembrete

### 5.4 register-audit
**Path:** `supabase/functions/register-audit/index.ts`

**Função:** Registra ações em auditoria

**Parâmetros:**
- ação: string
- detalhes: string
- entidade_id: uuid

---

## 6. Autenticação e Autorização

### 4.1 Check-in de Visitante
1. Busca visitante por CPF/passport
2. Se não existir, cria novo visitante
3. Insere registro em `visits` com check-in
4. Sistema bloqueia se já tem check-in ativo nos últimos 60 min
5. Auto check-out após 60 min de inatividade (Edge Function)

### 4.2 Agendamento Público
1. Usuário acessa `/agendamento/formulario`
2. Preenche dados: nome, email, telefone, CPF/CNPJ
3. Seleciona espaço, data, horário
4. Aceita termos de compromisso (checkbox)
5. Sistema valida CPF na Receita Federal (API BrasilAPI)
6. Captura IP público, fingerprint, timestamp
7. Cria hash SHA-256 do documento
8. Salva em `agendamentos` + `assinaturas_digitais`
9. Envia email de confirmação

### 4.3 Aprovação de Agendamento
1. Admin/coordenador acessa `/agendamento`
2. Visualiza lista de agendamentos pendentes
3. Pode aprobar/rejeitar/cancelar
4. Status atualizado automaticamente

---

## 5. Rotas

### Rotas Públicas
| Caminho | Componente | Descrição |
|---------|------------|-----------|
| `/gerenciamento` | Login | Login interno |
| `/agendamento` | LoginPublico | Login público |
| `/agendamento/cadastro` | CadastroPublico | Cadastro público |
| `/agendamento/formulario` | AgendamentoPublico | Formulário |
| `/agendamento/termo` | TermoCompromisso | Termo compromisso |

### Rotas Internas (protegidas)
| Caminho |Componente | Acesso |
|---------|----------|--------|
| `/` | Dashboard | usuário |
| `/visitors` | Visitors | usuário |
| `/lockers` | Lockers | usuário (espaço com armários) |
| `/telecentro` | Telecentro | usuário (espaço com telecentro) |
| `/agendamento` | Agendamento | usuário |
| `/reports` | Reports | coordenador+ |
| `/configuracoes` | Settings | administrador+ |

---

## 6. Autenticação e Autorização

### Perfis de Usuário
| Perfil | Permissões |
|-------|-----------|
| `administrador` | Tudo,incluiettings |
| `coordenador` | Relatórios,aprovações |
| `funcionario` | Check-in,visitors |
| `monitor` | Check-in |
| `cidadao` | Apenas agendamento público |

### Políticas RLS
- Usuários veem apenas dados do próprio espaço
- Admins veem todos os espaços
- Visitantes têm dados vinculados ao CPF

---

## 7. Edge Functions

### `public-submit-agendamento`
- Cria agendamento público
- Gera ID desessião
- Validaconflictos de horário
- Envia notificação interna

### `auto-checkout`
- Executa a cada 5min
- Faz check-out automático após 60 min
- Libera computador/armário

### `send-agendamento-email`
- Envia emails de confirmação
- Templates HTML

### `register-audit`
- Registra ações em auditoria

---

## 8. Integrações Externas

### BrasilAPI (CPF)
- Endpoint: `https://brasilapi.com.br/api/cpf/v1/{cpf}`
- Retorna: nome, situação cadastral
- Usado em: `src/services/cpfService.ts`

### IPify (IP Público)
- Endpoint: `https://api.ipify.org?format=json`
- Captura IP real do usuário

---

## 9. Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxx
```

---

## 10. Scripts npm

```bash
npm run dev      # Inicia servidor dev na porta 3000
npm run build   # Build produção
npm run lint    # Verificação TypeScript
npm run preview # Preview build
```

---

## 11. Regras de Segurança

### Assinatura Digital
- IP públicoreal (não 192.168.x.x)
- Hash SHA-256 do documento
- Validação CPF na Receita
- Fingerprint do navegador
- Timestamp com timezone Brasil
- Registro imutável em banco

### Auditoria
- Todas as ações sensíveis em `auditoria`
- IP, email, timestamp registrado
- RLS ativo em todas tabelas

---

## 12. Histórico de Atualizações Recentes

### Limpezas Feitas (Maio/2026)
- Removido arquivos de backup órfãos
- Renomeado `validateCPF` → `validateCPFReceita`
- Removido console.log de debug
- Adicionado useCallback em Visitors
- Build passando

### Funcionalidades adicionadas
- Validação CPF na Receita Federal
- Captura de IP públicoreal
- Hash SHA-256 de documentos
- Tabela `assinaturas_digitais` blindada
- Fingerprint do navegador

---

## 13. Como Estender

### Adicionar Nova Página
1. Criar componente em `src/components/pages/`
2. Importar em `App.tsx`
3. Adicionar Route com proteção

### Adicionar Nova Tabela
1. Criar no Supabase SQL Editor
2. Configurar RLS policies
3. Criar service em `src/services/`
4. Usar no componente via Supabase client

### Adicionar Validação
1. Adicionar em `src/lib/validators.ts`
2. Usar no form via service

---

_Última atualização: Ma/2026_