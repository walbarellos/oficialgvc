# 🗺️ Mapa do Sistema (GVC - Gerenciador de Visitante Cultural)

## 1. Visão Geral do Sistema
O **GVC** é uma aplicação web voltada para o controle de acesso e monitoramento de atividades em espaços culturais. Ele permite registrar visitantes (brasileiros e estrangeiros), realizar check-ins/check-outs, gerenciar a locação de armários, o uso de computadores (telecentro) e agendamentos. Além disso, fornece painéis em tempo real (dashboards e relatórios) para diferentes perfis hierárquicos (monitores, coordenadores e administradores).

## 2. Arquitetura Atual
A arquitetura baseia-se em **BaaS (Backend as a Service)** com uma Single Page Application (SPA) reativa:
- **Frontend:** React.js com TypeScript, construído através do Vite.
- **Estilização:** TailwindCSS, utilizando animações com `motion/react` e ícones `lucide-react`.
- **Backend/Banco de Dados:** Supabase (PostgreSQL, Supabase Auth, Realtime). Anteriormente utilizava Firebase, mas foi 100% migrado.
- **Gerenciamento de Estado:** React Context API (`AuthContext.tsx` centraliza os dados do usuário, permissões e configurações do espaço atual) aliado a *Local State* nos componentes.
- **Comunicação:** Chamadas assíncronas diretas via SDK do Supabase Client. Atualizações em tempo real são realizadas via WebSockets (`supabase.channel`).

## 3. Modelagem de Dados (Supabase / Postgres)
Com base nos tipos definidos em `src/types.ts` e nas chamadas de banco de dados observadas, o esquema atual consiste nas seguintes entidades principais:

*   **`espacos` (Espaços Culturais):**
    *   Campos: `id`, `nome`, `email`, `endereco`, `municipio`, `horario_funcionamento`, limites e módulos ativos (`perfil_armarios`, `perfil_telecentro`, `perfil_agendamento`, etc.).
    *   *Relacionamento:* 1:N com Usuários, Visitas e Armários.
*   **`usuarios` (Controle de Acesso):**
    *   Campos: `id` (UID do Auth), `nome`, `email`, `perfil` (`administrador`, `coordenador`, `funcionario`, `monitor`), `espaco_id`, `ativo`.
*   **`visitors` (Visitantes Base):**
    *   Campos: `id`, `full_name`, `cpf`, `passport`, `is_foreigner`, `gender`, `category`, `phone`, `email`.
*   **`visits` (Check-ins / Sessões Ativas):**
    *   Campos: `id`, `visitor_id`, `espaco_id`, `checkin` (timestamp), `checkout` (timestamp), `status` (`Ativo`, `Concluído`, `Excedido`), `armario`.
    *   *Relacionamento:* N:1 com `visitors` e `espacos`.
*   **`auditoria` (Logs de Sistema):**
    *   Campos: `id`, `acao`, `detalhes`, `usuario_id`, `usuario` (nome), `timestamp`.

## 4. Endpoints / APIs Identificados
Não há um backend Node.js ativo (apesar do Express constar no `package.json`). As "rotas" do backend são, na verdade, interações diretas via Supabase SDK (PostgREST API):

*   **Autenticação:** `supabase.auth.signInWithPassword`, `supabase.auth.signOut` e validação de sessão em `AuthContext`. Criação de contas paralelas em `UserModal`.
*   **Dashboards & Estatísticas:** Queries complexas na tabela `visits` usando `count: 'exact'`, `gte`, e `lte` filtradas por `espaco_id`.
*   **Realtime Subscriptions:**
    *   `dashboard-updates`: Monitora `INSERT`, `UPDATE` na tabela `visits`.
    *   `visitors-updates`: Monitora `*` na tabela `visitors`.
    *   `auditoria-bell`: Monitora `INSERT` na tabela `auditoria`.
*   **Visitantes & Check-in:** Inserções (`insert`) em `visitors` e submetidas a tabela de check-ins atreladas ao `visitor_id`.

## 5. Pontos de Melhoria Óbvios (Débito Técnico)

### A. Segurança e Autenticação
> [!WARNING]
> **Criação de Usuários Client-Side:** No `UserModal.tsx`, novos usuários são criados utilizando a API regular do Supabase Auth em um cliente secundário (`secondarySupabase.auth.signUp`). Isso não é recomendado em produção, pois expõe o processo de criação de contas.
> **Solução:** Criar uma **Supabase Edge Function** (ou Database RPC protegido via RLS) executada por um `service_role` apenas para perfis de `administrador`, centralizando e ocultando a lógica de criação.

### B. Gestão de Código e Arquitetura
> [!NOTE]
> **Legados e Dependências Órfãs:**
> - O arquivo `src/types.ts` ainda possui a interface `FirestoreErrorInfo` que remete ao Firebase.
> - O `package.json` possui as dependências `express`, `@types/express` e `date-fns` que parecem subutilizadas ou não necessárias no contexto puramente frontend Serverless.

### C. Experiência do Usuário (UX) e Tratamento de Erros
> [!TIP]
> - **Loading States:** Algumas requisições assíncronas ativam um loader global, impedindo interação com o app. Recomenda-se utilizar "Skeleton Loaders" (carregamento progressivo de partes da tela) especialmente no `Dashboard.tsx`.
> - **Validação de Formulários:** Modais dependem muito de validação manual com `alert()`. Seria mais profissional substituir isso por bibliotecas de validação como **Zod + React Hook Form** junto com toasts de notificação (`Sonner` ou `react-hot-toast`), evitando bloqueios do navegador.
> - **Tratamento de Sessão Expirada:** O sistema deve capturar eventos de falha de token de forma silenciosa e redirecionar para a tela de login mantendo uma mensagem clara.

### D. Organização de Código
> [!IMPORTANT]
> **Componentes Gigantes:** Componentes como `SpaceModal.tsx` e `Dashboard.tsx` têm lógicas muito extensas acopladas (queries HTTP + Estado Local + UI + Validação). Eles podem ser divididos em sub-componentes ou refatorados usando custom hooks (ex: `useDashboardStats()`, `useVisitors()`).
