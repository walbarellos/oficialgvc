import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { SystemUser, SpaceConfig, OperationType } from '../types';

interface AuthContextType {
  user: User | null;
  userData: SystemUser | null;
  spaceConfig: SpaceConfig | null;
  loading: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isStaff: boolean;
  isMonitor: boolean;
  isSuperadmin: boolean;
  isPublic: boolean;
  isCitizen: boolean;
  hasPermission: (path: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<SystemUser | null>(null);
  const [spaceConfig, setSpaceConfig] = useState<SpaceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let spaceSubscription: any = null;
    let userSubscription: any = null;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleSession(session);
      }
    );

    async function handleSession(session: Session | null) {
      setUser(session?.user || null);
      
      if (spaceSubscription) {
        supabase.removeChannel(spaceSubscription).then(() => {});
        spaceSubscription = null;
      }
      if (userSubscription) {
        supabase.removeChannel(userSubscription).then(() => {});
        userSubscription = null;
      }

      if (session?.user) {
        setLoading(true);
        // Fetch user data
        const { data: uData, error: uError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_uid', session.user.id)
          .single();

        if (uData) {
          const formattedUser = {
            id: uData.id,
            nome: uData.nome,
            email: uData.email,
            perfil: uData.perfil,
            espacoId: uData.espaco_id || null,
            espacoNome: uData.espaco_nome,
            ativo: uData.ativo
          } as SystemUser;
          setUserData(formattedUser);

          // Realtime user updates
          // userSubscription = supabase.channel('user-updates')
          //   .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios', filter: `auth_uid=eq.${session.user.id}` }, payload => {
          //     if (payload.new) {
          //       setUserData({
          //         id: payload.new.id,
          //         nome: payload.new.nome,
          //         email: payload.new.email,
          //         perfil: payload.new.perfil,
          //         espacoId: payload.new.espaco_id || null,
          //         espacoNome: payload.new.espaco_nome,
          //         ativo: payload.new.ativo
          //       } as SystemUser);
          //     }
          //   }).subscribe();

          if (formattedUser.espacoId && formattedUser.espacoId !== 'todos' && formattedUser.espacoId !== 'desconhecido') {
            const { data: sData } = await supabase
              .from('espacos')
              .select('*')
              .eq('id', formattedUser.espacoId)
              .single();
            
            if (sData) {
              setSpaceConfig(formatSpace(sData));
            }

            // Realtime space updates
            spaceSubscription = supabase.channel('space-updates')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'espacos', filter: `id=eq.${formattedUser.espacoId}` }, payload => {
                if (payload.new) {
                  setSpaceConfig(formatSpace(payload.new));
                }
              }).subscribe();
          } else {
            setSpaceConfig(null);
          }
        } else {
          // Usuário autenticado no Supabase Auth, mas sem registro em `usuarios`.
          // NUNCA promover a funcionário por domínio de e-mail.
          // Cidadão/público → null (App redireciona para área pública).
          setUserData(null);
          setSpaceConfig(null);
        }
        setLoading(false);
      } else {
        setUserData(null);
        setSpaceConfig(null);
        setLoading(false);
      }
    }

    function formatSpace(data: any): SpaceConfig {
      return {
        id: data.id,
        nome: data.nome,
        municipio: data.municipio,
        totalArmarios: data.total_armarios,
        mensagemBoasVindas: data.mensagem_boas_vindas,
        tempoLimiteExcedido: data.tempo_limite_excedido,
        capacidadeVisitantes: data.capacidade_visitantes,
        horarioFuncionamento: data.horario_funcionamento,
        perfilArmarios: data.perfil_armarios,
        perfilTelecentro: data.perfil_telecentro,
        perfilAgendamento: data.perfil_agendamento,
        totalComputadores: data.total_computadores,
        tempoLimiteComputador: data.tempo_limite_computador,
        capacidadeAgendamento: data.capacidade_agendamento
      };
    }

    return () => {
      authListener.subscription.unsubscribe();
      if (spaceSubscription) supabase.removeChannel(spaceSubscription).then(() => {});
      if (userSubscription) supabase.removeChannel(userSubscription).then(() => {});
    };
  }, []);

  const isAdmin = userData?.perfil === 'administrador';
  const isCoordinator = userData?.perfil === 'coordenador' || isAdmin;
  const isStaff = userData?.perfil === 'funcionario' || isCoordinator;
  const isInternalUser = ['administrador', 'coordenador', 'funcionario', 'monitor'].includes(userData?.perfil || '');
  
  const isMonitor = userData?.perfil === 'monitor' || isAdmin;
  const isSuperadmin = isAdmin;
  const isCitizen = !isInternalUser;
  const isPublic = !isInternalUser;

  const hasPermission = (path: string) => {
    const p = path.replace(/^\//, '') || 'painel';
    if (isAdmin) return true;
    
    const pathMap: Record<string, string> = {
      '': 'painel',
      'visitors': 'visitantes',
      'lockers': 'armarios',
      'telecentro': 'telecentro',
      'agendamento': 'agendamento',
      'reports': 'relatorios',
      'configuracoes': 'configuracoes'
    };
    
    const permissionKey = pathMap[p] || p;

    const PERMISSIONS: Record<string, string[]> = {
      coordenador: ["painel", "visitantes", "relatorios"],
      funcionario: ["painel", "visitantes", "armarios"],
      monitor: ["painel", "telecentro"]
    };

    const perfil = userData?.perfil || 'vazio';
    const allowed = PERMISSIONS[perfil] || [];
    
    return allowed.includes(permissionKey);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      spaceConfig,
      loading, 
      isAdmin, 
      isCoordinator, 
      isStaff,
      isMonitor,
      isSuperadmin,
      isPublic,
      isCitizen,
      hasPermission,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
