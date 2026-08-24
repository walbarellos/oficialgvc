import { supabase } from '../lib/supabase';

export type AuditoriaAcao = 
  | "criou_usuario" 
  | "excluiu_usuario" 
  | "editou_usuario" 
  | "criou_espaco" 
  | "excluiu_espaco" 
  | "editou_espaco" 
  | "alterou_configuracoes" 
  | "exportou_backup" 
  | "excluiu_visita";

interface AuditLogParams {
  acao: AuditoriaAcao;
  detalhes: string;
  entidadeId?: string | null;
  userProfile?: {
    nome?: string;
    perfil?: string;
    email?: string;
  } | null;
}

function maskSensitiveData(detalhes: string): string {
  const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
  const passportRegex = /\b[A-Z]{1,2}\d{6,9}\b/gi;
  
  let masked = detalhes.replace(cpfRegex, (match) => {
    const parts = match.replace(/[.-]/g, '');
    return `***.***.***-${parts.slice(-2)}`;
  });
  
  masked = masked.replace(passportRegex, (match) => {
    if (match.length <= 4) return match;
    return `${match.slice(0, 2)}***${match.slice(-2)}`;
  });
  
  return masked;
}

export const auditService = {
  async log(params: AuditLogParams) {
    try {
      const maskedDetalhes = maskSensitiveData(params.detalhes);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        acao: params.acao,
        detalhes: maskedDetalhes,
        entidade_id: params.entidadeId || null
      };

      const { data, error } = await supabase.functions.invoke('register-audit', {
        body: payload
      });

      if (error) {
        console.error("Erro ao registrar auditoria:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Erro crítico ao registrar auditoria:", error);
      return { success: false, error };
    }
  },

  async getRecent(limit = 50) {
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }
};