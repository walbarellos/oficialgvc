#!/usr/bin/env bash
set -e

# Vai para a pasta do script (raiz do projeto)
cd "$(dirname "$0")"

# Mata qualquer processo Vite anterior na porta 3002
pkill -f "vite --host 0.0.0.0 --port 3002" || true

echo "=== Iniciando Oficial GVC (Frontend) ==="
if [ ! -f .env.local ]; then 
  cp .env.example .env.local 2>/dev/null || true
  echo 'ATENCAO: verifique suas chaves do Supabase no .env.local'
fi

if [ ! -d node_modules ]; then 
  npm install
fi

npx vite --host 0.0.0.0 --port 3002 &
VITE_PID=$!

function cleanup() {
  echo ""
  echo "🛑 Recebido CTRL+C! Parando OficialGVC..."
  kill $VITE_PID 2>/dev/null || true
  echo "✅ Servidor desligado! Até logo."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "=========================================================="
echo "🚀 OficialGVC no ar!"
echo "  👉 Acesso: http://localhost:3002"
echo ""
echo "⚠️  Aperte CTRL+C nesta janela para encerrar."
echo "=========================================================="

wait
