import { useState, useEffect } from "react";

const LOCAL_IP = "localhost";
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);
const fmt = v => {
  if (v==null||v==="") return "—";
  const n=parseFloat(String(v).replace(/[^\d.,]/g,"").replace(",","."));
  return isNaN(n)?String(v):n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2});
};

const css = `
.trash-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.trash-info{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#FCA5A5;font-family:'Space Mono',monospace;line-height:1.6}
.trash-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(30,42,58,.5);transition:background .15s}
.trash-item:hover{background:rgba(0,229,160,.02)}
.trash-item:last-child{border-bottom:none}
.trash-store{font-size:13px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trash-meta{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:2px}
.trash-total{font-family:'Space Mono',monospace;font-weight:700;font-size:12px;color:#4A5568;flex-shrink:0}
.trash-del-info{font-family:'Space Mono',monospace;font-size:9px;color:#EF4444;flex-shrink:0}
.trash-btn{background:none;border:none;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px;transition:all .15s;flex-shrink:0;font-family:'Space Mono',monospace}
.trash-restore{color:#00E5A0;border:1px solid rgba(0,229,160,.3);}
.trash-restore:hover{background:rgba(0,229,160,.1)}
.trash-perm{color:#EF4444;border:1px solid rgba(239,68,68,.2);}
.trash-perm:hover{background:rgba(239,68,68,.1)}
.trash-empty{text-align:center;padding:50px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
.trash-list{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden}
`;

export default function Trash({ onRestored }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API}/trash`).then(r=>r.json())
      .then(d=>setItems(Array.isArray(d)?d:[]))
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const restore = async (id) => {
    await fetch(`${API}/trash/${id}/restore`, { method:"POST" });
    load(); onRestored?.();
  };

  const permDelete = async (id) => {
    if (!confirm("¿Eliminar permanentemente? Esta acción no se puede deshacer.")) return;
    await fetch(`${API}/trash/${id}/permanent`, { method:"DELETE" });
    load();
  };

  const emptyAll = async () => {
    if (!confirm(`¿Vaciar la papelera? Se eliminarán ${items.length} tickets permanentemente.`)) return;
    for (const t of items) await fetch(`${API}/trash/${t.id}/permanent`, { method:"DELETE" });
    load();
  };

  const daysUntilDelete = (deleted_at) => {
    if (!deleted_at) return 30;
    const d = new Date(deleted_at);
    const expire = new Date(d.getTime() + 30*86400000);
    const remaining = Math.ceil((expire - Date.now())/86400000);
    return Math.max(remaining, 0);
  };

  return (
    <div className="trash-wrap">
      <style>{css}</style>

      <div className="trash-info">
        Los tickets eliminados se conservan 30 días antes de borrarse definitivamente.<br/>
        Puedes restaurarlos o eliminarlos permanentemente antes de que expiren.
      </div>

      {items.length > 0 && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568"}}>
            {items.length} ticket{items.length!==1?"s":""} en la papelera
          </div>
          <button onClick={emptyAll} style={{background:"none",border:"1px solid rgba(239,68,68,.3)",color:"#F87171",borderRadius:6,padding:"5px 12px",fontFamily:"'Space Mono',monospace",fontSize:11,cursor:"pointer"}}>
            Vaciar papelera
          </button>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:"center",padding:30,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className="trash-empty">
          <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
          La papelera está vacía.
        </div>
      ) : (
        <div className="trash-list">
          {items.map(t => {
            const days = daysUntilDelete(t.deleted_at);
            return (
              <div key={t.id} className="trash-item">
                <div style={{flex:1,minWidth:0}}>
                  <div className="trash-store">{t.tienda||"Ticket #"+t.id}</div>
                  <div className="trash-meta">
                    {t.fecha_compra||t.fecha_escaneo?.slice(0,10)}
                    {days <= 7 && <span style={{color:"#F87171",marginLeft:8}}>⚠️ Expira en {days}d</span>}
                    {days > 7 && <span style={{color:"#4A5568",marginLeft:8}}>Expira en {days}d</span>}
                  </div>
                </div>
                <div className="trash-total">{fmt(t.total)}</div>
                <button className="trash-btn trash-restore" onClick={()=>restore(t.id)}>↩ Restaurar</button>
                <button className="trash-btn trash-perm" onClick={()=>permDelete(t.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
