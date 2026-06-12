import express from "express";
import cors from "cors";
import "dotenv/config";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors({
  origin: (origin, cb) => cb(null, true),  // acepta cualquier origen
  credentials: true
}));
app.use(express.json({ limit: "20mb" }));

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key (no RLS)
);

// Helper: ejecutar SQL raw via RPC (necesita función en Supabase — ver abajo)
// Usamos el cliente de Supabase directamente para queries simples
// y pg-compatible syntax para el resto

// ── Categorización ────────────────────────────────────────────────────────────
const DEFAULT_CATS = {
  "Frutas":               ["manzana","pera","naranja","platano","limon","fresa","uva","melon","sandia","kiwi","mango","pina","cereza","albaricoque","ciruela","fruta","mandarina","pomelo","nectarina","higo","granada","papaya","frambuesa","arandano","mora"],
  "Verduras":             ["tomate","lechuga","cebolla","patata","zanahoria","pimiento","pepino","calabacin","berenjena","brocoli","coliflor","espinaca","acelga","puerro","verdura","ensalada","apio","nabo","repollo","col","esparrago","alcachofa","calabaza","champiñon","seta","rucula","canonigo","remolacha","maiz","guisante"],
  "Pescado y Marisco":    ["salmon","merluza","bacalao","sardina","anchoa","dorada","lubina","gamba","langostino","mejillon","almeja","calamar","pulpo","sepia","rape","trucha","pescado","marisco","caballa","boqueron","atun","lenguado","besugo","bonito"],
  "Carnes":               ["pollo","cerdo","ternera","buey","cordero","pavo","conejo","carne","filete","chuleta","costilla","muslo","pechuga","hamburguesa","secreto","solomillo","entrecot","redondo"],
  "Charcuteria":          ["jamon","salchichon","fuet","morcilla","sobrasada","embutido","fiambre","pate","cecina","mortadela","bacon","panceta","salchicha","chorizo"],
  "Lacteos y Huevos":     ["leche","yogur","queso","mantequilla","nata","huevo","lacteo","kefir","cuajada","flan","natillas","mascarpone","mozarela","batido"],
  "Bebidas":              ["agua","cerveza","vino","refresco","zumo","cola","cafe","te","infusion","bebida","limonada","tonica","vermut","cava","sidra","aquarius","energetica","gin","ron","whisky","vodka"],
  "Pan y Bolleria":       ["pan","barra","baguette","croissant","magdalena","bollo","galleta","bizcocho","brioche","donut","bolleria","chapata","hogaza","muffin"],
  "Pasta Arroz Legumbre": ["pasta","macarron","espagueti","fideo","arroz","cereal","avena","muesli","lenteja","garbanzo","alubia","legumbre","quinoa","bulgur"],
  "Conservas":            ["conserva","aceitunas","alcaparras","tomate frito","tomate natural","bote"],
  "Congelados":           ["congelado","helado","croqueta","nugget","rebozado","menestra","pizza congelada"],
  "Snacks y Dulces":      ["chocolate","caramelo","gominola","snack","palomita","almendra","cacahuete","nuez","chips","patatas fritas","pipas","frutos secos","turron","mermelada","miel"],
  "Aceites y Condimentos":["aceite","vinagre","sal","azucar","harina","especias","oregano","ketchup","mayonesa","mostaza","salsa","pimienta","curry","canela","levadura","caldo"],
  "Limpieza Hogar":       ["detergente","suavizante","lavavajillas","limpiador","bayeta","esponja","fregona","friegasuelos","bolsa basura","papel cocina","servilleta","lejia","amoniaco"],
  "Higiene Personal":     ["champu","gel","jabon","dentifrico","pasta dientes","desodorante","compresas","tampon","panal","crema","locion","cuchilla","toallita"],
  "Mascotas":             ["pienso","arena gato","hueso perro"],
  "Bebe e Infantil":      ["papilla","potito","leche infantil"],
  "Otros":                [],
};

let CATS = { ...DEFAULT_CATS };

function categorizar(nombre) {
  if (!nombre) return "Otros";
  const n = " " + nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim() + " ";
  for (const [cat, kws] of Object.entries(CATS)) {
    for (const kw of kws) { if (n.includes(" " + kw + " ")) return cat; }
  }
  return "Otros";
}

// ── Normalización de nombres de producto ──────────────────────────────────────
function normalizeProductName(nombre) {
  if (!nombre) return "";
  return nombre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b\d+[\.,]?\d*\s*(kg|g|gr|l|ml|cl|mg|ud|uds|un|pack|litros?|gramos?|unidades?)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim()
    .split(" ").filter(w => w.length > 1 && !["de","del","la","el","los","las","con","sin","por","para","y","e","o"].includes(w))
    .slice(0, 3).join(" ");
}

