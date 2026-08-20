import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type ClientFactory = (token: string) => SupabaseClient;

export function createUserClient(token: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Valida o JWT do caller com o cliente anon; só depois o caller usa o service role.
export async function requireAuth(
  req: Request,
  factory: ClientFactory = createUserClient
): Promise<{ user: { id: string; email?: string }; supabaseUser: SupabaseClient }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid authorization");
  }

  const token = authHeader.slice(7);
  const supabaseUser = factory(token);

  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) {
    throw unauthorized("Unauthorized");
  }

  return { user: { id: user.id, email: user.email }, supabaseUser };
}

// Jobs internos (cron): exige segredo compartilhado via header x-cron-secret.
// O cron do Vercel não envia headers custom — o api/auto-checkout.ts (Vercel)
// injeta o header com CRON_SECRET do ambiente Vercel.
export function requireCronSecret(req: Request): void {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) {
    throw new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export const STAFF_PERFIS = ["administrador", "coordenador", "funcionario", "monitor"];