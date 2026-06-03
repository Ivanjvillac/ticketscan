import { useState, useEffect, useMemo } from "react";

const LOCAL_IP = "localhost";
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);
const fmt = v => {
  if (v==null||v==="") return "—";
  const n=parseFloat(String(v).replace(/[^\d.,]/g,"").replace(",","."));
  return isNaN(n)?String(v):n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2});
};
function parseDate(str) {
  if (!str) return null;
  if (str.includes("/")) { const [d,m,y]=str.split("/"); const dt=new Date(parseInt(y),parseInt(m)-1,parseInt(d)); return isNaN(dt)?null:dt; }
  const dt=new Date(str); return isNaN(dt)?null:dt;
}

const NUTRI = {
  "Frutas":              { grupo:"Frutas y verduras", color:"#10B981", puntos:5, co2:0.3 },
  "Verduras":            { grupo:"Frutas y verduras", color:"#10B981", puntos:5, co2:0.2 },
  "Pescado y Marisco":   { grupo:"Proteína magra",   color:"#3B82F6", puntos:5, co2:1.0 },
  "Carnes":              { grupo:"Proteína",          color:"#F59E0B", puntos:3, co2:4.0 },
  "Charcuteria":         { grupo:"Proteína procesada",color:"#EF4444", puntos:1, co2:2.5 },
  "Lacteos y Huevos":    { grupo:"Lácteos",           color:"#8B5CF6", puntos:4, co2:0.8 },
  "Pan y Bolleria":      { grupo:"Carbohidratos",     color:"#D97706", puntos:2, co2:0.5 },
  "Pasta Arroz Legumbre":{ grupo:"Carbohidratos comp",color:"#F59E0B", puntos:4, co2:0.4 },
  "Bebidas":             { grupo:"Bebidas",           color:"#06B6D4", puntos:2, co2:0.2 },
  "Snacks y Dulces":     { grupo:"Dulces/snacks",     color:"#EC4899", puntos:1, co2:0.6 },
  "Congelados":          { grupo:"Procesados",        color:"#6366F1", puntos:2, co2:0.8 },
  "Conservas":           { grupo:"Conservas",         color:"#64748B", puntos:3, co2:0.5 },
  "Aceites y Condimentos":{ grupo:"Grasas/condimentos",color:"#A3E635", puntos:3, co2:0.4 },
  "Limpieza Hogar":      { grupo:"No alimentario",    color:"#94A3B8", puntos:null, co2:0.3 },
  "Higiene Personal":    { grupo:"No alimentario",    color:"#94A3B8", puntos:null, co2:0.25 },
  "Mascotas":            { grupo:"Mascotas",          color:"#94A3B8", puntos:null, co2:1.0 },
  "Bebe e Infantil":     { grupo:"Infantil",          color:"#F9A8D4", puntos:null, co2:0.3 },
  "Otros":               { grupo:"Otros",             color:"#475569", puntos:null, co2:0.3 },
};

const css = `
.aa-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.aa-tabs{display:flex;gap:3px;background:#080C14;border:1px solid #1E2A3A;border-radius:10px;padding:4px;margin-bottom:20px;overflow-x:auto}
.aa-tabs::-webkit-scrollbar{display:none}
.aa-tab{flex-shrink:0;padding:7px 10px;border-radius:7px;border:none;background:transparent;color:#4A5568;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer;transition:all .15s}
.aa-tab.active{background:#0A0E1A;color:#00E5A0;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.insight{background:rgba(0,229,160,.04);border:1px solid rgba(0,229,160,.14);border-radius:10px;padding:13px 16px;margin-bottom:9px}
.insight-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}
.insight-txt{font-size:13px;line-height:1.5}
.nutri-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:20px}
.nutri-card{background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:12px 14px}
.nutri-label{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;margin-bottom:4px;text-transform:uppercase}
.nutri-val{font-size:18px;font-weight:800}
.nutri-sub{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;margin-top:3px}
.score-ring{display:flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;border:4px solid;font-size:24px;font-weight:800;margin:0 auto 16px}
.pie-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(30,42,58,.5)}
.pie-row:last-child{border-bottom:none}
.pie-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.pie-name{font-size:12px;font-weight:600;flex:1}
.pie-bar-wrap{width:80px;height:5px;background:#1E2A3A;border-radius:3px;overflow:hidden}
.pie-bar-fill{height:100%;border-radius:3px}
.pie-pct{font-family:'Space Mono',monospace;font-size:11px;color:#4A5568;min-width:36px;text-align:right}
.anomaly-card{border-radius:12px;padding:14px 16px;margin-bottom:10px;border:1px solid}
.tog-row{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.tog-lbl{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568}
.tog-btn{padding:5px 12px;border-radius:6px;border:1px solid #1E2A3A;background:#111827;color:#4A5568;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;transition:all .15s}
.tog-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.detail-list{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden;margin-bottom:20px}
.detail-row{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid rgba(30,42,58,.5)}
.detail-row:last-child{border-bottom:none}
.spin-sm{width:12px;height:12px;border:2px solid rgba(0,229,160,.3);border-top-color:#00E5A0;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.an-empty{text-align:center;padding:50px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
@media(max-width:680px){.nutri-grid{grid-template-columns:1fr 1fr}}
`;

