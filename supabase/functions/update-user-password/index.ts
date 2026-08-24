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
    
    // Check if requester is admin/coordinator
    const { data: requesterData } = await supabaseAdmin
      .from('usuarios')
      .select('perfil')
      .eq('auth_uid', user.id)
      .single()
      
    if (!requesterData || !['administrador', 'coordenador'].includes(requesterData.perfil)) {
      throw new Error('Not authorized')
    }

    const payload = await req.json()
    const { targetUserId, password } = payload

    if (!targetUserId || !password) throw new Error('Missing target user ID or password')

    // Find auth_uid for the target user
    const { data: targetUser } = await supabaseAdmin
      .from('usuarios')
      .select('auth_uid')
      .eq('id', targetUserId)
      .single()

    if (!targetUser || !targetUser.auth_uid) {
       throw new Error('Target user not found or has no auth_uid')
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.auth_uid,
      { password }
    )

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
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
