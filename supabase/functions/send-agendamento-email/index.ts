import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getAdminClient,
  requireAuth,
  STAFF_PERFIS,
} from "../_shared/auth.ts";

interface EmailPayload {
  tipo: 'confirmacao' | 'aprovacao' | 'rejeicao' | 'novo_agendamento';
  email_destino: string;
  nome_destino: string;
  agendamento_id?: string;
  dados?: {
    espaco?: string;
    data?: string;
    horario?: string;
    motivo?: string;
  };
}

function getEmailTemplate(payload: EmailPayload): { subject: string; html: string } {
  const { tipo, nome_destino, dados } = payload;

  const templates = {
    confirmacao: {
      subject: "Confirmação de Solicitação de Agendamento - FEM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Fundação de Cultura Elias Mansour</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Olá, ${nome_destino}!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Sua solicitação de agendamento foi recebida com sucesso!
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #4b5563;"><strong>Espaço:</strong> ${dados?.espaco || 'Não especificado'}</p>
              <p style="color: #4b5563;"><strong>Data:</strong> ${dados?.data || 'Não especificada'}</p>
              <p style="color: #4b5563;"><strong>Horário:</strong> ${dados?.horario || 'Não especificado'}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Você receberá uma resposta em até <strong>3 dias úteis</strong> no email cadastrado.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Este é um email automático, por favor não responda esta mensagem.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Fundação de Cultura Elias Mansour - FEM</p>
          </div>
        </div>
      `,
    },
    aprovacao: {
      subject: "Agendamento APROVADO - FEM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Agendamento Aprovado</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Olá, ${nome_destino}!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Ótima notícia! Seu agendamento foi <strong>APROVADO</strong>.
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10B981;">
              <p style="color: #4b5563;"><strong>Espaço:</strong> ${dados?.espaco || 'Não especificado'}</p>
              <p style="color: #4b5563;"><strong>Data:</strong> ${dados?.data || 'Não especificada'}</p>
              <p style="color: #4b5563;"><strong>Horário:</strong> ${dados?.horario || 'Não especificado'}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Por favor, compareça ao espaço na data e horário agendados.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Em caso de dúvidas, entre em contato com a coordenação do espaço.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Fundação de Cultura Elias Mansour - FEM</p>
          </div>
        </div>
      `,
    },
    rejeicao: {
      subject: "Agendamento REJEITADO - FEM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #DC2626, #EF4444); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">❌ Agendamento Rejeitado</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Olá, ${nome_destino}!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Infelizmente, seu agendamento foi <strong>REJEITADO</strong>.
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #EF4444;">
              <p style="color: #4b5563;"><strong>Espaço:</strong> ${dados?.espaco || 'Não especificado'}</p>
              <p style="color: #4b5563;"><strong>Data:</strong> ${dados?.data || 'Não especificada'}</p>
              <p style="color: #dc2626;"><strong>Motivo:</strong> ${dados?.motivo || 'Não especificado'}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Você pode realizar uma nova solicitação verificando a disponibilidade de outros horários ou datas.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Fundação de Cultura Elias Mansour - FEM</p>
          </div>
        </div>
      `,
    },
    novo_agendamento: {
      subject: "Nova Solicitação de Agendamento - FEM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📅 Nova Solicitação</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Nova solicitação de agendamento recebida!</h2>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #4b5563;"><strong>Solicitante:</strong> ${nome_destino}</p>
              <p style="color: #4b5563;"><strong>Espaço:</strong> ${dados?.espaco || 'Não especificado'}</p>
              <p style="color: #4b5563;"><strong>Data:</strong> ${dados?.data || 'Não especificada'}</p>
              <p style="color: #4b5563;"><strong>Horário:</strong> ${dados?.horario || 'Não especificado'}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Acesse o sistema de gestão para analisar e responder esta solicitação.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Fundação de Cultura Elias Mansour - FEM</p>
          </div>
        </div>
      `,
    },
  };

  return templates[tipo];
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Exige JWT válido do caller
    const { user, supabaseUser } = await requireAuth(req);

    // Staff pode enviar para qualquer destino; cidadão só para o próprio e-mail
    const { data: perfilRow } = await supabaseUser
      .from("usuarios")
      .select("perfil")
      .eq("auth_uid", user.id)
      .maybeSingle();

    const isStaff = !!perfilRow && STAFF_PERFIS.includes(perfilRow.perfil);

    const payload: EmailPayload = await req.json();

    if (!payload.email_destino || !payload.nome_destino) {
      return new Response(
        JSON.stringify({ error: "Email destino e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isStaff && payload.email_destino !== user.email) {
      return new Response(
        JSON.stringify({ error: "Forbidden: envio apenas para o próprio e-mail" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = getEmailTemplate(payload);

    const supabaseAdmin = getAdminClient();
    const { error: insertError } = await supabaseAdmin.from("email_queue").insert({
      destinatario: payload.email_destino,
      nome_destinatario: payload.nome_destino,
      assunto: subject,
      corpo_html: html,
      tipo: payload.tipo,
      referencia_id: payload.agendamento_id,
      status: "pendente",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email enfileirado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});