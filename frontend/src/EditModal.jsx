import { useState, useEffect } from "react";

const LOCAL_IP = "localhost";
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);
const CATS = [
  "Frutas","Verduras","Pescado y Marisco","Carnes","Charcuteria","Lacteos y Huevos",
  "Bebidas","Pan y Bolleria","Pasta Arroz Legumbre","Conservas","Congelados",
  "Snacks y Dulces","Aceites y Condimentos","Limpieza Hogar","Higiene Personal",
  "Mascotas","Bebe e Infantil","Otros"
];

const css = `
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;backdrop-filter:blur(4px)}
.modal-box{background:#0D1220;border:1px solid #1E2A3A;border-radius:16px;width:100%;max-width:700px;margin:auto;padding:24px;animation:slideUp .25s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-title{font-size:16px;font-weight:800}
.modal-close{background:none;border:none;color:#4A5568;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:color .15s}
.modal-close:hover{color:#E8EDF5}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.form-group{display:flex;flex-direction:column;gap:5px}
.form-group.full{grid-column:1/-1}
.form-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1px}
.form-inp{background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:9px 10px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;transition:border-color .15s;width:100%}
.form-inp:focus{border-color:rgba(0,229,160,.4)}
.form-select{background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:9px 10px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;width:100%}
.prod-table{width:100%;border-collapse:collapse;background:#111827;border-radius:10px;overflow:hidden;border:1px solid #1E2A3A;margin-bottom:16px}
.prod-table th{background:#0D1220;font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;padding:9px 10px;text-align:left;border-bottom:1px solid #1E2A3A}
.prod-table td{padding:8px 10px;border-bottom:1px solid rgba(30,42,58,.5);font-size:12px;vertical-align:middle}
.prod-table tr:last-child td{border-bottom:none}
.prod-inp{background:transparent;border:none;color:#E8EDF5;font-size:12px;font-family:'Syne',sans-serif;outline:none;width:100%;padding:2px 4px;border-radius:4px;transition:background .15s}
.prod-inp:focus{background:#0D1220}
.prod-cat-sel{background:transparent;border:none;color:#6B7280;font-size:11px;font-family:'Space Mono',monospace;outline:none;width:100%}
.prod-cat-sel:focus{background:#0D1220}
.del-prod-btn{background:none;border:none;cursor:pointer;color:#2D3748;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s}
.del-prod-btn:hover{color:#EF4444}
.add-prod-row{display:flex;gap:8px;margin-bottom:16px}
.add-prod-inp{flex:1;background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:8px 10px;color:#E8EDF5;font-size:12px;font-family:'Syne',sans-serif;outline:none;transition:border-color .15s}
.add-prod-inp:focus{border-color:rgba(0,229,160,.4)}
.add-prod-inp::placeholder{color:#2D3748}
.btn-save{background:#00E5A0;color:#0A0E1A;border:none;border-radius:8px;padding:10px 24px;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s}
.btn-save:hover{background:#00FFB2;transform:translateY(-1px)}
.btn-cancel{background:transparent;color:#6B7280;border:1px solid #1E2A3A;border-radius:8px;padding:10px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s}
.btn-cancel:hover{border-color:#4A5568;color:#E8EDF5}
.dup-badge{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);color:#FCD34D;font-family:'Space Mono',monospace;font-size:9px;padding:1px 6px;border-radius:20px;margin-left:6px}
`;