async function reloadCustomCats() {
  try {
    const { data } = await supabase.from("custom_categories").select("*");
    CATS = { ...DEFAULT_CATS };
    (data||[]).forEach(c => { CATS[c.nombre] = c.keywords ? c.keywords.split(",").map(k=>k.trim()).filter(Boolean) : []; });
  } catch {}
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Multi-user mode: AUTH_USERS="Ivan:pass1,Maria:pass2"
function parseUsers() {
  const raw = process.env.AUTH_USERS || "";
  if (!raw) return null;
  return raw.split(",").map(u => {
    const idx = u.indexOf(":");
    if (idx < 1) return null;
    return { nombre: u.slice(0, idx).trim(), password: u.slice(idx+1).trim() };
  }).filter(Boolean);
}
const MULTI_USERS = parseUsers();
const SESSIONS = new Map(); // token → { nombre }

function auth(req, res, next) {
  const hasAuth = process.env.AUTH_PASSWORD || MULTI_USERS?.length;
  if (!hasAuth) return next();
  const pub = ["/api/login","/api/check","/api/ping","/api/s/"];
  if (pub.some(p=>req.path.startsWith(p))) return next();
  const token = req.headers.authorization?.replace("Bearer ","");
  if (!token||!SESSIONS.has(token)) return res.status(401).json({ error:"No autorizado" });
  req.user = SESSIONS.get(token); // { nombre }
  next();
}
app.use(auth);

app.post("/api/login", (req, res) => {
  const hasAuth = process.env.AUTH_PASSWORD || MULTI_USERS?.length;
  if (!hasAuth) return res.json({ token:"noauth", user:null, needsAuth:false });
  const { password, nombre } = req.body;
  if (MULTI_USERS?.length) {
    const user = MULTI_USERS.find(u => u.nombre === nombre && u.password === password);
    if (!user) return res.status(401).json({ error:"Usuario o contraseña incorrectos" });
    const token = crypto.randomBytes(32).toString("hex");
    SESSIONS.set(token, { nombre: user.nombre });
    return res.json({ token, user: user.nombre, needsAuth: true });
  }
  if (password !== process.env.AUTH_PASSWORD) return res.status(401).json({ error:"Contraseña incorrecta" });
  const token = crypto.randomBytes(32).toString("hex");
  const userName = process.env.AUTH_USER || "Usuario";
  SESSIONS.set(token, { nombre: userName });
  res.json({ token, user: userName, needsAuth:true });
});
app.get("/api/ping", async (req, res) => {
  try {
    const { count } = await supabase.from("tickets").select("*", { count:"exact", head:true });
    res.json({ ok: true, tickets: count, ts: new Date().toISOString() });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

app.get("/api/check", (req, res) => res.json({
  needsAuth: !!(process.env.AUTH_PASSWORD || MULTI_USERS?.length),
  multiUser: !!(MULTI_USERS?.length),
  users: MULTI_USERS ? MULTI_USERS.map(u=>u.nombre) : null
}));

// ── Inicialización ────────────────────────────────────────────────────────────
await reloadCustomCats();

// Limpiar papelera y shares expirados al arrancar
try {
  await supabase.from("tickets").delete().lt("deleted_at", new Date(Date.now()-30*86400000).toISOString()).not("deleted_at","is",null);
  await supabase.from("shares").delete().lt("expira", new Date().toISOString());
} catch {}

// ── Imagen: guardar en Supabase Storage ───────────────────────────────────────
async function saveImage(ticketId, base64, mimeType) {
  try {
    const buf = Buffer.from(base64, "base64");
    const filename = `ticket_${ticketId}.jpg`;
    await supabase.storage.from("ticket-images").upload(filename, buf, { contentType: mimeType||"image/jpeg", upsert:true });
    const { data } = supabase.storage.from("ticket-images").getPublicUrl(filename);
    return data?.publicUrl || filename;
  } catch { return null; }
}

// ── Analizar ticket ───────────────────────────────────────────────────────────
app.post("/api/analizar", async (req, res) => {
  try {
    const { imagen_base64, media_type, force, subido_por } = req.body;
    if (!imagen_base64) return res.status(400).json({ error:"Falta imagen_base64" });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error:"Falta GROQ_API_KEY" });

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
      body: JSON.stringify({
        model:"meta-llama/llama-4-scout-17b-16e-instruct", max_tokens:4096, temperature:0.1,
        response_format:{type:"json_object"},
        messages:[{ role:"user", content:[
          { type:"image_url", image_url:{url:`data:${media_type||"image/jpeg"};base64,${imagen_base64}`} },
          { type:"text", text:`Analiza el ticket de compra y extrae los datos.
REGLAS ESTRICTAS:
- Responde SOLO con JSON. Nada antes ni después.
- Sin backticks, sin markdown, sin explicaciones.
- Todos los precios son números decimales (ej: 1.49 no "1,49€").
- Si un campo no existe pon null.
- En productos NO uses comillas dentro de los nombres.
- Incluye TODOS los productos del ticket, sin límite.
Formato: {"tienda":"string o null","fecha":"DD/MM/YYYY o null","hora":"HH:MM o null","ticket_num":"string o null","cajero":"string o null","productos":[{"nombre":"string","cantidad":1,"precio_unitario":0.00,"precio_total":0.00}],"subtotal":0.00,"descuentos":0.00,"iva":0.00,"total":0.00,"metodo_pago":"string o null","notas":"string o null"}` }
        ]}]
      })
    });

    const groqData = await groqRes.json();
    if (!groqRes.ok) {
      const raw = groqData?.error?.message || "";
      let msg = "Error al contactar con el servicio de análisis.";
      if (raw.toLowerCase().includes("restricted")) msg = "La cuenta de Groq está restringida. Contacta con support@groq.com o revisa console.groq.com.";
      else if (groqRes.status === 429 || raw.toLowerCase().includes("rate limit")) msg = "Límite de peticiones Groq alcanzado. Espera unos minutos e inténtalo de nuevo.";
      else if (groqRes.status === 401) msg = "API key de Groq inválida. Revisa la variable GROQ_API_KEY.";
      else if (raw) msg = raw;
      return res.status(500).json({ error: msg });
    }

    const text = groqData.choices?.[0]?.message?.content||"";
    const clean = text.replace(/```json|```/g,"").trim();
    const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
    if (start===-1||end===-1) throw new Error("Groq no devolvió JSON válido");

    let datos;
    try { datos = JSON.parse(clean.slice(start,end+1)); }
    catch {
      const fixed = clean.slice(start,end+1).replace(/[\x00-\x1F\x7F]/g," ").replace(/,\s*]/g,"]").replace(/,\s*}/g,"}").replace(/\n/g," ");
      try { datos = JSON.parse(fixed); }
      catch {
        const ex = k => { const m=clean.match(new RegExp(`"${k}"\\s*:\\s*([0-9.]+)`)); return m?parseFloat(m[1]):null; };
        const es = k => { const m=clean.match(new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`)); return m?m[1]:null; };
        datos = { tienda:es("tienda"), fecha:es("fecha"), hora:es("hora"), ticket_num:es("ticket_num"),
          metodo_pago:es("metodo_pago"), subtotal:ex("subtotal"), descuentos:ex("descuentos"),
          iva:ex("iva"), total:ex("total"), notas:es("notas"), productos:[] };
      }
    }

    // Detectar duplicado (mismo tienda+fecha+total) salvo force=true
    if (!force && datos.tienda && datos.fecha && datos.total != null) {
      const { data: dups } = await supabase.from("tickets")
        .select("id,tienda,fecha_compra,total").eq("tienda", datos.tienda)
        .eq("fecha_compra", datos.fecha).is("deleted_at", null).limit(1);
      if (dups?.length) {
        const d = dups[0];
        return res.status(409).json({ error:`Ticket duplicado: ya existe #${d.id} (${d.tienda}, ${d.fecha_compra}, ${d.total}€)`, duplicate: d });
      }
    }

    const { data: ticketRow, error: ticketErr } = await supabase.from("tickets").insert({
      tienda:datos.tienda||null, fecha_compra:datos.fecha||null, hora:datos.hora||null,
      ticket_num:datos.ticket_num||null, metodo_pago:datos.metodo_pago||null,
      subtotal:datos.subtotal||null, descuentos:datos.descuentos||null,
      iva:datos.iva||null, total:datos.total||null, notas:datos.notas||null,
      datos_json: JSON.stringify(datos),
      subido_por: subido_por || req.user?.nombre || null
    }).select("id").single();
    if (ticketErr) throw new Error(ticketErr.message);

    const ticketId = ticketRow.id;
    // No guardamos imagen en storage — datos ya extraídos, ahorramos espacio

    // Insertar productos
    if (datos.productos?.length) {
      const prods = datos.productos.map(p => ({
        ticket_id: ticketId, nombre:p.nombre, cantidad:p.cantidad??1,
        precio_unitario:p.precio_unitario||null, precio_total:p.precio_total||null,
        categoria: categorizar(p.nombre)
      }));
      await supabase.from("productos").insert(prods);
    }

    // Comprobar alertas de precio
    const { data: alertas } = await supabase.from("price_alerts").select("*").eq("activa",1);
    const triggered = [];
    for (const alerta of (alertas||[])) {
      const matching = (datos.productos||[]).filter(p => {
        const n=p.nombre?.toLowerCase()||""; const an=alerta.nombre.toLowerCase();
        return n.includes(an)||an.includes(n.slice(0,4));
      });
      for (const p of matching) {
        const precio = p.precio_unitario||p.precio_total;
        if (precio && precio <= alerta.precio_objetivo) {
          triggered.push({ alerta, producto:p, precio_visto:precio, tienda:datos.tienda });
          await supabase.from("price_alerts").update({ ultima_alerta:new Date().toISOString() }).eq("id",alerta.id);
        }
      }
    }

    res.json({ id:ticketId, ...datos, alertas_disparadas:triggered });
  } catch (err) { console.error(err); res.status(500).json({ error:err.message }); }
});

