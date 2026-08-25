import React, { useState } from 'react';
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  Trash2,
} from 'lucide-react';

interface AgendamentoDetalhesModalProps {
  agendamento: {
    id?: string;
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
    responsabhilidade_evento?: boolean;
    danos_patrimonio?: boolean;
    respeito_lotacao?: boolean;
    autorizo_divulgacao?: boolean;
    documento_anexo_url?: string;
    resposta_coordenador?: string;
    espacos?: { nome: string; municipio: string };
  };
  onClose: () => void;
  onStatusChange: (id: string, status: 'aprovado' | 'rejeitado', resposta?: string) => void;
  onDelete?: (id: string) => void;
  loading: boolean;
}

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

const tipoSolicitanteLabels: Record<string, string> = {
  escola: 'Escola',
  universidade: 'Universidade',
  ong: 'ONG',
  empresa: 'Empresa',
  pessoa_fisica: 'Pessoa Física',
};

export default function AgendamentoDetalhesModal({
  agendamento,
  onClose,
  onStatusChange,
  onDelete,
  loading,
}: AgendamentoDetalhesModalProps) {
  const [resposta, setResposta] = useState('');
  const [showConfirm, setShowConfirm] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const handleConfirm = () => {
    if (showConfirm === 'aprovar') {
      onStatusChange(agendamento.id, 'aprovado', resposta || undefined);
    } else if (showConfirm === 'rejeitar') {
      onStatusChange(agendamento.id, 'rejeitado', resposta);
    }
    setShowConfirm(null);
  };
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-6 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Detalhes do Agendamento</h2>
            <p className="text-slate-500 text-sm mt-1">
              Solicitação #{agendamento.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 rounded-2xl p-6">
              <h3 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                <User size={18} />
                Dados do Solicitante
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-indigo-700 font-medium">Nome:</span>{' '}
                  <span className="text-slate-700">{agendamento.solicitante_nome}</span>
                </p>
                <p>
                  <span className="text-indigo-700 font-medium">Tipo:</span>{' '}
                  <span className="text-slate-700">{tipoSolicitanteLabels[agendamento.tipo_solicitante] || agendamento.tipo_solicitante}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={14} className="text-indigo-500" />
                  <span className="text-slate-700">{agendamento.solicitante_email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={14} className="text-indigo-500" />
                  <span className="text-slate-700">{agendamento.solicitante_telefone}</span>
                </p>
                {agendamento.solicitante_documento && (
                  <p>
                    <span className="text-indigo-700 font-medium">Doc:</span>{' '}
                    <span className="text-slate-700">{agendamento.solicitante_documento}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-6">
              <h3 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                <MapPin size={18} />
                Espaço Solicitado
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-emerald-700 font-medium">Espaço:</span>{' '}
                  <span className="text-slate-700">{agendamento.espaco_solicitado}</span>
                </p>
                <p>
                  <span className="text-emerald-700 font-medium">Tipo:</span>{' '}
                  <span className="text-slate-700">{tipoEspacoLabels[agendamento.tipo_espaco] || agendamento.tipo_espaco}</span>
                </p>
                {agendamento.espacos && (
                  <p>
                    <span className="text-emerald-700 font-medium">Local:</span>{' '}
                    <span className="text-slate-700">{agendamento.espacos.nome}</span>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Users size={14} className="text-emerald-500" />
                  <span className="text-slate-700">{agendamento.numero_participantes} participantes</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarDays size={18} />
              Data e Horário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-xl p-4">
                <p className="text-slate-500 mb-1">Data</p>
                <p className="font-semibold text-slate-900">{formatDate(agendamento.data_pretendida)}</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-slate-500 mb-1">Início</p>
                <p className="font-semibold text-slate-900">{formatTime(agendamento.horario_inicio)}</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-slate-500 mb-1">Fim</p>
                <p className="font-semibold text-slate-900">{formatTime(agendamento.horario_fim)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} />
              Detalhes do Evento
            </h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 mb-1">Natureza</p>
                  <p className="font-medium text-slate-900">{naturezaLabels[agendamento.natureza_evento] || agendamento.natureza_evento}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Valor</p>
                  <p className="font-medium text-slate-900">
                    {agendamento.gratuito ? 'Gratuito' : `R$ ${agendamento.valor_ingresso?.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Descrição do Evento</p>
                <p className="text-slate-900">{agendamento.descricao_evento}</p>
              </div>
              {agendamento.necessita_equipamentos && (
                <div>
                  <p className="text-slate-500 mb-1">Equipamentos Necessários</p>
                  <p className="text-slate-900">{agendamento.necessita_equipamentos}</p>
                </div>
              )}
              {agendamento.observacoes && (
                <div>
                  <p className="text-slate-500 mb-1">Observações</p>
                  <p className="text-slate-900">{agendamento.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Termos Aceitos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className={`flex items-center gap-2 p-3 rounded-xl ${agendamento.termo_aceito ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {agendamento.termo_aceito ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="text-sm font-medium">Termo da Portaria 169/2023</span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-xl ${agendamento.responsabhilidade_evento ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {agendamento.responsabhilidade_evento ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="text-sm font-medium">Responsabilidade pelo evento</span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-xl ${agendamento.danos_patrimonio ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {agendamento.danos_patrimonio ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="text-sm font-medium">Responsabilidade por danos</span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-xl ${agendamento.respeito_lotacao ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {agendamento.respeito_lotacao ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="text-sm font-medium">Respeito à lotação máxima</span>
              </div>
            </div>
          </div>

          {agendamento.status === 'pendente' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                Resposta do Coordenador
              </h3>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder={showConfirm === 'rejeitar' ? 'Justificativa obrigatória para rejeição...' : 'Observações (opcional)...'}
                className="w-full p-4 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
              />
            </div>
          )}

          {agendamento.status !== 'pendente' && agendamento.resposta_coordenador && (
            <div className={`border rounded-2xl p-6 ${agendamento.status === 'aprovado' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`font-semibold mb-2 ${agendamento.status === 'aprovado' ? 'text-emerald-900' : 'text-red-900'}`}>
                Resposta do Coordenador
              </h3>
              <p className="text-sm text-slate-700">{agendamento.resposta_coordenador}</p>
            </div>
          )}
        </div>

        {agendamento.status === 'pendente' && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-6 flex items-center justify-end gap-4 rounded-b-3xl">
            {showConfirm ? (
              <>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-6 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || (showConfirm === 'rejeitar' && !resposta)}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50 ${
                    showConfirm === 'aprovar'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Processando...' : showConfirm === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowConfirm('rejeitar')}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <XCircle size={18} />
                  Rejeitar
                </button>
                <button
                  onClick={() => setShowConfirm('aprovar')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <CheckCircle size={18} />
                  Aprovar
                </button>
              </>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}