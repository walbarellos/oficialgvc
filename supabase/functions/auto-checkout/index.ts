import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getAdminClient,
  requireCronSecret,
} from "../_shared/auth.ts";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Job de sistema: NÃO aceitar JWT de usuário comum — exige segredo de cron
    requireCronSecret(req);

    const supabaseAdmin = getAdminClient();

    // Buscar visitas ativas há mais de 1 hora
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: exceededVisits, error: fetchError } = await supabaseAdmin
      .from('visits')
      .select('id, checkin, espaco_id')
      .eq('status', 'Ativo')
      .lt('checkin', oneHourAgo.toISOString());

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!exceededVisits || exceededVisits.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma visita excedida", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualizar status para Excedido
    const now = new Date().toISOString();
    const visitIds = exceededVisits.map(v => v.id);

    const { error: updateError } = await supabaseAdmin
      .from('visits')
      .update({
        status: 'Excedido',
        checkout: now
      })
      .in('id', visitIds);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      processed: visitIds.length,
      message: `${visitIds.length} visitas encerradas`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});