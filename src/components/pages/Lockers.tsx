import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  Lock, 
  LockOpen, 
  Unlock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '../layout/PageFooter';

interface Locker {
  id: string;
  number: number;
  status: 'Livre' | 'Ocupado' | 'Manutenção';
  visitorId?: string;
  visitorName?: string;
  updatedAt?: any;
}

export default function Lockers() {
  const { userData, spaceConfig } = useAuth();
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const totalLockersCount = spaceConfig?.totalArmarios || 20;

  useEffect(() => {
    if (!userData) return;

    const isGlobalAdmin = userData.perfil === 'administrador' && 
      (!userData.espacoId || userData.espacoId === 'todos');
    const espacoId = isGlobalAdmin ? null : userData.espacoId;

    const fetchLockers = async () => {
      let q = supabase.from('lockers').select('*');
      if (espacoId) {
        q = q.eq('espaco_id', espacoId);
      }
      
      const { data, error } = await q;
      if (error) {
        console.error("Erro ao carregar armários:", error);
        return;
      }

      const fullList: Locker[] = [];
      for (let i = 1; i <= totalLockersCount; i++) {
        const existing = data.find(l => l.number === i);
        fullList.push(
          existing 
            ? { 
                id: existing.id, 
                number: existing.number, 
                status: existing.status, 
                visitorId: existing.visitor_id, 
                visitorName: existing.visitor_name, 
                updatedAt: existing.updated_at 
              } 
            : { 
                id: `temp-${i}`, 
                number: i, 
                status: 'Livre' 
              }
        );
      }
      setLockers(fullList.sort((a,b) => a.number - b.number));
      setLoading(false);
    };

    fetchLockers();

    const channel = supabase.channel('lockers-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lockers' }, () => {
        fetchLockers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [totalLockersCount, userData]);

  useEffect(() => {
    if (debouncedSearchTerm.length > 2) {
      const searchVisitors = async () => {
        const { data } = await supabase.from('visitors').select('*');
        if (!data) return;

        const filtered = data.filter((v: any) => {
          const searchLower = debouncedSearchTerm.toLowerCase();
          const cleanTokenSearch = searchLower.replace(/[^\d]/g, '');
          const searchTokens = searchLower.split(/\s+/).filter(t => t.length > 0);
          
          const nameMatches = searchTokens.length > 0 && searchTokens.every(token => 
            v.full_name.toLowerCase().includes(token)
          );
          
          const cpfMatches = v.cpf && cleanTokenSearch && v.cpf.replace(/[^\d]/g, '').includes(cleanTokenSearch);
          const passportMatches = v.passport && searchLower && v.passport.toLowerCase().includes(searchLower);
          
          return nameMatches || cpfMatches || passportMatches;
        });

        setSearchResults(filtered.map(v => ({
           id: v.id,
           fullName: v.full_name,
           cpf: v.cpf,
           passport: v.passport
        })).slice(0, 5));
      };

      searchVisitors();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  const handleLockerClick = (locker: Locker) => {
    if (locker.status === 'Ocupado') return;
    
    setSelectedLocker(locker);
    setIsSearchOpen(true);
    setSearchTerm('');
  };

  const assignLocker = async (visitor: any) => {
    if (!selectedLocker || !userData) return;

    const isGlobalAdmin = userData.perfil === 'administrador' && 
      (!userData.espacoId || userData.espacoId === 'todos');
    const targetEspacoId = isGlobalAdmin ? null : userData.espacoId;

    try {
      let q = supabase.from('visits').select('id, local').eq('visitor_id', visitor.id).eq('status', 'Ativo');
      if (targetEspacoId) q = q.eq('espaco_id', targetEspacoId);
      const { data: activeCheckIn } = await q.limit(1);
      
      if (!activeCheckIn || activeCheckIn.length === 0) {
        setToast({ 
          message: 'ERRO: Visitante não possui check-in ativo neste espaço.', 
          type: 'error' 
        });
        setTimeout(() => setToast(null), 5000);
        return;
      }

      if (targetEspacoId) {
        const { data: existing } = await supabase.from('lockers').select('number')
          .eq('espaco_id', targetEspacoId)
          .eq('status', 'Ocupado')
          .eq('visitor_id', visitor.id);
        
        if (existing && existing.length > 0) {
          setToast({ 
            message: `ERRO: Este visitante já possui o armário ${existing[0].number}`, 
            type: 'error' 
          });
          setTimeout(() => setToast(null), 5000);
          return;
        }
      }

      await supabase.from('lockers').insert({
        number: selectedLocker.number,
        status: 'Ocupado',
        visitor_id: visitor.id,
        visitor_name: visitor.fullName,
        espaco_id: targetEspacoId
      });
      
      setToast({ message: `Armário ${selectedLocker.number} ocupado com sucesso!`, type: 'success' });
      setIsSearchOpen(false);
      setSelectedLocker(null);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao ocupar armário.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const releaseLocker = async (locker: Locker) => {
    try {
      await supabase.from('lockers').delete().eq('id', locker.id);
      
      setToast({ message: `Armário ${locker.number} liberado com sucesso!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Erro ao liberar armário:", error);
      setToast({ message: "Erro ao liberar armário. Tente novamente.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Livre': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Ocupado': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Manutenção': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  if (!userData || (spaceConfig && !spaceConfig.perfilArmarios && userData.perfil !== 'administrador')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Módulo de Armários Desativado</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Este espaço cultural não possui o perfil de armários ativo. 
          Entre em contato com o administrador para habilitar esta funcionalidade.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-20 right-8 px-6 py-3 rounded-xl shadow-lg z-[200] flex items-center gap-3 text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Gestão de Armários</h1>
          <p className="text-gray-500 text-sm">Controle de ocupação e chaves para visitantes.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold font-mono">
            <CheckCircle2 size={14} />
            {lockers.filter(l => l.status === 'available').length} LIVRES
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold font-mono">
            <Lock size={14} />
            {lockers.filter(l => l.status === 'occupied').length} OCUPADOS
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
             <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {lockers.map((locker) => (
            <motion.div
              key={locker.id}
              whileHover={{ y: -4 }}
              onClick={() => handleLockerClick(locker)}
              className={`relative overflow-hidden cursor-pointer group bg-white p-6 rounded-2xl border-2 transition-all ${
                locker.status === 'Ocupado' 
                  ? 'border-amber-200 shadow-amber-900/5 shadow-lg' 
                  : 'border-gray-100 hover:border-emerald-200 hover:shadow-emerald-900/5 hover:shadow-lg'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[40px] font-display font-black text-gray-400 group-hover:text-primary transition-colors leading-none">
                  {locker.number.toString().padStart(2, '0')}
                </span>
                {locker.status === 'Ocupado' ? (
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shadow-inner">
                    <Lock size={20} />
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shadow-inner">
                    <LockOpen size={20} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(locker.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    locker.status === 'Livre' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  {locker.status === 'Livre' ? 'Livre' : 'Ocupado'}
                </div>

                {locker.status === 'Ocupado' && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ocupado por:</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{locker.visitorName}</p>
                  </div>
                )}
              </div>

              {locker.status === 'Ocupado' && (
                <div className="mt-4 pt-4 border-t border-amber-50">
                   <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      releaseLocker(locker);
                    }}
                    className="w-full py-3 bg-red-600 text-white rounded-xl text-[11px] font-bold uppercase transition-all hover:bg-red-700 active:scale-95 flex items-center justify-center gap-2 shadow-lg relative z-[70] cursor-pointer"
                   >
                     <Unlock size={14} /> Liberar Armário
                   </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Visitor Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ocupar Armário {selectedLocker?.number}</h3>
                  <p className="text-xs text-gray-500">Busque o visitante pelo nome ou CPF.</p>
                </div>
                <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Nome ou CPF do visitante..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Resultados</p>
                  {searchResults.length > 0 ? (
                    searchResults.map((visitor) => (
                      <button
                        key={visitor.id}
                        onClick={() => assignLocker(visitor)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{visitor.fullName}</p>
                          <p className="text-[10px] font-mono text-gray-400">{visitor.cpf || visitor.passport}</p>
                        </div>
                      </button>
                    ))
                  ) : searchTerm.length > 2 ? (
                    <div className="p-8 text-center text-gray-400 text-sm italic">Nenhum visitante encontrado.</div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-sm">Digite pelo menos 3 caracteres para buscar.</div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer type="lockers" />
    </div>
  );
}
