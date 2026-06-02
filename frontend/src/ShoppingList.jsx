import { useState, useEffect } from "react";

const LOCAL_IP = "localhost";
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);
const CAT_ICONS = {
  "Frutas":"🍎","Verduras":"🥦","Pescado y Marisco":"🐟","Carnes":"🥩","Charcuteria":"🥓",
  "Lacteos y Huevos":"🥛","Bebidas":"🥤","Pan y Bolleria":"🍞","Pasta Arroz Legumbre":"🍝",
  "Conservas":"🥫","Congelados":"🧊","Snacks y Dulces":"🍫","Aceites y Condimentos":"🫒",
  "Limpieza Hogar":"🧹","Higiene Personal":"🧴","Mascotas":"🐾","Bebe e Infantil":"👶","Otros":"📦"
};
const fmt = v => {
  if (v == null || v === "") return "—";
  const n = parseFloat(String(v).replace(/[^\d.,]/g,"").replace(",","."));
  return isNaN(n) ? String(v) : n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2});
};

const css = `
.sl-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.sl-controls{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.sl-search{background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:8px 10px 8px 30px;color:#E8EDF5;font-size:12px;font-family:'Space Mono',monospace;outline:none;transition:border-color .15s;flex:1;min-width:150px}
.sl-search:focus{border-color:rgba(0,229,160,.4)}
.sl-search::placeholder{color:#2D3748}
.sl-search-wrap{position:relative;flex:1;min-width:150px}
.sl-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4A5568;font-size:12px;pointer-events:none}
.tog-btn{padding:5px 12px;border-radius:6px;border:1px solid #1E2A3A;background:#111827;color:#4A5568;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;transition:all .15s}
.tog-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.sl-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(30,42,58,.5);transition:background .15s;cursor:pointer}
.sl-item:last-child{border-bottom:none}
.sl-item:hover{background:rgba(0,229,160,.02)}
.sl-item.checked{opacity:.5}
.sl-check{width:18px;height:18px;border-radius:4px;border:2px solid #1E2A3A;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.sl-check.done{background:#00E5A0;border-color:#00E5A0;color:#0A0E1A;font-size:11px}
.sl-name{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-meta{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:2px}
.urgencia-bar{width:60px;height:4px;background:#1E2A3A;border-radius:2px;overflow:hidden;flex-shrink:0}
.urgencia-fill{height:100%;border-radius:2px}
.sl-precio{font-family:'Space Mono',monospace;font-size:11px;color:#4A5568;flex-shrink:0}
.sl-urgencia-badge{font-family:'Space Mono',monospace;font-size:9px;padding:2px 7px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.sl-badge-urgent{background:rgba(239,68,68,.1);color:#F87171;border:1px solid rgba(239,68,68,.2)}
.sl-badge-soon{background:rgba(251,191,36,.1);color:#FCD34D;border:1px solid rgba(251,191,36,.2)}
.sl-badge-ok{background:rgba(0,229,160,.1);color:#00E5A0;border:1px solid rgba(0,229,160,.2)}
.sl-add-btn{background:#00E5A0;color:#0A0E1A;border:none;border-radius:8px;padding:9px 18px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
.sl-add-btn:hover{background:#00FFB2;transform:translateY(-1px)}
.sl-add-form{background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:14px;margin-bottom:16px}
.add-input{width:100%;background:#0D1220;border:1px solid #1E2A3A;border-radius:6px;padding:9px 10px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;margin-bottom:8px;transition:border-color .15s}
.add-input:focus{border-color:rgba(0,229,160,.4)}
.sl-footer{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,229,160,.04);border-top:1px solid rgba(0,229,160,.1);border-radius:0 0 12px 12px;font-family:'Space Mono',monospace;font-size:11px;color:#4A5568}
.sl-empty{text-align:center;padding:50px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
.spin-sm{width:12px;height:12px;border:2px solid rgba(0,229,160,.3);border-top-color:#00E5A0;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
`;

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | urgent | soon
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [manualItem, setManualItem] = useState("");
  const [manualItems, setManualItems] = useState([]);

  useEffect(() => {
    fetch(`${API}/lista-compra`).then(r=>r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items
    .filter(p => filter==="urgent" ? p.urgencia>=1.2 : filter==="soon" ? p.urgencia>=0.8&&p.urgencia<1.2 : true)
    .filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()));

  const getUrgenciaBadge = (u) => {
    if (u >= 1.5) return { cls:"sl-badge-urgent", txt:"Muy urgente" };
    if (u >= 1.0) return { cls:"sl-badge-urgent", txt:`${u.toFixed(1)}× esperado` };
    if (u >= 0.8) return { cls:"sl-badge-soon", txt:"Pronto" };
    return { cls:"sl-badge-ok", txt:"Ok" };
  };

  const getBarColor = (u) => {
    if (u >= 1.2) return "#F87171";
    if (u >= 0.85) return "#FCD34D";
    return "#00E5A0";
  };

  const toggleCheck = (nombre) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(nombre) ? next.delete(nombre) : next.add(nombre);
      return next;
    });
  };

  const addManual = () => {
    if (!manualItem.trim()) return;
    setManualItems(prev => [...prev, { nombre:manualItem.trim(), manual:true }]);
    setManualItem("");
  };

  const checkedCount = checked.size;
  const totalCount = filtered.length + manualItems.length;

  if (loading) return (
    <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}>
      <span className="spin-sm" style={{marginRight:8}}/>Calculando lista…
    </div>
  );

  return (
    <div className="sl-wrap">
      <style>{css}</style>

      <div className="sl-controls">
        <div className="sl-search-wrap">
          <span className="sl-search-icon">🔍</span>
          <input className="sl-search" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <button className={`tog-btn ${filter==="all"?"active":""}`} onClick={()=>setFilter("all")}>Todos</button>
        <button className={`tog-btn ${filter==="urgent"?"active":""}`} onClick={()=>setFilter("urgent")}>🔴 Urgente</button>
        <button className={`tog-btn ${filter==="soon"?"active":""}`} onClick={()=>setFilter("soon")}>🟡 Pronto</button>
        <button className="sl-add-btn" onClick={()=>setShowAdd(v=>!v)}>+ Añadir</button>
      </div>

      {showAdd && (
        <div className="sl-add-form">
          <input className="add-input" placeholder="Nombre del producto…" value={manualItem}
            onChange={e=>setManualItem(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addManual()} autoFocus />
          <div style={{display:"flex",gap:8}}>
            <button className="sl-add-btn" style={{fontSize:12,padding:"7px 14px"}} onClick={addManual}>Añadir</button>
            <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"1px solid #1E2A3A",borderRadius:8,padding:"7px 14px",color:"#6B7280",fontFamily:"'Space Mono',monospace",fontSize:11,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {items.length === 0 && manualItems.length === 0 ? (
        <div className="sl-empty">
          <div style={{fontSize:40,marginBottom:12}}>🛒</div>
          Sin sugerencias todavía.<br/>Necesitas al menos 2 tickets del mismo producto<br/>para que aparezca aquí.
        </div>
      ) : (
        <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,marginBottom:22,overflow:"hidden"}}>
          {manualItems.map((m,i) => (
            <div key={`m-${i}`} className={`sl-item ${checked.has("__m"+i)?"checked":""}`}
              onClick={()=>toggleCheck("__m"+i)}>
              <div className={`sl-check ${checked.has("__m"+i)?"done":""}`}>{checked.has("__m"+i)?"✓":""}</div>
              <div style={{flex:1}}>
                <div className="sl-name" style={{textDecoration:checked.has("__m"+i)?"line-through":"none"}}>{m.nombre}</div>
                <div className="sl-meta">Añadido manualmente</div>
              </div>
              <button onClick={e=>{e.stopPropagation();setManualItems(p=>p.filter((_,j)=>j!==i));}}
                style={{background:"none",border:"none",color:"#2D3748",cursor:"pointer",fontSize:13,padding:"2px 4px"}}>✕</button>
            </div>
          ))}

          {filtered.map(p => {
            const badge = getUrgenciaBadge(p.urgencia);
            const barPct = Math.min(p.urgencia * 100, 100);
            const isChecked = checked.has(p.nombre);
            return (
              <div key={p.nombre} className={`sl-item ${isChecked?"checked":""}`} onClick={()=>toggleCheck(p.nombre)}>
                <div className={`sl-check ${isChecked?"done":""}`}>{isChecked?"✓":""}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="sl-name" style={{textDecoration:isChecked?"line-through":"none"}}>
                    {CAT_ICONS[p.categoria]||"📦"} {p.nombre}
                  </div>
                  <div className="sl-meta">
                    Última vez: {p.ultima_compra||"—"} · hace {p.dias_desde}d · cada ~{p.intervalo_medio}d
                  </div>
                </div>
                <div className="urgencia-bar">
                  <div className="urgencia-fill" style={{width:`${barPct}%`,background:getBarColor(p.urgencia)}}/>
                </div>
                {p.precio_medio && <span className="sl-precio">~{fmt(p.precio_medio)}</span>}
                <span className={`sl-urgencia-badge ${badge.cls}`}>{badge.txt}</span>
              </div>
            );
          })}

          <div className="sl-footer">
            <span>{checkedCount} / {totalCount} marcados</span>
            {checkedCount > 0 && (
              <button onClick={()=>setChecked(new Set())}
                style={{background:"none",border:"none",color:"#00E5A0",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:11}}>
                Limpiar selección
              </button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#2D3748",textAlign:"center"}}>
          Basado en tus patrones de compra · {items.length} productos sugeridos
        </div>
      )}
    </div>
  );
}
