// src/pages/EventDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, GhostButton, Header, Page, Pill, PrimaryButton, SectionTitle, colors } from "../ui/ui";

function formatDT(dt) {
  try { return new Date(dt).toLocaleString("pt-PT", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }); }
  catch { return ""; }
}

export default function EventDetail({ ctx }) {
  const { eventId } = useParams();
  const nav = useNavigate();

  const [event,   setEvent]   = useState(null);
  const [rsvps,   setRsvps]   = useState([]);
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);

  const role      = ctx.profile?.role || "player";
  const canManage = role === "admin" || role === "organizer";
  const isPlayer  = role === "player";

  function inviteUrl() {
    if (!event?.invite_token) return "";
    return `${window.location.origin}/e/${event.invite_token}`;
  }

  async function copyInvite() {
    setMsg("");
    const url = inviteUrl();
    if (!url) return setMsg("Este evento ainda não tem token.");
    try { await navigator.clipboard.writeText(url); setMsg("Convite copiado ✅"); }
    catch { window.prompt("Copia o link:", url); }
  }

  async function load() {
    setLoading(true); setMsg("");
    if (!eventId || eventId === "undefined") { setMsg("EventId inválido."); setLoading(false); return; }
    const ev = await supabase.from("events")
      .select("id,created_by,title,starts_at,location,needed_players,teams_enabled,status,invite_token")
      .eq("id",eventId).maybeSingle();
    if (ev.error) { setMsg("Evento: " + ev.error.message); setLoading(false); return; }
    if (!ev.data) { setMsg("Evento não encontrado."); setLoading(false); return; }
    setEvent(ev.data);
    const rs = await supabase.from("event_rsvps")
      .select("user_id,rsvp,created_at,profiles:user_id(name)")
      .eq("event_id",eventId).order("created_at",{ascending:true});
    if (rs.error) setMsg("RSVP: " + rs.error.message);
    setRsvps(rs.data||[]);
    setLoading(false);
  }

  useEffect(() => { if (!ctx.session) nav("/login",{replace:true}); }, [ctx.session]);
  useEffect(() => { if (!ctx.profile?.id) return; load(); }, [ctx.profile?.id, eventId]);

  const acceptedList = useMemo(() =>
    (rsvps||[]).filter(r => r.rsvp==="accepted").map(r => ({ user_id:r.user_id, name:r.profiles?.name||r.user_id })),
  [rsvps]);
  const declinedList = useMemo(() =>
    (rsvps||[]).filter(r => r.rsvp==="declined").map(r => ({ user_id:r.user_id, name:r.profiles?.name||r.user_id })),
  [rsvps]);

  const needed   = Number(event?.needed_players||0);
  const missing  = Math.max(0, needed - acceptedList.length);
  const myUserId = ctx.session?.user?.id;
  const myRsvp   = useMemo(() => {
    if (!myUserId) return null;
    return (rsvps||[]).find(r => r.user_id===myUserId)?.rsvp||null;
  }, [rsvps, myUserId]);

  async function setRsvpValue(value) {
    setMsg("");
    if (!isPlayer) return setMsg("Como admin/organizer, usa convites. RSVP é só para players.");
    const uid = ctx.session?.user?.id;
    if (!uid) return nav("/login",{replace:true});
    if (!event?.id) return setMsg("Evento inválido.");
    if (event.status && event.status!=="scheduled") return setMsg("Evento não está ativo.");
    const { error } = await supabase.from("event_rsvps").upsert({ event_id:event.id, user_id:uid, rsvp:value },{ onConflict:"event_id,user_id" });
    if (error) return setMsg("RSVP: " + error.message);
    await load();
    setMsg(value==="accepted" ? "Confirmado ✅" : "Recusado ❌");
  }

  async function cancelEvent() {
    setMsg("");
    if (!canManage) return setMsg("Sem permissões.");
    if (!event?.id) return setMsg("Evento inválido.");
    if (!window.confirm("Cancelar este evento?")) return;
    const { data, error } = await supabase.from("events").update({status:"cancelled"}).eq("id",event.id).select("id,status").maybeSingle();
    if (error) return setMsg("Cancelar: " + error.message);
    if (!data)  return setMsg("Cancelar bloqueado por permissões.");
    nav("/dashboard",{replace:true});
  }

  async function archiveEvent() {
    setMsg("");
    if (!canManage) return setMsg("Sem permissões.");
    if (!event?.id) return setMsg("Evento inválido.");
    if (!window.confirm("Arquivar este evento?")) return;
    const { data, error } = await supabase.from("events").update({status:"archived"}).eq("id",event.id).select("id,status").maybeSingle();
    if (error) return setMsg("Arquivar: " + error.message);
    if (!data)  return setMsg("Arquivar bloqueado por permissões.");
    nav("/dashboard",{replace:true});
  }

  if (!ctx.profile) return <Page><div style={{padding:20}}>A carregar…</div></Page>;
  if (loading)       return <Page><div style={{padding:20}}>A carregar evento…</div></Page>;

  const statusPill = event?.status==="scheduled" ? <Pill label="Ativo" tone="green" />
    : event?.status==="cancelled" ? <Pill label="Cancelado" tone="red" />
    : <Pill label="Arquivado" tone="gray" />;

  return (
    <Page>
      <Header kicker="Evento" title={event?.title||"Evento"} right={statusPill}
        sub={event?.starts_at ? formatDT(event.starts_at) + (event.location ? ` · ${event.location}` : "") : ""} />

      <div style={{ padding:"0 14px" }}>
        {msg && (
          <Card style={{ marginTop:12, borderColor: msg.includes("✅") ? "#22a050" : "rgba(239,68,68,0.25)", background: msg.includes("✅") ? "#e8f5ee" : "rgba(239,68,68,0.06)" }}>
            <div style={{ fontSize:13, color: msg.includes("✅") ? colors.sub : "#991B1B", fontWeight:700 }}>{msg}</div>
          </Card>
        )}

        {/* Contador de confirmados */}
        <Card style={{ marginTop:12 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:44, fontWeight:900, color:colors.text, lineHeight:1 }}>{acceptedList.length}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:900, color:colors.muted }}>/</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:44, fontWeight:900, color:colors.text, lineHeight:1 }}>{needed}</div>
            <div style={{ fontWeight:600, color:colors.muted, fontSize:14 }}>confirmados</div>
          </div>

          {/* Barra de progresso */}
          <div style={{ background:"#eef0eb", borderRadius:6, height:8, overflow:"hidden", marginBottom:8 }}>
            <div style={{ height:"100%", width:`${Math.min(100, needed > 0 ? (acceptedList.length/needed)*100 : 0)}%`, background: missing===0 ? colors.green : "#BA7517", borderRadius:6, transition:"width .5s ease" }} />
          </div>

          <div style={{ fontWeight:600, color: missing>0 ? "#d4621a" : colors.sub, fontSize:13, marginBottom:12 }}>
            {missing>0 ? `Faltam ${missing} jogadores` : "Mínimo atingido ✅"}
          </div>

          {/* Vagas dots */}
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16 }}>
            {Array.from({length:needed}).map((_,i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:"50%", background: i<acceptedList.length ? colors.green : "#eef0eb", border: i<acceptedList.length ? "none" : `1px solid ${colors.line}` }} />
            ))}
          </div>

          {event.status==="scheduled" && (
            <div style={{ display:"grid", gap:10 }}>
              {isPlayer && (
                <>
                  <PrimaryButton onClick={() => setRsvpValue("accepted")} disabled={myRsvp==="accepted"}>
                    {myRsvp==="accepted" ? "✓ Confirmado" : "Vou jogar ✓"}
                  </PrimaryButton>
                  <GhostButton onClick={() => setRsvpValue("declined")} disabled={myRsvp==="declined"}>
                    {myRsvp==="declined" ? "✗ Recusado" : "Não posso"}
                  </GhostButton>
                </>
              )}
              {event.teams_enabled && (
                <GhostButton onClick={() => nav(canManage ? `/events/${event.id}/teams` : `/events/${event.id}/teams-view`)}>
                  ⚽ Equipas
                </GhostButton>
              )}
              {canManage && (
                <>
                  <GhostButton onClick={copyInvite}>Copiar convite</GhostButton>
                  <GhostButton onClick={archiveEvent}>Arquivar</GhostButton>
                  <GhostButton onClick={cancelEvent}>Cancelar evento</GhostButton>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Confirmados */}
        <SectionTitle>Confirmados ({acceptedList.length})</SectionTitle>
        <Card>
          {acceptedList.length===0 ? (
            <div style={{ color:colors.muted, fontSize:13 }}>Sem confirmados.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {acceptedList.map((p,i) => (
                <div key={p.user_id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:colors.green+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, color:colors.sub, flexShrink:0 }}>
                    {i+1}
                  </div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{p.name}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recusados */}
        {declinedList.length > 0 && (
          <>
            <SectionTitle>Recusados ({declinedList.length})</SectionTitle>
            <Card>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {declinedList.map(p => (
                  <div key={p.user_id} style={{ fontSize:14, color:colors.muted }}>{p.name}</div>
                ))}
              </div>
            </Card>
          </>
        )}

        <div style={{ marginTop:14, paddingBottom:20 }}>
          <GhostButton onClick={() => nav("/dashboard")}>← Voltar ao menu</GhostButton>
        </div>
      </div>
    </Page>
  );
}
