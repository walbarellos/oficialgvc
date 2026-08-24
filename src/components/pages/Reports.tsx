import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  MapPin, 
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Calendar,
  Monitor,
  Users
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  BarChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Bar 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { normalizarVisita, traduzirPerfil } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../modals/ConfirmModal';

interface Visit {
  id: string;
  nome: string;
  perfil: string;
  local: string;
  espacoId?: string;
  checkin: any;
  checkout: any;
  status: 'Ativo' | 'Concluído' | 'Excedido';
  visitorId: string;
}

export default function Reports() {
  const { userData: currentAdmin } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);

  // Nov dados para gráficos
  const [genderData, setGenderData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number }[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Telecentro stats
  const [telecentroStats, setTelecentroStats] = useState({
    acessosHoje: 0,
    tempoMedio: 0,
    livres: 0,
    emUso: 0,
    excedidos: 0
  });
  const [loadingTelecentro, setLoadingTelecentro] = useState(false);
  
  // Dados do Telecentro para impressão
  const [telecentroPrintData, setTelecentroPrintData] = useState<any[]>([]);

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); 
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().split('T')[0];
  });

  const isRestrictedCoord = currentAdmin?.perfil === 'coordenador' && currentAdmin?.espacoId !== 'todos';

  const [filterLocation, setFilterLocation] = useState('Todos os Locais');
  const [filterProfile, setFilterProfile] = useState('Todos os Perfis');
  const [filterStatus, setFilterStatus] = useState('Todos os Status');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchConfigAndLocations = async () => {
      const { data: configData } = await supabase.from('configuracoes').select('*').eq('id', 'sistema').single();
      if (configData) setConfig(configData.data || {});

      const { data: locData } = await supabase.from('espacos').select('*').order('nome');
      if (locData) setLocations(locData);
    };

    fetchConfigAndLocations();

    const configChannel = supabase.channel('config-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, (payload: any) => {
      if (payload.new && payload.new.id === 'sistema') setConfig(payload.new.data || {});
    }).subscribe();

    const spacesChannel = supabase.channel('spaces-updates-reports').on('postgres_changes', { event: '*', schema: 'public', table: 'espacos' }, () => {
      supabase.from('espacos').select('*').order('nome').then(({ data }) => {
        if (data) setLocations(data);
      });
    }).subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(spacesChannel);
    };
  }, []);

  useEffect(() => {
    if (isRestrictedCoord && currentAdmin?.espacoId) {
      setFilterLocation(currentAdmin.espacoId);
    }
  }, [isRestrictedCoord, currentAdmin]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      let q = supabase.from('visits').select('*')
        .gte('checkin', new Date(startDate + 'T00:00:00').toISOString())
        .lte('checkin', new Date(endDate + 'T23:59:59').toISOString())
        .order('checkin', { ascending: false });

      if (filterLocation !== 'Todos os Locais' && filterLocation !== 'todos') {
        q = q.eq('espaco_id', filterLocation);
      }

      if (filterProfile !== 'Todos os Perfis') {
        q = q.eq('perfil', filterProfile);
      }

      if (filterStatus !== 'Todos os Status') {
        q = q.eq('status', filterStatus);
      }

      const { data, error } = await q;

      if (error) throw error;
      
      const fetchedVisits = (data || []).map(doc => normalizarVisita(doc)) as Visit[];
      setVisits(fetchedVisits);
      setCurrentPage(0);
    } catch (error: any) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funções para gráficos de Gênero e Faixa Etária
  const fetchGenderAndAgeData = async () => {
    setLoadingCharts(true);
    try {
      // Filtrar visitantes pelo período e localização
      let visitsQuery = supabase.from('visits').select('visitor_id, espaco_id, checkin')
        .gte('checkin', new Date(startDate + 'T00:00:00').toISOString())
        .lte('checkin', new Date(endDate + 'T23:59:59').toISOString());

      if (filterLocation !== 'Todos os Locais' && filterLocation !== 'todos') {
        visitsQuery = visitsQuery.eq('espaco_id', filterLocation);
      }

      const { data: visitsData } = await visitsQuery;

      if (!visitsData || visitsData.length === 0) {
        setGenderData([]);
        setAgeData([
          { name: '0-12 anos', value: 0 },
          { name: '13-17 anos', value: 0 },
          { name: '18-24 anos', value: 0 },
          { name: '25-35 anos', value: 0 },
          { name: '36-50 anos', value: 0 },
          { name: '51-65 anos', value: 0 },
          { name: '66+ anos', value: 0 },
          { name: 'Não informado', value: 0 }
        ]);
        setLoadingCharts(false);
        return;
      }

      // Obter IDs únicos de visitantes no período
      const visitorIds = [...new Set(visitsData.map(v => v.visitor_id))];

      // Buscar dados dos visitantes
      const { data: visitorsData } = await supabase
        .from('visitors')
        .select('id, gender, birth_date')
        .in('id', visitorIds);

      if (!visitorsData) {
        setLoadingCharts(false);
        return;
      }

      // Processar dados de gênero
      const genderCounts = {
        'Masculino': 0,
        'Feminino': 0
      };

      visitorsData.forEach(v => {
        if (v.gender === 'Masculino' || v.gender === 'masculino') {
          genderCounts['Masculino']++;
        } else if (v.gender === 'Feminino' || v.gender === 'feminino') {
          genderCounts['Feminino']++;
        }
        // Ignora valores nulos ou outros
      });

      setGenderData(
        Object.entries(genderCounts)
          .filter(([_, value]) => value > 0)
          .map(([name, value]) => ({
            name,
            value,
            color: name === 'Masculino' ? '#3B82F6' : '#EC4899'
          }))
      );

      // Processar dados de faixa etária
      const ageGroups = {
        '0-12 anos': 0,
        '13-17 anos': 0,
        '18-24 anos': 0,
        '25-35 anos': 0,
        '36-50 anos': 0,
        '51-65 anos': 0,
        '66+ anos': 0,
        'Não informado': 0
      };

      const calculateAge = (birthDate: string): number | null => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age >= 0 ? age : null;
      };

      visitorsData.forEach(v => {
        if (v.birth_date) {
          const age = calculateAge(v.birth_date);
          if (age !== null) {
            if (age <= 12) ageGroups['0-12 anos']++;
            else if (age <= 17) ageGroups['13-17 anos']++;
            else if (age <= 24) ageGroups['18-24 anos']++;
            else if (age <= 35) ageGroups['25-35 anos']++;
            else if (age <= 50) ageGroups['36-50 anos']++;
            else if (age <= 65) ageGroups['51-65 anos']++;
            else ageGroups['66+ anos']++;
          } else {
            ageGroups['Não informado']++;
          }
        } else {
          ageGroups['Não informado']++;
        }
      });

      setAgeData([
        { name: '0-12 anos', value: ageGroups['0-12 anos'] },
        { name: '13-17 anos', value: ageGroups['13-17 anos'] },
        { name: '18-24 anos', value: ageGroups['18-24 anos'] },
        { name: '25-35 anos', value: ageGroups['25-35 anos'] },
        { name: '36-50 anos', value: ageGroups['36-50 anos'] },
        { name: '51-65 anos', value: ageGroups['51-65 anos'] },
        { name: '66+ anos', value: ageGroups['66+ anos'] },
        { name: 'Não informado', value: ageGroups['Não informado'] }
      ]);

    } catch (error) {
      console.error("Erro ao carregar dados de gráficos:", error);
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    fetchGenderAndAgeData();
  }, [startDate, endDate, filterLocation]);

