import { useState, useEffect, useMemo } from "react";

const API = (typeof import.meta !== "undefined" && import.meta.env?.PROD) ? "/api" : "http://localhost:3001/api";
const fmt = v => {
  if (v == null || v === "") return "—";
  const n = parseFloat(String(v).replace(/[^\d.,]/g,"").replace(",","."));
  return isNaN(n) ? String(v) : n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2});
};

const css = `
.cmp-wrap{animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.cmp-tabs{display:flex;gap:4px;background:#080C14;border:1px solid #1E2A3A;border-radius:10px;padding:4px;margin-bottom:22px}
.cmp-tab{flex:1;padding:8px 12px;border-radius:7px;border:none;background:transparent;color:#4A5568;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s}
.cmp-tab.active{background:#0A0E1A;color:#00E5A0;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.search-wrap{position:relative;margin-bottom:16px}
.search-wrap-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4A5568;font-size:13px;pointer-events:none}
.search-inp{width:100%;background:#111827;border:1px solid #1E2A3A;border-radius:7px;padding:9px 10px 9px 32px;color:#E8EDF5;font-size:13px;outline:none;transition:border-color .15s}
.search-inp:focus{border-color:rgba(0,229,160,.4)}
.search-inp::placeholder{color:#2D3748}
.price-cmp-row{border-bottom:1px solid rgba(30,42,58,.5);padding:12px 0}
.price-cmp-row:last-child{border-bottom:none}
.pcr-name{font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.pcr-dif{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(251,191,36,.1);color:#FCD34D;border:1px solid rgba(251,191,36,.2)}
.pcr-stores{display:flex;gap:8px;flex-wrap:wrap}
.store-price-card{background:#111827;border:1px solid #1E2A3A;border-radius:8px;padding:10px 12px;min-width:120px;flex:1;transition:border-color .15s}
.store-price-card.cheapest{border-color:rgba(0,229,160,.4);background:rgba(0,229,160,.04)}
.store-price-card.priciest{border-color:rgba(239,68,68,.2)}
.spc-tienda{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spc-price{font-family:'Space Mono',monospace;font-weight:700;font-size:15px}
.spc-price.cheapest{color:#00E5A0}
.spc-price.priciest{color:#F87171}
.spc-meta{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;margin-top:3px}
.ahorro-badge{font-family:'Space Mono',monospace;font-size:10px;color:#34D399;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);padding:1px 7px;border-radius:20px}
.tk-select-wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
.tk-select-box{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden;max-height:260px;overflow-y:auto}
.tk-select-box::-webkit-scrollbar{width:4px}
.tk-select-box::-webkit-scrollbar-thumb{background:#1E2A3A;border-radius:2px}
.tk-select-header{padding:10px 14px;background:#0D1220;font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #1E2A3A;position:sticky;top:0}
.tk-select-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(30,42,58,.5);transition:background .15s}
.tk-select-item:last-child{border-bottom:none}
.tk-select-item:hover{background:rgba(0,229,160,.04)}
.tk-select-item.sel{background:rgba(0,229,160,.08);border-left:3px solid #00E5A0}
.tk-store{font-size:13px;font-weight:700}
.tk-date{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:2px}
.tk-total{font-family:'Space Mono',monospace;font-weight:700;font-size:12px;color:#00E5A0}
.diff-table{width:100%;border-collapse:collapse;background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden;margin-bottom:22px}
.diff-table th{background:#0D1220;font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid #1E2A3A}
.diff-table td{padding:10px 14px;font-size:12px;border-bottom:1px solid rgba(30,42,58,.5)}
.diff-table tr:last-child td{border-bottom:none}
.diff-up{color:#F87171;font-family:'Space Mono',monospace;font-size:11px;font-weight:700}
.diff-dn{color:#34D399;font-family:'Space Mono',monospace;font-size:11px;font-weight:700}
.diff-eq{color:#4A5568;font-family:'Space Mono',monospace;font-size:11px}
.empty-cmp{text-align:center;padding:50px 20px;color:#2D3748;font-family:'Space Mono',monospace;font-size:12px;line-height:2}
.spin-sm{width:12px;height:12px;border:2px solid rgba(0,229,160,.3);border-top-color:#00E5A0;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.tog-row{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.tog-lbl{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568}
.tog-btn{padding:5px 12px;border-radius:6px;border:1px solid #1E2A3A;background:#111827;color:#4A5568;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;transition:all .15s}
.tog-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
@media(max-width:680px){.tk-select-wrap{grid-template-columns:1fr}}
`;

