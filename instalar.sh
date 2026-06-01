#!/bin/bash
# TicketScan — Instalación automática
# Ejecuta este archivo una sola vez con: bash instalar.sh

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        TicketScan — Instalando       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Instalar dependencias del backend
echo "📦 Instalando backend..."
cd backend
npm install
cd ..

# 2. Instalar dependencias del frontend
echo "📦 Instalando frontend..."
cd frontend
npm install
cd ..

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PRÓXIMO PASO:"
echo "  Abre el archivo backend/.env"
echo "  y pega tu API key de Anthropic."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Luego ejecuta: bash arrancar.sh"
echo ""