// ── Tickets ───────────────────────────────────────────────────────────────────
app.get("/api/tickets", async (req, res) => {
  const [{ data: tickets }, { data: allTags }] = await Promise.all([
    supabase.from("tickets").select("*").is("deleted_at",null).order("id",{ascending:false}),
    supabase.from("tags").select("ticket_id,tag")
  ]);
  const tagMap = {};
  for (const t of (allTags||[])) { if (!tagMap[t.ticket_id]) tagMap[t.ticket_id]=[]; tagMap[t.ticket_id].push(t.tag); }
  for (const t of (tickets||[])) t.tags = tagMap[t.id]||[];
  res.json(tickets||[]);
});

app.get("/api/tickets/:id", async (req, res) => {
  const { data:ticket } = await supabase.from("tickets").select("*").eq("id",req.params.id).single();
  if (!ticket) return res.status(404).json({ error:"No encontrado" });
  const { data:productos } = await supabase.from("productos").select("*").eq("ticket_id",req.params.id);
  const { data:tags } = await supabase.from("tags").select("tag").eq("ticket_id",req.params.id);
  ticket.productos = productos||[];
  ticket.tags = (tags||[]).map(r=>r.tag);
  res.json(ticket);
});

app.put("/api/tickets/:id", async (req, res) => {
  try {
    const { tienda,fecha_compra,hora,ticket_num,metodo_pago,notas,deducible } = req.body;
    const id = parseInt(req.params.id, 10);
    const num = v => (v === "" || v == null) ? null : parseFloat(v);
    const subtotal = num(req.body.subtotal), descuentos = num(req.body.descuentos),
          iva = num(req.body.iva), total = num(req.body.total);

    // Sync datos_json so OCR fields stay in sync with DB columns
    const { data: existing } = await supabase.from("tickets").select("datos_json").eq("id",id).single();
    let datos_json = undefined;
    try {
      const parsed = JSON.parse(existing?.datos_json||"{}");
      datos_json = JSON.stringify({ ...parsed, tienda,fecha:fecha_compra,hora,ticket_num,metodo_pago,subtotal,descuentos,iva,total,notas });
    } catch {}

    const { error } = await supabase.from("tickets").update({
      tienda,fecha_compra,hora,ticket_num,metodo_pago,subtotal,descuentos,iva,total,notas,
      deducible:deducible?1:0,
      ...(datos_json !== undefined ? {datos_json} : {})
    }).eq("id",id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/tickets/:id", async (req, res) => {
  await supabase.from("tickets").update({ deleted_at:new Date().toISOString() }).eq("id",req.params.id);
  res.json({ ok:true });
});

// ── Fusionar tickets ──────────────────────────────────────────────────────────
app.post("/api/tickets/:id/merge", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const withId = parseInt(req.body.withId, 10);
    if (!withId || withId === id) return res.status(400).json({ error:"ID inválido" });
    await supabase.from("productos").update({ ticket_id: id }).eq("ticket_id", withId);
    const { data: srcTags } = await supabase.from("tags").select("tag").eq("ticket_id", withId);
    for (const row of (srcTags||[])) {
      try { await supabase.from("tags").upsert({ ticket_id: id, tag: row.tag }); } catch {}
    }
    await supabase.from("tickets").update({ deleted_at: new Date().toISOString() }).eq("id", withId);
    const { data: allProds } = await supabase.from("productos").select("precio_total").eq("ticket_id", id);
    const newTotal = Math.round((allProds||[]).reduce((s,p)=>s+(p.precio_total||0),0)*100)/100;
    if (newTotal > 0) await supabase.from("tickets").update({ total: newTotal }).eq("id", id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Papelera ──────────────────────────────────────────────────────────────────
app.get("/api/trash", async (req, res) => {
  const { data } = await supabase.from("tickets").select("*").not("deleted_at","is",null).order("deleted_at",{ascending:false});
  res.json(data||[]);
});
app.post("/api/trash/:id/restore", async (req, res) => {
  await supabase.from("tickets").update({ deleted_at:null }).eq("id",req.params.id);
  res.json({ ok:true });
});
app.delete("/api/trash/:id/permanent", async (req, res) => {
  await supabase.from("tickets").delete().eq("id",req.params.id);
  res.json({ ok:true });
});

// ── Productos CRUD ────────────────────────────────────────────────────────────
app.put("/api/productos/:id", async (req, res) => {
  const { nombre,cantidad,precio_unitario,precio_total,categoria,notas } = req.body;
  await supabase.from("productos").update({ nombre,cantidad,precio_unitario,precio_total,categoria:categoria||categorizar(nombre),notas:notas||null }).eq("id",req.params.id);
  res.json({ ok:true });
});
app.delete("/api/productos/:id", async (req, res) => {
  await supabase.from("productos").delete().eq("id",req.params.id);
  res.json({ ok:true });
});
app.post("/api/tickets/:id/productos", async (req, res) => {
  const { nombre,cantidad,precio_unitario,precio_total } = req.body;
  const { data } = await supabase.from("productos").insert({ ticket_id:parseInt(req.params.id),nombre,cantidad:cantidad??1,precio_unitario:precio_unitario||null,precio_total:precio_total||null,categoria:categorizar(nombre) }).select("id").single();
  res.json({ id:data?.id });
});

// ── Tags ──────────────────────────────────────────────────────────────────────
app.get("/api/tags", async (req, res) => {
  const { data } = await supabase.from("tags").select("tag");
  res.json([...new Set((data||[]).map(r=>r.tag))].sort());
});
app.post("/api/tickets/:id/tags", async (req, res) => {
  const { tag } = req.body; if (!tag?.trim()) return res.status(400).json({ error:"Tag vacío" });
  await supabase.from("tags").upsert({ ticket_id:parseInt(req.params.id), tag:tag.trim() });
  res.json({ ok:true });
});
app.delete("/api/tickets/:id/tags/:tag", async (req, res) => {
  await supabase.from("tags").delete().eq("ticket_id",req.params.id).eq("tag",decodeURIComponent(req.params.tag));
  res.json({ ok:true });
});

// ── Búsqueda full-text ────────────────────────────────────────────────────────
app.get("/api/search", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q||q.length<2) return res.json([]);
  const { data:byStore } = await supabase.from("tickets").select("*").is("deleted_at",null).ilike("tienda",`%${q}%`).limit(20);
  const { data:byProd } = await supabase.from("productos").select("ticket_id,nombre,precio_unitario").ilike("nombre",`%${q}%`).limit(50);
  const ticketIds = [...new Set((byProd||[]).map(p=>p.ticket_id))];
  let byProdTickets = [];
  if (ticketIds.length) {
    const { data } = await supabase.from("tickets").select("*").is("deleted_at",null).in("id",ticketIds);
    byProdTickets = data||[];
  }
  const seen = new Set(); const results = [];
  for (const t of [...(byStore||[]),...byProdTickets]) {
    if (seen.has(t.id)) continue; seen.add(t.id);
    const { data:tags } = await supabase.from("tags").select("tag").eq("ticket_id",t.id);
    t.tags = (tags||[]).map(r=>r.tag);
    t.matching = (byProd||[]).filter(p=>p.ticket_id===t.id).slice(0,5);
    results.push(t);
  }
  res.json(results.slice(0,30));
});

// ── Budgets ───────────────────────────────────────────────────────────────────
app.get("/api/budgets", async (req, res) => { const {data}=await supabase.from("budgets").select("*"); res.json(data||[]); });
app.post("/api/budgets", async (req, res) => {
  const { categoria,importe } = req.body;
  await supabase.from("budgets").upsert({ categoria,importe });
  res.json({ ok:true });
});
app.delete("/api/budgets/:cat", async (req, res) => {
  await supabase.from("budgets").delete().eq("categoria",decodeURIComponent(req.params.cat));
  res.json({ ok:true });
});
app.get("/api/budgets/gastado", async (req, res) => {
  const m = new Date(); const y=m.getFullYear(); const mo=String(m.getMonth()+1).padStart(2,"0");
  // fecha_compra is DD/MM/YYYY — filter by current month
  const { data:allProds } = await supabase.from("productos").select("categoria,precio_total,ticket_id");
  const { data:tickets } = await supabase.from("tickets").select("id,fecha_compra,fecha_escaneo").is("deleted_at",null);
  const thisMonth = new Set((tickets||[]).filter(t => {
    const fc=t.fecha_compra||""; const [dd,mm,yy]=fc.split("/");
    if (mm&&yy) return mm===mo&&yy===String(y);
    return (t.fecha_escaneo||"").startsWith(`${y}-${mo}`);
  }).map(t=>t.id));
  const gastadoMap = {};
  (allProds||[]).filter(p=>thisMonth.has(p.ticket_id)&&p.categoria).forEach(p=>{
    gastadoMap[p.categoria]=(gastadoMap[p.categoria]||0)+(p.precio_total||0);
  });
  res.json(Object.entries(gastadoMap).map(([categoria,gastado])=>({ categoria, gastado:Math.round(gastado*100)/100 })));
});

// ── Alertas de precio ─────────────────────────────────────────────────────────
app.get("/api/price-alerts", async (req, res) => { const {data}=await supabase.from("price_alerts").select("*").order("id",{ascending:false}); res.json(data||[]); });
app.post("/api/price-alerts", async (req, res) => {
  const { nombre,precio_objetivo } = req.body;
  const { data } = await supabase.from("price_alerts").insert({ nombre,precio_objetivo:parseFloat(precio_objetivo) }).select("id").single();
  res.json({ id:data?.id });
});
app.put("/api/price-alerts/:id", async (req, res) => {
  const { nombre,precio_objetivo,activa } = req.body;
  await supabase.from("price_alerts").update({ nombre,precio_objetivo:parseFloat(precio_objetivo),activa:activa?1:0 }).eq("id",req.params.id);
  res.json({ ok:true });
});
app.delete("/api/price-alerts/:id", async (req, res) => { await supabase.from("price_alerts").delete().eq("id",req.params.id); res.json({ ok:true }); });

// ── Compartir ─────────────────────────────────────────────────────────────────
app.post("/api/share/:id", async (req, res) => {
  const token = crypto.randomBytes(16).toString("hex");
  const expira = new Date(Date.now()+7*24*60*60*1000).toISOString();
  await supabase.from("shares").insert({ token,ticket_id:parseInt(req.params.id),expira });
  res.json({ token, url:`/s/${token}` });
});
app.get("/api/s/:token", async (req, res) => {
  const { data:share } = await supabase.from("shares").select("*").eq("token",req.params.token).gt("expira",new Date().toISOString()).single();
  if (!share) return res.status(404).json({ error:"Link no válido o expirado" });
  const { data:ticket } = await supabase.from("tickets").select("*").eq("id",share.ticket_id).single();
  if (!ticket) return res.status(404).json({ error:"Ticket no encontrado" });
  const { data:productos } = await supabase.from("productos").select("*").eq("ticket_id",ticket.id);
  ticket.productos = productos||[];
  res.json(ticket);
});

// ── Categorías personalizadas ─────────────────────────────────────────────────
app.get("/api/custom-categories", async (req, res) => { const {data}=await supabase.from("custom_categories").select("*"); res.json(data||[]); });
app.post("/api/custom-categories", async (req, res) => {
  const { nombre,icono,color,keywords } = req.body;
  await supabase.from("custom_categories").upsert({ nombre:nombre.trim(),icono:icono||"📦",color:color||"#00E5A0",keywords:keywords||"" });
  await reloadCustomCats();
  res.json({ ok:true });
});
app.delete("/api/custom-categories/:nombre", async (req, res) => {
  await supabase.from("custom_categories").delete().eq("nombre",decodeURIComponent(req.params.nombre));
  await reloadCustomCats();
  res.json({ ok:true });
});

// ── IVA ───────────────────────────────────────────────────────────────────────
app.get("/api/iva-report", async (req, res) => {
  const { year,quarter } = req.query;
  const y=parseInt(year)||new Date().getFullYear();
  const q=parseInt(quarter)||Math.ceil((new Date().getMonth()+1)/3);
  const meses=[[1,2,3],[4,5,6],[7,8,9],[10,11,12]][q-1];
  const { data:tickets } = await supabase.from("tickets").select("*").eq("deducible",1).is("deleted_at",null);
  const filtered = (tickets||[]).filter(t => {
    const d = t.fecha_compra; if (!d) return false;
    const [dd,mm,yy] = d.split("/");
    return parseInt(yy)===y && meses.includes(parseInt(mm));
  });
  res.json({ year:y, quarter:q, meses, tickets:filtered.length,
    base_imponible:Math.round(filtered.reduce((s,t)=>s+(t.subtotal||0),0)*100)/100,
    iva_soportado:Math.round(filtered.reduce((s,t)=>s+(t.iva||0),0)*100)/100,
    total:Math.round(filtered.reduce((s,t)=>s+(t.total||0),0)*100)/100,
    detalle:filtered });
});

// ── Stats: productos ──────────────────────────────────────────────────────────
app.get("/api/stats/productos", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id").is("deleted_at",null);
  const ids = (tickets||[]).map(t=>t.id);
  if (!ids.length) return res.json([]);
  const { data:prods } = await supabase.from("productos").select("*").in("ticket_id",ids);
  const map = {};
  (prods||[]).filter(p=>p.nombre?.trim()).forEach(p => {
    const k=normalizeProductName(p.nombre)||p.nombre.toLowerCase().trim().replace(/\s+/g," ");
    if (!map[k]) map[k]={ nombre:p.nombre,categoria:p.categoria,frecuencia:new Set(),total_cantidad:0,total_gasto:0,precios:[] };
    map[k].frecuencia.add(p.ticket_id);
    map[k].total_cantidad += p.cantidad||0;
    map[k].total_gasto += p.precio_total||0;
    if (p.precio_unitario>0) map[k].precios.push(p.precio_unitario);
  });
  const result = Object.values(map).map(p => ({
    nombre:p.nombre, categoria:p.categoria,
    frecuencia:p.frecuencia.size,
    total_cantidad:Math.round(p.total_cantidad*100)/100,
    total_gasto:Math.round(p.total_gasto*100)/100,
    precio_medio:p.precios.length?Math.round(p.precios.reduce((a,b)=>a+b,0)/p.precios.length*100)/100:null
  })).sort((a,b)=>b.frecuencia-a.frecuencia||b.total_gasto-a.total_gasto);
  res.json(result);
});

// ── Stats: precios ────────────────────────────────────────────────────────────
app.get("/api/stats/precios", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id,fecha_compra,tienda").is("deleted_at",null);
  const ticketMap = {}; (tickets||[]).forEach(t=>{ ticketMap[t.id]=t; });
  const { data:prods } = await supabase.from("productos").select("nombre,precio_unitario,categoria,ticket_id").gt("precio_unitario",0);
  const map = {};
  (prods||[]).filter(p=>p.nombre?.trim()).forEach(p => {
    const k=p.nombre.toLowerCase().trim().replace(/\s+/g," ");
    if (!map[k]) map[k]={ nombre:p.nombre,categoria:p.categoria||"Otros",historial:[] };
    const t=ticketMap[p.ticket_id];
    if (t) map[k].historial.push({ fecha:t.fecha_compra,precio:p.precio_unitario,tienda:t.tienda });
  });
  function parseFecha(s) {
    if (!s) return 0;
    if (s.includes("/")) { const [d,m,y]=s.split("/"); return new Date(y,m-1,d).getTime(); }
    return new Date(s).getTime();
  }
  const result = Object.values(map).filter(p=>p.historial.length>=2).map(p => {
    const sorted=p.historial.slice().sort((a,b)=>parseFecha(a.fecha)-parseFecha(b.fecha));
    const primero=sorted[0].precio,ultimo=sorted[sorted.length-1].precio;
    return { nombre:p.nombre,categoria:p.categoria,precio_actual:ultimo,precio_inicial:primero,
      precio_min:Math.min(...sorted.map(h=>h.precio)),precio_max:Math.max(...sorted.map(h=>h.precio)),
      variacion_pct:Math.round(((ultimo-primero)/primero)*1000)/10,veces:sorted.length,historial:sorted };
  }).sort((a,b)=>Math.abs(b.variacion_pct)-Math.abs(a.variacion_pct));
  res.json(result);
});

