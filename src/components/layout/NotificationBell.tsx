import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const { userData } = useAuth();
  
  const isAdmin = userData?.perfil === 'administrador';
  
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase.from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (data) {
        setNotifications(data);
        const lastRead = localStorage.getItem('gvc_last_read_audit') || '0';
        const unread = data.filter((n: any) => new Date(n.created_at || 0).getTime() > parseInt(lastRead)).length;
        setUnreadCount(unread);
      }
    };

    fetchNotifications();

    const channel = supabase.channel('auditoria-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auditoria' }, () => {
        fetchNotifications();
      }).subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      localStorage.setItem('gvc_last_read_audit', Date.now().toString());
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={handleOpen}
        type="button"
        className="text-slate-400 hover:text-primary transition-colors p-2 hover:bg-slate-50 rounded-full relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {ReactDOM.createPortal(
        <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
            className="fixed w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[9999] origin-top-right text-left"
          >
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Notificações de Sistema</h3>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => {
                    let dateStr = '';
                    if (notif.created_at) {
                      const date = new Date(notif.created_at);
                      const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
                      if (diff < 1) dateStr = 'Agora mesmo';
                      else if (diff < 60) dateStr = `há ${diff} min`;
                      else if (diff < 1440) dateStr = `há ${Math.floor(diff/60)} horas`;
                      else dateStr = date.toLocaleDateString('pt-BR');
                    }
                    
                    const isSystemAlert = ['criou_espaco', 'editou_espaco', 'excluiu_espaco', 'criou_usuario', 'editou_usuario', 'excluiu_usuario', 'exportou_backup', 'alterou_configuracoes'].includes(notif.acao);
                    
                    return (
                      <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${isSystemAlert ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="text-sm text-slate-900 leading-tight">
                              <span className="font-bold">{notif.usuario}</span> {notif.detalhes}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{dateStr}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma notificação</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-50 bg-slate-50/50">
               <button type="button" onClick={() => navigate('/auditoria')} className="text-xs font-bold text-primary w-full text-center hover:text-blue-700 transition-colors">
                  Ver registro completo
                </button>
             </div>
           </motion.div>
         )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}