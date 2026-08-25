import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Monitor, 
  MonitorOff, 
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  X,
  UserPlus,
  Clock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '../layout/PageFooter';

interface Computador {
  id: string;
  numero: number;
  status: 'Livre' | 'Em Uso' | 'Excedido';
  usuarioId?: string;
  usuarioNome?: string;
  horarioInicio?: any;
  horarioLimite?: any;
  espacoId?: string;
  espacoNome?: string;
}

export default function Telecentro() {
  const { userData, spaceConfig } = useAuth();
  const [computadores, setComputadores] = useState<Computador[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComputador, setSelectedComputador] = useState<Computador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tick, setTick] = useState(0);

  const totalComputadoresCount = spaceConfig?.totalComputadores || 10;
  const limiteMaximoMinutos = spaceConfig?.tempoLimiteComputador || 30;

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userData) return;

    const isGlobalAdmin = userData.perfil === 'administrador' && 
      (!userData.espacoId || userData.espacoId === 'todos');
    const espacoId = isGlobalAdmin ? null : userData.espacoId;

    const fetchComputadores = async () => {
      let q = supabase.from('computadores').select('*');
      if (espacoId) {
        q = q.eq('espaco_id', espacoId);
      }
      
      const { data, error } = await q;
      if (error) {
        console.error("Erro ao carregar computadores:", error);
        return;
      }

      const fullList: Computador[] = [];
      for (let i = 1; i <= totalComputadoresCount; i++) {
        const existing = data.find(c => c.numero === i);
        fullList.push(existing ? {
          id: existing.id,
          numero: existing.numero,
          status: existing.status as any,
          usuarioId: existing.usuario_id,
          usuarioNome: existing.usuario_nome,
          horarioInicio: existing.horario_inicio,
          horarioLimite: existing.horario_limite,
          espacoId: existing.espaco_id,
          espacoNome: existing.espaco_nome
        } : { 
          id: `temp-pc-${i}`, 
          numero: i, 
          status: 'Livre' 
        });
      }
      
      setComputadores(fullList.sort((a,b) => a.numero - b.numero));
      setLoading(false);
    };

    fetchComputadores();

    const channel = supabase.channel('computadores-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'computadores' }, () => {
        fetchComputadores();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [totalComputadoresCount, userData]);

  useEffect(() => {
    if (searchTerm.length > 2) {
      const searchVisitors = async () => {
        const { data } = await supabase.from('visitors').select('*');
        if (!data) return;

        const filtered = data.filter((v: any) => {
          const searchLower = searchTerm.toLowerCase();
          const cleanTokenSearch = searchLower.replace(/[^\d]/g, '');
          const searchTokens = searchLower.split(/\s+/).filter(t => t.length > 0);
          
          const nameMatches = searchTokens.length > 0 && searchTokens.every(token => 
            v.full_name.toLowerCase().includes(token)
          );
          
          const cpfMatches = v.cpf && cleanTokenSearch && v.cpf.includes(cleanTokenSearch);
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
  }, [searchTerm, userData]);

  const abrirBuscaVisitante = (computador: Computador) => {
    if (computador.status !== 'Livre') return;
    setSelectedComputador(computador);
    setIsSearchOpen(true);
    setSearchTerm('');
  };

  const iniciarComputador = async (visitante: any) => {
    if (!selectedComputador || !userData) return;

    const isGlobalAdmin = userData.perfil === 'administrador' && 
      (!userData.espacoId || userData.espacoId === 'todos');
    const targetEspacoId = isGlobalAdmin ? null : userData.espacoId;

    try {
      let q = supabase.from('visits').select('id, local').eq('visitor_id', visitante.id).eq('status', 'Ativo');
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
        const { data: existing } = await supabase.from('computadores').select('numero')
          .eq('espaco_id', targetEspacoId)
          .in('status', ['Em Uso', 'Excedido'])
          .eq('usuario_id', visitante.id);
        
        if (existing && existing.length > 0) {
          setToast({ 
            message: `ERRO: Este visitante já está utilizando o computador ${existing[0].numero}`, 
            type: 'error' 
          });
          setTimeout(() => setToast(null), 5000);
          return;
        }
      }

      const agora = new Date();
      const limite = new Date(agora.getTime() + limiteMaximoMinutos * 60000);

      await supabase.from('computadores').insert({
        numero: selectedComputador.numero,
        status: 'Em Uso',
        usuario_id: visitante.id,
        usuario_nome: visitante.fullName,
        espaco_id: targetEspacoId,
        espaco_nome: userData.espacoNome || '',
        horario_inicio: agora.toISOString(),
        horario_limite: limite.toISOString()
      });
      
      setToast({ message: `Computador ${selectedComputador.numero} iniciado com sucesso!`, type: 'success' });
      setIsSearchOpen(false);
      setSelectedComputador(null);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao iniciar computador.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const liberarComputador = async (computadorId: string) => {
    try {
      await supabase.from('computadores').delete().eq('id', computadorId);
      
      setToast({ message: `Computador liberado com sucesso!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Erro ao liberar computador:", error);
      setToast({ message: "Erro ao liberar computador. Tente novamente.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const formatarHora = (timestamp: any) => {
    if (!timestamp) return "--:--";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const calcularTempoRestante = (horarioLimite: any) => {
    if (!horarioLimite) return null;
    const agora = new Date();
    const limite = new Date(horarioLimite);
    const diff = limite.getTime() - agora.getTime();
    
    if (diff <= 0) return { minutos: 0, segundos: 0, excedido: true };
    
    const minutos = Math.floor(diff / 60000);
    const segundos = Math.floor((diff % 60000) / 1000);
    
    return { minutos, segundos, excedido: false };
  };

  const formatarTimer = (tempo: any) => {
    if (!tempo) return "00:00";
    if (tempo.excedido) return "00:00";
    return `${String(tempo.minutos).padStart(2, "0")}:${String(tempo.segundos).padStart(2, "0")}`;
  };

  const calcularPorcentagem = (tempoRestante: any) => {
    if (!tempoRestante || tempoRestante.excedido) return 0;
    const totalSegundos = tempoRestante.minutos * 60 + tempoRestante.segundos;
    const totalMaximoSegundos = limiteMaximoMinutos * 60;
    const perc = (totalSegundos / totalMaximoSegundos) * 100;
    return perc > 100 ? 100 : perc;
  };

  const obterStatusComputador = (computador: Computador) => {
    if (computador.status === "Livre") return "Livre";
    
    const agora = new Date();
    const limite = computador.horarioLimite ? new Date(computador.horarioLimite) : null;
    
    if (limite && agora > limite) {
      return "Excedido";
    }
    return "Em Uso";
  };

  if (!userData || (spaceConfig && !spaceConfig.perfilTelecentro && userData.perfil !== 'administrador')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Módulo de Telecentro Desativado</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Este espaço cultural não possui o perfil de telecentro ativo. 
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
          <h1 className="text-3xl font-display font-bold text-gray-900">Terminal de Pesquisa</h1>
          <p className="text-gray-500 text-sm">Controle de uso de computadores e contagem regressiva de tempo.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs font-bold font-mono">
            <CheckCircle2 size={14} />
            {computadores.filter(l => obterStatusComputador(l) === 'Livre').length} LIVRES
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold font-mono">
            <Monitor size={14} />
            {computadores.filter(l => obterStatusComputador(l) === 'Em Uso').length} EM USO
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold font-mono">
            <AlertCircle size={14} />
            {computadores.filter(l => obterStatusComputador(l) === 'Excedido').length} EXCEDIDOS
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
             <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {computadores.map((computador) => {
            const status = obterStatusComputador(computador);
            const tempoRestante = computador.status !== "Livre" ? calcularTempoRestante(computador.horarioLimite) : null;
            
            return (
              <div key={computador.id} className={`bg-white rounded-xl shadow-sm border-2 p-4 relative z-40 transition-colors ${
                  status === "Livre" ? "border-blue-300" : 
                  status === "Excedido" ? "border-red-400" : "border-blue-300"
                }`}
              >
                <div className="flex justify-center mb-2">
                  <Monitor className={`w-12 h-12 ${
                    status === "Livre" ? "text-blue-500" : 
                    status === "Excedido" ? "text-red-500" : "text-blue-500"
                  }`} />
                </div>
                
                <h3 className="text-center font-bold text-lg">
                  PC {computador.numero.toString().padStart(2, "0")}
                </h3>
                
                <div className="flex justify-center my-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status === "Livre" ? "bg-blue-100 text-blue-700" :
                    status === "Excedido" ? "bg-red-100 text-red-700 animate-pulse" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {status === "Livre" ? "LIVRE" : 
                     status === "Excedido" ? "EXCEDIDO" : "EM USO"}
                  </span>
                </div>
                
                {computador.usuarioNome && (
                  <p className="text-center text-sm font-medium text-gray-700 mt-1 truncate" title={computador.usuarioNome}>
                    {computador.usuarioNome}
                  </p>
                )}
                
                {status !== "Livre" && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Tempo Restante</p>
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className={`text-2xl font-mono font-bold ${
                        status === "Excedido" ? "text-red-600 animate-pulse" : 
                        (tempoRestante?.minutos || 0) < 5 ? "text-yellow-600" : "text-green-600"
                      }`}>
                        {formatarTimer(tempoRestante)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className={`h-1.5 rounded-full transition-all duration-1000 ${
                        status === "Excedido" ? "bg-red-500" : 
                        (tempoRestante?.minutos || 0) < 5 ? "bg-yellow-500" : "bg-green-500"
                      }`} style={{ width: `${calcularPorcentagem(tempoRestante)}%` }} />
                    </div>
                    
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                      <span>Início: {formatarHora(computador.horarioInicio)}</span>
                      <span>Fim: {formatarHora(computador.horarioLimite)}</span>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  {status === "Livre" ? (
                    <button
                      onClick={() => abrirBuscaVisitante(computador)}
                      className="relative z-50 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                      type="button"
                    >
                      <UserPlus className="w-4 h-4" />
                      Iniciar Uso
                    </button>
                  ) : (
                    <button
                      onClick={() => liberarComputador(computador.id)}
                      className="relative z-50 w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                      type="button"
                    >
                      <Unlock className="w-4 h-4" />
                      Liberar Computador
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-[110]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Iniciar Computador {selectedComputador?.numero}</h3>
                  <p className="text-xs text-gray-500">Busque o visitante pelo nome ou CPF.</p>
                </div>
                <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-gray-100 rounded-full" type="button">
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
                        type="button"
                        onClick={() => iniciarComputador(visitor)}
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
                  type="button"
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

      <Footer type="telecentro" />
    </div>
  );
}
