import { supabase } from '../lib/supabase';

export interface Agendamento {
  id?: string;
  espaco_id: string;
  protocolo?: string;
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone: string;
  solicitante_documento?: string;
  tipo_solicitante: string;
  tipo_espaco: string;
  espaco_solicitado: string;
  data_pretendida: string;
  horario_inicio: string;
  horario_fim: string;
  numero_participantes: number;
  descricao_evento: string;
  natureza_evento: string;
  gratuito: boolean;
  valor_ingresso?: number;
  necessita_equipamentos?: string;
  observacoes?: string;
  status?: string;
  termo_aceito: boolean;
  termo_aceito_em?: string;
  responsabhilidade_evento?: boolean;
  danos_patrimonio?: boolean;
  respeito_lotacao?: boolean;
  autorizo_divulgacao?: boolean;
  documento_anexo_url?: string;
  resposta_coordenador?: string;
  coordenador_id?: string;
  respondido_em?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgendamentoFilter {
  espaco_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface DashboardAgendamentos {
  total: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
  cancelados: number;
}

export const agendamentoService = {
  async list(filters?: AgendamentoFilter) {
    let query = supabase
      .from('agendamentos')
      .select('*, espacos(nome, municipio)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.espaco_id) {
      query = query.eq('espaco_id', filters.espaco_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.data_inicio) {
      query = query.gte('data_pretendida', filters.data_inicio);
    }
    if (filters?.data_fim) {
      query = query.lte('data_pretendida', filters.data_fim);
    }

    const { data, error } = await query;
    return { data: data as unknown as (Agendamento & { espacos: { nome: string; municipio: string } })[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, espacos(nome, municipio)')
      .eq('id', id)
      .single();
    return { data: data as unknown as Agendamento & { espacos: { nome: string; municipio: string } }, error };
  },

  async create(agendamento: Omit<Agendamento, 'id' | 'status' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert({
        ...agendamento,
        termo_aceito_em: agendamento.termo_aceito ? new Date().toISOString() : null,
      })
      .select()
      .single();
    return { data: data as Agendamento, error };
  },

  async updateStatus(
    id: string,
    status: 'aprovado' | 'rejeitado' | 'cancelado',
    resposta?: string
  ) {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({
        status,
        resposta_coordenador: resposta,
        respondido_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Agendamento, error };
  },

  async getDashboardStats(espacoId?: string) {
    let query = supabase
      .from('agendamentos')
      .select('status', { count: 'exact' });

    if (espacoId) {
      query = query.eq('espaco_id', espacoId);
    }

    const { data, error } = await query;
    
    if (error) return { data: null, error };

    const stats: DashboardAgendamentos = {
      total: 0,
      pendentes: 0,
      aprovados: 0,
      rejeitados: 0,
      cancelados: 0,
    };

    if (data) {
      stats.total = data.length;
      stats.pendentes = data.filter(d => d.status === 'pendente').length;
      stats.aprovados = data.filter(d => d.status === 'aprovado').length;
      stats.rejeitados = data.filter(d => d.status === 'rejeitado').length;
      stats.cancelados = data.filter(d => d.status === 'cancelado').length;
    }

    return { data: stats, error: null };
  },

  async getConflitos(espacoId: string, data: string, inicio: string, fim: string, excludeId?: string) {
    const { data: conflitos, error } = await supabase
      .from('agendamentos')
      .select('id, data_pretendida, horario_inicio, horario_fim, espaco_solicitado')
      .eq('espaco_id', espacoId)
      .eq('data_pretendida', data)
      .neq('status', 'rejeitado')
      .neq('status', 'cancelado')
      .or(`horario_inicio.lt.${fim},horario_fim.gt.${inicio}`)
      .neq('id', excludeId || '00000000-0000-0000-0000-000000000000');

    return { data: conflitos as Agendamento[], error };
  },

  async getAvailableDates(espacoId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('agendamentos')
      .select('data_pretendida, horario_inicio, horario_fim')
      .eq('espaco_id', espacoId)
      .gte('data_pretendida', startDate)
      .lte('data_pretendida', endDate)
      .neq('status', 'rejeitado')
      .neq('status', 'cancelado');

    return { data, error };
  },

  async uploadDocumento(agendamentoId: string, arquivo: File, tipo: 'termo_assinado' | 'comprovante' | 'outro') {
    const fileName = `${agendamentoId}/${tipo}_${Date.now()}_${arquivo.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos-agendamentos')
      .upload(fileName, arquivo);

    if (uploadError) return { data: null, error: uploadError };

    const { data: docData, error: docError } = await supabase
      .from('documentos_agendamento')
      .insert({
        agendamento_id: agendamentoId,
        nome_arquivo: arquivo.name,
        url_arquivo: fileName, // Armazena o path relativo para usar com createSignedUrl depois
        tipo_documento: tipo,
      })
      .select()
      .single();

    return { data: docData, error: docError };
  },

  async getDocumentos(agendamentoId: string) {
    const { data, error } = await supabase
      .from('documentos_agendamento')
      .select('*')
      .eq('agendamento_id', agendamentoId)
      .order('uploaded_at', { ascending: false });

    return { data, error };
  },
};