import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, UserCheck, AlertCircle } from 'lucide-react';
import UserModal from '../modals/UserModal';
import ConfirmModal from '../modals/ConfirmModal';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

const UsersTab: React.FC = () => {
  const { userData: currentAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('usuarios').select('*').order('nome').limit(200);
      if (data) {
        setUsers(data.map(d => ({
          ...d,
          espacoId: d.espaco_id,
          espacoNome: d.espaco_nome
        })));
      }
      setLoading(false);
    };

    fetchUsers();

    const channel = supabase.channel('usuarios-updates-tab').on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
      fetchUsers();
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await supabase.from('usuarios').delete().eq('id', userToDelete.id);
      await auditService.log({ acao: "excluiu_usuario", detalhes: `Excluiu usuário ${userToDelete.nome}`, entidadeId: userToDelete.id, userProfile: currentAdmin });
    } catch (error) {
      alert('Erro ao excluir usuário.');
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleDelete = (user: any) => {
    const admins = users.filter(u => u.perfil === 'administrador' && u.ativo);
    if (user.perfil === 'administrador' && admins.length <= 1) {
      alert('Não é possível excluir o último administrador ativo do sistema.');
      return;
    }
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'administrador':
        return 'bg-purple-600 text-white';
      case 'coordenador':
        return 'bg-blue-600 text-white';
      case 'funcionario':
        return 'bg-green-600 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      'administrador': 'Administrador',
      'coordenador': 'Coordenador',
      'funcionario': 'Funcionário'
    };
    return map[role] || role;
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Usuários do Sistema</h3>
          <p className="text-slate-500 text-sm">Gerencie quem tem acesso ao painel administrativo.</p>
        </div>
        <button 
          onClick={() => { setUserToEdit(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Espaço</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center animate-pulse text-slate-400 italic">Carregando usuários...</td></tr>
              ) : users.length > 0 ? users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {user.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm">{user.nome}</p>
                          {user.ativo ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(user.perfil)}`}>
                      {getRoleLabel(user.perfil)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 font-medium">{user.espacoNome || 'Global / Todos'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setUserToEdit(user); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic flex flex-col items-center gap-3">
                     <UserIcon size={32} className="text-slate-200" />
                     <span>Nenhum colaborador cadastrado. Clique em <b>'+ Novo Usuário'</b> para começar.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={userToEdit}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Usuário"
        message="Deseja excluir permanentemente este usuário?"
        itemText={userToDelete?.nome}
      />
    </div>
  );
};

export default UsersTab;
