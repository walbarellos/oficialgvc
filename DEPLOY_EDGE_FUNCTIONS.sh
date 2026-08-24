#!/bin/bash
# Script para deployar as Edge Functions para o Supabase

echo "Deploying register-audit..."
supabase functions deploy register-audit --no-verify-jwt

echo "Deploying send-agendamento-email..."
supabase functions deploy send-agendamento-email --no-verify-jwt

echo "Deploying auto-checkout..."
supabase functions deploy auto-checkout --no-verify-jwt

echo "Deploying create-user..."
supabase functions deploy create-user --no-verify-jwt

echo "Deploying update-user-password..."
supabase functions deploy update-user-password --no-verify-jwt

echo "Deploying public-submit-agendamento..."
supabase functions deploy public-submit-agendamento --no-verify-jwt

echo "Pronto! Certifique-se de configurar os secrets no Supabase (RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)!"
