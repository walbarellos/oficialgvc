import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  User,
  MapPin,
  Clock,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Building,
  Users,
  AlertCircle,
  Upload,
  Mail,
  Phone,
  LogOut,
  Trash2,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { spaceService, Space } from '../../services/spaceService';
import { useCreateAgendamento } from '../../hooks/useAgendamentos';
import { usePublicAuth } from '../../contexts/PublicAuthContext';
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone } from '../../lib/validators';
import { draftService } from '../../services/draftService';
import { getBrowserFingerprint } from '../../utils/browser';
import { validateCPFReceita } from '../../services/cpfService';

interface FormData {
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone: string;
  solicitante_documento: string;
  tipo_solicitante: string;
  razao_social: string;
  nome_instituicao: string;
  secretaria_governo: string;
  unidade_governo: string;
  espaco_id: string;
  tipo_espaco: string;
  espaco_solicitado: string;
  data_pretendida: string;
  horario_inicio: string;
  horario_fim: string;
  numero_participantes: number;
  descricao_evento: string;
  natureza_evento: string;
  gratuito: boolean;
  valor_ingresso: string;
  necessita_equipamentos: string;
  observacoes: string;
  termo_aceito: boolean;
  responsabhilidade_evento: boolean;
  danos_patrimonio: boolean;
  respeito_lotacao: boolean;
  autorizo_divulgacao: boolean;
  termo_compromisso_assinado: boolean;
  termo_compromisso_data: string;
  termo_compromisso_ip: string;
  termo_compromisso_arquivo: string;
}

const initialFormData: FormData = {
  solicitante_nome: '',
  solicitante_email: '',
  solicitante_telefone: '',
  solicitante_documento: '',
  tipo_solicitante: 'pessoa_fisica',
  razao_social: '',
  nome_instituicao: '',
  secretaria_governo: '',
  unidade_governo: '',
  espaco_id: '',
  tipo_espaco: '',
  espaco_solicitado: '',
  data_pretendida: '',
  horario_inicio: '',
  horario_fim: '',
  numero_participantes: 0,
  descricao_evento: '',
  natureza_evento: 'cultural',
  gratuito: true,
  valor_ingresso: '',
  necessita_equipamentos: '',
  observacoes: '',
  termo_aceito: false,
  responsabhilidade_evento: false,
  danos_patrimonio: false,
  respeito_lotacao: false,
  autorizo_divulgacao: false,
  termo_compromisso_assinado: false,
  termo_compromisso_data: '',
  termo_compromisso_ip: '',
  termo_compromisso_arquivo: '',
};

const steps = [
  { id: 1, title: 'Dados Pessoais', icon: User },
  { id: 2, title: 'Espaço', icon: MapPin },
  { id: 3, title: 'Data e Hora', icon: Clock },
  { id: 4, title: 'Evento', icon: FileText },
  { id: 5, title: 'Termos', icon: CheckCircle },
  { id: 6, title: 'Confirmação', icon: CheckCircle },
];

const tipoEspacosBase = [
  { value: 'auditorio', label: 'Auditório', key: 'has_auditorio', capacidadeKey: 'qtd_auditorio', minParticipantes: 20 },
  { value: 'sala_estudos', label: 'Sala de Estudos', key: 'has_sala_estudos', capacidadeKey: 'qtd_sala_estudos', minParticipantes: 5 },
  { value: 'teatro', label: 'Teatro', key: 'has_teatro', capacidadeKey: 'qtd_teatro', minParticipantes: 20 },
  { value: 'filmoteca', label: 'Filmoteca/Cinema', key: 'has_filmoteca', capacidadeKey: 'qtd_filmoteca', minParticipantes: 15 },
  { value: 'espaco_aberto', label: 'Espaço Aberto', key: 'has_espaco_aberto', capacidadeKey: 'qtd_espaco_aberto', minParticipantes: 10 },
  { value: 'visita_guiada', label: 'Visita Guiada', key: 'has_visita_guiada', capacidadeKey: '', minParticipantes: 15 },
];

const getAvailableSpaceTypes = (spaceId: string, allSpaces: Space[]) => {
  if (!spaceId || !allSpaces || allSpaces.length === 0) return [];
  
  const space = allSpaces.find(s => s.id === spaceId);
  if (!space) return [];
  
  return tipoEspacosBase
    .filter(t => space[t.key as keyof typeof space] === true)
    .map(t => ({
      value: t.value,
      label: t.label,
      capacidade: t.capacidadeKey ? (space[t.capacidadeKey as keyof typeof space] || 0) : 0,
      minParticipantes: t.minParticipantes
    }));
};

const naturezaOptions = [
  { value: 'cultural', label: 'Cultural' },
  { value: 'educacional', label: 'Educacional' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'comunitario', label: 'Comunitário' },
  { value: 'outro', label: 'Outro' },
];

const tipoSolicitanteOptions = [
  { value: 'pessoa_fisica', label: 'Pessoa Física (CPF)' },
  { value: 'pessoa_juridica', label: 'Pessoa Jurídica (CNPJ)' },
  { value: 'escola', label: 'Escola' },
  { value: 'universidade', label: 'Universidade/Faculdade' },
  { value: 'governo', label: 'Governo' },
];

