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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Auth header')
    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid token')
    
    // Check if requester is admin
    const { data: requesterData } = await supabaseAdmin
      .from('usuarios')
      .select('perfil')
      .eq('auth_uid', user.id)
      .single()
      
    if (!requesterData || requesterData.perfil !== 'administrador') {
      throw new Error('Not authorized')
    }

    const tables = ['visits', 'lockers', 'visitors', 'configuracoes', 'usuarios', 'espacos'];
    const allData: Record<string, any> = {
      metadata: {
        dataExportacao: new Date().toISOString(),
        versaoSistema: "1.3.0",
        totalRegistros: {}
      }
    };

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) {
        console.error(`Erro ao exportar ${table}:`, error);
        continue;
      }
      allData[table] = data;
      allData.metadata.totalRegistros[table] = data.length;
    }

    return new Response(
      JSON.stringify(allData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
