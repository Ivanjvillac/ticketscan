import { useState, useEffect } from "react";

const API = (typeof import.meta !== "undefined" && import.meta.env?.PROD) ? "/api" : "http://localhost:3001/api";
const fmt = v => {
  if (v==null||v==="") return "—";
  const n=parseFloat(String(v).replace(/[^\d.,]/g,"").replace(",","."));
  return isNaN(n)?String(v):n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2});
};

const css = `
.pa-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.pa-add{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px;margin-bottom:20px}
.pa-add-title{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
.pa-row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}
.pa-group{display:flex;flex-direction:column;gap:5px;flex:1;min-width:140px}
.pa-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1px}
.pa-inp{background:#0D1220;border:1px solid #1E2A3A;border-radius:6px;padding:9px 10px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;width:100%;transition:border-color .15s}
.pa-inp:focus{border-color:rgba(0,229,160,.4)}
.pa-inp::placeholder{color:#2D3748}
.pa-btn{background:#00E5A0;color:#0A0E1A;border:none;border-radius:8px;padding:9px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;white-space:nowrap}
.pa-btn:hover{background:#00FFB2;transform:translateY(-1px)}
.pa-list{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden}
.pa-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(30,42,58,.5);transition:background .15s}
.pa-item:last-child{border-bottom:none}
.pa-item:hover{background:rgba(0,229,160,.02)}
.pa-item.inactiva{opacity:.5}
.pa-nombre{font-size:13px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pa-precio{font-family:'Space Mono',monospace;fontWeight:700;font-size:14px;color:#00E5A0;flex-shrink:0}
.pa-meta{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;flex-shrink:0}
.pa-toggle{width:36px;height:20px;background:#1E2A3A;border-radius:10px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background .2s}
.pa-toggle.on{background:#00E5A0}
.pa-toggle::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;background:white;border-radius:50%;transition:left .2s}
.pa-toggle.on::after{left:19px}
.pa-del{background:none;border:none;cursor:pointer;color:#2D3748;font-size:13px;padding:4px;border-radius:4px;transition:color .15s}
.pa-del:hover{color:#EF4444}
.pa-empty{text-align:center;padding:40px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
.pa-info{background:rgba(0,229,160,.04);border:1px solid rgba(0,229,160,.14);border-radius:10px;padding:13px 16px;margin-bottom:16px;font-size:13px;line-height:1.6;color:#E8EDF5}
.pa-info b{color:#00E5A0}
`;

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [newNombre, setNewNombre] = useState("");
  const [newPrecio, setNewPrecio] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => fetch(`${API}/price-alerts`).then(r=>r.json()).then(d=>setAlerts(Array.isArray(d)?d:[])).catch(()=>setAlerts([]));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newNombre.trim()||!newPrecio) return;
    setSaving(true);
    await fetch(`${API}/price-alerts`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nombre:newNombre.trim(), precio_objetivo:parseFloat(newPrecio) })
    });
    setNewNombre(""); setNewPrecio(""); setSaving(false); load();
  };

  const toggle = async (a) => {
    await fetch(`${API}/price-alerts/${a.id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...a, activa: !a.activa })
    }); load();
  };

  const del = async (id) => {
    await fetch(`${API}/price-alerts/${id}`, { method:"DELETE" }); load();
  };

  return (
    <div className="pa-wrap">
      <style>{css}</style>

      <div className="pa-info">
        Las alertas se comprueban automáticamente cada vez que escaneas un ticket.<br/>
        Si se detecta el producto al precio objetivo o por debajo, recibirás un aviso inmediato.<br/>
        <b>Tip:</b> usa nombres cortos y genéricos ("leche entera", "huevos L").
      </div>

      <div className="pa-add">
        <div className="pa-add-title">Nueva alerta de precio</div>
        <div className="pa-row">
          <div className="pa-group">
            <span className="pa-lbl">Producto</span>
            <input className="pa-inp" placeholder="ej. leche entera" value={newNombre}
              onChange={e=>setNewNombre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          </div>
          <div className="pa-group" style={{maxWidth:150}}>
            <span className="pa-lbl">Precio objetivo (€)</span>
            <input className="pa-inp" type="number" min="0" step="0.01" placeholder="0.00"
              value={newPrecio} onChange={e=>setNewPrecio(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          </div>
          <button className="pa-btn" onClick={add} disabled={saving}>
            {saving?"…":"+ Añadir alerta"}
          </button>
        </div>
      </div>

      <div className="sec-label">Alertas activas <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>({alerts.filter(a=>a.activa).length}/{alerts.length})</span></div>

      {alerts.length === 0 ? (
        <div className="pa-empty">
          <div style={{fontSize:36,marginBottom:12}}>🔔</div>
          Sin alertas configuradas.<br/>Añade productos y precios objetivo<br/>para recibir avisos automáticos.
        </div>
      ) : (
        <div className="pa-list">
          {alerts.map(a => (
            <div key={a.id} className={`pa-item ${a.activa?"":" inactiva"}`}>
              <div style={{flex:1,minWidth:0}}>
                <div className="pa-nombre">{a.nombre}</div>
                {a.ultima_alerta && (
                  <div className="pa-meta">Última alerta: {new Date(a.ultima_alerta).toLocaleDateString("es-ES")}</div>
                )}
              </div>
              <div className="pa-precio">≤ {fmt(a.precio_objetivo)}</div>
              <button className={`pa-toggle ${a.activa?"on":""}`} onClick={()=>toggle(a)} title={a.activa?"Desactivar":"Activar"}/>
              <button className="pa-del" onClick={()=>del(a.id)}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
