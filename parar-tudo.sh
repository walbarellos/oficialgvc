#!/usr/bin/env bash
echo "🛑 Forçando parada do Vite..."
pkill -f "vite" || true
echo "✅ Servidor desligado!"
