import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getAdminClient,
  requireAuth,
  STAFF_PERFIS,
} from "../_shared/auth.ts";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Exige JWT válido do caller
    const { user, supabaseUser } = await requireAuth(req);

    // Verificar perfil staff na tabela usuarios (via cliente do próprio usuário)
    const { data: perfilRow } = await supabaseUser
      .from("usuarios")
      .select("perfil, nome")
      .eq("auth_uid", user.id)
      .maybeSingle();

    if (!perfilRow || !STAFF_PERFIS.includes(perfilRow.perfil)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // Sobrescrever identidade com dados do token — nunca confiar no client
    const supabaseAdmin = getAdminClient();
    const { error: insertError } = await supabaseAdmin.from("auditoria").insert({
      acao: payload.acao,
      detalhes: payload.detalhes,
      entidade_id: payload.entidade_id ?? null,
      usuario: perfilRow.nome,
      perfil: perfilRow.perfil,
      usuario_id: user.id,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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