// ── Stats: comparar tiendas ───────────────────────────────────────────────────
app.get("/api/stats/comparar-tiendas", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id,tienda").is("deleted_at",null).not("tienda","is",null);
  const ticketMap = {}; (tickets||[]).forEach(t=>{ ticketMap[t.id]=t.tienda; });
  const { data:prods } = await supabase.from("productos").select("nombre,precio_unitario,ticket_id").gt("precio_unitario",0);
  const map = {};
  (prods||[]).filter(p=>ticketMap[p.ticket_id]&&p.nombre?.trim()).forEach(p => {
    const k=p.nombre.toLowerCase().trim().replace(/\s+/g," ");
    const tienda=ticketMap[p.ticket_id];
    if (!map[k]) map[k]={ nombre:p.nombre,tiendas:{} };
    if (!map[k].tiendas[tienda]) map[k].tiendas[tienda]={ precios:[],veces:0 };
    map[k].tiendas[tienda].precios.push(p.precio_unitario);
    map[k].tiendas[tienda].veces++;
  });
  const result = Object.values(map).filter(p=>Object.keys(p.tiendas).length>=2).map(p => {
    const tiendas=Object.entries(p.tiendas).map(([tienda,v])=>({ tienda,precio_medio:Math.round(v.precios.reduce((a,b)=>a+b,0)/v.precios.length*100)/100,precio_min:Math.min(...v.precios),precio_max:Math.max(...v.precios),veces:v.veces }));
    const precios=tiendas.map(t=>t.precio_medio);
    const min=Math.min(...precios),max=Math.max(...precios);
    return { nombre:p.nombre,tiendas,diferencia_pct:Math.round(((max-min)/min)*1000)/10,mas_barato:tiendas.find(t=>t.precio_medio===min)?.tienda,ahorro_max:Math.round((max-min)*100)/100 };
  }).sort((a,b)=>b.diferencia_pct-a.diferencia_pct);
  res.json(result);
});

