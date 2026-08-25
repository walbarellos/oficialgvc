import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Visitor, OperationType } from '../../types';
import { 
  Search, 
  UserPlus, 
  Filter, 
  Edit,
  Trash2,
  IdCard,
  ChevronLeft,
  ChevronRight,
  Globe,
  CheckCircle2,
  Users,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import CheckInModal from '../modals/CheckInModal';
import { useAuth } from '../../contexts/AuthContext';
import { CheckinBlockedPopup } from '../ui/CheckinBlockedPopup';
import { CheckinSuccessPopup } from '../ui/CheckinSuccessPopup';

export default function Visitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [spaces, setSpaces] = useState<{id: string, nome: string}[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitorToEdit, setVisitorToEdit] = useState<Visitor | null>(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeVisits, setActiveVisits] = useState<any[]>([]);
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<{visitorName: string; cpf: string; currentSpace: string; checkinTime: string; remainingMinutes: number} | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{visitorName: string; space: string; checkinTime: string} | null>(null);
  
  const { userData, isAdmin } = useAuth();

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('visitors').select('*').order('created_at', { ascending: false }).limit(200);
      
      if (error) {
        console.error('Erro ao buscar visitantes:', error);
        alert('Erro ao buscar visitantes: ' + error.message);
        setVisitors([]);
        return;
      }
      
const mapped = data.map(d => ({
         id: d.id,
         fullName: d.full_name,
         cpf: d.cpf,
         passport: d.passport,
         isForeigner: d.is_foreigner,
         gender: d.gender,
         category: d.category,
         photoUrl: d.photo_url,
         createdAt: d.created_at,
         email: d.email,
         phone: d.phone,
         birthDate: d.birth_date,
         address: d.address,
         parentalAuthorization: d.parental_authorization,
         responsibleName: d.responsible_name,
         responsibleCpf: d.responsible_cpf
       })) as Visitor[];
       setVisitors(mapped);
     } catch (err) {
       console.error("Erro ao carregar visitantes:", err);
     } finally {
       setLoading(false);
     }
  }, []);

  useEffect(() => {
    fetchVisitors();
    if (isAdmin) {
      fetchActiveVisits();
    }

    const channel = supabase.channel('visitors-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchVisitors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchVisitors]);

  useEffect(() => {
    if (userData?.espacoId === 'todos') {
      supabase.from('espacos').select('id, nome').then(({ data }) => {
        if (data) setSpaces(data);
      });
    }
  }, [userData]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o registro de ${name}?`)) {
      try {
        await supabase.from('visitors').delete().eq('id', id);
      } catch (error) {
        console.error("Erro ao deletar", error);
      }
    }
  };

  const isMinor = (birthDate?: string) => {
    if (!birthDate) return false;
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age < 18;
  };

  const handleEdit = (visitor: Visitor) => {
    setVisitorToEdit(visitor);
    setIsModalOpen(true);
  };

  const handleCheckIn = async (visitor: Visitor) => {
    if (saving) return;
    
    let espacoId = userData?.espacoId;
    let espacoNome = userData?.espacoNome;

    if (userData?.espacoId === 'todos') {
      if (!selectedSpaceId) {
        alert("Por favor, selecione um espaço no seletor acima antes de fazer o check-in.");
        return;
      }
      espacoId = selectedSpaceId;
      espacoNome = spaces.find(s => s.id === selectedSpaceId)?.nome || "Entrada Principal";
    }
    
    setSaving(true);
    try {
      const now = new Date();

      // Apenas inserir - o banco que bloqueia duplicados via trigger
      const { error } = await supabase.from('visits').insert({
        visitor_id: visitor.id,
        nome: visitor.fullName,
        perfil: visitor.category || 'general',
        local: espacoNome || 'Entrada Principal',
        espaco_id: espacoId === 'todos' ? null : espacoId,
        status: 'Ativo'
      });

      if (error) {
        console.error("Erro no check-in:", error.message);
        
        // Erro da trigger (bloqueio)
        if (error.message.includes('já possui check-in ativo') || error.message.includes('60 minutos')) {
          // Buscar info do check-in ativo para mostrar
          const { data: activeVisit } = await supabase
            .from('visits')
            .select('id, local, checkin')
            .eq('visitor_id', visitor.id)
            .eq('status', 'Ativo')
            .limit(1);
          
          if (activeVisit && activeVisit.length > 0) {
            const diffMin = Math.floor((now.getTime() - new Date(activeVisit[0].checkin).getTime()) / 60000);
            setBlockedInfo({
              visitorName: visitor.fullName,
              cpf: visitor.cpf || 'Não informado',
              currentSpace: activeVisit[0].local,
              checkinTime: activeVisit[0].checkin,
              remainingMinutes: 60 - diffMin
            });
            setShowBlockedPopup(true);
            setSaving(false);
            return;
          }
        }
        
        throw error;
      }

      // Sucesso
      setShowSuccessPopup(true);
      setSuccessInfo({
        visitorName: visitor.fullName,
        space: espacoNome || 'Entrada Principal',
        checkinTime: now.toISOString()
      });
      setTimeout(() => setShowSuccessPopup(false), 4000);
      fetchVisitors();
    } catch (error: any) {
      console.error("Erro ao realizar checkin:", error);
      setShowError(true);
      setErrorMessage(error.message || 'Erro ao realizar check-in.');
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (visit: any) => {
    if (saving) return;
    if (!confirm(`Confirmar checkout de ${visit.nome}?`)) return;

    setSaving(true);
    try {
      const checkoutTime = new Date().toISOString();
      const { error } = await supabase.from('visits').update({
        checkout: checkoutTime,
        status: 'Concluído'
      }).eq('id', visit.id);

      if (error) throw error;

      setShowSuccessPopup(true);
      setSuccessInfo({
        visitorName: visit.nome,
        space: visit.local || 'Espaço Cultural',
        checkinTime: visit.checkin
      });
      setTimeout(() => setShowSuccessPopup(false), 4000);
      fetchActiveVisits();
    } catch (error) {
      console.error("Erro ao realizar checkout:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUndoCheckIn = async (visit: any) => {
    if (saving) return;
    if (!confirm(`⚠️ Desfazer check-in de ${visit.nome}?\n\nIsso irá excluir o registro de visita. O visitante poderá fazer check-in novamente.`)) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('visits').delete().eq('id', visit.id);

      if (error) throw error;

      setShowSuccessPopup(true);
      setSuccessInfo({
        visitorName: visit.nome,
        space: visit.local || 'Espaço Cultural',
        checkinTime: visit.checkin
      });
      setTimeout(() => setShowSuccessPopup(false), 3000);
      fetchActiveVisits();
    } catch (error) {
      console.error("Erro ao desfazer checkin:", error);
    } finally {
      setSaving(false);
    }
  };

  const fetchActiveVisits = async () => {
    try {
      const { data } = await supabase
        .from('visits')
        .select('*')
        .eq('status', 'Ativo')
        .order('checkin', { ascending: false });
      setActiveVisits(data || []);
    } catch (err) {
      console.error("Erro ao carregar visits ativas:", err);
    }
  };

  const filteredVisitors = visitors.filter(v => {
    //     // console.log('Filtrando visitor:', v.fullName, 'searchTerm:', searchTerm);
      const searchLower = searchTerm.toLowerCase();
      const cleanSearch = searchTerm.replace(/[^\d]/g, '');
      const searchTokens = searchLower.split(/\s+/).filter(t => t.length > 0);
      
      const nameMatches = searchTokens.length > 0 && searchTokens.every(token => 
        v.fullName.toLowerCase().includes(token)
      );
      
      return (
        (searchTokens.length === 0 || nameMatches) ||
        (v.cpf && cleanSearch && v.cpf.includes(cleanSearch)) ||
        (v.passport && searchLower && v.passport.toLowerCase().includes(searchLower))
      );
    });
  
  // console.log('Total visitantes:', visitors.length, 'Filtrados:', filteredVisitors.length);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {showError && (
        <motion.div 
          initial={{ opacity: 0, y: -20, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-8 bg-red-600 text-white px-6 py-4 rounded-xl shadow-xl z-[100] flex items-center gap-3 min-w-[280px]"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="font-bold text-sm">Atenção</p>
            <p className="text-red-100 text-xs mt-0.5 whitespace-pre-line">{errorMessage}</p>
          </div>
        </motion.div>
      )}

      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              <h2 className="font-display font-bold text-purple-900">Check-in Admin</h2>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
            </div>
            <span className="text-sm text-purple-600 font-medium">{activeVisits.length} visita(s) ativa(s)</span>
          </div>
          
          {activeVisits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeVisits.map((visit) => (
                <div key={visit.id} className="bg-white border border-purple-100 rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{visit.nome}</p>
                      <p className="text-xs text-gray-500">{visit.local}</p>
                      <p className="text-xs text-purple-600 mt-1">
                        Check-in: {visit.checkin ? new Date(visit.checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleCheckOut(visit)}
                        disabled={saving}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        Check-Out
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum check-in ativo no momento.</p>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">Registro de Visitantes</h1>
          <p className="text-gray-500 max-w-2xl">Localize indivíduos registrados, verifique credenciais e emita acesso temporário a salas de leitura ou galerias restritas.</p>
        </div>
        <div className="flex items-end gap-4 border-blue-100 hidden sm:flex">
          {userData?.espacoId === 'todos' && (
            <div className="bg-white border text-sm border-gray-200 px-4 py-2 rounded-lg">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Local de Check-in</span>
               <select 
                 value={selectedSpaceId} 
                 onChange={e => setSelectedSpaceId(e.target.value)}
                 className="bg-transparent font-bold text-primary outline-none"
               >
                 <option value="" disabled>Selecione um local</option>
                 {spaces.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
               </select>
            </div>
          )}
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Data Atual</p>
            <p className="text-sm font-mono font-bold text-primary">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Nome, CPF ou Afiliação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => { setVisitorToEdit(null); setIsModalOpen(true); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow-sm"
            >
              <UserPlus size={20} />
              Novo Visitante
            </button>
            <button className="p-3 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-2">
            <IdCard className="text-primary" size={20} />
            <h3 className="font-display font-bold text-gray-900">Resultados do Registro</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Mostrando {filteredVisitors.length} resultados</span>
            
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identificação do Visitante</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Último Acesso</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVisitors.length > 0 ? filteredVisitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-blue-50 overflow-hidden">
                        {visitor.photoUrl ? (
                          <img src={visitor.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{visitor.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{visitor.fullName}</p>
                          {isMinor(visitor.birthDate) && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-widest border border-amber-200">
                              INFANTOJUVENIL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-gray-400">
                            {visitor.isForeigner 
                              ? `PASS: ${visitor.passport}` 
                              : `CPF: ${visitor.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`}
                          </p>
                          {visitor.isForeigner && <Globe size={12} className="text-blue-400" />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Registrado
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{visitor.createdAt ? new Date(visitor.createdAt).toLocaleDateString('pt-BR') : 'Sem registro'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Membro</p>
                  </td>
<td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => handleCheckIn(visitor)}
                         disabled={saving}
                         className={`flex items-center gap-1.5 px-4 py-1.5 text-white rounded font-bold text-[10px] uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                           saving 
                             ? 'bg-gray-400 cursor-wait' 
                             : 'bg-primary hover:bg-blue-900 hover:scale-105 active:scale-95'
                         }`}
                       >
                        {saving ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Check-in'
                        )}
                       </button>
                       <div className="w-px h-6 bg-gray-200 mx-1"></div>
                       <button 
                        onClick={() => handleEdit(visitor)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded transition-all"
                       >
                         <Edit size={16} />
                       </button>
                       <button 
                        onClick={() => handleDelete(visitor.id, visitor.fullName)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhum visitante encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <CheckInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        visitorToEdit={visitorToEdit} 
      />

      {showBlockedPopup && blockedInfo && (
        <CheckinBlockedPopup
          blockedInfo={blockedInfo}
          onClose={() => {
            setShowBlockedPopup(false);
            setBlockedInfo(null);
          }}
        />
      )}

      {showSuccessPopup && successInfo && (
        <CheckinSuccessPopup
          info={successInfo}
          onClose={() => {
            setShowSuccessPopup(false);
            setSuccessInfo(null);
          }}
        />
      )}
    </div>
  );
}
