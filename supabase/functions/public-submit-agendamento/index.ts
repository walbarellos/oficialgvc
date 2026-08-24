import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Capturar IP real do cliente
    const forwardedFor = req.headers.get('x-forwarded-for')
    const cfIP = req.headers.get('cf-connecting-ip')
    const realIP = req.headers.get('x-real-ip')
    const clientIP = forwardedFor?.split(',')[0]?.trim() || cfIP || realIP || 'unknown'
    
    const agendamento = await req.json()
    
    // Se o frontend não enviou IP, usar o capturado
    const ipFinal = agendamento.termo_compromisso_ip || clientIP
    
    // Gerar ID único e timestamp para assinatura digital
    const assinaturaId = crypto.randomUUID()
    const anoAtual = new Date().getFullYear();
    const hashUnico = crypto.randomUUID().split('-')[0].toUpperCase();
    const protocoloGerado = `GVC-${anoAtual}-${hashUnico}`;
    const assinaturaData = new Date().toISOString()

    // Validar dados obrigatórios
    if (!agendamento.solicitante_nome || !agendamento.solicitante_email || !agendamento.espaco_id) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir agendamento (service role ignora RLS)
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .insert({
        espaco_id: agendamento.espaco_id,
        solicitante_nome: agendamento.solicitante_nome,
        solicitante_email: agendamento.solicitante_email,
        solicitante_telefone: agendamento.solicitante_telefone,
        solicitante_documento: agendamento.solicitante_documento,
        tipo_solicitante: agendamento.tipo_solicitante || 'pessoa_fisica',
        razao_social: agendamento.razao_social || null,
        nome_instituicao: agendamento.nome_instituicao || null,
        secretaria_governo: agendamento.secretaria_governo || null,
        unidade_governo: agendamento.unidade_governo || null,
        espaco_solicitado: agendamento.espaco_solicitado,
        tipo_espaco: agendamento.tipo_espaco,
        data_pretendida: agendamento.data_pretendida,
        horario_inicio: agendamento.horario_inicio,
        horario_fim: agendamento.horario_fim,
        numero_participantes: agendamento.numero_participantes,
        descricao_evento: agendamento.descricao_evento,
        natureza_evento: agendamento.natureza_evento || 'cultural',
        gratuito: agendamento.gratuito !== false,
        valor_ingresso: agendamento.gratuito ? null : (parseFloat(agendamento.valor_ingresso) || null),
        necessita_equipamentos: agendamento.necessita_equipamentos || null,
        observacoes: agendamento.observacoes || null,
        status: 'pendente',
        protocolo: protocoloGerado,
        
        // Termos
        termo_aceito: agendamento.termo_aceito || false,
        termo_aceito_em: agendamento.termo_aceito ? new Date().toISOString() : null,
        responsabhilidade_evento: agendamento.responsabhilidade_evento || false,
        danos_patrimonio: agendamento.danos_patrimonio || false,
        respeito_lotacao: agendamento.respeito_lotacao || false,
        autorizo_divulgacao: agendamento.autorizo_divulgacao || false,
        
        // Termo de Compromisso Digital - com IP real capturado no backend
        termo_compromisso_assinado: true,
        termo_compromisso_data: assinaturaData,
        termo_compromisso_ip: ipFinal,
        
        // Campos de auditoria
        assinatura_id: assinaturaId,
        ip_confirmacao: clientIP,
        user_agent: req.headers.get('user-agent') || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limpar rascunho após sucesso
    if (agendamento.session_id) {
      await supabaseAdmin.rpc('limpar_rascunho_agendamento', {
        p_session_id: agendamento.session_id
      }).catch(() => {})
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})