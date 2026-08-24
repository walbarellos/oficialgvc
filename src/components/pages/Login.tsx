import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

const FOTOS = {
  foto1: '/images/123456.jpg',
  foto2: '/images/123.jpg',
  foto3: '/images/1234.jpg',
  foto4: '/images/agents.home-entities.18mpqo8.jpg',
  foto5: '/images/home-header2.home-header.1tbiu2x.jpg',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const [error, setError] = useState(location.state?.message || (searchParams.get('expired') ? 'Sua sessão expirou. Por favor, faça login novamente.' : ''));
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, preencha o email para recuperar a senha');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError('Erro ao enviar email de recuperação: ' + error.message);
    } else {
      setError('Instruções de recuperação enviadas para seu email!');
    }
    setLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (authErr) {
        if (authErr.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else {
          setError('Erro ao autenticar: ' + authErr.message);
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError('Erro ao autenticar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <div className="hidden lg:flex w-7/12 bg-surface-container-high relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high via-surface to-primary-fixed/10 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-fixed/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary-fixed/15 rounded-full blur-[120px]" />
        
        <div className="relative z-10 h-full w-full p-3">
          <div className="grid grid-cols-5 grid-rows-2 gap-2.5 h-full">
            <motion.div 
              className="col-span-3 row-span-2 relative overflow-hidden rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.img 
                src={FOTOS.foto1}
                alt="Espaço cultural"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
            
            <motion.div
              className="col-span-1 row-span-1 relative overflow-hidden rounded-xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.img 
                src={FOTOS.foto4}
                alt="Detalhe"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
            
            <motion.div
              className="col-span-1 row-span-1 relative overflow-hidden rounded-xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <motion.img 
                src={FOTOS.foto2}
                alt="Foto 2"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
            
            <motion.div
              className="col-span-1 row-span-1 relative overflow-hidden rounded-xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <motion.img 
                src={FOTOS.foto3}
                alt="Foto 3"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
            
            <motion.div
              className="col-span-1 row-span-1 relative overflow-hidden rounded-xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <motion.img 
                src={FOTOS.foto5}
                alt="Foto 5"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-5/12 bg-surface h-full flex flex-col items-center justify-center relative z-20 shadow-[-12px_0_50px_rgba(0,52,101,0.1)]">
        <div className="absolute top-0 right-0 w-full h-56 bg-gradient-to-b from-primary-fixed/30 to-transparent lg:hidden" />
        
        <div className="w-full max-w-[400px] px-12">
          <motion.div 
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-4 mb-10"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-40 animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-[#004b8d] rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="font-display text-4xl font-black bg-gradient-to-r from-primary via-[#004b8d] to-[#835425] bg-clip-text text-transparent">
                GVC
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-[0.25em] font-semibold mt-1">
                Gerenciamento Cultural
              </p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                Sistema Oficial
              </span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="font-display text-3xl font-bold text-slate-800 mb-2">
              Bem-vindo(a)
            </h2>
            <p className="text-sm text-slate-500">
              Acesse o sistema de Gerenciamento de Visitantes e Acervo (GVC).
            </p>
          </motion.div>
          
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleEmailLogin} 
            className="space-y-4"
          >
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                E-mail Institucional
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="nome@cultura.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm text-sm"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full mt-5 flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-full text-sm font-semibold shadow-lg hover:bg-[#004b8d] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Acessar Sistema
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </>
              )}
            </motion.button>
          </motion.form>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 pt-6 border-t border-slate-200 text-center"
          >
            <button
              onClick={() => navigate('/agendamento-publico')}
              className="text-[#835425] hover:text-[#6d4520] text-sm font-medium underline underline-offset-3"
            >
              Agendamento de Espaço Cultural
            </button>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 pt-4 border-t border-slate-200 text-center"
          >
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-slate-400 hover:text-primary"
            >
              Problemas com o acesso?
            </button>
            
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-xs text-slate-500"
                >
                  Suporte: (68) 3223-1210<br/>
                  suporte@cultura.gov.br
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}