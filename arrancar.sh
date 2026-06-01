#!/bin/bash
# TicketScan — Arranca backend y frontend a la vez

echo ""
echo "🚀 Arrancando TicketScan..."
echo ""

# Arranca el backend en segundo plano
cd backend
node server.js &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID $BACKEND_PID) → http://localhost:3001"

# Arranca el frontend
cd ../frontend
echo "✅ Frontend iniciando → http://localhost:5173"
echo ""
echo "  Abre tu navegador en: http://localhost:5173"
echo "  Para parar todo: Ctrl + C"
echo ""

# Cuando se cierre el frontend, cierra también el backend
trap "kill $BACKEND_PID 2>/dev/null; echo 'Servidores parados.'" EXIT

npm run dev