// Fetch Telecentro stats
  const loadTelecentroData = () => {
    setLoadingTelecentro(true);
    (async () => {
      try {
        let query = supabase.from('computadores').select('*');
        if (filterLocation && filterLocation !== 'Todos os Locais' && filterLocation !== 'todos') {
          query = query.eq('espaco_id', filterLocation);
        }
        const { data: comps } = await query;
        
        if (!comps) {
          setTelecentroStats({ acessosHoje: 0, tempoMedio: 0, livres: 0, emUso: 0, excedidos: 0 });
          setTelecentroPrintData([]);
          setLoadingTelecentro(false);
          return;
        }

        const startDatetime = new Date(startDate + 'T00:00:00').toISOString();
        const endDatetime = new Date(endDate + 'T23:59:59').toISOString();

        const acessosPeriodo = comps.filter(c => c.horario_inicio && new Date(c.horario_inicio) >= new Date(startDatetime) && new Date(c.horario_inicio) <= new Date(endDatetime));
        const ativos = comps.filter(c => c.status === 'Em Uso');
        const livres = comps.filter(c => c.status === 'Livre' || !c.status).length;
        const emUso = ativos.length;
        const excedidos = comps.filter(c => c.status === 'Excedido').length;

        const usedWithTime = comps.filter(c => c.horario_inicio && c.horario_limite);
        let tempoMedio = 0;
        if (usedWithTime.length > 0) {
          const totalMinutes = usedWithTime.reduce((acc, c) => acc + (new Date(c.horario_limite).getTime() - new Date(c.horario_inicio).getTime()) / 60000, 0);
          tempoMedio = Math.round(totalMinutes / usedWithTime.length);
        }

        setTelecentroStats({ acessosHoje: acessosPeriodo.length, tempoMedio, livres, emUso, excedidos });
        setTelecentroPrintData(acessosPeriodo);
      } catch (error) {
        console.error("Erro ao carregar stats do telecentro:", error);
      } finally {
        setLoadingTelecentro(false);
      }
    })();
  };

  // Carregar Telecentro quando filtros mudam
  useEffect(() => {
    loadTelecentroData();
  }, [startDate, endDate, filterLocation]);

  const handleExportExcel = async () => {
    // Dados de Visitantes
    const visitData = visits.map(v => {
      const status = v.status as string;
      return {
        'ID Registro': `V-${v.id.slice(0, 4).toUpperCase()}`,
        'Nome do Visitante': v.nome,
        'Perfil': traduzirPerfil(v.perfil),
        'Local de Acesso': v.local,
        'Horário Entrada': v.checkin ? format(new Date(v.checkin), 'dd/MM/yyyy HH:mm') : 'N/A',
        'Horário Saída': v.checkout ? format(new Date(v.checkout), 'dd/MM/yyyy HH:mm') : 'Pendente',
        'Situação': status === 'Ativo' ? 'ENTRADA' : (status === 'Concluído' || status === 'Excedido' ? 'SAÍDA' : status)
      };
    });

    const wsVisits = XLSX.utils.json_to_sheet(visitData);
    wsVisits['!cols'] = [
      {wch: 12}, {wch: 35}, {wch: 15}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 15}
    ];

    // Dados do Telecentro
    let telecentroData: any[] = [];
    try {
      let query = supabase.from('computadores').select('*');
      if (filterLocation && filterLocation !== 'Todos os Locais' && filterLocation !== 'todos') {
        query = query.eq('espaco_id', filterLocation);
      }
      const { data: comps } = await query;

      if (comps && comps.length > 0) {
        const startDatetime = new Date(startDate + 'T00:00:00').toISOString();
        const endDatetime = new Date(endDate + 'T23:59:59').toISOString();

        telecentroData = comps
          .filter(c => c.horario_inicio && new Date(c.horario_inicio) >= new Date(startDatetime) && new Date(c.horario_inicio) <= new Date(endDatetime))
          .map(c => ({
            'PC': c.numero,
            'Usuário': c.usuario_nome || c.usuarioNome || '-',
            'Espaço': c.espaco_nome || c.espacoNome || '-',
            'Início': c.horario_inicio ? format(new Date(c.horario_inicio), 'dd/MM/yyyy HH:mm') : '-',
            'Término': c.horario_limite ? format(new Date(c.horario_limite), 'dd/MM/yyyy HH:mm') : '-',
            'Status': c.status || 'Desconhecido'
          }));
      }
    } catch (e) {
      console.error("Erro ao buscar dados do Telecentro:", e);
    }

    const wsTelecentro = XLSX.utils.json_to_sheet(telecentroData);
    wsTelecentro['!cols'] = [
      {wch: 8}, {wch: 30}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 15}
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsVisits, "Visitantes");
    if (telecentroData.length > 0) {
      XLSX.utils.book_append_sheet(wb, wsTelecentro, "Telecentro");
    }
    XLSX.writeFile(wb, `relatorio-gvc-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  useEffect(() => {
    if (isRestrictedCoord) {
      if (filterLocation === currentAdmin?.espacoId) {
        fetchVisits();
      }
    } else {
      fetchVisits();
    }
  }, [isRestrictedCoord, filterLocation, currentAdmin?.espacoId]);

  const confirmDelete = async () => {
    if (!visitToDelete) return;
    try {
      await supabase.from('visits').delete().eq('id', visitToDelete.id);
      setVisits(prev => prev.filter(v => v.id !== visitToDelete.id));
      await auditService.log({ acao: "excluiu_visita", detalhes: `Excluiu registro de visita de ${visitToDelete.nome} em ${visitToDelete.local}`, entidadeId: visitToDelete.id, userProfile: currentAdmin });
    } catch (error) {
      alert("Erro ao excluir registro.");
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleDelete = (visit: Visit) => {
    setVisitToDelete(visit);
    setIsDeleteModalOpen(true);
  };

  const paginatedData = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return visits.slice(start, end);
  }, [visits, currentPage]);

  const totalPages = Math.ceil(visits.length / itemsPerPage) || 1;

  const peakHour = useMemo(() => {
    if (visits.length === 0) return 'N/A';
    const hours = visits.map(v => {
      if (!v.checkin) return -1;
      const date = new Date(v.checkin);
      return date.getHours();
    }).filter(h => h !== -1);
    
    if (hours.length === 0) return 'N/A';

    const counts: Record<number, number> = {};
    hours.forEach(h => counts[h] = (counts[h] || 0) + 1);
    const peak = Object.keys(counts).reduce((a, b) => counts[Number(a)] > counts[Number(b)] ? a : b);
    return `${peak}h - ${Number(peak) + 1}h (${counts[Number(peak)]} visitas)`;
  }, [visits]);

  const formatVisitTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '?';
  };

  const formatVisitDateTime = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return format(date, 'dd/MM HH:mm');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-emerald-100 text-emerald-800';
      case 'Concluído':
        return 'bg-blue-100 text-blue-800';
      case 'Excedido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
       <div className="print-only mb-10 text-center border-b pb-6">
         <h1 className="text-3xl font-bold text-gray-900">Relatório de Visitas - GVC</h1>
         <p className="text-gray-500 text-sm mt-2">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
       </div>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">Relatórios de Visitas</h1>
          <p className="text-gray-500">Logs detalhados e análises de visitas institucionais.</p>
        </div>
        <div className="flex gap-3 no-print">
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <FileText size={16} /> Exportar PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Inicial</label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-3 pr-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Final</label>
            <div className="relative">
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-3 pr-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Localização</label>
            <select 
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              disabled={isRestrictedCoord}
              className={`w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all ${isRestrictedCoord ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {!isRestrictedCoord && <option value="Todos os Locais">Todos os Locais</option>}
              {isRestrictedCoord ? (
                <option value={currentAdmin?.espacoId}>{currentAdmin?.espacoNome}</option>
              ) : (
                locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.nome}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Perfil</label>
            <select 
              value={filterProfile}
              onChange={(e) => setFilterProfile(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all"
            >
              <option value="Todos os Perfis">Todos os Perfis</option>
              <option value="general">Visitante</option>
              <option value="student">Estudante</option>
              <option value="researcher">Pesquisador</option>
            </select>
          </div>
          <div className="flex items-end lg:col-span-1">
            <button 
              onClick={() => {
                fetchVisits();
                loadTelecentroData();
              }}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
            >
              <Filter size={16} /> Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Telecentro Stats */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-6 no-print">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Monitor className="text-indigo-600" size={18} />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 text-sm">Telecentro</h3>
            <p className="text-xs text-indigo-600">Estatísticas em tempo real</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{loadingTelecentro ? '...' : telecentroStats.acessosHoje}</p>
            <p className="text-xs text-gray-500">Acessos (Período)</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{loadingTelecentro ? '...' : telecentroStats.emUso}</p>
            <p className="text-xs text-gray-500">Em Uso</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{loadingTelecentro ? '...' : telecentroStats.livres}</p>
            <p className="text-xs text-gray-500">Livres</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{loadingTelecentro ? '...' : telecentroStats.excedidos}</p>
            <p className="text-xs text-gray-500">Excedidos</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{loadingTelecentro ? '...' : `${telecentroStats.tempoMedio}min`}</p>
            <p className="text-xs text-gray-500">Tempo Médio</p>
          </div>
        </div>
      </div>

      {/* Stats Summary - CLEAN DESIGN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 no-print">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-left">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Total de Visitas
          </p>
          <p className="text-4xl font-bold text-gray-900 mt-2">
            {loading ? '---' : visits.length.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Registradas {config?.institutionName ? `no(a) ${config.institutionName}` : 'na instituição'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-left">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Horário de Pico
          </p>
          <p className="text-4xl font-bold text-primary mt-2">
            {loading ? '---' : peakHour}
          </p>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
            <Clock size={12} /> Horário com maior fluxo de entrada
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm" id="reports-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">ID</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Visitante</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Perfil</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Local</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Entrada / Saída</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-4 bg-gray-50/50 h-16"></td>
                    </tr>
                  ))
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((visit) => (
                    <motion.tr 
                      key={visit.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 transition-colors text-sm"
                    >
                      <td className="px-4 py-4 text-gray-400 text-xs">V-{visit.id.slice(0, 4).toUpperCase()}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {getInitials(visit.nome)}
                          </div>
                          <span className="font-sans font-semibold text-gray-900">{visit.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {traduzirPerfil(visit.perfil)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-sans text-gray-500">{visit.local}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-gray-900 font-bold text-xs">
                            {visit.checkin ? formatVisitDateTime(visit.checkin) : '-'}
                          </p>
                          {visit.checkout && (
                            <p className="text-gray-400 text-xs">
                              → {formatVisitDateTime(visit.checkout)}
                            </p>
                          )}
                          {!visit.checkout && (
                            <p className="text-primary animate-pulse italic text-xs font-bold">
                              EM CURSO
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(visit.status)}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                             (visit.status as string) === 'Ativo' ? 'bg-emerald-500' : ((visit.status as string) === 'Concluído' ? 'bg-blue-500' : 'bg-red-500')
                          }`} />
                          {(visit.status as string) === 'Ativo' ? 'ENTRADA' : ((visit.status as string) === 'Concluído' ? 'SAÍDA' : visit.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right no-print">
                         <div className="flex justify-end gap-2">
                            <button className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-100 rounded-lg">
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(visit)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-sans italic">
                      Nenhum registro encontrado para este período e filtros.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 font-sans no-print">
           <span className="text-left">
             Mostrando {visits.length > 0 ? currentPage * itemsPerPage + 1 : 0}-
             {Math.min((currentPage + 1) * itemsPerPage, visits.length)} de {visits.length}
           </span>
           <div className="flex gap-2">
             <button 
               onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
               disabled={currentPage === 0 || loading}
               className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all font-bold text-xs uppercase"
             >
               <ChevronLeft size={16} /> Anterior
             </button>
             <button 
               onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
               disabled={currentPage >= totalPages - 1 || loading}
               className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all font-bold text-xs uppercase"
             >
               Próximo <ChevronRight size={16} />
             </button>
</div>
        </div>

        {/* Telecentro Section - Print Only */}
        {telecentroPrintData.length > 0 && (
          <div className="print-only mt-8">
            <div className="mb-6 text-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Telecentro - Uso de Computadores</h2>
              <p className="text-gray-500 text-sm">Período: {startDate} a {endDate}</p>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">PC</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Espaço</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Início</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Término</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {telecentroPrintData.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm">{c.numero}</td>
                    <td className="px-4 py-2 text-sm">{c.usuario_nome || c.usuarioNome || '-'}</td>
                    <td className="px-4 py-2 text-sm">{c.espaco_nome || c.espacoNome || '-'}</td>
                    <td className="px-4 py-2 text-sm">{c.horario_inicio ? format(new Date(c.horario_inicio), 'dd/MM/yyyy HH:mm') : '-'}</td>
                    <td className="px-4 py-2 text-sm">{c.horario_limite ? format(new Date(c.horario_limite), 'dd/MM/yyyy HH:mm') : '-'}</td>
                    <td className="px-4 py-2 text-sm">{c.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Novos Gráficos: Gênero e Faixa Etária */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Gráfico de Gênero */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
            Visitantes por Gênero
          </h3>
          {loadingCharts ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Carregando...</div>
            </div>
          ) : genderData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} visitantes`, 'Quantidade']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de Faixa Etária */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
            Visitantes por Faixa Etária
          </h3>
          {loadingCharts ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Carregando...</div>
            </div>
          ) : ageData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} visitantes`, 'Quantidade']}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Registro"
        message="Deseja excluir permanentemente este registro de visita?"
        itemText={visitToDelete ? `Visita de ${visitToDelete.nome} em ${visitToDelete.local}` : ''}
      />
    </div>
  );
}
