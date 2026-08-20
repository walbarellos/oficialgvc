import { supabase } from '../lib/supabase';

export interface AgendamentoDraft {
  id?: string;
  session_id: string;
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone: string;
  solicitante_documento: string;
  tipo_solicitante: string;
  razao_social: string;
  nome_instituicao: string;
  secretaria_governo: string;
  unidade_governo: string;
  espaco_id: string;
  tipo_espaco: string;
  espaco_solicitado: string;
  data_pretendida: string;
  horario_inicio: string;
  horario_fim: string;
  numero_participantes: number;
  descricao_evento: string;
  natureza_evento: string;
  gratuito: boolean;
  valor_ingresso: string;
  necessita_equipamentos: string;
  observacoes: string;
  termo_aceito: boolean;
  responsabhilidade_evento: boolean;
  danos_patrimonio: boolean;
  respeito_lotacao: boolean;
  autorizo_divulgacao: boolean;
  termo_compromisso_assinado: boolean;
  termo_compromisso_data: string;
  termo_compromisso_ip: string;
  current_step: number;
}

const SESSION_KEY = 'gvc_session_id';

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export const draftService = {
  async saveDraft(data: AgendamentoDraft): Promise<boolean> {
    try {
      const sessionId = getSessionId();
      const { error } = await supabase.rpc('salvar_rascunho_agendamento', {
        p_session_id: sessionId,
        p_dados: JSON.stringify({
          ...data,
          currentStep: data.current_step
        })
      });

      if (error) {
        console.error('Erro ao salvar rascunho no banco:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Erro ao salvar rascunho:', e);
      return false;
    }
  },

  async loadDraft(): Promise<AgendamentoDraft | null> {
    try {
      const sessionId = getSessionId();
      const { data, error } = await supabase
        .from('agendamentos_rascunho')
        .select('*')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        session_id: data.session_id,
        solicitante_nome: data.solicitante_nome || '',
        solicitante_email: data.solicitante_email || '',
        solicitante_telefone: data.solicitante_telefone || '',
        solicitante_documento: data.solicitante_documento || '',
        tipo_solicitante: data.tipo_solicitante || 'pessoa_fisica',
        razao_social: data.razao_social || '',
        nome_instituicao: data.nome_instituicao || '',
        secretaria_governo: data.secretaria_governo || '',
        unidade_governo: data.unidade_governo || '',
        espaco_id: data.espaco_id || '',
        tipo_espaco: data.tipo_espaco || '',
        espaco_solicitado: data.espaco_solicitado || '',
        data_pretendida: data.data_pretendida || '',
        horario_inicio: data.horario_inicio || '',
        horario_fim: data.horario_fim || '',
        numero_participantes: data.numero_participantes || 0,
        descricao_evento: data.descricao_evento || '',
        natureza_evento: data.natureza_evento || 'cultural',
        gratuito: data.gratuito !== false,
        valor_ingresso: data.valor_ingresso || '',
        necessita_equipamentos: data.necessita_equipamentos || '',
        observacoes: data.observacoes || '',
        termo_aceito: data.termo_aceito || false,
        responsabhilidade_evento: data.responsabhilidade_evento || false,
        danos_patrimonio: data.danos_patrimonio || false,
        respeito_lotacao: data.respeito_lotacao || false,
        autorizo_divulgacao: data.autorizo_divulgacao || false,
        termo_compromisso_assinado: data.termo_compromisso_assinado || false,
        termo_compromisso_data: data.termo_compromisso_data || '',
        termo_compromisso_ip: data.termo_compromisso_ip || '',
        current_step: data.current_step || 1
      };
    } catch (e) {
      console.error('Erro ao carregar rascunho:', e);
      return null;
    }
  },

  async clearDraft(): Promise<boolean> {
    try {
      const sessionId = getSessionId();
      const { error } = await supabase.rpc('limpar_rascunho_agendamento', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('Erro ao limpar rascunho:', error);
        return false;
      }

      sessionStorage.removeItem(SESSION_KEY);
      return true;
    } catch (e) {
      console.error('Erro ao limpar rascunho:', e);
      return false;
    }
  },

  getSessionId
};