// ── Stats: marcas ─────────────────────────────────────────────────────────────
const MARCAS_BLANCAS = ["hacendado","deliplus","bosque verde","millennial","freshona","milfina","combino","deluxe","pikok","chef select","solevita","belbake","vitafit","bellarom","cien","w5","aro"];
function detectarMarcaBlanca(nombre) {
  if (!nombre) return false;
  const n=nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  return MARCAS_BLANCAS.some(mb=>n.includes(mb));
}
app.get("/api/stats/marcas", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id").is("deleted_at",null);
  const ids=(tickets||[]).map(t=>t.id);
  if (!ids.length) return res.json({ blancaGasto:0,marcaGasto:0,blancaCount:0,marcaCount:0,pctBlanca:0,ahorroPotencial:0,topMarca:[] });
  const { data:prods } = await supabase.from("productos").select("nombre,categoria,precio_total").in("ticket_id",ids);
  let blancaGasto=0,marcaGasto=0,blancaCount=0,marcaCount=0;
  const marcas=[];
  (prods||[]).forEach(p => {
    if (detectarMarcaBlanca(p.nombre)) { blancaGasto+=p.precio_total||0;blancaCount++; }
    else { marcaGasto+=p.precio_total||0;marcaCount++;marcas.push(p); }
  });
  const topMarca=[...marcas].sort((a,b)=>(b.precio_total||0)-(a.precio_total||0)).slice(0,20).map(p=>({ nombre:p.nombre,categoria:p.categoria,precio:p.precio_total }));
  res.json({ blancaGasto:Math.round(blancaGasto*100)/100,marcaGasto:Math.round(marcaGasto*100)/100,blancaCount,marcaCount,pctBlanca:Math.round(blancaGasto/(blancaGasto+marcaGasto||1)*1000)/10,ahorroPotencial:Math.round(marcaGasto*0.25*100)/100,topMarca });
});