function NutricionalTab({ historial }) {
  const [periodo, setPeriodo] = useState("mes");

  const data = useMemo(() => {
    const now = Date.now();
    const limitMs = periodo==="semana" ? 7*86400000 : periodo==="mes" ? 30*86400000 : Infinity;
    const filtered = historial.filter(t => {
      if (limitMs===Infinity) return true;
      const d = parseDate(t.fecha_compra); return d && (now - d.getTime()) <= limitMs;
    });

    // Gather all productos from filtered tickets - we need to fetch them
    // Since historial only has ticket data, we'll use a backend call
    return filtered;
  }, [historial, periodo]);

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const hasTickets = historial.length > 0;

  useEffect(() => {
    if (!hasTickets && retry === 0) return; // wait for backend to be warm
    setLoading(true);
    fetch(`${API}/stats/productos`).then(r=>r.json())
      .then(d=>setProductos(Array.isArray(d)?d:[])).catch(()=>setProductos([]))
      .finally(()=>setLoading(false));
  }, [hasTickets, retry]);

  const stats = useMemo(() => {
    const catMap = {};
    productos.forEach(p => {
      const k = p.categoria||"Otros";
      if (!catMap[k]) catMap[k]={ gasto:0, frecuencia:0, nutri:NUTRI[k]||NUTRI["Otros"] };
      catMap[k].gasto += p.total_gasto||0;
      catMap[k].frecuencia += p.frecuencia||0;
    });
    const alimentaria = Object.entries(catMap).filter(([,v])=>v.nutri.puntos!==null);
    const totalGastoAlim = alimentaria.reduce((s,[,v])=>s+v.gasto,0)||1;
    const grupos = {};
    alimentaria.forEach(([cat,v]) => {
      const g = v.nutri.grupo;
      if (!grupos[g]) grupos[g]={ gasto:0, puntos:v.nutri.puntos, color:v.nutri.color };
      grupos[g].gasto += v.gasto;
    });
    const puntosTotal = alimentaria.reduce((s,[,v])=>s+(v.nutri.puntos*(v.gasto/totalGastoAlim)),0);
    const score = Math.round(puntosTotal*20);

    // CO2
    const co2Total = Object.entries(catMap).reduce((s,[,v])=>s+(v.gasto*(v.nutri.co2||0.3)),0);

    return { catMap, grupos, score, co2Total:Math.round(co2Total), totalGastoAlim, alimentaria };
  }, [productos]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Calculando…</div>;
  if (!productos.length) return (
    <div className="an-empty">Sin productos registrados.
      <br/><button onClick={()=>setRetry(c=>c+1)} style={{marginTop:12,background:"#00E5A0",border:"none",color:"#0A0E1A",padding:"8px 18px",borderRadius:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 Reintentar</button>
    </div>
  );

  const scoreColor = stats.score>=70?"#00E5A0":stats.score>=50?"#FCD34D":"#F87171";
  const co2Arboles = Math.round(stats.co2Total/21);

  return (
    <div>
      <div className="tog-row">
        <span className="tog-lbl">Período:</span>
        {[["semana","Esta semana"],["mes","Este mes"],["todo","Todo"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${periodo===v?"active":""}`} onClick={()=>setPeriodo(v)}>{l}</button>
        ))}
      </div>

      <div className="sec-label">Puntuación nutricional de tu cesta</div>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"20px",marginBottom:20,textAlign:"center"}}>
        <div className="score-ring" style={{borderColor:scoreColor,color:scoreColor}}>{stats.score}</div>
        <div style={{fontSize:14,fontWeight:700,color:scoreColor,marginBottom:4}}>
          {stats.score>=70?"Cesta saludable 🌿":stats.score>=50?"Cesta mejorable ⚡":"Cesta poco equilibrada ⚠️"}
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568"}}>
          Score 0–100 basado en proporción de alimentos saludables vs procesados
        </div>
      </div>

      <div className="nutri-grid">
        <div className="nutri-card">
          <div className="nutri-label">Huella CO₂ estimada</div>
          <div className="nutri-val" style={{color:"#34D399"}}>{stats.co2Total} kg</div>
          <div className="nutri-sub">≈ {co2Arboles} árboles/año para compensar</div>
        </div>
        <div className="nutri-card">
          <div className="nutri-label">Frutas y verduras</div>
          <div className="nutri-val" style={{color:"#10B981"}}>
            {Math.round(((stats.catMap["Frutas"]?.gasto||0)+(stats.catMap["Verduras"]?.gasto||0))/stats.totalGastoAlim*100)}%
          </div>
          <div className="nutri-sub">del gasto alimentario</div>
        </div>
        <div className="nutri-card">
          <div className="nutri-label">Proteína animal</div>
          <div className="nutri-val" style={{color:"#F59E0B"}}>
            {Math.round(((stats.catMap["Carnes"]?.gasto||0)+(stats.catMap["Charcuteria"]?.gasto||0)+(stats.catMap["Pescado y Marisco"]?.gasto||0))/stats.totalGastoAlim*100)}%
          </div>
          <div className="nutri-sub">del gasto alimentario</div>
        </div>
        <div className="nutri-card">
          <div className="nutri-label">Procesados y dulces</div>
          <div className="nutri-val" style={{color:"#EC4899"}}>
            {Math.round(((stats.catMap["Snacks y Dulces"]?.gasto||0)+(stats.catMap["Congelados"]?.gasto||0))/stats.totalGastoAlim*100)}%
          </div>
          <div className="nutri-sub">del gasto alimentario</div>
        </div>
      </div>

      <div className="sec-label">Distribución por grupo alimentario</div>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
        {Object.entries(stats.grupos).sort((a,b)=>b[1].gasto-a[1].gasto).map(([grupo,info])=>{
          const pct = Math.round(info.gasto/stats.totalGastoAlim*100);
          return (
            <div key={grupo} className="pie-row">
              <div className="pie-dot" style={{background:info.color}}/>
              <div className="pie-name">{grupo}</div>
              <div className="pie-bar-wrap"><div className="pie-bar-fill" style={{width:`${pct}%`,background:info.color}}/></div>
              <div className="pie-pct">{pct}%</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:info.puntos>=4?"#34D399":info.puntos>=3?"#FCD34D":"#F87171",minWidth:16,textAlign:"right"}}>
                {"★".repeat(info.puntos||0)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sec-label">Huella CO₂ por categoría</div>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"14px 16px"}}>
        {Object.entries(stats.catMap)
          .map(([cat,v]) => ({ cat, co2:Math.round(v.gasto*(v.nutri.co2||0.3)), nutri:v.nutri }))
          .sort((a,b)=>b.co2-a.co2).slice(0,8).map(({cat,co2,nutri})=>(
          <div key={cat} className="pie-row">
            <div className="pie-dot" style={{background:nutri.color}}/>
            <div className="pie-name">{cat}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#6B7280"}}>{co2} kg CO₂</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarcasTab({ historialLen = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!historialLen && retry === 0) return;
    setLoading(true);
    fetch(`${API}/stats/marcas`).then(r=>r.json()).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, [historialLen > 0, retry]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Analizando marcas…</div>;
  if (!data) return (
    <div className="an-empty">Sin datos suficientes.
      <br/><button onClick={()=>setRetry(c=>c+1)} style={{marginTop:12,background:"#00E5A0",border:"none",color:"#0A0E1A",padding:"8px 18px",borderRadius:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 Reintentar</button>
    </div>
  );

  const totalGasto = data.blancaGasto + data.marcaGasto || 1;

  return (
    <div>
      <div className="insight">
        <div className="insight-lbl">Resumen de marcas</div>
        <div className="insight-txt">
          Gastas <strong>{data.pctBlanca}%</strong> en marca blanca y <strong>{Math.round((1-data.pctBlanca/100)*100)}%</strong> en marca comercial.
          Si cambiaras toda la marca a blanca podrías ahorrar <strong style={{color:"#34D399"}}>~{fmt(data.ahorroPotencial)}</strong> (estimado ~25% menos).
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:"#111827",border:"1px solid rgba(0,229,160,.2)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#00E5A0",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Marca blanca</div>
          <div style={{fontSize:22,fontWeight:800,color:"#00E5A0"}}>{fmt(data.blancaGasto)}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:4}}>{data.blancaCount} productos · {data.pctBlanca}%</div>
        </div>
        <div style={{background:"#111827",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#F87171",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Marca comercial</div>
          <div style={{fontSize:22,fontWeight:800,color:"#F87171"}}>{fmt(data.marcaGasto)}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:4}}>{data.marcaCount} productos · {Math.round((1-data.pctBlanca/100)*100)}%</div>
        </div>
      </div>

      {/* Bar visual */}
      <div style={{height:12,background:"#1E2A3A",borderRadius:6,overflow:"hidden",marginBottom:20,display:"flex"}}>
        <div style={{width:`${data.pctBlanca}%`,background:"linear-gradient(90deg,#00E5A0,#00B8FF)",borderRadius:"6px 0 0 6px"}}/>
        <div style={{flex:1,background:"linear-gradient(90deg,#F87171,#EF4444)",borderRadius:"0 6px 6px 0"}}/>
      </div>

      <div className="sec-label">Productos de marca con mayor gasto</div>
      <div className="detail-list">
        {(data.topMarca||[]).slice(0,10).map((p,i) => (
          <div key={i} className="detail-row">
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{p.nombre}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>{p.categoria}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13}}>{fmt(p.precio)}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#34D399"}}>ahorro est. {fmt(p.precio*0.25)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnomaliaTab({ historial }) {
  const anomalias = useMemo(() => {
    if (historial.length < 4) return [];
    const byWeek = {};
    historial.forEach(t => {
      const d = parseDate(t.fecha_compra); if (!d) return;
      const ws = new Date(d); ws.setDate(d.getDate() - (d.getDay()||7) + 1);
      const key = ws.toISOString().slice(0,10);
      if (!byWeek[key]) byWeek[key]={ key, total:0, count:0, tickets:[] };
      byWeek[key].total += t.total||0; byWeek[key].count++;
      byWeek[key].tickets.push(t);
    });
    const weeks = Object.values(byWeek).sort((a,b)=>a.key.localeCompare(b.key));
    if (weeks.length < 3) return [];
    const avg = weeks.slice(0,-1).reduce((s,w)=>s+w.total,0) / (weeks.length-1);
    const std = Math.sqrt(weeks.slice(0,-1).reduce((s,w)=>s+(w.total-avg)**2,0) / (weeks.length-1));
    return weeks.map(w => {
      const desviacion = ((w.total-avg)/avg*100);
      const sigma = std > 0 ? (w.total-avg)/std : 0;
      return { ...w, avg, desviacion:Math.round(desviacion), sigma:Math.round(sigma*10)/10,
        tipo: w.total>avg+std*1.5?"alta": w.total<avg-std*1.5?"baja":null };
    }).filter(w=>w.tipo).reverse().slice(0,10);
  }, [historial]);

  const pred = useMemo(() => {
    const hoy = new Date();
    const año = hoy.getFullYear(), mes = hoy.getMonth()+1;
    const diasMes = new Date(año, mes, 0).getDate();
    const diasHoy = hoy.getDate();
    const keyPre = `${String(mes).padStart(2,"0")}/%/${año}`;
    const ticketsMes = historial.filter(t => {
      if (!t.fecha_compra) return false;
      const [d,m,y] = t.fecha_compra.split("/");
      return parseInt(y)===año && parseInt(m)===mes;
    });
    const gastoHasta = ticketsMes.reduce((s,t)=>s+(t.total||0),0);
    const diario = diasHoy > 0 ? gastoHasta/diasHoy : 0;
    const proyectado = diario * diasMes;
    const diasRestantes = diasMes - diasHoy;
    return { gastoHasta, proyectado, diario, diasRestantes, diasHoy, diasMes, ticketsMes:ticketsMes.length };
  }, [historial]);

  return (
    <div>
      <div className="sec-label">Predicción del mes en curso</div>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"16px",marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Gastado hasta hoy</div>
            <div style={{fontSize:20,fontWeight:800,color:"#E8EDF5"}}>{fmt(pred.gastoHasta)}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:3}}>día {pred.diasHoy}/{pred.diasMes} · {pred.ticketsMes} tickets</div>
          </div>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Proyección total mes</div>
            <div style={{fontSize:20,fontWeight:800,color:"#00E5A0"}}>{fmt(pred.proyectado)}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:3}}>~{fmt(pred.diario)}/día</div>
          </div>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Restante del mes</div>
            <div style={{fontSize:20,fontWeight:800,color:"#FCD34D"}}>{pred.diasRestantes}d</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:3}}>est. {fmt(pred.diario*pred.diasRestantes)} más</div>
          </div>
        </div>
        <div style={{marginTop:14,height:8,background:"#1E2A3A",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:`${Math.min(pred.diasHoy/pred.diasMes*100,100)}%`,height:"100%",background:"linear-gradient(90deg,#00E5A0,#00B8FF)",borderRadius:4}}/>
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginTop:4}}>{Math.round(pred.diasHoy/pred.diasMes*100)}% del mes transcurrido</div>
      </div>

      <div className="sec-label">Anomalías detectadas</div>
      {anomalias.length === 0 ? (
        <div className="an-empty" style={{padding:"30px 20px"}}>
          Sin anomalías detectadas. Gasto estable semana a semana.
        </div>
      ) : anomalias.map((a,i) => (
        <div key={i} className="anomaly-card" style={{
          borderColor: a.tipo==="alta"?"rgba(239,68,68,.3)":"rgba(52,211,153,.3)",
          background: a.tipo==="alta"?"rgba(239,68,68,.04)":"rgba(52,211,153,.04)"
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>Semana del {a.key}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>
                {a.count} compras · media: {fmt(a.avg)}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14,
                color:a.tipo==="alta"?"#F87171":"#34D399"}}>{fmt(a.total)}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,
                color:a.tipo==="alta"?"#F87171":"#34D399"}}>
                {a.tipo==="alta"?`+${a.desviacion}% más de lo normal`:`${a.desviacion}% menos de lo normal`}
              </div>
            </div>
          </div>
          {a.tickets.slice(0,3).map((t,j)=>(
            <div key={j} style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",padding:"2px 0"}}>
              {t.tienda||"Ticket"} · {t.fecha_compra} · {fmt(t.total)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdvancedAnalysis({ historial }) {
  const [tab, setTab] = useState("nutricional");
  return (
    <div className="aa-wrap">
      <style>{css}</style>
      <div className="aa-tabs">
        {[["nutricional","🥗 Nutrición"],["co2","🌿 CO₂"],["marcas","🏷️ Marcas"],["anomalias","⚡ Anomalías"]].map(([v,l])=>(
          <button key={v} className={`aa-tab ${tab===v?"active":""}`} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>
      {tab==="nutricional" && <NutricionalTab historial={historial}/>}
      {tab==="co2" && <NutricionalTab historial={historial}/>}
      {tab==="marcas" && <MarcasTab historialLen={historial.length}/>}
      {tab==="anomalias" && <AnomaliaTab historial={historial}/>}
    </div>
  );
}
