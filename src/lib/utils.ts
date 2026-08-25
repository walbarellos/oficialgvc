import { OperationType, FirestoreErrorInfo } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  console.error('Database Error: ', errorString);
  throw new Error(errorString);
}

/**
 * Normaliza um documento de visita do Supabase (ou Firebase antigo) para um formato padrão.
 */
export function normalizarVisita(doc: any) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id || data.id;

  // Normalização de Nome — prioriza o nome atual do cadastro (JOIN visitors)
  // para que edições no cadastro reflitam em todos os registros de visita
  const nome = data.visitors?.full_name || data.nome || data.visitorName || data.fullName || "Desconhecido";
  
  // Normalização de Perfil/Categoria
  const perfil = data.perfil || data.category || data.profile || "general";
  
  // Normalização de Local
  const local = data.local || data.location || data.espacoNome || "Entrada Principal";
  
  // Normalização de Status
  let status = data.status || "Ativo";
  if (status === 'active') status = 'Ativo';
  if (status === 'completed') status = 'Concluído';
  
  // Normalização de Horários
  const checkin = data.checkin || data.serverCheckInTime || data.checkInTime;
  const checkout = data.checkout || null;

  return {
    id,
    visitorId: data.visitorId || data.visitor_id || null,
    nome,
    perfil,
    local,
    status,
    checkin,
    checkout,
    espacoId: data.espacoId || data.espaco_id || "desconhecido",
    isMinor: (() => {
      if (!data.visitors?.birth_date) return false;
      const today = new Date();
      const dob = new Date(data.visitors.birth_date);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age < 18;
    })()
  };
}

export const traduzirPerfil = (p: string) => {
  const map: Record<string, string> = {
    'student': 'Estudante',
    'researcher': 'Pesquisador',
    'general': 'Visitante',
    'staff': 'Funcionário',
    'Visitante': 'Visitante',
    'Estudante': 'Estudante',
    'Pesquisador': 'Pesquisador',
    'Funcionário': 'Funcionário'
  };
  return map[p] || p;
};
