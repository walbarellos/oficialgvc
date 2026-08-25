import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, AlertCircle, 
  MapPin, 
  Mail, 
  Clock, 
  Users, 
  Package, 
  Bell, 
  Info, 
  Search, 
  Monitor, 
  CalendarDays, 
  ClipboardList,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

interface SpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceToEdit?: any;
}

const MUNICIPARIOS_ACRE = [
  "Acrelândia", "Assis Brasil", "Brasiléia", "Bujari", "Capixaba", 
  "Cruzeiro do Sul", "Epitaciolândia", "Feijó", "Jordão", "Mâncio Lima", 
  "Manoel Urbano", "Marechal Thaumaturgo", "Plácido de Castro", "Porto Acre", 
  "Porto Walter", "Rio Branco", "Rodrigues Alves", "Santa Rosa do Purus", 
  "Sena Madureira", "Senador Guiomard", "Tarauacá", "Xapuri"
];

const SpaceModal: React.FC<SpaceModalProps> = ({ isOpen, onClose, spaceToEdit }) => {
  const { userData: currentAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [showMunicipioList, setShowMunicipioList] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    endereco: '',
    municipio: '',
    horarioFuncionamento: 'Seg-Sex: 8h-18h, Sáb: 8h-12h',
    capacidadeVisitantes: 100,
    mensagemBoasVindas: '',
    tempoLimiteExcedido: 4,
    ativo: true,
    perfilArmarios: true,
    perfilTelecentro: false,
    perfilAgendamento: false,
    totalArmarios: 20,
    totalComputadores: 10,
    tempoLimiteComputador: 20,
    capacidadeAgendamento: 0,
    hasAuditorio: false,
    qtdAuditorio: 0,
    hasSalaEstudos: false,
    qtdSalaEstudos: 0,
    hasTeatro: false,
    qtdTeatro: 0,
    hasFilmoteca: false,
    qtdFilmoteca: 0,
    hasEspacoAberto: false,
    qtdEspacoAberto: 0,
    hasVisitaGuiada: false,
    qtdVisitaGuiada: 0
  });

  useEffect(() => {
    
    if (spaceToEdit) {
      setFormData({
        nome: spaceToEdit.nome || '',
        email: spaceToEdit.email || '',
        endereco: spaceToEdit.endereco || '',
        municipio: spaceToEdit.municipio || '',
        horarioFuncionamento: spaceToEdit.horario_funcionamento || spaceToEdit.horarioFuncionamento || 'Seg-Sex: 8h-18h, Sáb: 8h-12h',
        capacidadeVisitantes: spaceToEdit.capacidade_visitantes || spaceToEdit.capacidadeVisitantes || 100,
        mensagemBoasVindas: spaceToEdit.mensagem_boas_vindas || spaceToEdit.mensagemBoasVindas || '',
        tempoLimiteExcedido: spaceToEdit.tempo_limite_excedido || spaceToEdit.tempoLimiteExcedido || 4,
        ativo: spaceToEdit.ativo !== false,
        perfilArmarios: spaceToEdit.perfil_armarios !== false && spaceToEdit.perfilArmarios !== false,
        perfilTelecentro: !!(spaceToEdit.perfil_telecentro || spaceToEdit.perfilTelecentro),
        perfilAgendamento: !!(spaceToEdit.perfil_agendamento || spaceToEdit.perfilAgendamento),
        totalArmarios: spaceToEdit.total_armarios || spaceToEdit.totalArmarios || 20,
        totalComputadores: spaceToEdit.total_computadores || spaceToEdit.totalComputadores || 10,
        tempoLimiteComputador: spaceToEdit.tempo_limite_computador || spaceToEdit.tempoLimiteComputador || 20,
        capacidadeAgendamento: spaceToEdit.capacidade_agendamento || spaceToEdit.capacidadeAgendamento || 0,
        hasAuditorio: spaceToEdit.has_auditorio || false,
        qtdAuditorio: spaceToEdit.qtd_auditorio || 0,
        hasSalaEstudos: spaceToEdit.has_sala_estudos || false,
        qtdSalaEstudos: spaceToEdit.qtd_sala_estudos || 0,
        hasTeatro: spaceToEdit.has_teatro || false,
        qtdTeatro: spaceToEdit.qtd_teatro || 0,
        hasFilmoteca: spaceToEdit.has_filmoteca || false,
        qtdFilmoteca: spaceToEdit.qtd_filmoteca || 0,
        hasEspacoAberto: spaceToEdit.has_espaco_aberto || false,
        qtdEspacoAberto: spaceToEdit.qtd_espaco_aberto || 0,
        hasVisitaGuiada: spaceToEdit.has_visita_guiada || false,
        qtdVisitaGuiada: spaceToEdit.qtd_visita_guiada || 0
      });
      setMunicipioSearch(spaceToEdit.municipio || '');
    } else {
      setFormData({
        nome: '',
        email: '',
        endereco: '',
        municipio: '',
        horarioFuncionamento: 'Seg-Sex: 8h-18h, Sáb: 8h-12h',
        capacidadeVisitantes: 100,
        mensagemBoasVindas: '',
        tempoLimiteExcedido: 4,
        ativo: true,
        perfilArmarios: true,
        perfilTelecentro: false,
        perfilAgendamento: false,
        totalArmarios: 20,
        totalComputadores: 10,
        tempoLimiteComputador: 20,
        capacidadeAgendamento: 0,
        hasAuditorio: false,
        qtdAuditorio: 0,
        hasSalaEstudos: false,
        qtdSalaEstudos: 0,
        hasTeatro: false,
        qtdTeatro: 0,
        hasFilmoteca: false,
        qtdFilmoteca: 0,
        hasEspacoAberto: false,
        qtdEspacoAberto: 0,
        hasVisitaGuiada: false,
        qtdVisitaGuiada: 0
      });
      setMunicipioSearch('');
    }
  }, [spaceToEdit, isOpen]);

  const filteredMunicipios = useMemo(() => {
    return MUNICIPARIOS_ACRE.filter(m => 
      m.toLowerCase().includes(municipioSearch.toLowerCase())
    );
  }, [municipioSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.endereco || !formData.municipio) {
      setErrorMsg('Preencha todos os campos obrigatórios (*)');
      return;
    }

    if (formData.perfilArmarios && (formData.totalArmarios < 5 || formData.totalArmarios > 50)) {
      setErrorMsg('O total de armários deve ser entre 5 e 50.');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        nome: formData.nome,
        email: formData.email,
        endereco: formData.endereco,
        municipio: formData.municipio,
        horario_funcionamento: formData.horarioFuncionamento,
        capacidade_visitantes: formData.capacidadeVisitantes,
        mensagem_boas_vindas: formData.mensagemBoasVindas,
        tempo_limite_excedido: formData.tempoLimiteExcedido,
        ativo: formData.ativo,
        perfil_armarios: formData.perfilArmarios,
        perfil_telecentro: formData.perfilTelecentro,
        perfil_agendamento: formData.perfilAgendamento,
        total_armarios: formData.totalArmarios,
        total_computadores: formData.totalComputadores,
        tempo_limite_computador: formData.tempoLimiteComputador,
        capacidade_agendamento: formData.capacidadeAgendamento,
        has_auditorio: formData.hasAuditorio,
        qtd_auditorio: formData.qtdAuditorio,
        has_sala_estudos: formData.hasSalaEstudos,
        qtd_sala_estudos: formData.qtdSalaEstudos,
        has_teatro: formData.hasTeatro,
        qtd_teatro: formData.qtdTeatro,
        has_filmoteca: formData.hasFilmoteca,
        qtd_filmoteca: formData.qtdFilmoteca,
        has_espaco_aberto: formData.hasEspacoAberto,
        qtd_espaco_aberto: formData.qtdEspacoAberto,
        has_visita_guiada: formData.hasVisitaGuiada,
        qtd_visita_guiada: formData.qtdVisitaGuiada
      };

      if (spaceToEdit) {
        const { error: updateError } = await supabase.from('espacos').update(dataToSave).eq('id', spaceToEdit.id);
        if (updateError) {
          console.error('Erro ao atualizar:', updateError);
          setErrorMsg('Erro ao salvar: ' + updateError.message);
          setLoading(false);
          return;
        }
        await auditService.log({ acao: "editou_espaco", detalhes: `Editou espaço cultural ${formData.nome}`, entidadeId: spaceToEdit.id, userProfile: currentAdmin });
      } else {
        const { data, error } = await supabase.from('espacos').insert([dataToSave]).select().single();
        if (error) throw error;
        if (data) {
          await auditService.log({ acao: "criou_espaco", detalhes: `Criou novo espaço cultural ${formData.nome}`, entidadeId: data.id, userProfile: currentAdmin });
        }
      }
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMsg('Erro ao salvar espaço.');
    } finally {
      setLoading(false);
    }
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900">
                {spaceToEdit ? `Editar ${spaceToEdit.nome}` : 'Novo Espaço Cultural'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Configure as informações e limites desta unidade.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {errorMsg && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium text-red-900">{errorMsg}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 pb-10 scrollbar-hide">
            {/* Seção 1: Dados do Espaço */}
            <div className="text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <ClipboardList size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Dados do Espaço</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nome do Espaço Cultural *</label>
                  <input 
                    type="text" 
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})}
                    placeholder="Ex: BIBLIOTECA PÚBLICA ESTADUAL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans uppercase"
                    style={{ textTransform: 'uppercase' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Email Institucional *</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="adonay@instituicao.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                      required
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Município *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={municipioSearch}
                      onFocus={() => setShowMunicipioList(true)}
                      onChange={e => {
                        setMunicipioSearch(e.target.value);
                        setShowMunicipioList(true);
                      }}
                      placeholder="Busca Município..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                      required
                    />
                    <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  {showMunicipioList && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[110] max-h-48 overflow-y-auto">
                      {filteredMunicipios.length > 0 ? filteredMunicipios.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, municipio: m});
                            setMunicipioSearch(m);
                            setShowMunicipioList(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {m}
                        </button>
                      )) : (
                        <p className="p-3 text-xs text-slate-400 italic">Nenhum município encontrado</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Endereço Completo *</label>
                  <input 
                    type="text" 
                    value={formData.endereco}
                    onChange={e => setFormData({...formData, endereco: e.target.value})}
                    placeholder="Av. Brasil, 123 - Centro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Nova Seção: Perfis do Espaço */}
            <div className="text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                  <ClipboardList size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Perfis do Espaço</h3>
              </div>
              
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ative os módulos disponíveis nesta unidade</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Perfil: Armários */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.perfilArmarios ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={formData.perfilArmarios}
                          onChange={e => setFormData({...formData, perfilArmarios: e.target.checked})}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <Package size={14} className={formData.perfilArmarios ? 'text-blue-500' : 'text-slate-400'} />
                            Armários
                          </label>
                          <p className="text-[10px] text-slate-500">Guarda-volumes para visitantes</p>
                          
                          {formData.perfilArmarios && (
                            <div className="mt-3 py-2 border-t border-slate-100">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total de Armários (5-50)</label>
                              <input 
                                type="number" 
                                value={formData.totalArmarios}
                                onChange={e => setFormData({...formData, totalArmarios: Number(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Perfil: Telecentro */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.perfilTelecentro ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={formData.perfilTelecentro}
                          onChange={e => setFormData({...formData, perfilTelecentro: e.target.checked})}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <Monitor size={14} className={formData.perfilTelecentro ? 'text-indigo-500' : 'text-slate-400'} />
                            Telecentro
                          </label>
                          <p className="text-[10px] text-slate-500">Computadores para pesquisa</p>
                          
                          {formData.perfilTelecentro && (
                            <div className="mt-3 py-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qtd IDs (5-30)</label>
                                <input 
                                  type="number" 
                                  value={formData.totalComputadores}
                                  onChange={e => setFormData({...formData, totalComputadores: Number(e.target.value)})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tempo (min)</label>
                                <input 
                                  type="number" 
                                  value={formData.tempoLimiteComputador}
                                  onChange={e => setFormData({...formData, tempoLimiteComputador: Number(e.target.value)})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Perfil: Agendamento */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.perfilAgendamento ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={formData.perfilAgendamento}
                          onChange={e => setFormData({...formData, perfilAgendamento: e.target.checked})}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex-1">
                          <label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <CalendarDays size={14} className={formData.perfilAgendamento ? 'text-amber-500' : 'text-slate-400'} />
                            Agendamento
                          </label>
                          <p className="text-[10px] text-slate-500">Agendamento de espaços e eventos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {formData.perfilAgendamento && (
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Tipos de Espaços Disponíveis (para agendamento)
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: 'hasAuditorio', qtdKey: 'qtdAuditorio', label: '🎭 Auditório' },
                        { key: 'hasSalaEstudos', qtdKey: 'qtdSalaEstudos', label: '📚 Sala de Estudos' },
                        { key: 'hasTeatro', qtdKey: 'qtdTeatro', label: '🎬 Teatro' },
                        { key: 'hasFilmoteca', qtdKey: 'qtdFilmoteca', label: '🎥 Filmoteca/Cinema' },
                        { key: 'hasEspacoAberto', qtdKey: 'qtdEspacoAberto', label: '🌳 Espaço Aberto' },
                        { key: 'hasVisitaGuiada', qtdKey: 'qtdVisitaGuiada', label: '🎓 Visita Guiada' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={formData[item.key as keyof typeof formData] as boolean}
                            onChange={e => setFormData({...formData, [item.key]: e.target.checked})}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-medium text-slate-700 w-40">{item.label}</span>
                          {formData[item.key as keyof typeof formData] && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">Capacidade Total:</span>
                              <input 
                                type="number" 
                                min="0"
                                value={formData[item.qtdKey as keyof typeof formData] as number}
                                onChange={e => setFormData({...formData, [item.qtdKey]: Number(e.target.value)})}
                                placeholder="0"
                                className="w-16 bg-slate-50 border border-slate-200 rounded py-1.5 px-2 text-xs text-center focus:ring-2 focus:ring-amber-200 outline-none"
                              />
                              <span className="text-[10px] text-slate-400">lugares</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Configurações do Espaço */}
            <div className="text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <SettingsIcon size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configurações Gerais</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Horário de Funcionamento</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.horarioFuncionamento}
                      onChange={e => setFormData({...formData, horarioFuncionamento: e.target.value})}
                      placeholder="Seg-Sex: 8h-18h"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                    />
                    <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Capacidade de Visitantes</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.capacidadeVisitantes}
                      onChange={e => setFormData({...formData, capacidadeVisitantes: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                    />
                    <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Mensagem de Boas-Vindas</label>
                  <textarea 
                    value={formData.mensagemBoasVindas}
                    onChange={e => setFormData({...formData, mensagemBoasVindas: e.target.value})}
                    placeholder="Ex: Bem-vindo ao espaço!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans min-h-[100px]"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 py-2">
                   <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.ativo}
                      onChange={e => setFormData({...formData, ativo: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-bold text-slate-600 uppercase tracking-widest">Espaço Ativo</span>
                  </label>
                </div>
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl shrink-0 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Salvando...'
              ) : (
                <>
                  <Save size={16} />
                  Salvar Espaço
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SpaceModal;