// ── Lista de la compra ────────────────────────────────────────────────────────
app.get("/api/lista-compra", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id,fecha_compra").is("deleted_at",null);
  const ticketMap={}; (tickets||[]).forEach(t=>{ ticketMap[t.id]=t.fecha_compra; });
  const { data:prods } = await supabase.from("productos").select("nombre,categoria,precio_unitario,ticket_id");
  const map={};
  (prods||[]).filter(p=>p.nombre?.trim()).forEach(p => {
    const k=normalizeProductName(p.nombre)||p.nombre.toLowerCase().trim().replace(/\s+/g," ");
    const fecha=ticketMap[p.ticket_id];
    if (!map[k]) map[k]={ nombre:p.nombre,categoria:p.categoria,tickets:new Set(),fechas:[],precios:[] };
    map[k].tickets.add(p.ticket_id);
    if (fecha) map[k].fechas.push(fecha);
    if (p.precio_unitario>0) map[k].precios.push(p.precio_unitario);
  });
  function parseFecha(s) {
    if (!s) return 0;
    if (s.includes("/")) { const [d,m,y]=s.split("/"); return new Date(y,m-1,d).getTime(); }
    return new Date(s).getTime();
  }
  const now=Date.now();
  const result = Object.values(map).filter(p=>p.tickets.size>=2).map(p => {
    const sorted=p.fechas.map(f=>parseFecha(f)).filter(Boolean).sort();
    if (!sorted.length) return null;
    const lastTs=sorted[sorted.length-1],firstTs=sorted[0];
    const totalDays=(lastTs-firstTs)/86400000;
    const n=sorted.length;
    const intervalMedio=n>1?totalDays/(n-1):30;
    const diasDesde=(now-lastTs)/86400000;
    const urgencia=intervalMedio>0?diasDesde/intervalMedio:0;
    const precio_medio=p.precios.length?Math.round(p.precios.reduce((a,b)=>a+b,0)/p.precios.length*100)/100:null;
    const granel=intervalMedio<10?`Compras cada ${Math.round(intervalMedio)}d — considera comprar 2× a la vez`:null;
    return { nombre:p.nombre,categoria:p.categoria,ultima_compra:p.fechas.sort().pop(),
      dias_desde:Math.round(diasDesde),intervalo_medio:Math.round(intervalMedio),
      urgencia:Math.round(urgencia*100)/100,precio_medio,veces:p.tickets.size,sugerencia_granel:granel };
  }).filter(p=>p&&p.urgencia>=0.6&&p.dias_desde<=180).sort((a,b)=>b.urgencia-a.urgencia);
  res.json(result);
});

