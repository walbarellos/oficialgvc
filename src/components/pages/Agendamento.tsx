import { auditService } from "../../services/auditService";
import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  FileText,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgendamentos, useDashboardAgendamentos } from '../../hooks/useAgendamentos';
import { useUpdateStatusAgendamento } from '../../hooks/useAgendamentos';
import { spaceService, Space } from '../../services/spaceService';
import type { Agendamento } from '../../services/agendamentoService';
import AgendamentoDetalhesModal from '../modals/AgendamentoDetalhesModal';
import { supabase } from '../../lib/supabase';

interface AgendamentoWithSpace {
  id: string;
  espaco_id: string;
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
  status: string;
  termo_aceito: boolean;
  responsabhilidade_evento?: boolean;
  danos_patrimonio?: boolean;
  respeito_lotacao?: boolean;
  autorizo_divulgacao?: boolean;
  documento_anexo_url?: string;
  resposta_coordenador?: string;
  created_at: string;
  espacos?: { nome: string; municipio: string };
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pendente: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: <AlertCircle size={14} />,
  },
  aprovado: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <CheckCircle size={14} />,
  },
  rejeitado: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <XCircle size={14} />,
  },
  cancelado: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    icon: <XCircle size={14} />,
  },
};

const naturezaLabels: Record<string, string> = {
  cultural: 'Cultural',
  educacional: 'Educacional',
  corporativo: 'Corporativo',
  comunitario: 'Comunitário',
  outro: 'Outro',
};

const tipoEspacoLabels: Record<string, string> = {
  auditorium: 'Auditório',
  sala_reuniao: 'Sala de Reunião',
  area_externa: 'Área Externa',
  visita_guiada: 'Visita Guiada',
  outro: 'Outro',
};

export default function Agendamento() {
  const { userData } = useAuth();
  const [espacoFilter, setEspacoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const itemsPerPage = 10;

  const canAccess = userData?.perfil === 'administrador' || userData?.perfil === 'coordenador';
  const isGlobalAdmin = userData?.perfil === 'administrador' && (userData.espacoId === 'todos' || !userData.espacoId);

  const { stats, loading: loadingStats } = useDashboardAgendamentos(
    !isGlobalAdmin && userData?.espacoId ? userData.espacoId : undefined
  );

  const { agendamentos, loading, refetch } = useAgendamentos({
    espaco_id: !isGlobalAdmin && userData?.espacoId ? userData.espacoId : espacoFilter || undefined,
    status: statusFilter || undefined,
  });

  const { updateStatus, loading: updatingStatus } = useUpdateStatusAgendamento();

  React.useEffect(() => {
    const loadSpaces = async () => {
      const { data } = await spaceService.list();
      if (data) {
        setSpaces(data);
      }
    };
    loadSpaces();
  }, []);

  const filteredAgendamentos = useMemo(() => {
    if (!searchTerm) return agendamentos;
    const term = searchTerm.toLowerCase();
    return agendamentos.filter(
      (a) =>
        a.solicitante_nome?.toLowerCase().includes(term) ||
        a.solicitante_email?.toLowerCase().includes(term) ||
        a.espaco_solicitado?.toLowerCase().includes(term) ||
        a.descricao_evento?.toLowerCase().includes(term)
    );
  }, [agendamentos, searchTerm]);

  const paginatedAgendamentos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAgendamentos.slice(start, start + itemsPerPage);
  }, [filteredAgendamentos, currentPage]);

  const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const handleStatusChange = async (id: string, status: 'aprovado' | 'rejeitado', resposta?: string) => {
    const { error } = await updateStatus(id, status, resposta);
    if (!error) {
      refetch();
      
      // Registrar na auditoria
      await auditService.log({
        acao: `${status}_agendamento`,
        detalhes: `Agendamento ${status} para ${selectedAgendamento?.solicitante_nome}. ${resposta ? 'Motivo: ' + resposta : ''}`,
        entidadeId: id
      });

      try {
        const { error: emailError } = await supabase.functions.invoke('send-agendamento-email', {
          body: JSON.stringify({
            tipo: status === 'aprovado' ? 'aprovacao' : 'rejeicao',
            email_destino: selectedAgendamento?.solicitante_email,
            nome_destino: selectedAgendamento?.solicitante_nome,
            agendamento_id: id,
            dados: {
              espaco: selectedAgendamento?.espaco_solicitado,
              data: formatDate(selectedAgendamento?.data_pretendida || ''),
              horario: `${formatTime(selectedAgendamento?.horario_inicio || '')} - ${formatTime(selectedAgendamento?.horario_fim || '')}`,
              motivo: resposta,
            },
          }),
        });
        if (emailError) throw emailError;
      } catch (emailErr: any) {
        console.error('Erro ao enviar email de status:', emailErr);
        alert('Status atualizado, mas houve um erro ao enviar o email de notificação.');
      }
    } else {
      alert('Erro ao atualizar status: ' + error.message);
    }
    setSelectedAgendamento(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);
    
    if (!error) {
      refetch();
      await auditService.log({
        acao: 'exclusao_agendamento',
        detalhes: `Agendamento ${id} excluído definitivamente.`,
        entidadeId: id
      });
    } else {
      alert('Erro ao excluir agendamento: ' + error.message);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Apenas administradores e coordenadores podem gerenciar agendamentos de espaços.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
          <CalendarDays size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900">
            Agendamento de Espaços
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Gerencie reservas de salas, auditórios e espaços multiuso.
          </p>
        </div>
      </div>

      {!loadingStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Aprovados</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.aprovados}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Rejeitados</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejeitados}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <AlertCircle size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Cancelados</p>
                <p className="text-2xl font-bold text-slate-600">{stats.cancelados}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar solicitante ou evento..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>
            {isGlobalAdmin && (
              <select
                value={espacoFilter}
                onChange={(e) => {
                  setEspacoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os espaços</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.nome}
                  </option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Carregando agendamentos...</p>
          </div>
        ) : filteredAgendamentos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum agendamento encontrado</h3>
            <p className="text-slate-500">
              {searchTerm || espacoFilter || statusFilter
                ? 'Tente ajustar os filtros de busca.'
                : ' Aguarde por novas solicitações.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Solicitante
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Espaço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Data / Horário
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Participantes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAgendamentos.map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{agendamento.solicitante_nome}</p>
                          <p className="text-sm text-slate-500">{agendamento.solicitante_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{agendamento.espaco_solicitado}</p>
                          <p className="text-sm text-slate-500">{tipoEspacoLabels[agendamento.tipo_espaco] || agendamento.tipo_espaco}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays size={14} />
                          <span>{formatDate(agendamento.data_pretendida)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock size={14} />
                          <span>
                            {formatTime(agendamento.horario_inicio)} - {formatTime(agendamento.horario_fim)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users size={14} />
                          <span>{agendamento.numero_participantes}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[agendamento.status]?.bg || 'bg-slate-50'} ${statusColors[agendamento.status]?.text || 'text-slate-600'}`}
                        >
                          {statusColors[agendamento.status]?.icon}
                          {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAgendamento(agendamento)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Eye size={14} />
                            Ver
                          </button>
                          <button
                            onClick={() => handleDelete(agendamento.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            title="Excluir agendamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAgendamentos.length)} de {filteredAgendamentos.length} resultados
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedAgendamento && (
        <AgendamentoDetalhesModal
          agendamento={selectedAgendamento}
          onClose={() => setSelectedAgendamento(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          loading={updatingStatus}
        />
      )}
    </div>
  );
}