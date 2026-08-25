import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: any;
}

export default function UserModal({ isOpen, onClose, userToEdit }: UserModalProps) {
  const { userData: currentAdmin } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmSenha: '',
    perfil: 'funcionario',
    espacoId: 'todos',
    espacoNome: '',
    ativo: true
  });
  const [espacos, setEspacos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const calculateStrength = (pass: string) => {
    let s = 0;
    if (!pass) return 0;
    if (pass.length >= 8) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[@#$%^&+=!.?_]/.test(pass)) s++;
    return s;
  };

  const strength = calculateStrength(formData.senha);

  useEffect(() => {
    const fetchEspacos = async () => {
      const { data } = await supabase.from('espacos').select('*').order('nome');
      if (data) {
        setEspacos(data);
      }
    };
    fetchEspacos();
  }, []);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        nome: userToEdit.nome || '',
        email: userToEdit.email || '',
        senha: '',
        confirmSenha: '',
        perfil: userToEdit.perfil || 'funcionario',
        espacoId: userToEdit.espacoId || userToEdit.espaco_id || '',
        espacoNome: userToEdit.espacoNome || userToEdit.espaco_nome || '',
        ativo: userToEdit.ativo !== undefined ? userToEdit.ativo : true
      });
      setChangePassword(false);
    } else {
      setFormData({
        nome: '',
        email: '',
        senha: '',
        confirmSenha: '',
        perfil: 'funcionario',
        espacoId: 'todos',
        espacoNome: '',
        ativo: true
      });
      setChangePassword(true);
    }
  }, [userToEdit, isOpen]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return setErrorMsg('Nome é obrigatório');
    if (!validateEmail(formData.email)) return setErrorMsg('Email inválido');
    
    if (changePassword) {
      if (formData.senha.length < 8) return setErrorMsg('A senha deve ter no mínimo 8 caracteres');
      if (!/[A-Z]/.test(formData.senha)) return setErrorMsg('A senha deve conter pelo menos 1 letra maiúscula');
      if (!/[0-9]/.test(formData.senha)) return setErrorMsg('A senha deve conter pelo menos 1 número');
      if (!/[@#$%^&+=!.?_]/.test(formData.senha)) return setErrorMsg('A senha deve conter pelo menos 1 caractere especial (@, #, $, etc.)');
      if (formData.senha !== formData.confirmSenha) return setErrorMsg('As senhas não conferem');
    }

    setLoading(true);
    try {
      if (!userToEdit || userToEdit.email !== formData.email) {
        const { data: existing } = await supabase.from('usuarios').select('id').eq('email', formData.email);
        if (existing && existing.length > 0) {
          setErrorMsg("Este email já está sendo utilizado por outro usuário no banco de dados.");
          setLoading(false);
          return;
        }
      }

      const selectedEspaco = espacos.find(e => e.id === formData.espacoId);
      const dataToSave: any = {
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil,
        espaco_id: formData.espacoId && formData.espacoId !== 'todos' ? formData.espacoId : null,
        espaco_nome: formData.espacoId === 'todos' ? 'TODOS OS ESPAÇOS' : (selectedEspaco ? selectedEspaco.nome : 'Global'),
      };

      if (userToEdit) {
        const { error: updateError } = await supabase.from('usuarios').update(dataToSave).eq('id', userToEdit.id);
        
        if (updateError) {
          console.error('Update error:', updateError);
          setErrorMsg('Erro ao atualizar: ' + updateError.message);
          setLoading(false);
          return;
        }
        
        // Se a senha foi alterada e for o próprio usuário, atualizamos com updateUser
        if (changePassword) {
          if (currentAdmin && currentAdmin.id === userToEdit.id) {
            await supabase.auth.updateUser({ password: formData.senha });
          } else {
            const { error: fnError } = await supabase.functions.invoke('update-user-password', {
              body: { targetUserId: userToEdit.id, password: formData.senha }
            });
            if (fnError) {
              setErrorMsg('Erro ao alterar senha: ' + fnError.message);
              setLoading(false);
              return;
            }
          }
        }
      } else {
        const { data: responseData, error: fnError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            senha: formData.senha,
            nome: formData.nome,
            perfil: formData.perfil,
            espacoId: formData.espacoId,
            espacoNome: dataToSave.espaco_nome
          }
        });

        if (fnError || responseData?.error) {
          setErrorMsg('Erro ao criar usuário: ' + (fnError?.message || responseData?.error));
          throw new Error(fnError?.message || responseData?.error);
        }

        const newUid = responseData?.data?.id || responseData?.user?.id;
        if (newUid) {
          await auditService.log({ acao: "criou_usuario", detalhes: `Criou usuário ${formData.nome} (${formData.perfil}) de forma segura`, entidadeId: newUid, userProfile: currentAdmin });
          setErrorMsg('Usuário criado com sucesso com privilégios adequados!');
        }
      }
      
      onClose();
    } catch (error: any) {
      console.error(error);
      setErrorMsg('Erro ao salvar usuário: ' + (error.message || 'Erro desconhecido'));
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-display font-bold text-slate-900">
              {userToEdit ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nome Completo</label>
                <input 
                  type="text"
                  required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Email (Login)</label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                  placeholder="email@instituicao.org"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Perfil / Cargo</label>
                <select 
                  value={formData.perfil}
                  onChange={e => setFormData({...formData, perfil: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="coordenador">Coordenador</option>
                  <option value="monitor">Monitor</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Espaço Cultural</label>
                <select 
                  value={formData.espacoId}
                  onChange={e => setFormData({...formData, espacoId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans text-sm whitespace-normal"
                >
                  <option value="todos">TODOS OS ESPAÇOS</option>
                  {espacos.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              {userToEdit && (
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="changePass" 
                    checked={changePassword} 
                    onChange={e => setChangePassword(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="changePass" className="text-sm font-medium text-slate-600">Alterar Senha do Usuário</label>
                </div>
              )}

              {changePassword && (
                <>
                  <div className="relative md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nova Senha</label>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required={changePassword}
                      value={formData.senha}
                      onChange={e => setFormData({...formData, senha: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                      placeholder="Min. 8 caracteres"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {/* Password Strength Indicator */}
                    <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          strength === 0 ? 'w-0' :
                          strength <= 1 ? 'w-1/4 bg-red-500' :
                          strength <= 2 ? 'w-2/4 bg-orange-500' :
                          strength <= 3 ? 'w-3/4 bg-yellow-500' : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex gap-2 mt-1 px-1">
                       <span className={`text-[8px] font-bold ${formData.senha.length >= 8 ? 'text-emerald-500' : 'text-slate-300'}`}>8+ chars</span>
                       <span className={`text-[8px] font-bold ${/[A-Z]/.test(formData.senha) ? 'text-emerald-500' : 'text-slate-300'}`}>MAIUSC</span>
                       <span className={`text-[8px] font-bold ${/[0-9]/.test(formData.senha) ? 'text-emerald-500' : 'text-slate-300'}`}>NUM</span>
                       <span className={`text-[8px] font-bold ${/[@#$%^&+=!.?_]/.test(formData.senha) ? 'text-emerald-500' : 'text-slate-300'}`}>ESPECIAL</span>
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Confirmar Senha</label>
                    <input 
                      type="password"
                      required={changePassword}
                      value={formData.confirmSenha}
                      onChange={e => setFormData({...formData, confirmSenha: e.target.value})}
                      className={`w-full bg-slate-50 border ${formData.confirmSenha && formData.senha !== formData.confirmSenha ? 'border-red-300' : 'border-slate-200'} rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans`}
                      placeholder="Repita a senha"
                    />
                    {formData.confirmSenha && formData.senha !== formData.confirmSenha && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 px-1">As senhas não conferem</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Processando...' : userToEdit ? 'Atualizar Usuário' : 'Criar Usuário'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
