import { useState, useEffect } from 'react';
import { 
  Building, 
  Database, 
  ShieldCheck, 
  Users,
  MapPin,
  Settings as SettingsIcon,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layout,
  Activity,
  Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import SpacesTab from '../settings/SpacesTab';
import UsersTab from '../settings/UsersTab';
import AuditoriaTab from '../settings/AuditoriaTab';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

export default function Settings() {
  const { userData: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'espacos' | 'usuarios' | 'auditoria'>('espacos');
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalUsers: 0,
    totalLockers: 0
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: spacesData } = await supabase.from('espacos').select('ativo, total_armarios');
      const { count: usersCount } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });

      if (spacesData) {
        const active = spacesData.filter(d => d.ativo !== false).length;
        const lockers = spacesData.reduce((acc, doc) => acc + (doc.total_armarios || 0), 0);
        setStats(prev => ({ ...prev, totalSpaces: active, totalLockers: lockers }));
      }
      if (usersCount !== null) {
        setStats(prev => ({ ...prev, totalUsers: usersCount }));
      }
      setLoading(false);
    };

    fetchStats();

    const spacesChannel = supabase.channel('settings-spaces').on('postgres_changes', { event: '*', schema: 'public', table: 'espacos' }, () => {
      fetchStats();
    }).subscribe();

    const usersChannel = supabase.channel('settings-users').on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
      fetchStats();
    }).subscribe();

    return () => {
      supabase.removeChannel(spacesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportAll = async () => {
    try {

      const { data, error } = await supabase.functions.invoke('export-backup');
      if (error || !data) {
        throw new Error(error?.message || 'Erro desconhecido');
      }

      const jsonString = JSON.stringify(data, null, 2);

      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-gvc-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Backup exportado com sucesso!', 'success');
      await auditService.log({ acao: "exportou_backup", detalhes: "Realizou exportação de backup de segurança", entidadeId: null, userProfile: currentAdmin });
    } catch (error) {
      console.error(error);
      showToast('Erro ao exportar backup.', 'error');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">Painel de Controle</h1>
          <p className="text-gray-500">Configurações globais, gestão de acessos e espaços institucionais.</p>
        </div>
        <button 
          onClick={handleExportAll}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Download size={16} /> Exportar Backup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Building size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Espaços Ativos</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalSpaces}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Package size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Armários na Rede</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalLockers}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-8 mb-2">
        <button 
          onClick={() => setActiveTab('espacos')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'espacos' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center gap-2">
            <Building size={16} /> Espaços Culturais
          </div>
          {activeTab === 'espacos' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'usuarios' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Usuários
          </div>
          {activeTab === 'usuarios' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('auditoria')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'auditoria' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center gap-2">
            <Activity size={16} /> Auditoria
          </div>
          {activeTab === 'auditoria' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
      </div>

      <div className="min-h-[400px] mt-6">
        {activeTab === 'espacos' && (
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 10 }}>
            <SpacesTab />
          </motion.div>
        )}
        {activeTab === 'usuarios' && (
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 10 }}>
            <UsersTab />
          </motion.div>
        )}
        {activeTab === 'auditoria' && (
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 10 }}>
            <AuditoriaTab />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[100] ${
              toast.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
