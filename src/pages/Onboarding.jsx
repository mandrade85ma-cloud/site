// src/pages/Onboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { colors } from "../ui/ui";

const POSITIONS = [
  { id:"goalkeeper", icon:"🥅", label:"GR",      desc:"Guarda-redes" },
  { id:"defender",   icon:"🛡️", label:"Defesa",  desc:"Protege a equipa" },
  { id:"midfielder", icon:"⚙️", label:"Médio",   desc:"Liga defesa e ataque" },
  { id:"forward",    icon:"⚡", label:"Avançado", desc:"Marca golos" },
];

export default function Onboarding({ ctx }) {
  const nav = useNavigate();
  const [name,     setName]     = useState(ctx.profile?.name || "");
  const [position, setPosition] = useState(ctx.profile?.position || "");
  const [step,     setStep]     = useState(1);
  const [msg,      setMsg]      = useState("");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!ctx.session) nav("/login", { replace:true });
    if (ctx.profile?.name) setName(ctx.profile.name);
  }, [ctx.session, ctx.profile?.id]);

  async function save() {
    setMsg("");
    if (!ctx.session?.user?.id) { nav("/login", { replace:true }); return; }
    const n = (name || "").trim();
    if (n.length < 2) return setMsg("Indica o teu nome (mínimo 2 letras).");
    setSaving(true);
    const { data, error } = await supabase.rpc("upsert_my_name", { p_name: n });
    if (!error && position) {
      await supabase.from("profiles").update({ position }).eq("id", ctx.session.user.id);
    }
    setSaving(false);
    if (error) {
      if (String(error.message).includes("NO_AUTH")) return setMsg("Sessão inválida. Faz logout/login.");
      if (String(error.message).includes("INVALID_NAME")) return setMsg("Nome inválido.");
      return setMsg("Erro: " + error.message);
    }
    if (data) ctx.setProfile({ ...data, position });
    nav("/dashboard", { replace:true });
  }

  return (
    <div style={{ minHeight:"100vh", background:colors.dark, display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 80% 0%,#1a7a3c55 0%,transparent 60%)", pointerEvents:"none" }} />

      {/* Header */}
      <div style={{ padding:"20px 20px 0", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:32, height:32, background:"#22a050", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:"#fff" }}>J</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#fff", letterSpacing:"0.04em" }}>JOGA</span>
        </div>

        {/* Progress dots */}
        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {[1,2].map(s => (
            <div key={s} style={{ height:8, borderRadius:4, background: s<=step ? "#22a050" : "rgba(255,255,255,0.2)", transition:"all .3s", width: s===step ? 20 : 8 }} />
          ))}
        </div>

        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
          Passo {step} de 2
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#fff", marginBottom:6 }}>
          {step===1 ? "Como te chamas?" : "Qual é a tua posição?"}
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>
          {step===1 ? "É o nome que os outros jogadores vão ver." : "Usamos para equilibrar as equipas."}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:"24px 20px", position:"relative" }}>

        {step === 1 && (
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key==="Enter" && name.trim().length>=2 && setStep(2)}
              placeholder="Ex: Miguel Andrade"
              style={{ width:"100%", height:48, borderRadius:10, border:"1.5px solid rgba(255,255,255,0.2)", padding:"0 16px", outline:"none", fontSize:15, color:"#fff", background:"rgba(255,255,255,0.1)", fontFamily:"inherit", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor="#22a050"}
              onBlur={e  => e.target.style.borderColor="rgba(255,255,255,0.2)"} />
            {msg && <div style={{ marginTop:12, color:"#fca5a5", fontSize:13 }}>{msg}</div>}
            <button onClick={() => { if(name.trim().length<2) return setMsg("Indica o teu nome (mínimo 2 letras)."); setMsg(""); setStep(2); }}
              style={{ width:"100%", height:46, marginTop:20, borderRadius:10, border:"none", background:"#22a050", color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {POSITIONS.map(pos => (
                <div key={pos.id} onClick={() => setPosition(pos.id)}
                  style={{ padding:16, borderRadius:14, border: position===pos.id ? "2px solid #22a050" : "1.5px solid rgba(255,255,255,0.15)", background: position===pos.id ? "rgba(34,160,80,0.2)" : "rgba(255,255,255,0.06)", cursor:"pointer", textAlign:"center", transition:"all .15s" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{pos.icon}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>{pos.label}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:3 }}>{pos.desc}</div>
                </div>
              ))}
            </div>
            {msg && <div style={{ marginBottom:12, color:"#fca5a5", fontSize:13 }}>{msg}</div>}
            <button onClick={save} disabled={saving}
              style={{ width:"100%", height:46, borderRadius:10, border:"none", background:"#22a050", color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, marginBottom:10 }}>
              {saving ? "A guardar..." : "Entrar na JOGA →"}
            </button>
            <button onClick={() => setStep(1)}
              style={{ width:"100%", height:46, borderRadius:10, border:"1.5px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.6)", fontSize:13, cursor:"pointer" }}>
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