// ── Comparador de precios entre tiendas ───────────────────────────────────────
function ComparadorTiendas() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("dif"); // dif | ahorro | alfa

  useEffect(() => {
    fetch(`${API}/stats/comparar-tiendas`).then(r=>r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = search.trim() ? data.filter(p=>p.nombre?.toLowerCase().includes(search.toLowerCase())) : data;
    return [...list].sort((a,b) => {
      if (sort==="dif") return b.diferencia_pct - a.diferencia_pct;
      if (sort==="ahorro") return b.ahorro_max - a.ahorro_max;
      if (sort==="alfa") return a.nombre.localeCompare(b.nombre);
      return 0;
    });
  }, [data, search, sort]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}><span className="spin-sm" style={{marginRight:8}}/>Cargando comparativa…</div>;

  if (!data.length) return (
    <div className="empty-cmp">
      <div style={{fontSize:40,marginBottom:12}}>🏪</div>
      Sin datos suficientes.<br/>Necesitas el mismo producto en al menos 2 tiendas distintas.
    </div>
  );

  const totalAhorroPotencial = filtered.reduce((s,p)=>s+p.ahorro_max,0);

  return (
    <div>
      <div style={{background:"rgba(0,229,160,.04)",border:"1px solid rgba(0,229,160,.15)",borderRadius:10,padding:"12px 16px",marginBottom:18}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#00E5A0",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Ahorro potencial total</div>
        <div style={{fontSize:22,fontWeight:800,color:"#00E5A0"}}>{fmt(totalAhorroPotencial)}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>comprando siempre en la tienda más barata</div>
      </div>

      <div className="search-wrap">
        <span className="search-wrap-icon">🔍</span>
        <input className="search-inp" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="tog-row">
        <span className="tog-lbl">Ordenar:</span>
        {[["dif","Mayor diferencia %"],["ahorro","Mayor ahorro €"],["alfa","Alfabético"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${sort===v?"active":""}`} onClick={()=>setSort(v)}>{l}</button>
        ))}
      </div>

      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"4px 16px"}}>
        {filtered.map(p => {
          const prices = p.tiendas.map(t=>t.precio_medio);
          const minP = Math.min(...prices), maxP = Math.max(...prices);
          return (
            <div key={p.nombre} className="price-cmp-row">
              <div className="pcr-name">
                {p.nombre}
                <span className="pcr-dif">+{p.diferencia_pct}%</span>
                <span className="ahorro-badge">ahorra {fmt(p.ahorro_max)}/ud</span>
              </div>
              <div className="pcr-stores">
                {[...p.tiendas].sort((a,b)=>a.precio_medio-b.precio_medio).map(t => {
                  const isCheapest = t.precio_medio === minP;
                  const isPriciest = t.precio_medio === maxP && p.tiendas.length > 1;
                  return (
                    <div key={t.tienda} className={`store-price-card ${isCheapest?"cheapest":isPriciest?"priciest":""}`}>
                      <div className="spc-tienda">{isCheapest?"🏆 ":""}{t.tienda}</div>
                      <div className={`spc-price ${isCheapest?"cheapest":isPriciest?"priciest":""}`}>{fmt(t.precio_medio)}</div>
                      <div className="spc-meta">{t.veces}× registrado · min {fmt(t.precio_min)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Comparar dos tickets ──────────────────────────────────────────────────────
function ComparadorTickets({ historial }) {
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const [detA, setDetA] = useState(null);
  const [detB, setDetB] = useState(null);

  const loadTicket = async (id, setter) => {
    const r = await fetch(`${API}/tickets/${id}`);
    setter(await r.json());
  };

  const selectA = (t) => { setSelA(t); setDetA(null); loadTicket(t.id, setDetA); };
  const selectB = (t) => { setSelB(t); setDetB(null); loadTicket(t.id, setDetB); };

  const diff = useMemo(() => {
    if (!detA || !detB) return [];
    const mapA = {}, mapB = {};
    (detA.productos||[]).forEach(p => { if(p.nombre) mapA[p.nombre.toLowerCase().trim()] = p; });
    (detB.productos||[]).forEach(p => { if(p.nombre) mapB[p.nombre.toLowerCase().trim()] = p; });
    const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    return [...keys].map(k => {
      const a = mapA[k], b = mapB[k];
      const pA = a?.precio_unitario || a?.precio_total, pB = b?.precio_unitario || b?.precio_total;
      const dif = pA && pB ? Math.round(((pB-pA)/pA)*1000)/10 : null;
      return { nombre: a?.nombre || b?.nombre, pA, pB, dif, soloA: !b, soloB: !a };
    }).sort((a,b) => {
      if (a.soloA || a.soloB) return 1;
      return Math.abs(b.dif||0) - Math.abs(a.dif||0);
    });
  }, [detA, detB]);

  return (
    <div>
      <div className="tk-select-wrap">
        {[{lbl:"Ticket A",sel:selA,onSel:selectA},{lbl:"Ticket B",sel:selB,onSel:selectB}].map(({lbl,sel,onSel})=>(
          <div key={lbl} className="tk-select-box">
            <div className="tk-select-header">{lbl} — {sel?`#${sel.id} ${sel.tienda||""}`:""}</div>
            {historial.map(t=>(
              <div key={t.id} className={`tk-select-item ${sel?.id===t.id?"sel":""}`} onClick={()=>onSel(t)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div className="tk-store">{t.tienda||"Ticket #"+t.id}</div>
                    <div className="tk-date">{t.fecha_compra||t.fecha_escaneo?.slice(0,10)}</div>
                  </div>
                  <div className="tk-total">{t.total!=null?fmt(t.total):""}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selA && selB && (
        <>
          {(!detA || !detB) ? (
            <div style={{textAlign:"center",padding:20,color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}>
              <span className="spin-sm" style={{marginRight:8}}/>Cargando…
            </div>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,marginBottom:18,alignItems:"center"}}>
                <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:10,padding:"12px 16px"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",marginBottom:4}}>{detA.tienda||"Ticket A"} · {detA.fecha_compra}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#E8EDF5"}}>{fmt(detA.total)}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>{detA.productos?.length||0} productos</div>
                </div>
                <div style={{textAlign:"center",color:"#4A5568",fontFamily:"'Space Mono',monospace",fontSize:12}}>VS</div>
                <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:10,padding:"12px 16px"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",marginBottom:4}}>{detB.tienda||"Ticket B"} · {detB.fecha_compra}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#E8EDF5"}}>{fmt(detB.total)}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:2}}>{detB.productos?.length||0} productos</div>
                </div>
              </div>

              <div className="sec-label">Diferencias de precio</div>
              <table className="diff-table">
                <thead><tr><th>Producto</th><th>Ticket A</th><th>Ticket B</th><th>Diferencia</th></tr></thead>
                <tbody>
                  {diff.map((row,i)=>(
                    <tr key={i} style={row.soloA||row.soloB?{opacity:.5}:{}}>
                      <td style={{fontWeight:600,fontSize:13}}>{row.nombre}</td>
                      <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:row.soloB?"#2D3748":"#E8EDF5"}}>
                        {row.pA ? fmt(row.pA) : <span style={{color:"#2D3748"}}>—</span>}
                      </td>
                      <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:row.soloA?"#2D3748":"#E8EDF5"}}>
                        {row.pB ? fmt(row.pB) : <span style={{color:"#2D3748"}}>—</span>}
                      </td>
                      <td>
                        {row.dif !== null ? (
                          <span className={row.dif > 0.5 ? "diff-up" : row.dif < -0.5 ? "diff-dn" : "diff-eq"}>
                            {row.dif > 0.5 ? `+${row.dif}%` : row.dif < -0.5 ? `${row.dif}%` : "Igual"}
                          </span>
                        ) : (
                          <span className="diff-eq">{row.soloA?"Solo en A":"Solo en B"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {!selA && !selB && (
        <div className="empty-cmp">
          <div style={{fontSize:40,marginBottom:12}}>↔️</div>
          Selecciona dos tickets para comparar producto a producto.
        </div>
      )}
    </div>
  );
}

export default function Compare({ historial }) {
  const [tab, setTab] = useState("tiendas");
  return (
    <div className="cmp-wrap">
      <style>{css}</style>
      <div className="cmp-tabs">
        <button className={`cmp-tab ${tab==="tiendas"?"active":""}`} onClick={()=>setTab("tiendas")}>🏪 Precios por tienda</button>
        <button className={`cmp-tab ${tab==="tickets"?"active":""}`} onClick={()=>setTab("tickets")}>↔️ Comparar tickets</button>
      </div>
      {tab==="tiendas" && <ComparadorTiendas/>}
      {tab==="tickets" && <ComparadorTickets historial={historial}/>}
    </div>
  );
}
