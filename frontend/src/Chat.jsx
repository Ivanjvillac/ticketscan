import { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://localhost:3001/api`);

const SUGGESTIONS = [
  "¿Cuánto gasté este mes?",
  "¿En qué tienda gasto más?",
  "¿Qué categoría me cuesta más?",
  "¿Cuánto gasto de media por ticket?",
  "¿Cuál fue mi mes más caro?",
  "Dame un resumen de mis hábitos de compra",
  "¿En qué categoría podría ahorrar más?",
];

const css = `
.chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 160px);min-height:400px;max-height:700px;animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.chat-messages{flex:1;overflow-y:auto;padding:16px 0;display:flex;flex-direction:column;gap:12px}
.chat-messages::-webkit-scrollbar{width:4px}
.chat-messages::-webkit-scrollbar-thumb{background:#1E2A3A;border-radius:2px}
.chat-bubble{max-width:85%;padding:12px 16px;border-radius:16px;font-size:13px;line-height:1.6;animation:fadeUp .2s ease}
.chat-bubble.user{align-self:flex-end;background:#00E5A0;color:#0A0E1A;border-radius:16px 16px 4px 16px;font-weight:600}
.chat-bubble.assistant{align-self:flex-start;background:#111827;border:1px solid #1E2A3A;color:#E8EDF5;border-radius:16px 16px 16px 4px}
.chat-bubble.loading{background:#111827;border:1px solid #1E2A3A;padding:14px 20px}
.chat-input-row{display:flex;gap:8px;padding:12px 0 0;border-top:1px solid #1E2A3A;flex-shrink:0}
.chat-inp{flex:1;background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:11px 16px;color:#E8EDF5;font-size:13px;font-family:'Syne',sans-serif;outline:none;resize:none;min-height:44px;max-height:120px;transition:border-color .15s;line-height:1.4}
.chat-inp:focus{border-color:rgba(0,229,160,.4)}
.chat-inp::placeholder{color:#2D3748}
.chat-send{background:#00E5A0;border:none;border-radius:12px;width:44px;height:44px;cursor:pointer;font-size:18px;color:#0A0E1A;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s}
.chat-send:hover:not(:disabled){background:#00FFB2;transform:translateY(-1px)}
.chat-send:disabled{opacity:.4;cursor:not-allowed}
.chat-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:10px 0;flex-shrink:0}
.chat-sug{background:#111827;border:1px solid #1E2A3A;border-radius:20px;padding:5px 12px;font-size:11px;font-family:'Space Mono',monospace;color:#4A5568;cursor:pointer;transition:all .15s;white-space:nowrap}
.chat-sug:hover{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.chat-dot{width:6px;height:6px;border-radius:50%;background:#00E5A0;animation:bounce .8s ease infinite}
.chat-dot:nth-child(2){animation-delay:.15s}
.chat-dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:scale(.6)}40%{transform:scale(1)}}
@media(max-width:680px){.chat-wrap{height:calc(100dvh - 200px)}}
`;

export default function Chat() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"¡Hola! 👋 Soy tu asistente financiero. Pregúntame sobre tus hábitos de compra, tiendas, categorías, tendencias de gasto o cualquier dato de tus tickets. Tengo acceso a todos tus datos." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg = { role:"user", content:msg };
    const history = messages.filter(m=>m.role!=="assistant"||messages.indexOf(m)>0);
    setMessages(prev => [...prev, userMsg, { role:"loading" }]);
    setLoading(true);
    try {
      const r = await fetch(`${API}/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message:msg, history:history.slice(-8) })
      });
      const data = await r.json();
      setMessages(prev => [...prev.filter(m=>m.role!=="loading"), { role:"assistant", content: data.reply || data.error || "Error" }]);
    } catch(e) {
      setMessages(prev => [...prev.filter(m=>m.role!=="loading"), { role:"assistant", content:"⚠️ Error de conexión. Verifica que el backend está activo." }]);
    } finally { setLoading(false); }
  };

  const handleKey = e => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="chat-wrap">
      <style>{css}</style>

      <div className="chat-messages">
        {messages.map((m, i) => (
          m.role==="loading" ? (
            <div key={i} className="chat-bubble loading">
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <div className="chat-dot"/>
                <div className="chat-dot"/>
                <div className="chat-dot"/>
              </div>
            </div>
          ) : (
            <div key={i} className={`chat-bubble ${m.role}`}
              style={{whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          )
        ))}
        <div ref={messagesEndRef}/>
      </div>

      {messages.length <= 2 && (
        <div className="chat-suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="chat-sug" onClick={()=>send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-inp"
          placeholder="Pregunta sobre tus gastos…"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          autoFocus
        />
        <button className="chat-send" onClick={()=>send()} disabled={!input.trim()||loading}>
          {loading ? <span style={{width:18,height:18,border:"2px solid rgba(10,14,26,.4)",borderTop:"2px solid #0A0E1A",borderRadius:"50%",animation:"spin .7s linear infinite",display:"block"}}/> : "↑"}
        </button>
      </div>

      <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#2D3748",textAlign:"center",padding:"6px 0 0"}}>
        Powered by Groq · Llama 4 Scout · Datos en tiempo real
      </div>
    </div>
  );
}