// ── Chat con datos ────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Mensaje vacío" });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error:"Falta GROQ_API_KEY" });
    const { data:tickets } = await supabase.from("tickets").select("id,tienda,total,fecha_compra,fecha_escaneo").is("deleted_at",null).order("id",{ascending:false});
    const { data:prods } = await supabase.from("productos").select("nombre,categoria,precio_total,ticket_id");
    const totalGastado = (tickets||[]).reduce((s,t)=>s+(t.total||0),0);
    const storeMap={}; (tickets||[]).forEach(t=>{const k=t.tienda||"Desconocida";if(!storeMap[k])storeMap[k]=0;storeMap[k]+=(t.total||0);});
    const topStores=Object.entries(storeMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k}: ${v.toFixed(2)}€`).join("\n");
    const catMap={}; (prods||[]).forEach(p=>{if(!catMap[p.categoria])catMap[p.categoria]=0;catMap[p.categoria]+=(p.precio_total||0);});
    const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k}: ${v.toFixed(2)}€`).join("\n");
    const now=new Date(); const monthMap={};
    (tickets||[]).forEach(t=>{
      const d=t.fecha_compra?t.fecha_compra.includes("/")?new Date(t.fecha_compra.split("/").reverse().join("-")):new Date(t.fecha_compra):null;
      if(!d||isNaN(d)||(now-d)/86400000>365)return;
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if(!monthMap[k])monthMap[k]=0; monthMap[k]+=t.total||0;
    });
    const monthSummary=Object.entries(monthMap).sort().slice(-6).map(([k,v])=>`${k}: ${v.toFixed(2)}€`).join(" | ");
    const systemPrompt=`Eres un asistente financiero personal. Analizas datos de compra del usuario y respondes en español, de forma concisa y útil.

DATOS (actualizados):
- Total histórico: ${totalGastado.toFixed(2)}€ · ${(tickets||[]).length} tickets · ticket medio: ${((tickets||[]).length?totalGastado/(tickets||[]).length:0).toFixed(2)}€

TIENDAS:\n${topStores}

CATEGORÍAS:\n${topCats}

ÚLTIMOS 6 MESES: ${monthSummary||"sin datos"}

Responde en español. Máx 3 párrafos cortos. Usa los datos para dar respuestas concretas con números. Si no puedes responder con los datos disponibles, dilo.`;
    const messages=[{role:"system",content:systemPrompt},...history.slice(-8).map(m=>({role:m.role,content:m.content})),{role:"user",content:message}];
    const groqRes=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify({model:"meta-llama/llama-4-scout-17b-16e-instruct",messages,max_tokens:600,temperature:0.35})});
    const groqData=await groqRes.json();
    if(!groqRes.ok){const raw=groqData?.error?.message||"";let msg="Error al contactar con el servicio de IA.";if(raw.toLowerCase().includes("restricted"))msg="La cuenta de Groq está restringida. Revisa console.groq.com.";else if(groqRes.status===429||raw.toLowerCase().includes("rate limit"))msg="Límite de peticiones Groq alcanzado. Espera unos minutos.";else if(groqRes.status===401)msg="API key de Groq inválida.";else if(raw)msg=raw;return res.status(500).json({error:msg});}
    res.json({reply:groqData.choices[0].message.content});
  } catch(e){res.status(500).json({error:e.message});}
});