export default function AgendamentoPublico() {
  const navigate = useNavigate();
  const { user: publicUser, logout, publicLoading } = usePublicAuth();

  useEffect(() => {
    if (!publicLoading && !publicUser) {
      navigate('/agendamento');
    }
  }, [publicUser, publicLoading, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [protocoloSalvo, setProtocoloSalvo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conflitos, setConflitos] = useState<any[]>([]);
  const [assinaturaInfo, setAssinaturaInfo] = useState<{
    ip: string;
    fingerprint: object;
    timestamp: string;
    hash: string;
  } | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Função para salvar dados (protegida contra erros)
  const saveData = useCallback(async (data: any, step: number) => {
    if (success) return;
    
    const dataStr = JSON.stringify(data);
    
    // SessionStorage (mais rápido)
    try {
      sessionStorage.setItem('gvc_agendamento_draft', dataStr);
      sessionStorage.setItem('gvc_agendamento_step', step.toString());
    } catch (e) {
      console.error('SessionStorage error:', e);
    }
    
    // Salvar no Banco de Dados (silencioso)
    try {
      const sessionId = sessionStorage.getItem('gvc_session_id') || 'gvc_' + Date.now();
      sessionStorage.setItem('gvc_session_id', sessionId);
      
      const dbData = { ...data, current_step: step, session_id: sessionId };
      await draftService.saveDraft(dbData);
    } catch (e) {
      console.error('DB save error (non-critical):', e);
    }
    
    // LocalStorage backup
    try {
      localStorage.setItem('gvc_agendamento_draft_backup', dataStr);
      localStorage.setItem('gvc_agendamento_step_backup', step.toString());
    } catch {}
  }, [success]);

  // Função para carregar dados (robusta)
  const loadData = useCallback(async () => {
    let loaded = false;
    
    // Primeiro: sessionStorage (mais rápido)
    try {
      const savedData = sessionStorage.getItem('gvc_agendamento_draft');
      const savedStep = sessionStorage.getItem('gvc_agendamento_step');
      
      if (savedData && savedData !== '{}') {
        const parsed = JSON.parse(savedData);
        if (parsed && (parsed.solicitante_nome || parsed.espaco_id)) {
          setFormData(parsed);
          if (savedStep) setCurrentStep(parseInt(savedStep) || 1);
          loaded = true;
        }
      }
    } catch (e) {
      console.error('Erro sessionStorage:', e);
    }
    
    // Segundo: localStorage backup
    if (!loaded) {
      try {
        const savedData = localStorage.getItem('gvc_agendamento_draft_backup');
        const savedStep = localStorage.getItem('gvc_agendamento_step_backup');
        
        if (savedData && savedData !== '{}') {
          const parsed = JSON.parse(savedData);
if (parsed && (parsed.solicitante_nome || parsed.espaco_id)) {
          setFormData(parsed);
          if (savedStep) setCurrentStep(parseInt(savedStep) || 1);
          loaded = true;
          }
        }
      } catch (e) {
        console.error('Erro localStorage:', e);
      }
    }
    
    // Terceiro: Banco de dados (silencioso)
    if (!loaded) {
      try {
        const dbDraft = await draftService.loadDraft();
        if (dbDraft && (dbDraft.solicitante_nome || dbDraft.espaco_id)) {
          setFormData({
            ...initialFormData,
            ...dbDraft
          });
          setCurrentStep(dbDraft.current_step || 1);
        }
      } catch (e) {
        console.error('Erro banco (não crítico):', e);
      }
    }
    
    setDraftLoaded(true);
  }, []);

  // Carregar dados ao montar componente
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Salvar dados quando formData mudar
  useEffect(() => {
    if (draftLoaded && !success) {
      saveData(formData, currentStep);
    }
  }, [formData, currentStep, draftLoaded, success, saveData]);

  // Auto-save a cada 5 segundos
  useEffect(() => {
    if (!draftLoaded || success) return;
    
    const interval = setInterval(() => {
      saveData(formData, currentStep);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [formData, currentStep, draftLoaded, success, saveData]);

  // Salvar ao minimizar/fechar
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveData(formData, currentStep);
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveData(formData, currentStep);
      if (formData.solicitante_nome || formData.espaco_id) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, currentStep, saveData]);

  // Limpar dados após sucesso
  useEffect(() => {
    if (success) {
      sessionStorage.removeItem('gvc_agendamento_draft');
      sessionStorage.removeItem('gvc_agendamento_step');
      localStorage.removeItem('gvc_agendamento_draft_backup');
      localStorage.removeItem('gvc_agendamento_step_backup');
    }
  }, [success]);

  const clearDraft = useCallback(async () => {
    if (confirm('Tem certeza que deseja limpar todos os dados preenchidos?')) {
      // Limpar do banco de dados
      await draftService.clearDraft();
      
      // Limpar localmente
      sessionStorage.removeItem('gvc_agendamento_draft');
      sessionStorage.removeItem('gvc_agendamento_step');
      sessionStorage.removeItem('gvc_session_id');
      localStorage.removeItem('gvc_agendamento_draft_backup');
      localStorage.removeItem('gvc_agendamento_step_backup');
      
      setFormData(initialFormData);
      setCurrentStep(1);
    }
}, []);

  const handleDocumentChange = (value: string) => {
    const isPessoaFisica = formData.tipo_solicitante === 'pessoa_fisica';
    
    if (isPessoaFisica) {
      const formatted = formatCPF(value);
      updateFormData('solicitante_documento', formatted);
      
      if (value.length >= 14) {
        const cleanDoc = value.replace(/\D/g, '');
        if (cleanDoc.length === 11) {
          if (!validateCPF(cleanDoc)) {
            setDocumentError('CPF inválido');
          } else {
            setDocumentError(null);
          }
        }
      } else {
        setDocumentError(null);
      }
    } else if (formData.tipo_solicitante === 'pessoa_juridica') {
      const formatted = formatCNPJ(value);
      updateFormData('solicitante_documento', formatted);
      
      if (value.length >= 18) {
        const cleanDoc = value.replace(/\D/g, '');
        if (cleanDoc.length === 14) {
          if (!validateCNPJ(cleanDoc)) {
            setDocumentError('CNPJ inválido');
          } else {
            setDocumentError(null);
          }
        }
      } else {
        setDocumentError(null);
      }
    } else {
      updateFormData('solicitante_documento', value);
      setDocumentError(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    updateFormData('solicitante_telefone', formatted);
    
    const cleanPhone = value.replace(/\D/g, '');
    if (cleanPhone.length > 0 && cleanPhone.length < 10) {
      setPhoneError('Telefone inválido');
    } else {
      setPhoneError(null);
    }
  };

  const isPessoaFisica = formData.tipo_solicitante === 'pessoa_fisica';
  const isPessoaJuridica = formData.tipo_solicitante === 'pessoa_juridica';
  const isEscola = formData.tipo_solicitante === 'escola';
  const isUniversidade = formData.tipo_solicitante === 'universidade';
  const isGoverno = formData.tipo_solicitante === 'governo';

  const { create, loading: creating } = useCreateAgendamento();

  useEffect(() => {
    const loadSpaces = async () => {
      const { data } = await spaceService.list();
      if (data) {
        setSpaces(data.filter((s) => s.perfil_agendamento));
      }
      setLoadingSpaces(false);
    };
    loadSpaces();
  }, []);

  useEffect(() => {
    if (publicUser) {
      setFormData((prev) => ({
        ...prev,
        solicitante_nome: publicUser.nome || prev.solicitante_nome,
        solicitante_email: publicUser.email || prev.solicitante_email,
        solicitante_telefone: publicUser.telefone || prev.solicitante_telefone,
      }));
    }
  }, [publicUser]);

  useEffect(() => {
    if (formData.espaco_id && formData.data_pretendida && formData.horario_inicio && formData.horario_fim) {
      checkConflitos();
    }
  }, [formData.espaco_id, formData.data_pretendida, formData.horario_inicio, formData.horario_fim]);

  const checkConflitos = async () => {
    if (!formData.espaco_id || !formData.data_pretendida || !formData.horario_inicio || !formData.horario_fim) {
      setConflitos([]);
      return;
    }

    setCheckingConflict(true);
    
    // Converter horários para minutos para calcular folga de 10min
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const inicioMin = toMinutes(formData.horario_inicio);
    const fimMin = toMinutes(formData.horario_fim);
    const intervaloMin = 10; // 10 minutos de folga
    
    // Busca agendamentos existentes no espaço, data e tipo de evento
    const { data } = await supabase
      .from('agendamentos')
      .select('id, horario_inicio, horario_fim, espaco_solicitado, tipo_espaco, natureza_evento')
      .eq('espaco_id', formData.espaco_id)
      .eq('data_pretendida', formData.data_pretendida)
      .neq('status', 'rejeitado')
      .neq('status', 'cancelado');
    
    // Verificar conflitos com 10min de folga, considerando mesmo tipo_espaco e natureza_evento
    const conflitosEncontrados = (data || []).filter((ag: any) => {
      // Só conflita se for MESMO tipo de espaço e MESMA natureza do evento
      if (ag.tipo_espaco !== formData.tipo_espaco || ag.natureza_evento !== formData.natureza_evento) {
        return false;
      }
      
      const agInicio = toMinutes(ag.horario_inicio);
      const agFim = toMinutes(ag.horario_fim);
      
      // Verificar sobreposição com 10min de folga
      const novoInicio = inicioMin - intervaloMin;
      const novoFim = fimMin + intervaloMin;
      
      return !(agFim <= novoInicio || agInicio >= novoFim);
    });
    
    setConflitos(conflitosEncontrados);
    setCheckingConflict(false);
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const baseValid = 
          formData.solicitante_nome.trim() !== '' &&
          formData.solicitante_email.trim() !== '' &&
          formData.solicitante_telefone.trim() !== '' &&
          formData.tipo_solicitante !== '' &&
          !documentError &&
          !phoneError;
        
        if (!baseValid) return false;
        
        if (formData.tipo_solicitante === 'pessoa_juridica' && formData.razao_social.trim() === '') return false;
        if ((formData.tipo_solicitante === 'escola' || formData.tipo_solicitante === 'universidade') && formData.nome_instituicao.trim() === '') return false;
        if (formData.tipo_solicitante === 'governo' && (formData.secretaria_governo.trim() === '' || formData.unidade_governo.trim() === '')) return false;
        
        return true;
      case 2:
        return formData.espaco_id !== '' && formData.tipo_espaco !== '';
      case 3:
        return (
          formData.data_pretendida !== '' &&
          formData.horario_inicio !== '' &&
          formData.horario_fim !== '' &&
          formData.numero_participantes > 0 &&
          conflitos.length === 0
        );
      case 4:
        return (
          formData.natureza_evento !== '' &&
          formData.descricao_evento.trim() !== ''
        );
      case 5:
        return (
          formData.termo_aceito &&
          formData.responsabhilidade_evento &&
          formData.danos_patrimonio &&
          formData.respeito_lotacao
        );
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const cpfDoc = formData.solicitante_documento.replace(/\D/g, '');
    let cpfValidation: any = null;

try {
      const selectedSpace = spaces.find((s) => s.id === formData.espaco_id);

      // Validar CPF na Receita Federal
      if (formData.tipo_solicitante === 'cpf' && cpfDoc.length === 11) {
        cpfValidation = await validateCPFReceita(cpfDoc);
        if (!cpfValidation.valid) {
          setError(`CPF inválido: ${cpfValidation.message}. Verifique e tente novamente.`);
          setLoading(false);
          return;
        }
      }

      // Usar Edge Function para submissão pública
      const { data, error: createError } = await supabase.functions.invoke('public-submit-agendamento', {
        body: {
          ...formData,
          espaco_solicitado: selectedSpace?.nome || formData.espaco_solicitado,
          valor_ingresso: formData.gratuito ? null : parseFloat(formData.valor_ingresso) || null,
          session_id: draftService.getSessionId(),
          browser_fingerprint: assinaturaInfo?.fingerprint || null,
          cpf_validado: formData.tipo_solicitante === 'cpf' ? cpfValidation?.valid : null,
          cpf_status: cpfValidation?.status || null,
        }
      });

      if (createError) {
        console.error('Erro ao criar agendamento:', createError);
        setError(createError.message || 'Erro ao processar agendamento');
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Enviar email de confirmação (opcional)
      if (data?.data) {
        try {
          await supabase.functions.invoke('send-agendamento-email', {
            body: JSON.stringify({
              tipo: 'confirmacao',
              email_destino: formData.solicitante_email,
              nome_destino: formData.solicitante_nome,
              agendamento_id: data.data.id,
              dados: {
                espaco: selectedSpace?.nome,
                data: new Date(formData.data_pretendida).toLocaleDateString('pt-BR'),
                horario: `${formData.horario_inicio.slice(0, 5)} - ${formData.horario_fim.slice(0, 5)}`,
              },
            }),
          });
        } catch (e) {
          console.error('Erro ao enviar email:', e);
        }

        // A assinatura digital agora é gerada com segurança 100% no servidor (Edge Function).
      }

      // Limpar rascunho local
      await draftService.clearDraft();
      sessionStorage.removeItem('gvc_agendamento_draft');
      sessionStorage.removeItem('gvc_agendamento_step');

      setProtocoloSalvo(data?.data?.protocolo || 'GVC-GERACAO-PENDENTE');
      setSuccess(true);
    } catch (e: any) {
      console.error('Erro completo:', e);
      setError(e.message || 'Erro ao processar agendamento');
    }

    setLoading(false);
  };


  const handleExportPDF = () => {
    const protocolo = protocoloSalvo || 'GVC-PENDENTE';
    const printContent = `
      <html>
        <head>
          <title>Protocolo de Agendamento - ${protocolo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .protocolo { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .protocolo strong { font-size: 18px; }
            .section { margin: 20px 0; }
            .section h3 { color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-item { padding: 8px 0; }
            .info-item strong { display: block; color: #6b7280; font-size: 12px; }
            .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
            .obs { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🏛️ GEC - Gestão de Espaços Culturais</div>
            <p>Fundação Cultural do Estado de Alagoas</p>
          </div>
          <div class="protocolo">
            <strong>Protocolo:</strong> ${protocolo}<br>
            <span style="color: #6b7280; font-size: 14px;">Data de envio: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
          <div class="section">
            <h3>📋 Dados do Solicitante</h3>
            <div class="info">
              <div class="info-item"><strong>Nome</strong>${formData.solicitante_nome}</div>
              <div class="info-item"><strong>Email</strong>${formData.solicitante_email}</div>
              <div class="info-item"><strong>Telefone</strong>${formData.solicitante_telefone}</div>
              <div class="info-item"><strong>Tipo</strong>${tipoSolicitanteOptions.find(o => o.value === formData.tipo_solicitante)?.label || formData.tipo_solicitante}</div>
              <div class="info-item"><strong>Documento</strong>${formData.solicitante_documento}</div>
            </div>
          </div>
          <div class="section">
            <h3>🏛️ Espaço Solicitado</h3>
            <div class="info">
              <div class="info-item"><strong>Espaço</strong>${spaces.find(s => s.id === formData.espaco_id)?.nome || formData.espaco_solicitado}</div>
              <div class="info-item"><strong>Data</strong>${formatDate(formData.data_pretendida)}</div>
              <div class="info-item"><strong>Horário</strong>${formData.horario_inicio.slice(0, 5)} - ${formData.horario_fim.slice(0, 5)}</div>
              <div class="info-item"><strong>Participantes</strong>${formData.numero_participantes}</div>
            </div>
          </div>
          <div class="section">
            <h3>📝 Dados do Evento</h3>
            <div class="info">
              <div class="info-item"><strong>Natureza</strong>${formData.natureza_evento}</div>
              <div class="info-item"><strong>Gratuito</strong>${formData.gratuito ? 'Sim' : 'Não'}</div>
            </div>
            <div style="margin-top: 10px;">
              <strong>Descrição:</strong>
              <p>${formData.descricao_evento}</p>
            </div>
          </div>
          <div class="section">
            <h3>📄 Termos e Compromisso (Portaria nº 169/2023 - FEM)</h3>
            <div style="margin-top: 10px;">
              ${formData.termo_aceito ? '✅' : '❌'} <strong>Declaro que li e aceito os termos da Portaria nº 169/2023</strong><br>
              ${formData.responsabhilidade_evento ? '✅' : '❌'} <strong>Assumo total responsabilidade pela segurança e produção do evento</strong><br>
              ${formData.danos_patrimonio ? '✅' : '❌'} <strong>Responsabilizo-me por eventuais danos ao patrimônio público</strong><br>
              ${formData.respeito_lotacao ? '✅' : '❌'} <strong>Comprometo-me a respeitar a lotação máxima do espaço</strong><br>
              ${formData.autorizo_divulgacao ? '✅' : '❌'} <strong>Autorizo a FEM a utilizar imagens do evento para divulgação</strong>
            </div>
          </div>
          <div class="section" style="background: #f0fdf4; border: 2px solid #16a34a; padding: 15px; border-radius: 8px;">
            <h3 style="color: #16a34a;">✍️ Assinatura Digital</h3>
            <div class="info">
              <div class="info-item"><strong>Assinante</strong>${formData.tipo_solicitante === 'pessoa_fisica' ? formData.solicitante_nome : formData.razao_social}</div>
              <div class="info-item"><strong>CPF/CNPJ</strong>${formData.solicitante_documento}</div>
              <div class="info-item"><strong>Data/Hora da Assinatura</strong>${formData.termo_compromisso_data ? new Date(formData.termo_compromisso_data).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
              <div class="info-item"><strong>IP</strong>${formData.termo_compromisso_ip || 'Não registrado'}</div>
            </div>
            <p style="font-size: 11px; color: #6b7280; margin-top: 10px;">
              * Assinatura eletrônica válida conforme Lei nº 11.977/2008 e MP nº 2.200-2/2001
            </p>
          </div>
          <div class="obs">
            ⏰ <strong>Prazo de resposta:</strong> Até 3 dias úteis<br>
            📧 O resultado será enviado para o email cadastrado
          </div>
          <div class="footer">
            <p>Documento gerado automaticamente pelo sistema GEC</p>
            <p>https://gec.cultura.al.gov.br</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (success) {
    const protocolo = protocoloSalvo || 'GVC-PENDENTE';
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} className="text-emerald-600" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold">
              ✓ Confirmado
            </div>
          </div>
          
          <h1 className="text-3xl font-display font-bold text-slate-900 mt-6 mb-2">
            Agendamento Enviado!
          </h1>
          <p className="text-slate-600 mb-6">
            Sua solicitação foi recebida com sucesso. Você receberá uma resposta em até <strong>3 dias úteis</strong> no email cadastrado.
          </p>
          
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6 border border-indigo-100">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs text-indigo-600 font-medium">PROTOCOLO</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{protocolo}</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-4 text-left mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">📋 Resumo do Agendamento</h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600"><strong>Espaço:</strong> {spaces.find((s) => s.id === formData.espaco_id)?.nome}</p>
              <p className="text-slate-600"><strong>Data:</strong> {formatDate(formData.data_pretendida)}</p>
              <p className="text-slate-600"><strong>Horário:</strong> {formData.horario_inicio.slice(0, 5)} - {formData.horario_fim.slice(0, 5)}</p>
              <p className="text-slate-600"><strong>Participantes:</strong> {formData.numero_participantes}</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left mb-6">
            <h3 className="font-semibold text-green-900 mb-3">✍️ Assinatura Digital Confirmada</h3>
            <div className="space-y-2 text-sm">
              <p className="text-green-800"><strong>Assinante:</strong> {formData.tipo_solicitante === 'pessoa_fisica' ? formData.solicitante_nome : formData.razao_social}</p>
              <p className="text-green-800"><strong>CPF/CNPJ:</strong> {formData.solicitante_documento}</p>
              <p className="text-green-800"><strong>Data/Hora:</strong> {new Date().toLocaleString('pt-BR')}</p>
              <p className="text-green-800"><strong>IP Capturado:</strong> {(navigator as any).connection?.effectiveType ? 'Via conexão' : 'Registro confirmado'}</p>
            </div>
            <p className="text-xs text-green-700 mt-2">
              ✅ Assinatura válida conforme Lei nº 11.977/2008 e MP nº 2.200-2/2001
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileText size={18} />
              📄 Imprimir Comprovante
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData(initialFormData);
                setCurrentStep(1);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              ➕ Nova Solicitação
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mt-6">
            💡 Dica: Salve o comprovante PDF para anexar em sistemas de protocolo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg">
              <CalendarDays size={28} />
            </div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Agendamento de Espaços
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Solicite o uso de auditórios, salas de reunião, áreas externas e visitas guiadas nos espaços culturais da FEM.
          </p>
        </div>

<div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Agendamento</p>
                  <p className="text-3xl font-bold">{Math.round((currentStep / 6) * 100)}%</p>
                </div>
                <div className="text-white text-right">
                  <p className="text-sm font-medium opacity-90">Etapa {currentStep} de 6</p>
                  <p className="text-lg font-bold">{steps[currentStep - 1]?.title}</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-white text-sm">
                <span className="font-medium">
                  {currentStep === 1 && "📋 Preencha seus dados pessoais"}
                  {currentStep === 2 && "🏛️ Escolha o espaço cultural"}
                  {currentStep === 3 && "📅 Defina data e horário"}
                  {currentStep === 4 && "📝 Descreva seu evento"}
                  {currentStep === 5 && "📄 Leia e aceite os Termos"}
                {currentStep === 6 && "✅ Revise e confirme"}
                </span>
                {currentStep === 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/agendamento');
                      }}
                      className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                    >
                      <LogOut size={12} />
                      Trocar conta
                    </button>
                    <button 
                      type="button"
                      onClick={clearDraft}
                      className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                      title="Limpar formulário"
                    >
                      <Trash2 size={12} />
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isClickable = currentStep > 1 && isCompleted;
                return (
                  <React.Fragment key={step.id}>
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all hover:scale-105 ${
                        isActive ? 'scale-110' : isClickable ? 'opacity-100 hover:text-indigo-600' : 'opacity-50'
                      }`}
                      onClick={() => {
                        if (isClickable) {
                          setCurrentStep(step.id);
                        }
                      }}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                            : isActive
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
                            : 'bg-white text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium text-center hidden lg:block ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 rounded-full transition-colors ${
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
</div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Dados do Solicitante</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.solicitante_nome}
                        onChange={(e) => updateFormData('solicitante_nome', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      E-mail *
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={formData.solicitante_email}
                        onChange={(e) => updateFormData('solicitante_email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Telefone *
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={formData.solicitante_telefone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                        placeholder="(00) 90000-0000"
                        maxLength={15}
                      />
                    </div>
                    {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isPessoaFisica ? 'CPF *' : 'CNPJ *'}
                    </label>
                    <input
                      type="text"
                      value={formData.solicitante_documento}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${documentError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                      placeholder={isPessoaFisica ? '000.000.000-00' : '00.000.000/0001-00'}
                      maxLength={isPessoaFisica ? 14 : 18}
                    />
                    {documentError && <p className="text-red-500 text-xs mt-1">{documentError}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Solicitante *
                    </label>
                    <select
                      value={formData.tipo_solicitante}
                      onChange={(e) => {
                        updateFormData('tipo_solicitante', e.target.value);
                        updateFormData('solicitante_documento', '');
                        setDocumentError(null);
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {tipoSolicitanteOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isPessoaJuridica && (
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => updateFormData('razao_social', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nome completo da empresa"
                      />
                    </div>
                  )}

                  {(isEscola || isUniversidade) && (
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nome da Instituição *
                      </label>
                      <input
                        type="text"
                        value={formData.nome_instituicao}
                        onChange={(e) => updateFormData('nome_instituicao', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={isEscola ? 'Nome da escola' : 'Nome da universidade/faculdade'}
                      />
                    </div>
                  )}

                  {isGoverno && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Secretaria *
                        </label>
                        <input
                          type="text"
                          value={formData.secretaria_governo}
                          onChange={(e) => updateFormData('secretaria_governo', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Ex: Secretaria de Cultura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Unidade *
                        </label>
                        <input
                          type="text"
                          value={formData.unidade_governo}
                          onChange={(e) => updateFormData('unidade_governo', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Ex: Diretoria de Eventos"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Escolha do Espaço</h2>
                {loadingSpaces ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Nenhum espaço disponível para agendamento no momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Espaço Cultural *
                      </label>
                      <select
                        value={formData.espaco_id}
                        onChange={(e) => {
                          updateFormData('espaco_id', e.target.value);
                          updateFormData('tipo_espaco', '');
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecione um espaço</option>
                        {spaces.map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.nome}
                          </option>
                        ))}
                      </select>
                      {formData.espaco_id && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-xl">
                          <p className="text-sm text-slate-600">
                            <strong>Endereço:</strong> {spaces.find((s) => s.id === formData.espaco_id)?.endereco || 'Não informado'}
                          </p>
                          {spaces.find((s) => s.id === formData.espaco_id)?.horario_funcionamento && (
                            <p className="text-sm text-slate-600 mt-1">
                              <strong>Funcionamento:</strong> {spaces.find((s) => s.id === formData.espaco_id)?.horario_funcionamento}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tipo de Espaço *
                      </label>
                      <select
                        value={formData.tipo_espaco}
                        onChange={(e) => updateFormData('tipo_espaco', e.target.value)}
                        disabled={!formData.espaco_id}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Selecione o tipo</option>
                        {getAvailableSpaceTypes(formData.espaco_id, spaces).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} {Number(opt.capacidade) > 0 ? `(até ${opt.capacidade} lugares)` : ''}
                          </option>
                        ))}
                      </select>
                      {!formData.espaco_id && (
                        <p className="text-xs text-slate-500 mt-1">Selecione um espaço cultural primeiro</p>
                      )}
                      {formData.espaco_id && getAvailableSpaceTypes(formData.espaco_id, spaces).length === 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Este espaço não possui tipos de espaços cadastrados para agendamento</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Data e Horário</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Data Pretendida *
                    </label>
                    <input
                      type="date"
                      value={formData.data_pretendida}
                      onChange={(e) => updateFormData('data_pretendida', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número de Participantes *
                    </label>
                    <div className="relative">
                      <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={formData.numero_participantes || ''}
                        onChange={(e) => updateFormData('numero_participantes', parseInt(e.target.value) || 0)}
                        min={1}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Quantidade de pessoas"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Horário de Início *
                    </label>
                    <input
                      type="time"
                      value={formData.horario_inicio}
                      onChange={(e) => updateFormData('horario_inicio', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Horário de Término *
                    </label>
                    <input
                      type="time"
                      value={formData.horario_fim}
                      onChange={(e) => updateFormData('horario_fim', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {conflitos.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-medium text-red-700 mb-2">Conflitos detectados!</p>
                    <p className="text-sm text-red-600">
                      Já existe agendamento para este horário: {conflitos[0].espaco_solicitado} (
                      {conflitos[0].horario_inicio?.slice(0, 5)} - {conflitos[0].horario_fim?.slice(0, 5)})
                    </p>
                  </div>
                )}
                {checkingConflict && (
                  <div className="text-sm text-slate-500">Verificando disponibilidade...</div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Detalhes do Evento</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Natureza do Evento *
                    </label>
                    <select
                      value={formData.natureza_evento}
                      onChange={(e) => updateFormData('natureza_evento', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {naturezaOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      O evento é gratuito? *
                    </label>
                    <select
                      value={formData.gratuito ? 'true' : 'false'}
                      onChange={(e) => updateFormData('gratuito', e.target.value === 'true')}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="true">Sim, gratuito</option>
                      <option value="false">Não, tem ingresso</option>
                    </select>
                  </div>
                  {!formData.gratuito && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Valor do Ingresso (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.valor_ingresso}
                        onChange={(e) => updateFormData('valor_ingresso', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0,00"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descrição do Evento *
                    </label>
                    <textarea
                      value={formData.descricao_evento}
                      onChange={(e) => updateFormData('descricao_evento', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descreva o evento que será realizado..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Necessita de Equipamentos?
                    </label>
                    <textarea
                      value={formData.necessita_equipamentos}
                      onChange={(e) => updateFormData('necessita_equipamentos', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: projetor, som, cadeiras extras..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observações Adicionais
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => updateFormData('observacoes', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Outras informações relevantes..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Termo de Compromisso e Responsabilidade</h2>
                <p className="text-sm text-slate-600 mb-4">Preencha os dados abaixo e assine digitalmente o Termo de Compromisso (Anexo I - Portaria nº 169/2023)</p>
                
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Dados do Evento</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Nome Completo / Razão Social:</span>
                      <p className="font-medium">{formData.tipo_solicitante === 'pessoa_fisica' ? formData.solicitante_nome : formData.razao_social}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">CPF ou CNPJ:</span>
                      <p className="font-medium">{formData.solicitante_documento}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Espaço Cultural:</span>
                      <p className="font-medium">{formData.espaco_solicitado || spaces.find(s => s.id === formData.espaco_id)?.nome || 'Não selecionado'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Data do Evento:</span>
                      <p className="font-medium">{formData.data_pretendida ? new Date(formData.data_pretendida).toLocaleDateString('pt-BR') : 'Não definida'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Horário:</span>
                      <p className="font-medium">{formData.horario_inicio?.slice(0,5) || '--:--'} às {formData.horario_fim?.slice(0,5) || '--:--'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Descrição da Atividade:</span>
                      <p className="font-medium">{formData.descricao_evento || 'Não informada'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-slate-900 mb-4">TERMO DE COMPROMISSO E RESPONSABILIDADE</h3>
                  <p className="text-xs text-slate-600 mb-3"><strong>Anexo I - Portaria nº 169/2023 - FEM</strong></p>
                  <div className="text-xs text-slate-700 space-y-2 text-justify">
                    <p>Eu, <strong>{formData.tipo_solicitante === 'pessoa_fisica' ? formData.solicitante_nome : formData.razao_social}</strong>, {formData.tipo_solicitante === 'pessoa_fisica' ? 'domiciliado(a)' : 'sediado(a)'} {formData.tipo_solicitante === 'pessoa_fisica' ? formData.nome_instituicao || 'não informado' : formData.nome_instituicao || 'não informado'}, CPF/CNPJ nº <strong>{formData.solicitante_documento}</strong>, doravante denominado(a) COMPROMISSADO(A), de acordo com o previsto na Portaria nº 169/2023, firma o presente Termo, nas seguintes condições:</p>
                    
                    <p><strong>1.</strong> O presente Termo tem por objeto a utilização, pelo COMPROMISSADO(A), do <strong>{formData.espaco_solicitado || spaces.find(s => s.id === formData.espaco_id)?.nome || 'espaço cultural'}</strong>, para a realização exclusiva da atividade <strong>{formData.descricao_evento || 'não informada'}</strong>, no(s) dia(s) <strong>{formData.data_pretendida ? new Date(formData.data_pretendida).toLocaleDateString('pt-BR') : 'não definido'}</strong>, das <strong>{formData.horario_inicio?.slice(0,5) || '--'}</strong> às <strong>{formData.horario_fim?.slice(0,5) || '--'}</strong>.</p>
                    
                    <p><strong>2.</strong> O (A) COMPROMISSADO(A) assumirá o encargo de segurança e produção do evento, bem como os custos de materiais de consumo e expediente a serem utilizados no evento.</p>
                    
                    <p><strong>3.</strong> São obrigações do(a) COMPROMISSADO(A):</p>
                    <p className="pl-4">I - Manter sob sua guarda e responsabilidade o bem cujo uso fora autorizado;</p>
                    <p className="pl-4">II - Não dar ao bem imóvel destinação diversa ou estranha à prevista no item 1 deste Termo;</p>
                    <p className="pl-4">III - Não ceder, nem transferir, no todo ou em parte, o seu uso a terceiros;</p>
                    <p className="pl-4">IV - Zelar pela manutenção e conservação do imóvel, ao longo do período da autorização;</p>
                    <p className="pl-4">V - Responder por todos os danos causados ao imóvel durante o período da autorização;</p>
                    <p className="pl-4">VI - Responder por danos pessoais e materiais causados a terceiros decorrente da realização da atividade;</p>
                    <p className="pl-4">VII - Responsabilizar-se pelo cumprimento de toda a legislação trabalhista e previdenciária;</p>
                    <p className="pl-4">VIII - Providenciar todas as autorizações e medidas necessárias para a realização do evento;</p>
                    <p className="pl-4">IX - Respeitar os horários de funcionamento do espaço;</p>
                    <p className="pl-4">X - Respeitar a lotação máxima das dependências dos espaços culturais;</p>
                    <p className="pl-4">XI - Fixar a classificação indicativa de cada evento conforme legislação vigente;</p>
                    <p className="pl-4">XII - Dispor de responsáveis pela montagem e desmontagem dos equipamentos;</p>
                    <p className="pl-4">XIII - Arcar com as despesas de segurança, controle de acesso e limpeza;</p>
                    <p className="pl-4">XIV - Mencionar em qualquer instrumento de divulgação o apoio do Governo do Estado através da FEM;</p>
                    <p className="pl-4">XV - Informar a desistência do uso com no mínimo 3 dias de antecedência;</p>
                    <p className="pl-4">XVI - Responder pelo descumprimento das normas através de suspensão de 3 meses.</p>
                    
                    <p><strong>4.</strong> Na hipótese de descumprimento do que versa a PORTARIA 169/23 da FEM, será revogada a autorização do uso do espaço, implicando no cancelamento do evento.</p>
                    
                    <p><strong>5.</strong> O(A) COMPROMISSADO(A) declara ter ciência da obrigatoriedade do espaço utilizado nas mesmas condições físicas, estruturais, estéticas e de funcionamento, sendo responsável por eventuais danos ao espaço.</p>
                    
                    <p><strong>6.</strong> O(A) COMPROMISSADO(A) declara sua ciência e concordância com todas as condições de uso estabelecidas no presente Termo.</p>
                    
                    <p><strong>7.</strong> Este Termo deverá ser assinado em 2 (duas) vias, de igual teor, antes da realização da atividade.</p>
                    
                    <p className="mt-4">Rio Branco, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                    ⚠️ Declaração de Ciência e Responsabilidade
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 border border-red-300 rounded-xl cursor-pointer hover:bg-red-100">
                      <input
                        type="checkbox"
                        checked={formData.termo_aceito}
                        onChange={async (e) => {
                          updateFormData('termo_aceito', e.target.checked);
                          if (e.target.checked) {
                            const fingerprint = getBrowserFingerprint();
                            setAssinaturaInfo({ fingerprint, hash: '', ip: '', timestamp: '' });
                          }
                        }}
                        className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-red-800">
                        <strong>Declaro</strong> que li, compreendi e aceito integralmente o Termo de Compromisso e Responsabilidade acima, 
                        me submetendo a todas as suas cláusulas e condições, sob pena de <strong>responsabilização administrativa e civil</strong>, 
                        nos termos da legislação vigente.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-4 border border-red-300 rounded-xl cursor-pointer hover:bg-red-100">
                      <input
                        type="checkbox"
                        checked={formData.responsabhilidade_evento}
                        onChange={(e) => updateFormData('responsabhilidade_evento', e.target.checked)}
                        className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-red-800">
                        <strong>Assumo</strong> total responsabilidade pela segurança e produção do evento, incluindo quaisquer danos 
                        a terceiros, pessoas ou bens, isentando a FEM e o Estado de qualquer responsabilidade.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-4 border border-red-300 rounded-xl cursor-pointer hover:bg-red-100">
                      <input
                        type="checkbox"
                        checked={formData.danos_patrimonio}
                        onChange={(e) => updateFormData('danos_patrimonio', e.target.checked)}
                        className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-red-800">
                        <strong>Responsabilizo-me</strong> por eventuais danos ao patrimônio público, comprometendo-me a ressarcir 
                        integralmente quaisquer prejuízos causados.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-4 border border-red-300 rounded-xl cursor-pointer hover:bg-red-100">
                      <input
                        type="checkbox"
                        checked={formData.respeito_lotacao}
                        onChange={(e) => updateFormData('respeito_lotacao', e.target.checked)}
                        className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-red-800">
                        <strong>Comprometo-me</strong> a respeitar a lotação máxima do espaço e a legislação trabalhista e previdenciária aplicável.
                      </span>
                    </label>
                  </div>
                </div>

                {formData.termo_aceito && formData.responsabhilidade_evento && formData.danos_patrimonio && formData.respeito_lotacao && (
                  <div className="bg-green-50 border border-green-300 rounded-xl p-6">
                    <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                      <Shield size={20} />
                      Assinatura Digital Blindada
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-white border border-green-300 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Tipo de Assinatura</p>
                            <p className="font-medium">Digital (ACEITE ELETRÔNICO)</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Assinante</p>
                            <p className="font-medium">{formData.tipo_solicitante === 'pessoa_fisica' ? formData.solicitante_nome : formData.razao_social}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">CPF/CNPJ</p>
                            <p className="font-medium">{formData.solicitante_documento}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Data/Hora (Brasília)</p>
                            <p className="font-medium">{assinaturaInfo?.timestamp || formData.termo_compromisso_data ? new Date(formData.termo_compromisso_data || Date.now()).toLocaleString('pt-BR') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">IP Público</p>
                            <p className="font-medium flex items-center gap-1">
                              <Smartphone size={12} />
                              {assinaturaInfo?.ip || formData.termo_compromisso_ip || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Hash SHA-256</p>
                            <p className="font-mono text-xs text-slate-600 truncate">
                              {assinaturaInfo?.hash?.substring(0, 20) || '-'}...
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Shield size={12} />
                        Assinatura eletrônica com valor jurídico conforme Lei nº 11.977/2008, MP nº 2.200-2/2001 e Lei nº 14.063/2020. IP público e hash criptográfico garantidos.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.autorizo_divulgacao}
                      onChange={(e) => updateFormData('autorizo_divulgacao', e.target.checked)}
                      className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">
                      Autorizo a FEM a utilizar imagens do evento para fins de divulgação institucional (opcional)
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
                    <FileText className="w-4 h-4" />
                    <a 
                      href="/PORTARIA-169-2023.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Ler a Portaria nº 169/2023 completa
                    </a>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Confirmação</h2>
                
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-sm text-indigo-600 font-medium">Protocolo de Agendamento</p>
                      <p className="text-2xl font-bold text-indigo-900">{protocoloSalvo || 'Aguardando envio...'}</p>
                      <p className="text-xs text-indigo-500 mt-1">
                        Gerado em: {new Date().toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Dados do Solicitante</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Nome:</strong> {formData.solicitante_nome}</p>
                    <p><strong>E-mail:</strong> {formData.solicitante_email}</p>
                    <p><strong>Telefone:</strong> {formData.solicitante_telefone}</p>
                    <p><strong>Tipo:</strong> {tipoSolicitanteOptions.find((o) => o.value === formData.tipo_solicitante)?.label}</p>
                  </div>

                  <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2 pt-2">Espaço</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Espaço:</strong> {spaces.find((s) => s.id === formData.espaco_id)?.nome}</p>
                    <p><strong>Tipo:</strong> {tipoEspacosBase.find((e) => e.value === formData.tipo_espaco)?.label}</p>
                  </div>

                  <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2 pt-2">Data e Participantes</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Data:</strong> {formatDate(formData.data_pretendida)}</p>
                    <p><strong>Horário:</strong> {formData.horario_inicio?.slice(0, 5)} - {formData.horario_fim?.slice(0, 5)}</p>
                    <p><strong>Participantes:</strong> {formData.numero_participantes}</p>
                    <p><strong>Natureza:</strong> {naturezaOptions.find((n) => n.value === formData.natureza_evento)?.label}</p>
                  </div>

                  <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2 pt-2">Evento</h3>
                  <div className="text-sm">
                    <p><strong>Descrição:</strong> {formData.descricao_evento}</p>
                    {formData.necessita_equipamentos && (
                      <p><strong>Equipamentos:</strong> {formData.necessita_equipamentos}</p>
                    )}
                    <p><strong>Valor:</strong> {formData.gratuito ? 'Gratuito' : `R$ ${formData.valor_ingresso}`}</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Ao enviar esta solicitação, você concorda com todos os termos da Portaria nº 169/2023. Você receberá uma resposta em até 3 dias úteis.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-8 py-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
              Voltar
            </button>
            {currentStep < 6 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!validateStep(currentStep)}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || creating}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all hover:scale-105 hover:shadow-lg disabled:opacity-40"
              >
                {loading || creating ? 'Enviando...' : 'Enviar Solicitação'}
                <CheckCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}