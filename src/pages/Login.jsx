// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { colors } from "../ui/ui";

export default function Login({ ctx }) {
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/dashboard";

  const [mode,     setMode]     = useState("signin");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [msg,      setMsg]      = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (ctx?.session) nav(returnTo, { replace:true });
  }, [ctx?.session, returnTo, nav]);

  async function signIn() {
    setMsg("");
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) return setMsg("Email inválido.");
    if (!password) return setMsg("Mete a password.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email:e, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    nav(returnTo, { replace:true });
  }

  async function signUp() {
    setMsg("");
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (n.length < 2) return setMsg("Indica o teu nome.");
    if (!e.includes("@")) return setMsg("Email inválido.");
    if (!password || password.length < 8) return setMsg("Password mínimo 8 caracteres.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email:e, password });
    if (error) { setLoading(false); return setMsg(error.message); }
    const userId = data?.user?.id;
    if (!userId) { setLoading(false); return setMsg("Conta criada. Faz login para continuar."); }
    const { error: perr } = await supabase.from("profiles").upsert({ id:userId, name:n, role:"player" }, { onConflict:"id" });
    setLoading(false);
    if (perr) return setMsg("Conta criada, mas falhou criar perfil: " + perr.message);
    setMsg("Conta criada ✅ Agora entra.");
    setMode("signin"); setPassword("");
  }

  const isSignIn = mode === "signin";

  return (
    <div style={{ minHeight:"100vh", background:colors.dark, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 60% 0%,#1a7a3c55 0%,transparent 60%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", right:-40, bottom:-40, width:240, height:240, border:"2px solid rgba(255,255,255,0.05)", borderRadius:"50%" }} />
      <div style={{ position:"absolute", right:20, bottom:20, width:140, height:140, border:"2px solid rgba(255,255,255,0.04)", borderRadius:"50%" }} />

      <div style={{ position:"relative", width:"100%", maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, background:"#22a050", borderRadius:14, display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#fff", marginBottom:12 }}>J</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:"#fff", letterSpacing:"0.04em" }}>JOGA</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4 }}>A tua plataforma de futebol amador</div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:18, padding:24 }}>
          {/* Tabs */}
          <div style={{ display:"flex", background:colors.bg, borderRadius:10, padding:3, marginBottom:20 }}>
            {["signin","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setMsg(""); }}
                style={{ flex:1, padding:"9px 0", borderRadius:8, border:"none", fontSize:13, fontWeight:500, cursor:"pointer", background:mode===m?"#fff":"transparent", color:mode===m?colors.text:colors.muted, transition:"all .2s" }}>
                {m==="signin" ? "Entrar" : "Registar"}
              </button>
            ))}
          </div>

          {!isSignIn && (
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:500, color:colors.muted, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Miguel Andrade"
                style={{ width:"100%", height:44, borderRadius:9, border:`1.5px solid ${colors.line}`, padding:"0 14px", outline:"none", fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor=colors.green}
                onBlur={e  => e.target.style.borderColor=colors.line} />
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:colors.muted, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email"
              style={{ width:"100%", height:44, borderRadius:9, border:`1.5px solid ${colors.line}`, padding:"0 14px", outline:"none", fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor=colors.green}
              onBlur={e  => e.target.style.borderColor=colors.line} />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:500, color:colors.muted, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignIn ? "A tua password" : "Mínimo 8 caracteres"} type="password"
              style={{ width:"100%", height:44, borderRadius:9, border:`1.5px solid ${colors.line}`, padding:"0 14px", outline:"none", fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor=colors.green}
              onBlur={e  => e.target.style.borderColor=colors.line}
              onKeyDown={e => e.key==="Enter" && (isSignIn ? signIn() : signUp())} />
          </div>

          {msg && (
            <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:9, background:msg.includes("✅")?"#e8f5ee":"#fde8e8", color:msg.includes("✅")?colors.sub:"#a02020", fontSize:13, fontWeight:500 }}>
              {msg}
            </div>
          )}

          <button onClick={isSignIn ? signIn : signUp} disabled={loading}
            style={{ width:"100%", height:46, borderRadius:10, border:"none", background:colors.green, color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
            {loading ? "Aguarda..." : isSignIn ? "Entrar" : "Criar conta"}
          </button>

          {isSignIn && (
            <div style={{ textAlign:"center", marginTop:14 }}>
              <span style={{ fontSize:12, color:colors.muted, cursor:"pointer" }} onClick={() => nav("/reset")}>
                Esqueceste a password?
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
