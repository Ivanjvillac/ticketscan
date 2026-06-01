# 🧾 TicketScan

Escanea tickets de compra con IA y guarda los datos automáticamente.

---

## Requisitos previos (solo una vez)

Instala **Node.js** desde https://nodejs.org  
Elige la versión **LTS** (la recomendada). Solo tienes que instalarlo como cualquier programa.

---

## Pasos para poner en marcha la app

### Paso 1 — Copia la carpeta `ticketscan` donde quieras
Por ejemplo en tu Escritorio o en Documentos.

### Paso 2 — Pon tu API Key de Anthropic

1. Abre la carpeta `ticketscan/backend/`
2. Abre el archivo `.env` con el Bloc de notas
3. Sustituye `sk-ant-PEGA_AQUI_TU_API_KEY` por tu clave real
4. Guarda el archivo

> Tu API key la encuentras en https://console.anthropic.com

### Paso 3 — Instala las dependencias (solo la primera vez)

**En Mac/Linux:**
- Abre el Terminal dentro de la carpeta `ticketscan`
- Ejecuta: `bash instalar.sh`

**En Windows:**
- Abre PowerShell o CMD dentro de la carpeta `ticketscan`
- Ejecuta: `cd backend && npm install && cd ../frontend && npm install`

### Paso 4 — Arranca la app

**En Mac/Linux:**
```
bash arrancar.sh
```

**En Windows — Terminal 1:**
```
cd backend
node server.js
```
**En Windows — Terminal 2:**
```
cd frontend
npm run dev
```

### Paso 5 — Abre el navegador

Ve a: **http://localhost:5173**

---

## ¿Dónde se guardan los datos?

En el archivo `backend/tickets.db` — es una base de datos SQLite.  
No se borra sola, persiste entre reinicios de la app.  
Puedes hacer una copia de seguridad copiando ese archivo.

---

## Solución de problemas

| Problema | Solución |
|---|---|
| "Backend no disponible" | Asegúrate de que el servidor backend está corriendo |
| "Error de API" | Comprueba que la API key en `.env` es correcta |
| Puerto ocupado | Cierra otras apps en los puertos 3001 o 5173 |
