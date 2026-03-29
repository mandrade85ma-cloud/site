// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, GhostButton, Input, Page, PrimaryButton, SectionTitle, ScorePill, BottomNav, colors } from "../ui/ui";

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
}
function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d < 0)  return null;
  return `em ${d} dias`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("pt-PT", { weekday:"short", day:"numeric", month:"short" });
}

export default function Dashboard({ ctx }) {
  const navigate = useNavigate();
  const profile  = ctx?.profile;

  const [groups,    setGroups]    = useState([]);
  const [nextEvent, setNextEvent] = useState(null);
  const [confirmed, setConfirmed] = useState(0);
  const [myRsvp,    setMyRsvp]    = useState(null);
  const [urgente,   setUrgente]   = useState(null);
  const [newGroup,  setNewGroup]  = useState("");
  const [creating,  setCreating]  = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { loadData(); }, [profile?.id]);

  async function loadData() {
    if (!profile?.id) return;
    setLoading(true);

    // Grupos
    const { data: gm } = await supabase
      .from("group_members")
      .select("group_id, groups(id,name,created_at,owner_id,invite_token)")
      .eq("user_id", profile.id);

    const groupsData = await Promise.all((gm ?? []).map(async row => {
      const g = row.groups;
      const { count } = await supabase.from("events")
        .select("id", { count:"exact", head:true })
        .eq("group_id", g.id).eq("status","scheduled");
      return { ...g, eventCount: count ?? 0, isOwner: g.owner_id === profile.id };
    }));
    setGroups(groupsData);

    // Próximo evento
    const groupIds = (gm ?? []).map(r => r.group_id);
    if (groupIds.length) {
      const { data: evs } = await supabase
        .from("events")
        .select("id,title,starts_at,location,needed_players,invite_token,groups(name),event_rsvps(user_id,rsvp)")
        .in("group_id", groupIds)
        .eq("status","scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending:true })
        .limit(1);

      if (evs?.length) {
        const ev   = evs[0];
        const conf = ev.event_rsvps.filter(r => r.rsvp === "accepted").length;
        const my   = ev.event_rsvps.find(r => r.user_id === profile.id)?.rsvp ?? null;
        setNextEvent(ev); setConfirmed(conf); setMyRsvp(my);
        const hrs = (new Date(ev.starts_at) - new Date()) / 3600000;
        if (hrs < 72 && conf < ev.needed_players)
          setUrgente({ event: ev, missing: ev.needed_players - conf });
      }
    }
    setLoading(false);
  }

  async function handleRsvp(rsvp) {
    if (!nextEvent || !profile?.id) return;
    const prev = myRsvp;
    setMyRsvp(rsvp);
    if (rsvp === "accepted" && prev !== "accepted") setConfirmed(c => c + 1);
    if (rsvp !== "accepted" && prev === "accepted") setConfirmed(c => c - 1);
    await supabase.from("event_rsvps").upsert(
      { event_id: nextEvent.id, user_id: profile.id, rsvp, updated_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" }
    );
  }

  async function handleCreateGroup() {
    if (!newGroup.trim() || !profile?.id) return;
    setCreating(true);
    const token = Math.random().toString(36).slice(2,10);
    const { data: g } = await supabase.from("groups")
      .insert({ name: newGroup.trim(), owner_id: profile.id, invite_token: token })
      .select().single();
    if (g) {
      await supabase.from("group_members")
        .insert({ group_id: g.id, user_id: profile.id, joined_via: "created" });
      setGroups(prev => [...prev, { ...g, eventCount: 0, isOwner: true }]);
    }
    setNewGroup(""); setCreating(false);
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f6f2" }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, color:"#22a050" }}>A carregar...</div>
    </div>
  );

  const repLevel = profile?.rep_level ?? 1;
  const atiLevel = profile?.ati_level ?? 1;
  const repScore = profile?.rep_score ?? 0;
  const atiScore = profile?.ati_score ?? 0;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#f5f6f2", display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"#0e5c2a", padding:"18px 20px 0", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 80% 0%,#1a7a3c55 0%,transparent 60%)", pointerEvents:"none" }} />

        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:"#22a050", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#fff" }}>J</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:21, color:"#fff", letterSpacing:"0.04em" }}>JOGA</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ background:"#f0c233", color:"#3a2800", fontSize:11, fontWeight:500, padding:"4px 10px", borderRadius:20 }}>
              {profile?.role === "admin" ? "Admin" : profile?.role === "organizer" ? "Organizer" : "Player"}
            </span>
            <button onClick={() => ctx?.logout?.()}
              style={{ background:"rgba(255,255,255,0.12)", color:"#fff", border:"none", fontSize:12, padding:"6px 12px", borderRadius:7, cursor:"pointer" }}>
              Sair
            </button>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding:"18px 0 0", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Dashboard</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#fff" }}>
                Olá, {profile?.name?.split(" ")[0] ?? "Jogador"} 👋
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:3 }}>
                {groups.length} grupo{groups.length !== 1 ? "s" : ""}
                {nextEvent ? ` · próximo jogo ${daysUntil(nextEvent.starts_at)}` : ""}
              </div>
            </div>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"#22a050", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:"#fff", border:"2.5px solid rgba(255,255,255,0.2)", flexShrink:0 }}>
              {initials(profile?.name)}
            </div>
          </div>

          {/* Score pills */}
          <div style={{ display:"flex", gap:8, paddingBottom:18 }}>
            <ScorePill type="rep" level={repLevel} score={repScore} />
            <ScorePill type="ati" level={atiLevel} score={atiScore} />
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #e2e5de" }}>
        {[
          { val: groups.length,                              lbl:"Grupos",      color:"#22a050" },
          { val: groups.reduce((a,g) => a+g.eventCount, 0), lbl:"Eventos",     color:"#22a050" },
          { val: urgente ? urgente.missing : "—",            lbl:"Vagas livres",color: urgente ? "#d4621a" : "#22a050" },
          { val: (repScore / 20).toFixed(1),                 lbl:"Rep. score",  color:"#BA7517" },
        ].map((s,i,arr) => (
          <div key={i} style={{ flex:1, padding:"11px 6px", textAlign:"center", borderRight: i < arr.length-1 ? "1px solid #e2e5de" : "none" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:10, color:"#6b7068", marginTop:2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── ALERTA URGENTE ── */}
      {urgente && (
        <div style={{ background:"#d4621a", margin:"14px 14px 0", borderRadius:14, padding:"13px 15px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", right:-20, top:-20, width:80, height:80, border:"2px solid rgba(255,255,255,0.1)", borderRadius:"50%" }} />
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>
            Plantel incompleto · Urgente
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:"#fff" }}>
            {urgente.event.title} — {urgente.event.groups?.name}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>
            Faltam {urgente.missing} jogador{urgente.missing !== 1 ? "es" : ""} · {daysUntil(urgente.event.starts_at)}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:9 }}>
            <button onClick={() => navigate("/events/" + urgente.event.id)}
              style={{ padding:"6px 11px", borderRadius:6, border:"none", fontSize:11, fontWeight:700, background:"#fff", color:"#d4621a", cursor:"pointer" }}>
              Ver evento
            </button>
            <button onClick={() => navigator.clipboard?.writeText(window.location.origin + "/e/" + urgente.event.invite_token)}
              style={{ padding:"6px 11px", borderRadius:6, border:"1px solid rgba(255,255,255,0.25)", fontSize:11, fontWeight:700, background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer" }}>
              Copiar convite
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ flex:1, padding:"14px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* PRÓXIMO EVENTO */}
        <div>
          <SectionTitle right="Criar →" onClick={() => navigate("/events/new")}>Próximo evento</SectionTitle>
          {nextEvent ? (
            <div onClick={() => navigate("/events/" + nextEvent.id)}
              style={{ background:"#0e5c2a", borderRadius:14, padding:"14px 16px", position:"relative", overflow:"hidden", cursor:"pointer" }}>
              <div style={{ position:"absolute", right:-8, bottom:-8, fontSize:64, opacity:0.07 }}>⚽</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>
                {fmtDate(nextEvent.starts_at)} · {nextEvent.groups?.name}
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:"#fff" }}>{nextEvent.title}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:5, display:"flex", gap:10 }}>
                <span>📍 {nextEvent.location}</span>
                <span>🕙 {new Date(nextEvent.starts_at).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:10 }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Vagas:</span>
                <div style={{ display:"flex", gap:3 }}>
                  {Array.from({ length: nextEvent.needed_players }).map((_,i) => (
                    <div key={i} style={{ width:8, height:8, borderRadius:"50%",
                      background: i < confirmed ? "#22a050" : "rgba(255,255,255,0.18)",
                      border: i < confirmed ? "none" : "1px solid rgba(255,255,255,0.3)" }} />
                  ))}
                </div>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginLeft:4 }}>{confirmed}/{nextEvent.needed_players}</span>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:11 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleRsvp("accepted")}
                  style={{ flex:1, padding:9, background: myRsvp==="accepted" ? "#1a7a3c" : "#22a050", color:"#fff", border:"none", borderRadius:8, fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {myRsvp === "accepted" ? "✓ Confirmado" : "Vou jogar"}
                </button>
                <button onClick={() => handleRsvp("declined")}
                  style={{ padding:"9px 12px", background: myRsvp==="declined" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.75)", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>
                  Não posso
                </button>
              </div>
            </div>
          ) : (
            <Card style={{ textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🗓️</div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Sem eventos confirmados</div>
              <div style={{ fontSize:13, color:colors.muted }}>Cria um evento ou entra num grupo via convite.</div>
            </Card>
          )}
        </div>

        {/* GRUPOS */}
        <div>
          <SectionTitle>Os teus grupos</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {groups.length === 0 && (
              <Card style={{ textAlign:"center", border:"1.5px dashed #e2e5de" }}>
                <div style={{ fontSize:13, color:colors.muted }}>Ainda não pertences a nenhum grupo.</div>
              </Card>
            )}
            {groups.map(g => (
              <Card key={g.id} onClick={() => navigate("/groups/" + g.id)} style={{ position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:"#22a050", borderRadius:"3px 0 0 3px" }} />
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:9 }}>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700 }}>{g.name}</div>
                    <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>
                      Criado {new Date(g.created_at).toLocaleDateString("pt-PT",{day:"numeric",month:"short"})}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:20, background:"#e8f5ee", color:"#1a7a3c" }}>
                    {g.isOwner ? "Dono" : "Membro"}
                  </span>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:11, color:colors.muted }}>Toca para ver eventos</span>
                  <span style={{ fontSize:11, fontWeight:500, background:"#fff7e0", color:"#7a5500", padding:"2px 7px", borderRadius:6 }}>
                    {g.eventCount} evento{g.eventCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CRIAR GRUPO */}
        <div>
          <SectionTitle>Criar grupo</SectionTitle>
          <Card>
            <Input label="Nome do grupo" value={newGroup} onChange={e => setNewGroup(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateGroup()}
              placeholder="Ex: Albogas 6F" />
            <div style={{ marginTop:10 }}>
              <PrimaryButton onClick={handleCreateGroup} disabled={creating || !newGroup.trim()}>
                {creating ? "A criar..." : "Criar grupo"}
              </PrimaryButton>
            </div>
          </Card>
        </div>

        {/* INVITE BANNER */}
        {groups.length > 0 && (
          <div style={{ background:"#0e5c2a", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:8 }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#fff" }}>Convidar jogadores</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>Partilha o link do teu grupo</div>
            </div>
            <button onClick={() => navigate("/groups/" + groups[0]?.id)}
              style={{ background:"#f0c233", color:"#3a2800", border:"none", fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", padding:"8px 14px", borderRadius:8, cursor:"pointer" }}>
              Ver grupos
            </button>
          </div>
        )}
      </div>

      <BottomNav active="home" />

      {/* FAB */}
      <button onClick={() => navigate("/groups/" + groups[0]?.id)}
        style={{ position:"fixed", bottom:68, right:18, width:48, height:48, borderRadius:"50%", background:"#22a050", color:"#fff", border:"none", fontSize:22, boxShadow:"0 4px 16px rgba(26,122,60,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10, cursor:"pointer" }}>
        +
      </button>
    </div>
  );
}
