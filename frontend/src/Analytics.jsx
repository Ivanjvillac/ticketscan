import { useState, useEffect, useMemo } from "react";

const API = (typeof import.meta !== "undefined" && import.meta.env?.PROD) ? "/api" : "http://localhost:3001/api";

const css = `
.an-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.an-tabs{display:flex;gap:3px;background:#080C14;border:1px solid #1E2A3A;border-radius:10px;padding:4px;margin-bottom:24px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.an-tabs::-webkit-scrollbar{display:none}
.an-tab{flex-shrink:0;padding:8px 10px;border-radius:7px;border:none;background:transparent;color:#4A5568;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer;transition:all .15s;white-space:nowrap}
.an-tab:hover{color:#E8EDF5}
.an-tab.active{background:#0A0E1A;color:#00E5A0;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.tog-row{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.tog-lbl{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568}
.tog-btn{padding:5px 12px;border-radius:6px;border:1px solid #1E2A3A;background:#111827;color:#4A5568;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;transition:all .15s}
.tog-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.tog-btn:hover:not(.active){border-color:#4A5568;color:#E8EDF5}
.chart-box{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:18px 14px;margin-bottom:22px}
.chart-title{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.bar-v-wrap{display:flex;align-items:flex-end;gap:3px;padding-bottom:20px;position:relative}
.bar-v-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;position:relative}
.bar-v-fill{width:100%;border-radius:3px 3px 0 0;background:linear-gradient(180deg,#00E5A0,#00B8FF66);min-height:2px;position:relative;cursor:default}
.bar-v-fill.hi{background:linear-gradient(180deg,#00FFB2,#00E5A0)}
.bar-v-fill.red{background:linear-gradient(180deg,#F87171,#EF444466)}
.bar-v-tip{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:#0D1220;border:1px solid #1E2A3A;border-radius:6px;padding:4px 8px;font-family:'Space Mono',monospace;font-size:10px;color:#E8EDF5;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s;z-index:20}
.bar-v-fill:hover .bar-v-tip{opacity:1}
.bar-v-lbl{position:absolute;bottom:0;font-family:'Space Mono',monospace;font-size:8px;color:#4A5568;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;left:0}
.h-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.h-track{flex:1;height:6px;background:#1E2A3A;border-radius:3px;overflow:hidden}
.h-fill{height:100%;background:linear-gradient(90deg,#00E5A0,#00B8FF);border-radius:3px}
.detail-list{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden;margin-bottom:22px}
.detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 17px;border-bottom:1px solid rgba(30,42,58,.5)}
.detail-row:last-child{border-bottom:none}
.store-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px 18px;margin-bottom:10px;transition:border-color .15s}
.store-card:hover{border-color:rgba(0,229,160,.25)}
.store-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.store-card-name{font-size:15px;font-weight:700}
.store-card-total{font-family:'Space Mono',monospace;font-weight:700;font-size:18px;color:#00E5A0}
.store-stats{display:flex;gap:18px;flex-wrap:wrap}
.sstat{display:flex;flex-direction:column;gap:2px}
.sstat-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1px}
.sstat-val{font-size:13px;font-weight:700}
.prog-bar{width:100%;height:3px;background:#1E2A3A;border-radius:2px;overflow:hidden;margin-bottom:10px}
.prog-fill{height:100%;background:linear-gradient(90deg,#00E5A0,#00B8FF);border-radius:2px}
.prod-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid rgba(30,42,58,.5)}
.prod-row:last-child{border-bottom:none}
.prod-rank{font-family:'Space Mono',monospace;font-size:10px;color:#2D3748;min-width:26px;text-align:right;flex-shrink:0}
.prod-name{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.micro-bar{width:70px;height:3px;background:#1E2A3A;border-radius:2px;overflow:hidden;flex-shrink:0}
.micro-fill{height:100%;background:linear-gradient(90deg,#00E5A0,#00B8FF);border-radius:2px}
.badge-g{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(0,229,160,.1);color:#00E5A0;border:1px solid rgba(0,229,160,.2);white-space:nowrap;flex-shrink:0}
.badge-gray{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(107,114,128,.1);color:#6B7280;border:1px solid rgba(107,114,128,.2);white-space:nowrap;flex-shrink:0}
.badge-up{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(239,68,68,.1);color:#F87171;border:1px solid rgba(239,68,68,.2);white-space:nowrap;flex-shrink:0}
.badge-dn{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(52,211,153,.1);color:#34D399;border:1px solid rgba(52,211,153,.2);white-space:nowrap;flex-shrink:0}
.badge-eq{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(107,114,128,.1);color:#6B7280;border:1px solid rgba(107,114,128,.2);white-space:nowrap;flex-shrink:0}
.pattern-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
.pattern-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px}
.pattern-title{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.insight{background:rgba(0,229,160,.04);border:1px solid rgba(0,229,160,.14);border-radius:10px;padding:13px 16px;margin-bottom:9px}
.insight-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}
.insight-txt{font-size:13px;line-height:1.5;color:#E8EDF5}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.an-empty{text-align:center;padding:60px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
.spin-sm{width:12px;height:12px;border:2px solid rgba(0,229,160,.3);border-top-color:#00E5A0;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.search-wrap{position:relative;flex:1;min-width:160px}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4A5568;font-size:12px;pointer-events:none}
.search-ctrl{width:100%;background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:8px 10px 8px 30px;color:#E8EDF5;font-size:12px;font-family:'Space Mono',monospace;outline:none;transition:border-color .15s}
.search-ctrl:focus{border-color:rgba(0,229,160,.4)}
.search-ctrl::placeholder{color:#2D3748}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:22px}
.cat-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:14px 16px;cursor:pointer;transition:all .15s}
.cat-card:hover{border-color:rgba(0,229,160,.25);background:rgba(0,229,160,.03)}
.cat-card.expanded{border-color:rgba(0,229,160,.4);background:rgba(0,229,160,.05)}
.cat-icon{font-size:22px;margin-bottom:6px}
.cat-name{font-size:13px;font-weight:700;margin-bottom:2px}
.cat-meta{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568}
.cat-total{font-family:'Space Mono',monospace;font-size:15px;font-weight:700;color:#00E5A0;margin-top:4px}
.cat-products{margin-top:12px;border-top:1px solid #1E2A3A;padding-top:10px}
.cat-prod-item{font-size:12px;color:#6B7280;padding:3px 0;display:flex;justify-content:space-between}
.cat-prod-item span:last-child{font-family:'Space Mono',monospace;color:#4A5568}
.price-row{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid rgba(30,42,58,.5)}
.price-row:last-child{border-bottom:none}
.price-name{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.price-hist{display:flex;gap:6px;flex-shrink:0;cursor:pointer;align-items:center}
.price-hist-item{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;background:#0D1220;border:1px solid #1E2A3A;border-radius:4px;padding:2px 6px;white-space:nowrap}
.expand-btn{background:none;border:none;color:#4A5568;cursor:pointer;font-size:12px;padding:2px 4px}
.expand-btn:hover{color:#E8EDF5}
@media(max-width:680px){
  .pattern-grid{grid-template-columns:1fr}
  .cat-grid{grid-template-columns:1fr 1fr}
  .an-tab{font-size:10px;padding:7px 7px}
}
`;

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DIAS_S = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DIAS_L = ["domingos","lunes","martes","miércoles","jueves","viernes","sábados"];