// ── Detección suscripciones ───────────────────────────────────────────────────
app.get("/api/stats/suscripciones", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id,tienda,total,fecha_compra").is("deleted_at",null).not("total","is",null).not("tienda","is",null);
  function parseFecha(s){if(!s)return 0;if(s.includes("/")){const[d,m,y]=s.split("/");return new Date(y,m-1,d).getTime();}return new Date(s).getTime();}
  const storeMap={};
  (tickets||[]).forEach(t=>{if(!storeMap[t.tienda])storeMap[t.tienda]=[];storeMap[t.tienda].push({id:t.id,total:t.total,fecha:t.fecha_compra,ts:parseFecha(t.fecha_compra)});});
  const suspects=[];
  for(const[tienda,tks]of Object.entries(storeMap)){
    if(tks.length<3)continue;
    const sorted=tks.slice().sort((a,b)=>a.ts-b.ts);
    const seen=new Set();
    for(let i=0;i<sorted.length;i++){
      if(seen.has(i))continue;
      const base=sorted[i].total; const group=[sorted[i]];
      for(let j=i+1;j<sorted.length;j++){if(Math.abs(sorted[j].total-base)/base<0.08){group.push(sorted[j]);seen.add(j);}}
      if(group.length<3)continue;
      const gsorted=group.slice().sort((a,b)=>a.ts-b.ts);
      const diffs=gsorted.slice(1).map((t,idx)=>(t.ts-gsorted[idx].ts)/86400000);
      const avgDiff=diffs.reduce((a,b)=>a+b,0)/diffs.length;
      if(avgDiff<18||avgDiff>50)continue;
      suspects.push({tienda,importe_medio:Math.round(base*100)/100,apariciones:group.length,intervalo_dias:Math.round(avgDiff),ultima:gsorted[gsorted.length-1].fecha,primera:gsorted[0].fecha,tickets:group.map(t=>({id:t.id,total:t.total,fecha:t.fecha}))});
      seen.add(i);
    }
  }
  res.json(suspects.sort((a,b)=>b.apariciones-a.apariciones));
});

// ── Stats: inflación por categoría ───────────────────────────────────────────
app.get("/api/stats/inflacion-categoria", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("id,fecha_compra").is("deleted_at",null);
  const { data:prods } = await supabase.from("productos").select("categoria,precio_unitario,ticket_id").gt("precio_unitario",0);
  const ticketMap = {}; (tickets||[]).forEach(t => { ticketMap[t.id] = t.fecha_compra; });
  const catMonthMap = {};
  (prods||[]).forEach(p => {
    const fecha = ticketMap[p.ticket_id];
    if (!fecha || !p.categoria) return;
    let mes;
    if (fecha.includes("/")) { const [d,m,y]=fecha.split("/"); mes=`${m.padStart(2,"0")}/${y}`; }
    else { const dt=new Date(fecha); if(isNaN(dt))return; mes=`${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`; }
    if (!catMonthMap[p.categoria]) catMonthMap[p.categoria]={};
    if (!catMonthMap[p.categoria][mes]) catMonthMap[p.categoria][mes]={sum:0,n:0};
    catMonthMap[p.categoria][mes].sum += p.precio_unitario;
    catMonthMap[p.categoria][mes].n++;
  });
  function mesToDate(m) { const [mm,yy]=m.split("/"); return new Date(parseInt(yy),parseInt(mm)-1); }
  const result = Object.entries(catMonthMap).map(([cat,meses]) => {
    const months = Object.entries(meses).map(([mes,v])=>({
      mes, precio_medio:Math.round(v.sum/v.n*100)/100, n:v.n
    })).sort((a,b)=>mesToDate(a.mes)-mesToDate(b.mes));
    if (months.length < 2) return null;
    const first=months[0].precio_medio, last=months[months.length-1].precio_medio;
    const cambio_pct = first>0 ? Math.round(((last-first)/first)*1000)/10 : null;
    return { categoria:cat, meses:months, cambio_pct, precio_actual:last, precio_inicial:first };
  }).filter(Boolean).sort((a,b)=>Math.abs(b.cambio_pct||0)-Math.abs(a.cambio_pct||0));
  res.json(result);
});

// ── Backup ────────────────────────────────────────────────────────────────────
app.get("/api/backup", async (req, res) => {
  const { data:tickets } = await supabase.from("tickets").select("*").order("id");
  for (const t of (tickets||[])) {
    const { data:prods } = await supabase.from("productos").select("*").eq("ticket_id",t.id);
    const { data:tags } = await supabase.from("tags").select("tag").eq("ticket_id",t.id);
    t.productos=prods||[]; t.tags=(tags||[]).map(r=>r.tag);
  }
  const { data:budgets } = await supabase.from("budgets").select("*");
  const { data:alerts } = await supabase.from("price_alerts").select("*");
  const { data:cats } = await supabase.from("custom_categories").select("*");
  res.setHeader("Content-Disposition",`attachment; filename="ticketscan-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json({ version:3, fecha:new Date().toISOString(), tickets:tickets||[], budgets:budgets||[], price_alerts:alerts||[], custom_categories:cats||[] });
});

app.post("/api/restore", async (req, res) => {
  const { tickets,budgets,price_alerts,custom_categories } = req.body;
  if (!Array.isArray(tickets)) return res.status(400).json({ error:"Formato inválido" });
  let count=0;
  for (const t of tickets) {
    const { data:exists } = await supabase.from("tickets").select("id").eq("id",t.id).single();
    if (exists) continue;
    await supabase.from("tickets").insert({ id:t.id,fecha_escaneo:t.fecha_escaneo,tienda:t.tienda,fecha_compra:t.fecha_compra,hora:t.hora,ticket_num:t.ticket_num,metodo_pago:t.metodo_pago,subtotal:t.subtotal,descuentos:t.descuentos,iva:t.iva,total:t.total,notas:t.notas,datos_json:t.datos_json,deducible:t.deducible||0 });
    if (t.productos?.length) await supabase.from("productos").insert(t.productos.map(p=>({ ...p,ticket_id:t.id,categoria:p.categoria||categorizar(p.nombre) })));
    if (t.tags?.length) await supabase.from("tags").insert(t.tags.map(tag=>({ ticket_id:t.id,tag })));
    count++;
  }
  if (budgets?.length) await supabase.from("budgets").upsert(budgets);
  if (price_alerts?.length) await supabase.from("price_alerts").insert(price_alerts.map(({id,...r})=>r));
  if (custom_categories?.length) await supabase.from("custom_categories").upsert(custom_categories);
  await reloadCustomCats();
  res.json({ ok:true, imported:count });
});

// Escuchar siempre (Render y local)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend en http://localhost:${PORT}`));

export default app;
