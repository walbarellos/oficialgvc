import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Lock as LockIcon, 
  FileText, 
  Settings as SettingsIcon, 
  HelpCircle, 
  LogOut, 
  Plus,
  Monitor,
  CalendarDays,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  onNewCheckIn: () => void;
}

export default function Sidebar({ onNewCheckIn }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, userData, spaceConfig, logout, isAdmin, isCoordinator, isStaff } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Painel', path: '/' },
    { icon: Users, label: 'Visitantes', path: '/visitors' },
    { 
      icon: LockIcon, 
      label: 'Armários', 
      path: '/lockers',
      hidden: spaceConfig && !spaceConfig.perfilArmarios && userData?.perfil !== 'administrador'
    },
    { 
      icon: Monitor, 
      label: 'Telecentro', 
      path: '/telecentro',
      hidden: !spaceConfig?.perfilTelecentro && userData?.perfil !== 'administrador'
    },
    { 
      icon: CalendarDays, 
      label: 'Agendamento', 
      path: '/agendamento',
      hidden: !spaceConfig?.perfilAgendamento && userData?.perfil !== 'administrador'
    },
    { icon: FileText, label: 'Relatórios', path: '/reports', hidden: !['coordenador', 'administrador'].includes(userData?.perfil || '') },
    { icon: SettingsIcon, label: 'Configurações', path: '/configuracoes' }
  ].filter(item => {
    if (item.hidden) return false;
    return hasPermission(item.path);
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-gray-200 flex flex-col z-50">
      <div className="p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shrink-0">
            G
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg text-gray-900 leading-tight">GVC</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
              {userData?.espacoId === 'todos' || !userData?.espacoId ? 'Gestão Cultural' : userData?.espacoNome}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        {(isAdmin || isCoordinator || isStaff) && (
          <button 
            onClick={onNewCheckIn}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
          >
            <Plus size={18} />
            Novo Check-in
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path || (location.pathname === '/' && item.path === '/painel');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                active 
                  ? 'bg-blue-50 text-primary border-l-4 border-primary font-bold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <item.icon size={20} className={active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 mb-2 mx-4 rounded-xl">
        <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{userData?.nome || 'Usuário'}</p>
        <div className="flex flex-col gap-1.5 mt-2">
          <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
            userData?.perfil === "administrador" ? "bg-purple-600 shadow-purple-100" :
            userData?.perfil === "coordenador" ? "bg-blue-600 shadow-blue-100" :
            userData?.perfil === "operador" ? "bg-green-700 shadow-green-100" :
            userData?.perfil === "monitor" ? "bg-orange-500 shadow-orange-100" :
            "bg-green-600 shadow-green-100"
          }`}>
            {userData?.perfil === "administrador" ? "Administrador" :
             userData?.perfil === "coordenador" ? "Coordenador" :
             userData?.perfil === "operador" ? "Operador" :
             userData?.perfil === "monitor" ? "Monitor" :
             "Funcionário"}
          </span>
          {userData?.espacoNome && userData?.espacoId !== "todos" && userData?.espacoId !== "desconhecido" && (
            <p className="text-[10px] font-bold text-slate-400 break-words flex items-start gap-1.5 leading-tight">
              <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" /> {userData.espacoNome}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 mt-auto space-y-1">
        <div className="px-4 py-2 flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isOnline ? 'Conectado' : 'Sem Conexão'}
          </span>
        </div>
        <a 
          href="http://10.24.18.20" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 rounded-xl transition-colors text-sm font-medium group"
        >
          <HelpCircle size={18} />
          <span>Suporte</span>
          <ExternalLink size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