const CAT_ICONS = {
  "Frutas":"🍎","Verduras":"🥦","Pescado y Marisco":"🐟","Carnes":"🥩","Charcuteria":"🥓",
  "Lacteos y Huevos":"🥛","Bebidas":"🥤","Pan y Bolleria":"🍞","Pasta Arroz Legumbre":"🍝",
  "Conservas":"🥫","Congelados":"🧊","Snacks y Dulces":"🍫","Aceites y Condimentos":"🫒",
  "Limpieza Hogar":"🧹","Higiene Personal":"🧴","Mascotas":"🐾","Bebe y Infantil":"👶","Otros":"📦"
};

const fmt = (v, digits = 2) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: digits });
};

function parseDate(str) {
  if (!str) return null;
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    if (!d || !m || !y) return null;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function getWeekStart(d) {
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function BarChart({ items, height = 90 }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="bar-v-wrap" style={{ height: height + 22 }}>
      {items.map((item, i) => {
        const h = Math.max((item.value / max) * height, item.value > 0 ? 2 : 0);
        return (
          <div key={i} className="bar-v-col">
            <div className={`bar-v-fill${item.cls ? " " + item.cls : ""}`} style={{ height: `${h}px` }}>
              {item.tooltip && <div className="bar-v-tip">{item.tooltip}</div>}
            </div>
            <span className="bar-v-lbl">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ data, width = 72, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (width - 4) + 2,
    height - 4 - ((v - min) / range) * (height - 8)
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#F87171" : "#34D399";
  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── TIEMPO ───────────────────────────────────────────────────────────────────
function TiempoTab({ historial }) {
  const [group, setGroup] = useState("mes");

  const byMonth = useMemo(() => {
    const map = {};
    historial.forEach(t => {
      const d = parseDate(t.fecha_compra); if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!map[key]) map[key] = { key, label: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, total: 0, count: 0 };
      map[key].total += t.total || 0; map[key].count++;
    });
    return Object.values(map).sort((a,b) => a.key.localeCompare(b.key));
  }, [historial]);

  const byWeek = useMemo(() => {
    const map = {};
    historial.forEach(t => {
      const d = parseDate(t.fecha_compra); if (!d) return;
      const ws = getWeekStart(d);
      const key = ws.toISOString().slice(0,10);
      if (!map[key]) map[key] = { key, label: `${ws.getDate()}/${ws.getMonth()+1}`, total: 0, count: 0 };
      map[key].total += t.total || 0; map[key].count++;
    });
    return Object.values(map).sort((a,b) => a.key.localeCompare(b.key)).slice(-16);
  }, [historial]);

  const data = group === "mes" ? byMonth : byWeek;
  const best = data.reduce((m, d) => d.total > (m?.total || 0) ? d : m, null);
  if (!data.length) return <div className="an-empty">Sin fechas válidas en los tickets.</div>;

  return (
    <div>
      <div className="tog-row">
        <span className="tog-lbl">Agrupar:</span>
        {[["mes","Por mes"],["semana","Por semana"]].map(([v,l]) => (
          <button key={v} className={`tog-btn ${group===v?"active":""}`} onClick={()=>setGroup(v)}>{l}</button>
        ))}
      </div>
      <div className="chart-box">
        <div className="chart-title">Gasto {group === "mes" ? "mensual" : "semanal"}</div>
        <BarChart height={90} items={data.map(d => ({
          label: d.label, value: d.total, cls: d===best?"hi":"",
          tooltip: `${d.label}: ${fmt(d.total)} · ${d.count} ticket${d.count!==1?"s":""}`
        }))} />
      </div>
      <div className="sec-label">Detalle</div>
      <div className="detail-list">
        {data.slice().reverse().map(d => (
          <div key={d.key} className="detail-row">
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{d.label}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>{d.count} ticket{d.count!==1?"s":""}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14,color:d===best?"#00E5A0":"#E8EDF5"}}>{fmt(d.total)}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>~{fmt(d.total/d.count)} / visita</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TIENDAS ──────────────────────────────────────────────────────────────────
function TiendasTab({ historial }) {
  const [sort, setSort] = useState("gasto");

  const stores = useMemo(() => {
    const map = {};
    historial.forEach(t => {
      const k = t.tienda || "Desconocida";
      if (!map[k]) map[k] = { tienda: k, total: 0, count: 0, totals: [], dates: [] };
      map[k].total += t.total || 0; map[k].count++;
      if (t.total) map[k].totals.push(t.total);
      const d = parseDate(t.fecha_compra); if (d) map[k].dates.push(d.getTime());
    });
    return Object.values(map);
  }, [historial]);

  const sorted = useMemo(() => [...stores].sort((a,b) => {
    if (sort==="gasto") return b.total-a.total;
    if (sort==="visitas") return b.count-a.count;
    if (sort==="media") return (b.total/b.count)-(a.total/a.count);
    return 0;
  }), [stores, sort]);

  const maxTotal = Math.max(...sorted.map(s=>s.total), 1);
  if (!stores.length) return <div className="an-empty">Sin tiendas registradas.</div>;

  return (
    <div>
      <div className="tog-row">
        <span className="tog-lbl">Ordenar:</span>
        {[["gasto","Mayor gasto"],["visitas","Más visitas"],["media","Ticket medio"]].map(([v,l]) => (
          <button key={v} className={`tog-btn ${sort===v?"active":""}`} onClick={()=>setSort(v)}>{l}</button>
        ))}
      </div>
      {sorted.map(s => {
        const avg = s.total/s.count;
        const maxT = s.totals.length ? Math.max(...s.totals) : 0;
        const minT = s.totals.length ? Math.min(...s.totals) : 0;
        const sD = s.dates.slice().sort();
        const diffs = sD.slice(1).map((t,i)=>(t-sD[i])/86400000);
        const avgInt = diffs.length ? Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length) : null;
        return (
          <div key={s.tienda} className="store-card">
            <div className="store-card-head">
              <div>
                <div className="store-card-name">{s.tienda}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>
                  {s.count} visita{s.count!==1?"s":""}
                  {avgInt!=null?` · cada ~${avgInt}d`:""}
                </div>
              </div>
              <div className="store-card-total">{fmt(s.total)}</div>
            </div>
            <div className="prog-bar"><div className="prog-fill" style={{width:`${(s.total/maxTotal)*100}%`}}/></div>
            <div className="store-stats">
              <div className="sstat"><span className="sstat-lbl">Ticket medio</span><span className="sstat-val">{fmt(avg)}</span></div>
              <div className="sstat"><span className="sstat-lbl">Máximo</span><span className="sstat-val">{fmt(maxT)}</span></div>
              <div className="sstat"><span className="sstat-lbl">Mínimo</span><span className="sstat-val">{fmt(minT)}</span></div>
              {avgInt!=null && <div className="sstat"><span className="sstat-lbl">Frecuencia</span><span className="sstat-val">~{avgInt}d</span></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
function ProductosTab() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("frecuencia");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/stats/productos`)
      .then(r=>r.json()).then(d=>setProductos(Array.isArray(d)?d:[])).catch(()=>setProductos([]))
      .finally(()=>setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = search.trim() ? productos.filter(p=>p.nombre?.toLowerCase().includes(search.toLowerCase())) : productos;
    return [...list].sort((a,b) => {
      if (sort==="frecuencia") return b.frecuencia-a.frecuencia;
      if (sort==="gasto") return (b.total_gasto||0)-(a.total_gasto||0);
      if (sort==="precio") return (b.precio_medio||0)-(a.precio_medio||0);
      return 0;
    });
  }, [productos, sort, search]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Cargando…</div>;
  if (!productos.length) return <div className="an-empty">Sin productos registrados.</div>;

  const maxFreq = Math.max(...filtered.map(p=>p.frecuencia), 1);
  const maxGasto = Math.max(...filtered.map(p=>p.total_gasto||0), 1);

  return (
    <div>
      <div className="tog-row">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-ctrl" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="tog-row" style={{marginTop:-8}}>
        <span className="tog-lbl">Ordenar:</span>
        {[["frecuencia","Más repetidos"],["gasto","Más gastado"],["precio","Más caro"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${sort===v?"active":""}`} onClick={()=>setSort(v)}>{l}</button>
        ))}
      </div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginBottom:10}}>
        {filtered.length} producto{filtered.length!==1?"s":""}
      </div>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,marginBottom:22}}>
        {filtered.slice(0,150).map((p,i)=>(
          <div key={i} className="prod-row">
            <span className="prod-rank">#{i+1}</span>
            <div style={{flex:1,minWidth:0}}>
              <div className="prod-name">{p.nombre}</div>
              <div style={{display:"flex",gap:6,marginTop:5,alignItems:"center"}}>
                <div className="micro-bar"><div className="micro-fill" style={{width:`${(p.frecuencia/maxFreq)*100}%`}}/></div>
                <div className="micro-bar" style={{background:"rgba(0,184,255,.1)"}}>
                  <div className="micro-fill" style={{width:`${((p.total_gasto||0)/maxGasto)*100}%`,background:"linear-gradient(90deg,#00B8FF,#7C3AED66)"}}/>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8,flexShrink:0}}>
              <span className="badge-g">{p.frecuencia}× tickets</span>
              {p.total_gasto>0 && <span className="badge-gray">{fmt(p.total_gasto)} total</span>}
            </div>
          </div>
        ))}
        {filtered.length>150 && <div style={{textAlign:"center",padding:12,fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>+{filtered.length-150} más — usa el buscador</div>}
      </div>
    </div>
  );
}

// ── PRECIOS ───────────────────────────────────────────────────────────────────
function PreciosTab() {
  const [precios, setPrecios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | up | down
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${API}/stats/precios`)
      .then(r=>r.json()).then(d=>setPrecios(Array.isArray(d)?d:[])).catch(()=>setPrecios([]))
      .finally(()=>setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return precios
      .filter(p => filter==="up" ? p.variacion_pct>0.5 : filter==="down" ? p.variacion_pct<-0.5 : true)
      .filter(p => !search.trim() || p.nombre?.toLowerCase().includes(search.toLowerCase()));
  }, [precios, filter, search]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Cargando…</div>;
  if (!precios.length) return (
    <div className="an-empty">
      Sin suficientes datos para comparar precios.<br/>
      Necesitas el mismo producto en al menos 2 tickets distintos.
    </div>
  );

  const subidas = precios.filter(p=>p.variacion_pct>0.5).length;
  const bajadas = precios.filter(p=>p.variacion_pct<-0.5).length;
  const estables = precios.length - subidas - bajadas;

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 16px",flex:1,minWidth:80}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#F87171",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Subidas</div>
          <div style={{fontSize:22,fontWeight:800,color:"#F87171"}}>{subidas}</div>
        </div>
        <div style={{background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.2)",borderRadius:10,padding:"10px 16px",flex:1,minWidth:80}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#34D399",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Bajadas</div>
          <div style={{fontSize:22,fontWeight:800,color:"#34D399"}}>{bajadas}</div>
        </div>
        <div style={{background:"rgba(107,114,128,.08)",border:"1px solid rgba(107,114,128,.2)",borderRadius:10,padding:"10px 16px",flex:1,minWidth:80}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#6B7280",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Estables</div>
          <div style={{fontSize:22,fontWeight:800,color:"#6B7280"}}>{estables}</div>
        </div>
      </div>

      <div className="tog-row">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-ctrl" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="tog-row" style={{marginTop:-8}}>
        <span className="tog-lbl">Filtrar:</span>
        {[["all","Todos"],["up","↑ Subidas"],["down","↓ Bajadas"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${filter===v?"active":""}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>

      <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginBottom:10}}>
        {filtered.length} producto{filtered.length!==1?"s":""} con historial de precios
      </div>

      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,marginBottom:22}}>
        {filtered.slice(0,100).map((p,i) => {
          const isExp = expanded === i;
          const up = p.variacion_pct > 0.5;
          const dn = p.variacion_pct < -0.5;
          const prices = p.historial.map(h=>h.precio);
          return (
            <div key={i} style={{borderBottom:i<filtered.length-1?"1px solid rgba(30,42,58,.5)":"none"}}>
              <div className="price-row" onClick={()=>setExpanded(isExp?null:i)} style={{cursor:"pointer"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="price-name">{p.nombre}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>
                    {p.veces} registros · {p.categoria}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <Sparkline data={prices} />
                  <div style={{textAlign:"right",minWidth:70}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13}}>{fmt(p.precio_actual)}</div>
                    <div>
                      {up && <span className="badge-up">+{p.variacion_pct}%</span>}
                      {dn && <span className="badge-dn">{p.variacion_pct}%</span>}
                      {!up && !dn && <span className="badge-eq">~estable</span>}
                    </div>
                  </div>
                  <span style={{color:"#2D3748",fontSize:11}}>{isExp?"▲":"▼"}</span>
                </div>
              </div>
              {isExp && (
                <div style={{background:"#0D1220",padding:"12px 16px",borderTop:"1px solid #1E2A3A"}}>
                  <div style={{display:"flex",gap:16,marginBottom:10,flexWrap:"wrap"}}>
                    <div><span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1}}>Inicial</span><div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:"#6B7280"}}>{fmt(p.precio_inicial)}</div></div>
                    <div><span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1}}>Actual</span><div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:up?"#F87171":dn?"#34D399":"#E8EDF5"}}>{fmt(p.precio_actual)}</div></div>
                    <div><span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1}}>Mínimo</span><div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:"#34D399"}}>{fmt(p.precio_min)}</div></div>
                    <div><span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1}}>Máximo</span><div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:"#F87171"}}>{fmt(p.precio_max)}</div></div>
                  </div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Historial</div>
                  {p.historial.map((h,j) => (
                    <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:j<p.historial.length-1?"1px solid rgba(30,42,58,.3)":"none",fontSize:12}}>
                      <span style={{fontFamily:"'Space Mono',monospace",color:"#4A5568"}}>{h.fecha || "—"}</span>
                      <span style={{fontFamily:"'Space Mono',monospace",color:"#6B7280",fontSize:11}}>{h.tienda}</span>
                      <span style={{fontFamily:"'Space Mono',monospace",fontWeight:700,color:j===p.historial.length-1?(up?"#F87171":dn?"#34D399":"#E8EDF5"):"#6B7280"}}>{fmt(h.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length>100 && <div style={{textAlign:"center",padding:12,fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>+{filtered.length-100} más — usa el buscador</div>}
      </div>
    </div>
  );
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
function CategoriasTab() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort] = useState("gasto");

  useEffect(() => {
    fetch(`${API}/stats/productos`)
      .then(r=>r.json()).then(d=>setProductos(Array.isArray(d)?d:[])).catch(()=>setProductos([]))
      .finally(()=>setLoading(false));
  }, []);

  const cats = useMemo(() => {
    const map = {};
    productos.forEach(p => {
      const k = p.categoria || "Otros";
      if (!map[k]) map[k] = { nombre: k, count: 0, gasto: 0, frecuencia: 0, productos: [] };
      map[k].count++;
      map[k].gasto += p.total_gasto || 0;
      map[k].frecuencia += p.frecuencia || 0;
      map[k].productos.push(p);
    });
    return Object.values(map).sort((a,b) => {
      if (sort==="gasto") return b.gasto-a.gasto;
      if (sort==="variedad") return b.count-a.count;
      if (sort==="frecuencia") return b.frecuencia-a.frecuencia;
      return 0;
    });
  }, [productos, sort]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Cargando…</div>;
  if (!productos.length) return <div className="an-empty">Sin productos registrados.</div>;

  const maxGasto = Math.max(...cats.map(c=>c.gasto), 1);

  return (
    <div>
      <div className="tog-row">
        <span className="tog-lbl">Ordenar:</span>
        {[["gasto","Mayor gasto"],["variedad","Más variedad"],["frecuencia","Más repetido"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${sort===v?"active":""}`} onClick={()=>setSort(v)}>{l}</button>
        ))}
      </div>

      <div className="sec-label">Gasto por categoría</div>
      <div className="chart-box" style={{marginBottom:22}}>
        <BarChart height={80} items={cats.slice(0,12).map(c=>({
          label: c.nombre.split(" ")[0],
          value: c.gasto,
          tooltip: `${c.nombre}: ${fmt(c.gasto)}`
        }))} />
      </div>

      <div className="sec-label">Detalle por categoría</div>
      {cats.map((cat, i) => {
        const isExp = expanded === cat.nombre;
        const topProds = [...cat.productos].sort((a,b)=>(b.total_gasto||0)-(a.total_gasto||0)).slice(0,5);
        return (
          <div key={cat.nombre} style={{marginBottom:10}}>
            <div
              className={`cat-card ${isExp?"expanded":""}`}
              onClick={()=>setExpanded(isExp?null:cat.nombre)}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:20,marginBottom:4}}>{CAT_ICONS[cat.nombre]||"📦"}</div>
                  <div className="cat-name">{cat.nombre}</div>
                  <div className="cat-meta">{cat.count} producto{cat.count!==1?"s":""} · {cat.frecuencia} compras</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="cat-total">{fmt(cat.gasto)}</div>
                  <div style={{width:90,height:3,background:"#1E2A3A",borderRadius:2,overflow:"hidden",marginTop:6}}>
                    <div style={{width:`${(cat.gasto/maxGasto)*100}%`,height:"100%",background:"linear-gradient(90deg,#00E5A0,#00B8FF)",borderRadius:2}}/>
                  </div>
                </div>
              </div>

              {isExp && (
                <div className="cat-products" onClick={e=>e.stopPropagation()}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>
                    Top productos
                  </div>
                  {topProds.map((p,j) => (
                    <div key={j} className="cat-prod-item">
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{p.nombre}</span>
                      <span>{p.frecuencia}× · {fmt(p.total_gasto)}</span>
                    </div>
                  ))}
                  {cat.productos.length > 5 && (
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#2D3748",marginTop:6}}>
                      +{cat.productos.length-5} más en esta categoría
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PATRONES ─────────────────────────────────────────────────────────────────
function PatronesTab({ historial }) {
  const byDow = useMemo(() => {
    const arr = DIAS_S.map((day,i)=>({day,idx:i,total:0,count:0}));
    historial.forEach(t => {
      const d = parseDate(t.fecha_compra); if (!d) return;
      arr[d.getDay()].total += t.total||0; arr[d.getDay()].count++;
    });
    return arr;
  }, [historial]);

  const byHour = useMemo(() => {
    const arr = Array.from({length:24},(_,i)=>({hour:i,count:0,total:0}));
    historial.forEach(t => {
      if (!t.hora) return;
      const h = parseInt(t.hora.split(":")[0]);
      if (h>=0&&h<24){arr[h].count++;arr[h].total+=t.total||0;}
    });
    return arr;
  }, [historial]);

  const intervals = useMemo(() => {
    const map = {};
    historial.forEach(t=>{
      const k=t.tienda||"?"; const d=parseDate(t.fecha_compra); if(!d)return;
      if(!map[k])map[k]=[];map[k].push(d.getTime());
    });
    return Object.entries(map).map(([store,times])=>{
      const s=times.slice().sort();
      if(s.length<2)return null;
      const diffs=s.slice(1).map((t,i)=>(t-s[i])/86400000);
      return{store,avg:Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length),count:s.length};
    }).filter(Boolean).sort((a,b)=>b.count-a.count);
  }, [historial]);

  const maxDow = Math.max(...byDow.map(d=>d.count),1);
  const maxDowAvg = Math.max(...byDow.map(d=>d.count>0?d.total/d.count:0),1);
  const busyDay = byDow.reduce((m,d)=>d.count>(m?.count||0)?d:m,null);
  const topSpendDay = byDow.reduce((m,d)=>{
    const avg=d.count>0?d.total/d.count:0;
    const mA=m&&m.count>0?m.total/m.count:0;
    return avg>mA?d:m;
  },null);
  const busyHour = byHour.reduce((m,h)=>h.count>(m?.count||0)?h:m,null);
  const hasHour = byHour.some(h=>h.count>0);

  if (!historial.length) return <div className="an-empty">Sin datos para analizar.</div>;

  return (
    <div>
      <div className="sec-label">Insights</div>
      <div style={{marginBottom:22}}>
        {busyDay&&busyDay.count>0&&<div className="insight"><div className="insight-lbl">Día más activo</div><div className="insight-txt">Compras más los <strong>{DIAS_L[busyDay.idx]}</strong> — {busyDay.count} ticket{busyDay.count!==1?"s":""}</div></div>}
        {topSpendDay&&topSpendDay.count>0&&<div className="insight"><div className="insight-lbl">Mayor gasto medio</div><div className="insight-txt">Los <strong>{DIAS_L[topSpendDay.idx]}</strong> gastas <strong>{fmt(topSpendDay.total/topSpendDay.count)}</strong> de media por visita</div></div>}
        {hasHour&&busyHour&&busyHour.count>0&&<div className="insight"><div className="insight-lbl">Hora punta</div><div className="insight-txt">Sueles comprar a las <strong>{busyHour.hour}:00–{busyHour.hour}:59h</strong> ({busyHour.count} ticket{busyHour.count!==1?"s":""})</div></div>}
        {intervals.length>0&&<div className="insight"><div className="insight-lbl">Frecuencia de visita</div><div className="insight-txt">{intervals.slice(0,3).map(iv=><span key={iv.store}><strong>{iv.store}</strong>: ~{iv.avg}d &nbsp;</span>)}</div></div>}
      </div>

      <div className="pattern-grid">
        <div className="pattern-card">
          <div className="pattern-title">Tickets por día</div>
          {byDow.map(d=>(
            <div key={d.day} className="h-row">
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,minWidth:30,color:d===busyDay?"#00E5A0":"#6B7280"}}>{d.day}</span>
              <div className="h-track"><div className="h-fill" style={{width:`${(d.count/maxDow)*100}%`}}/></div>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",minWidth:20,textAlign:"right"}}>{d.count}</span>
            </div>
          ))}
        </div>
        <div className="pattern-card">
          <div className="pattern-title">Gasto medio por día</div>
          {byDow.map(d=>{
            const avg=d.count>0?d.total/d.count:0;
            return(
              <div key={d.day} className="h-row">
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,minWidth:30,color:d===topSpendDay?"#00E5A0":"#6B7280"}}>{d.day}</span>
                <div className="h-track"><div className="h-fill" style={{width:`${(avg/maxDowAvg)*100}%`}}/></div>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",minWidth:52,textAlign:"right"}}>{avg>0?fmt(avg):"—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {hasHour&&(
        <>
          <div className="sec-label">Hora del día</div>
          <div className="chart-box">
            <div className="chart-title">Tickets por hora</div>
            <BarChart height={70} items={Array.from({length:24},(_,i)=>({
              label:i%4===0?`${i}h`:"",value:byHour[i].count,
              cls:byHour[i]===busyHour?"hi":"",
              tooltip:`${i}:00h — ${byHour[i].count} ticket${byHour[i].count!==1?"s":""}`
            }))}/>
          </div>
        </>
      )}

      {intervals.length>0&&(
        <>
          <div className="sec-label">Frecuencia por tienda</div>
          <div className="detail-list">
            {intervals.map(iv=>(
              <div key={iv.store} className="detail-row">
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{iv.store}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>{iv.count} tickets registrados</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:15,color:"#00E5A0"}}>~{iv.avg}d</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568"}}>entre visitas</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── INFLACIÓN PERSONAL + TENDENCIA ───────────────────────────────────────────
function InflacionTab({ historial }) {
  const [precios, setPrecios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats/precios`).then(r=>r.json())
      .then(d=>setPrecios(Array.isArray(d)?d:[])).catch(()=>setPrecios([]))
      .finally(()=>setLoading(false));
  }, []);

  // Regresión lineal sobre gasto mensual
  const { byMonth, slope, intercept, trend } = useMemo(() => {
    const map = {};
    historial.forEach(t => {
      const d = parseDate(t.fecha_compra); if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!map[key]) map[key] = { key, total:0, count:0 };
      map[key].total += t.total||0; map[key].count++;
    });
    const byMonth = Object.values(map).sort((a,b)=>a.key.localeCompare(b.key));
    if (byMonth.length < 2) return { byMonth, slope:0, intercept:0, trend:"neutro" };
    const pts = byMonth.map((m,i) => [i, m.total]);
    const n = pts.length;
    const sumX = pts.reduce((s,p)=>s+p[0],0), sumY = pts.reduce((s,p)=>s+p[1],0);
    const sumXY = pts.reduce((s,p)=>s+p[0]*p[1],0), sumX2 = pts.reduce((s,p)=>s+p[0]*p[0],0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    return { byMonth, slope, intercept, trend: slope>2?"sube":slope<-2?"baja":"estable" };
  }, [historial]);

  // Índice de inflación personal
  const inflacion = useMemo(() => {
    if (!precios.length || byMonth.length < 2) return null;
    const primero = byMonth[0].key, ultimo = byMonth[byMonth.length-1].key;
    const cestaProd = precios.filter(p => p.veces >= 3);
    if (!cestaProd.length) return null;
    let sumPrimero = 0, sumUltimo = 0, n = 0;
    cestaProd.forEach(p => {
      const hist = p.historial.filter(h=>h.fecha);
      const enPrimero = hist.filter(h => {
        const d = parseDate(h.fecha); if (!d) return false;
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        return k <= primero;
      });
      const enUltimo = hist.filter(h => {
        const d = parseDate(h.fecha); if (!d) return false;
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        return k >= ultimo;
      });
      if (!enPrimero.length || !enUltimo.length) return;
      const pP = enPrimero.reduce((s,h)=>s+h.precio,0)/enPrimero.length;
      const pU = enUltimo.reduce((s,h)=>s+h.precio,0)/enUltimo.length;
      sumPrimero += pP; sumUltimo += pU; n++;
    });
    if (!n) return null;
    const pct = Math.round(((sumUltimo-sumPrimero)/sumPrimero)*1000)/10;
    return { pct, n, periodo: `${primero} → ${ultimo}` };
  }, [precios, byMonth]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Calculando…</div>;
  if (!historial.length) return <div className="an-empty">Sin datos suficientes.</div>;

  const trendColor = trend==="sube"?"#F87171":trend==="baja"?"#34D399":"#4A5568";
  const trendIcon = trend==="sube"?"📈 Sube":trend==="baja"?"📉 Baja":"➡️ Estable";

  return (
    <div>
      <div className="sec-label">Índice de inflación personal</div>
      {inflacion ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
          <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"16px 18px",gridColumn:"1/-1"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Tu cesta de la compra ({inflacion.n} productos recurrentes)</div>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <div style={{fontSize:36,fontWeight:800,color:inflacion.pct>0?"#F87171":inflacion.pct<0?"#34D399":"#00E5A0"}}>
                {inflacion.pct>0?"+":""}{inflacion.pct}%
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568"}}>
                {inflacion.periodo}<br/>
                {inflacion.pct>0?"Los precios de tu cesta han subido":inflacion.pct<0?"Los precios de tu cesta han bajado":"Los precios de tu cesta están estables"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="insight" style={{marginBottom:22}}>
          <div className="insight-lbl">Sin datos suficientes</div>
          <div className="insight-txt">Necesitas productos que hayas comprado 3+ veces en distintos meses para calcular tu inflación personal.</div>
        </div>
      )}

      <div className="sec-label">Tendencia de gasto mensual</div>
      {byMonth.length < 2 ? (
        <div className="an-empty">Necesitas al menos 2 meses de datos.</div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Tendencia</div>
              <div style={{fontSize:20,fontWeight:800,color:trendColor}}>{trendIcon}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:4}}>
                {Math.abs(slope)>0.1?`${slope>0?"+":"-"}${fmt(Math.abs(slope))}/mes`:"Sin tendencia clara"}
              </div>
            </div>
            <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Próximo mes estimado</div>
              <div style={{fontSize:20,fontWeight:800,color:"#E8EDF5"}}>
                {fmt(Math.max(intercept + slope * byMonth.length, 0))}
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:4}}>basado en regresión lineal</div>
            </div>
          </div>

          <div className="chart-box">
            <div className="chart-title">Gasto mensual + tendencia</div>
            <BarChart height={90} items={byMonth.map((m,i) => {
              const proj = intercept + slope * i;
              return {
                label: m.key.slice(5),
                value: m.total,
                tooltip: `${m.key}: ${fmt(m.total)} (tendencia: ${fmt(proj)})`,
                cls: m.total > proj * 1.1 ? "red" : m.total < proj * 0.9 ? "hi" : ""
              };
            })} />
          </div>

          <div className="detail-list">
            {byMonth.slice().reverse().map((m,i,arr) => {
              const prev = arr[i+1];
              const dif = prev ? Math.round(((m.total-prev.total)/prev.total)*1000)/10 : null;
              return (
                <div key={m.key} className="detail-row">
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{m.key}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>{m.count} tickets</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14}}>{fmt(m.total)}</div>
                    {dif!==null && <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:dif>0?"#F87171":dif<0?"#34D399":"#4A5568"}}>
                      {dif>0?`+${dif}%`:dif<0?`${dif}%`:"Igual"} vs anterior
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function Analytics({ historial }) {
  const [tab, setTab] = useState("tiempo");

  return (
    <div className="an-wrap">
      <style>{css}</style>
      {!historial.length ? (
        <div className="an-empty" style={{paddingTop:80}}>
          <div style={{fontSize:44,marginBottom:16}}>📈</div>
          Sin datos para analizar.<br/>Escanea tickets primero.
        </div>
      ) : (
        <>
          <div className="an-tabs">
            {[["tiempo","⏱ Tiempo"],["tiendas","🏪 Tiendas"],["productos","🛒 Productos"],
              ["precios","💰 Precios"],["categorias","🏷️ Categorías"],
              ["inflacion","📉 Inflación"],["patrones","📈 Patrones"]].map(([v,l])=>(
              <button key={v} className={`an-tab ${tab===v?"active":""}`} onClick={()=>setTab(v)}>{l}</button>
            ))}
          </div>
          {tab==="tiempo"     && <TiempoTab historial={historial}/>}
          {tab==="tiendas"    && <TiendasTab historial={historial}/>}
          {tab==="productos"  && <ProductosTab/>}
          {tab==="precios"    && <PreciosTab/>}
          {tab==="categorias" && <CategoriasTab/>}
          {tab==="inflacion"  && <InflacionTab historial={historial}/>}
          {tab==="patrones"   && <PatronesTab historial={historial}/>}
        </>
      )}
    </div>
  );
}