export default function EditModal({ ticket, onClose, onSaved }) {
  const [meta, setMeta] = useState({
    tienda: ticket.tienda || "",
    fecha_compra: ticket.fecha_compra || "",
    hora: ticket.hora || "",
    ticket_num: ticket.ticket_num || "",
    metodo_pago: ticket.metodo_pago || "",
    subtotal: ticket.subtotal ?? "",
    descuentos: ticket.descuentos ?? "",
    iva: ticket.iva ?? "",
    total: ticket.total ?? "",
    notas: ticket.notas || "",
  });
  const [productos, setProductos] = useState(
    (ticket.productos || []).map(p => ({ ...p, _changed: false, _deleted: false }))
  );
  const [newProd, setNewProd] = useState({ nombre:"", cantidad:"1", precio_unitario:"", precio_total:"" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  // Detect duplicates
  const nameCount = {};
  productos.filter(p=>!p._deleted).forEach(p => {
    const k = p.nombre?.toLowerCase().trim();
    if (k) nameCount[k] = (nameCount[k]||0) + 1;
  });
  const isDup = (nombre) => nameCount[nombre?.toLowerCase().trim()] > 1;

  const updateMeta = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  const updateProd = (idx, field, val) => {
    setProductos(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val, _changed: true } : p));
  };

  const deleteProd = (idx) => {
    setProductos(prev => prev.map((p, i) => i === idx ? { ...p, _deleted: true } : p));
  };

  const addProd = () => {
    if (!newProd.nombre.trim()) return;
    setProductos(prev => [...prev, { ...newProd, _new: true, _changed: false, _deleted: false }]);
    setNewProd({ nombre:"", cantidad:"1", precio_unitario:"", precio_total:"" });
  };

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const r = await fetch(`${API}/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta)
      });
      if (!r.ok) { setSaveError(`Error ${r.status} — ${await r.text()}`); return; }

      // Verify DB actually has the new value
      const verify = await fetch(`${API}/tickets/${ticket.id}`);
      const dbTicket = await verify.json();
      if (dbTicket.fecha_compra !== meta.fecha_compra) {
        setSaveError(`❗ DB no actualizó la fecha. Enviado: "${meta.fecha_compra}" — En DB: "${dbTicket.fecha_compra}". URL usada: ${API}`);
        return;
      }

      for (const p of productos) {
        if (p._deleted && p.id) {
          await fetch(`${API}/productos/${p.id}`, { method: "DELETE" });
        } else if (p._new) {
          await fetch(`${API}/tickets/${ticket.id}/productos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre:p.nombre, cantidad:parseFloat(p.cantidad)||1,
              precio_unitario:parseFloat(p.precio_unitario)||null, precio_total:parseFloat(p.precio_total)||null })
          });
        } else if (p._changed && p.id) {
          await fetch(`${API}/productos/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre:p.nombre, cantidad:parseFloat(p.cantidad)||1,
              precio_unitario:parseFloat(p.precio_unitario)||null, precio_total:parseFloat(p.precio_total)||null,
              categoria:p.categoria })
          });
        }
      }
      await onSaved();
      setSaveOk(true);
      setTimeout(onClose, 1200);
    } catch (e) { setSaveError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{css}</style>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">✏️ Editar Ticket #{ticket.id}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sec-label">Información general</div>
        <div className="form-grid">
          {[["tienda","Tienda"],["fecha_compra","Fecha (DD/MM/YYYY)"],["hora","Hora (HH:MM)"],
            ["ticket_num","Nº Ticket"],["metodo_pago","Método de pago"]].map(([k,l])=>(
            <div key={k} className="form-group">
              <span className="form-lbl">{l}</span>
              <input className="form-inp" value={meta[k]} onChange={e=>updateMeta(k,e.target.value)}/>
            </div>
          ))}
          <div className="form-group">
            <span className="form-lbl">Subtotal (€)</span>
            <input className="form-inp" type="number" step="0.01" value={meta.subtotal} onChange={e=>updateMeta("subtotal",e.target.value)}/>
          </div>
          <div className="form-group">
            <span className="form-lbl">Descuentos (€)</span>
            <input className="form-inp" type="number" step="0.01" value={meta.descuentos} onChange={e=>updateMeta("descuentos",e.target.value)}/>
          </div>
          <div className="form-group">
            <span className="form-lbl">IVA (€)</span>
            <input className="form-inp" type="number" step="0.01" value={meta.iva} onChange={e=>updateMeta("iva",e.target.value)}/>
          </div>
          <div className="form-group">
            <span className="form-lbl">Total (€)</span>
            <input className="form-inp" type="number" step="0.01" value={meta.total} onChange={e=>updateMeta("total",e.target.value)}/>
          </div>
          <div className="form-group full">
            <span className="form-lbl">Notas</span>
            <input className="form-inp" value={meta.notas} onChange={e=>updateMeta("notas",e.target.value)}/>
          </div>
        </div>

        <div className="sec-label">
          Productos
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>
            {productos.filter(p=>!p._deleted).length} artículos
          </span>
        </div>

        <table className="prod-table">
          <thead>
            <tr><th>Producto</th><th>Uds</th><th>P.Unit €</th><th>Total €</th><th>Categoría</th><th></th></tr>
          </thead>
          <tbody>
            {productos.map((p, i) => p._deleted ? null : (
              <tr key={i} style={p._changed||p._new?{background:"rgba(0,229,160,.03)"}:{}}>
                <td>
                  <input className="prod-inp" value={p.nombre||""} onChange={e=>updateProd(i,"nombre",e.target.value)}/>
                  {isDup(p.nombre) && <span className="dup-badge">DUP</span>}
                </td>
                <td style={{width:50}}><input className="prod-inp" type="number" min="0" step="0.001" value={p.cantidad||""} onChange={e=>updateProd(i,"cantidad",e.target.value)}/></td>
                <td style={{width:70}}><input className="prod-inp" type="number" min="0" step="0.001" value={p.precio_unitario||""} onChange={e=>updateProd(i,"precio_unitario",e.target.value)}/></td>
                <td style={{width:70}}><input className="prod-inp" type="number" min="0" step="0.001" value={p.precio_total||""} onChange={e=>updateProd(i,"precio_total",e.target.value)}/></td>
                <td style={{width:120}}>
                  <select className="prod-cat-sel" value={p.categoria||"Otros"} onChange={e=>updateProd(i,"categoria",e.target.value)}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={{width:32}}><button className="del-prod-btn" onClick={()=>deleteProd(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-prod-row">
          <input className="add-prod-inp" placeholder="Nombre producto…" value={newProd.nombre} onChange={e=>setNewProd(p=>({...p,nombre:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addProd()}/>
          <input className="add-prod-inp" style={{maxWidth:60}} type="number" placeholder="Ud." value={newProd.cantidad} onChange={e=>setNewProd(p=>({...p,cantidad:e.target.value}))}/>
          <input className="add-prod-inp" style={{maxWidth:70}} type="number" placeholder="Unit€" value={newProd.precio_unitario} onChange={e=>setNewProd(p=>({...p,precio_unitario:e.target.value}))}/>
          <input className="add-prod-inp" style={{maxWidth:70}} type="number" placeholder="Tot€" value={newProd.precio_total} onChange={e=>setNewProd(p=>({...p,precio_total:e.target.value}))}/>
          <button className="btn-save" style={{padding:"8px 14px",fontSize:12}} onClick={addProd}>+ Añadir</button>
        </div>

        {saveError && <div style={{color:"#F87171",fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:8,padding:"8px 10px",background:"rgba(239,68,68,.08)",borderRadius:6}}>❌ {saveError}</div>}
        {saveOk && <div style={{color:"#34D399",fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:8,padding:"8px 10px",background:"rgba(52,211,153,.08)",borderRadius:6}}>✅ Guardado correctamente</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
