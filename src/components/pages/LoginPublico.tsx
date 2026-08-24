import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

const FOTOS = {
  espaco1: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800',
  espaco2: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
  espaco3: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=600',
  espaco4: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600',
  espaco5: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600',
};

export default function LoginPublico() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else {
        setError('Erro ao autenticar: ' + authError.message);
      }
      setLoading(false);
    } else {
      navigate('/agendamento/formulario');
    }
  };

  const showCadastroSucesso = searchParams.get('cadastro') === 'sucesso';

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <div className="hidden lg:flex w-7/12 bg-gradient-to-br from-[#fdf6ed] via-[#fef7ed] to-[#fcf0de] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-tertiary/5 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary/10 rounded-full blur-[120px]" />
        
<div className="relative z-10 h-full w-full p-3">
          <div className="grid grid-cols-5 grid-rows-2 gap-2.5 h-full">
            <motion.div 
              className="col-span-3 row-span-2 relative overflow-hidden rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.img 
                src={FOTOS.espaco1}
                alt="Auditório cultural"
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
                src={FOTOS.espaco2}
                alt="Sala de Reunião"
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
                src={FOTOS.espaco3}
                alt="Visita Guiada"
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
                src={FOTOS.espaco4}
                alt="Galeria"
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
                src={FOTOS.espaco5}
                alt="Teatro"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute bottom-10 left-10 right-10 z-50"
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-[#835425]/10">
            <h2 className="font-display text-2xl font-bold text-[#835425]">
              Reserve seu Espaço
            </h2>
            <p className="text-slate-700 mt-2 leading-relaxed font-medium">
              Solicite auditórios, salas de reuniões, visitas guiadas e teatros nos espaços públicos culturais da FEM.
            </p>
          </div>
        </motion.div>
      </div>
      
      <div className="w-full lg:w-5/12 bg-surface h-full flex flex-col items-center justify-center relative z-20 shadow-[-12px_0_50px_rgba(131,84,37,0.1)]">
        <div className="absolute top-0 right-0 w-full h-56 bg-gradient-to-b from-secondary/10 to-transparent lg:hidden" />
        
        <div className="w-full max-w-[400px] px-12">
          <motion.div 
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-4 mb-10"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-secondary rounded-2xl blur-xl opacity-40 animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-secondary to-[#755b00] rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="font-display text-3xl font-black text-[#835425]">
                Agendamento
              </h1>
              <p className="text-xs text-[#755b00] uppercase tracking-[0.2em] font-semibold mt-1">
                Espaços Culturais
              </p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 px-4 py-1.5 bg-secondary/5 border border-secondary/10 rounded-full"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                Solicite Online
              </span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200"
          >
            {['Solicitar', 'Confirmar', 'Agendado'].map((passo, i) => (
              <div key={passo} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {i + 1}
                </div>
                <span className="text-xs text-slate-500 hidden md:inline">{passo}</span>
                {i < 2 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            ))}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-6"
          >
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Bem-vindo(a)
            </h2>
            <p className="text-sm text-slate-500">
              Faça login para agendar espaços culturais.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <AnimatePresence>
              {showCadastroSucesso && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cadastro realizado! Faça login para continuar.
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            

            
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all shadow-sm text-sm"
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
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all shadow-sm text-sm"
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
                className="w-full mt-5 flex items-center justify-center gap-2 bg-gradient-to-r from-secondary to-[#755b00] text-white py-3 px-4 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 pt-6 border-t border-slate-200 text-center"
          >
            <p className="text-sm text-slate-500">
              Não tem conta?{' '}
              <button
                onClick={() => navigate('/cadastro-publico')}
                className="text-[#835425] hover:text-[#6d4520] font-medium underline underline-offset-3"
              >
                Criar cadastro
              </button>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 flex items-center justify-center gap-2"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              Acesso Seguro • FEM GAC
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}