import { useState, useEffect } from "react";

const LOCAL_IP = "localhost";
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);

const TODAS_CATS = [
  "Frutas","Verduras","Pescado y Marisco","Carnes","Charcuteria","Lacteos y Huevos",
  "Bebidas","Pan y Bolleria","Pasta Arroz Legumbre","Conservas","Congelados",
  "Snacks y Dulces","Aceites y Condimentos","Limpieza Hogar","Higiene Personal",
  "Mascotas","Bebe e Infantil","Otros"
];
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
.budget-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.budget-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:24px}
.budget-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:14px 16px;transition:border-color .15s}
.budget-card.over{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.03)}
.budget-card.warn{border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.02)}
.budget-card.ok{border-color:rgba(0,229,160,.2)}
.bc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.bc-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}
.bc-actions{display:flex;gap:4px}
.bc-act-btn{background:none;border:none;cursor:pointer;color:#2D3748;font-size:12px;padding:2px 4px;border-radius:4px;transition:color .15s}
.bc-act-btn:hover{color:#E8EDF5}
.bc-bar-wrap{width:100%;height:8px;background:#1E2A3A;border-radius:4px;overflow:hidden;margin-bottom:8px}
.bc-bar{height:100%;border-radius:4px;transition:width .5s ease}
.bc-bar.ok{background:linear-gradient(90deg,#00E5A0,#00B8FF)}
.bc-bar.warn{background:linear-gradient(90deg,#FCD34D,#F59E0B)}
.bc-bar.over{background:linear-gradient(90deg,#F87171,#EF4444)}
.bc-nums{display:flex;justify-content:space-between;font-family:'Space Mono',monospace;font-size:11px}
.bc-gastado{font-weight:700}
.bc-gastado.ok{color:#00E5A0}
.bc-gastado.warn{color:#FCD34D}
.bc-gastado.over{color:#F87171}
.bc-presup{color:#4A5568}
.bc-pct{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:3px;text-align:right}
.add-form{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px;margin-bottom:24px}
.add-form-title{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
.form-row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}
.form-group{display:flex;flex-direction:column;gap:5px;flex:1;min-width:140px}
.form-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1px}
.form-select,.form-input{background:#0D1220;border:1px solid #1E2A3A;border-radius:6px;padding:9px 10px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;transition:border-color .15s;width:100%}
.form-select:focus,.form-input:focus{border-color:rgba(0,229,160,.4)}
.btn-add{background:#00E5A0;color:#0A0E1A;border:none;border-radius:8px;padding:9px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-add:hover{background:#00FFB2;transform:translateY(-1px)}
.budget-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:22px}
.bs-card{background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:13px 15px}
.bs-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}
.bs-val{font-size:18px;font-weight:800}
.empty-budget{text-align:center;padding:40px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
@media(max-width:680px){.budget-summary{grid-template-columns:1fr 1fr}.budget-grid{grid-template-columns:1fr}}
`;

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [gastado, setGastado] = useState({});
  const [newCat, setNewCat] = useState("");
  const [newImporte, setNewImporte] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");

  const load = async () => {
    const [b, g] = await Promise.all([
      fetch(`${API}/budgets`).then(r=>r.json()),
      fetch(`${API}/budgets/gastado`).then(r=>r.json())
    ]);
    setBudgets(Array.isArray(b) ? b : []);
    const gmap = {};
    (Array.isArray(g) ? g : []).forEach(x => { gmap[x.categoria] = x.gastado; });
    setGastado(gmap);
  };

  useEffect(() => { load(); }, []);

  const addBudget = async () => {
    if (!newCat || !newImporte) return;
    await fetch(`${API}/budgets`, { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ categoria:newCat, importe:parseFloat(newImporte) }) });
    setNewCat(""); setNewImporte("");
    load();
  };

  const deleteBudget = async (cat) => {
    await fetch(`${API}/budgets/${encodeURIComponent(cat)}`, { method:"DELETE" });
    load();
  };

  const saveEdit = async (cat) => {
    await fetch(`${API}/budgets`, { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ categoria:cat, importe:parseFloat(editVal) }) });
    setEditing(null);
    load();
  };

  const catsConPresupuesto = budgets.map(b => b.categoria);
  const catsSinPresupuesto = TODAS_CATS.filter(c => !catsConPresupuesto.includes(c));

  const totalPresupuestado = budgets.reduce((s,b)=>s+b.importe,0);
  const totalGastado = budgets.reduce((s,b)=>s+(gastado[b.categoria]||0),0);
  const totalRestante = totalPresupuestado - totalGastado;

  const getStatus = (importe, gast) => {
    const pct = gast / importe;
    if (pct >= 1) return "over";
    if (pct >= 0.8) return "warn";
    return "ok";
  };

  return (
    <div className="budget-wrap">
      <style>{css}</style>

      {budgets.length > 0 && (
        <>
          <div className="sec-label">Resumen del mes</div>
          <div className="budget-summary">
            <div className="bs-card">
              <div className="bs-lbl">Presupuestado</div>
              <div className="bs-val">{fmt(totalPresupuestado)}</div>
            </div>
            <div className="bs-card">
              <div className="bs-lbl">Gastado</div>
              <div className="bs-val" style={{color:totalGastado>totalPresupuestado?"#F87171":"#00E5A0"}}>{fmt(totalGastado)}</div>
            </div>
            <div className="bs-card">
              <div className="bs-lbl">Restante</div>
              <div className="bs-val" style={{color:totalRestante<0?"#F87171":"#E8EDF5"}}>{fmt(Math.abs(totalRestante))}{totalRestante<0?" (excedido)":""}</div>
            </div>
          </div>
        </>
      )}

      <div className="add-form">
        <div className="add-form-title">Añadir / actualizar presupuesto</div>
        <div className="form-row">
          <div className="form-group">
            <span className="form-lbl">Categoría</span>
            <select className="form-select" value={newCat} onChange={e=>setNewCat(e.target.value)}>
              <option value="">Seleccionar…</option>
              {TODAS_CATS.map(c=><option key={c} value={c}>{CAT_ICONS[c]||"📦"} {c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{maxWidth:160}}>
            <span className="form-lbl">Importe mensual (€)</span>
            <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
              value={newImporte} onChange={e=>setNewImporte(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addBudget()} />
          </div>
          <button className="btn-add" onClick={addBudget}>Guardar</button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-budget">
          <div style={{fontSize:36,marginBottom:12}}>💶</div>
          Sin presupuestos configurados.<br/>Añade un límite por categoría para llevar el control.
        </div>
      ) : (
        <>
          <div className="sec-label">Progreso mensual por categoría</div>
          <div className="budget-grid">
            {budgets.map(b => {
              const gast = gastado[b.categoria] || 0;
              const pct = Math.min((gast / b.importe) * 100, 100);
              const status = getStatus(b.importe, gast);
              return (
                <div key={b.categoria} className={`budget-card ${status}`}>
                  <div className="bc-head">
                    <div className="bc-title">
                      <span>{CAT_ICONS[b.categoria]||"📦"}</span>
                      <span>{b.categoria}</span>
                    </div>
                    <div className="bc-actions">
                      {editing === b.categoria ? (
                        <>
                          <input style={{width:70,background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:4,padding:"2px 6px",color:"#E8EDF5",fontSize:12,fontFamily:"monospace"}}
                            type="number" value={editVal} onChange={e=>setEditVal(e.target.value)}
                            onKeyDown={e=>{if(e.key==="Enter")saveEdit(b.categoria);if(e.key==="Escape")setEditing(null);}} autoFocus />
                          <button className="bc-act-btn" onClick={()=>saveEdit(b.categoria)} title="Guardar">✓</button>
                          <button className="bc-act-btn" onClick={()=>setEditing(null)} title="Cancelar">✕</button>
                        </>
                      ) : (
                        <>
                          <button className="bc-act-btn" onClick={()=>{setEditing(b.categoria);setEditVal(String(b.importe));}} title="Editar">✏️</button>
                          <button className="bc-act-btn" onClick={()=>deleteBudget(b.categoria)} title="Eliminar" style={{color:"#4A5568"}}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bc-bar-wrap">
                    <div className={`bc-bar ${status}`} style={{width:`${pct}%`}} />
                  </div>
                  <div className="bc-nums">
                    <span className={`bc-gastado ${status}`}>{fmt(gast)}</span>
                    <span className="bc-presup">de {fmt(b.importe)}</span>
                  </div>
                  <div className="bc-pct">
                    {pct.toFixed(0)}% usado
                    {status==="over" && <span style={{color:"#F87171"}}> · Excedido {fmt(gast-b.importe)}</span>}
                    {status==="warn" && <span style={{color:"#FCD34D"}}> · Queda {fmt(b.importe-gast)}</span>}
                    {status==="ok" && <span style={{color:"#4A5568"}}> · Queda {fmt(b.importe-gast)}</span>}
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
