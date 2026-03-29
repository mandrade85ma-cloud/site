// src/pages/Group.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, GhostButton, Header, Input, Page, Pill, PrimaryButton, SectionTitle, colors } from "../ui/ui";

function formatDT(dt) {
  try { return new Date(dt).toLocaleString("pt-PT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }); }
  catch { return ""; }
}
function makeToken(len=18) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i=0; i<len; i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||""));
}

export default function Group({ ctx }) {
  const { groupId } = useParams();
  const nav = useNavigate();

  const [loading,      setLoading]      = useState(true);
  const [msg,          setMsg]          = useState("");
  const [group,        setGroup]        = useState(null);
  const [events,       setEvents]       = useState([]);
  const [title,        setTitle]        = useState("");
  const [startsAt,     setStartsAt]     = useState("");
  const [location,     setLocation]     = useState("");
  const [needed,       setNeeded]       = useState(10);
  const [teamsEnabled, setTeamsEnabled] = useState(false);

  const role       = ctx.profile?.role || "player";
  const isAdmin    = role === "admin";
  const isOrganizer= role === "organizer";
  const canCreate  = isAdmin || isOrganizer;

  useEffect(() => { if (!ctx.session) nav("/login", { replace:true }); }, [ctx.session, nav]);

  function groupInviteUrl() {
    if (!group?.invite_token) return "";
    return `${window.location.origin}/g/${group.invite_token}`;
  }

  async function copyGroupInvite() {
    setMsg("");
    const url = groupInviteUrl();
    if (!url) return setMsg("Este grupo ainda não tem token.");
    try { await navigator.clipboard.writeText(url); setMsg("Convite do grupo copiado ✅"); }
    catch { window.prompt("Copia o link:", url); }
  }

  async function load() {
    setLoading(true); setMsg(""); setGroup(null); setEvents([]);
    if (!isUuid(groupId)) { setMsg("Grupo inválido (URL errada)."); setLoading(false); return; }
    const g = await supabase.from("groups").select("id,name,owner_id,created_at,invite_token").eq("id",groupId).maybeSingle();
    if (g.error) { setMsg("Erro grupo: " + g.error.message); setLoading(false); return; }
    if (!g.data) { setMsg("Grupo não encontrado."); setLoading(false); return; }
    setGroup(g.data);
    const e = await supabase.from("events").select("id,title,starts_at,location,needed_players,status,teams_enabled,invite_token,group_id").eq("group_id",groupId).eq("status","scheduled").order("starts_at",{ascending:true});
    if (e.error) setMsg("Eventos: " + e.error.message);
    setEvents(e.data || []);
    setLoading(false);
  }

  useEffect(() => { if (!ctx.profile?.id) return; load(); }, [ctx.profile?.id, groupId]);

  async function createEvent() {
    setMsg("");
    if (!canCreate) return setMsg("Sem permissões para criar eventos.");
    if (!group?.id)  return setMsg("Grupo inválido.");
    const t = (title||"").trim();
    if (!t) return setMsg("Mete o título.");
    if (!startsAt) return setMsg("Mete data/hora.");
    const loc = (location||"").trim();
    if (!loc) return setMsg("Mete o local.");
    const n = Number(needed);
    if (!Number.isFinite(n)||n<2) return setMsg("Nº mínimo inválido (>=2).");
    const ins = await supabase.from("events").insert({ group_id:group.id, created_by:ctx.profile.id, title:t, starts_at:new Date(startsAt).toISOString(), location:loc, needed_players:n, teams_enabled:!!teamsEnabled, status:"scheduled", invite_token:makeToken() });
    if (ins.error) return setMsg("Criar evento: " + ins.error.message);
    setTitle(""); setStartsAt(""); setLocation(""); setNeeded(10); setTeamsEnabled(false);
    await load();
    setMsg("Evento criado ✅");
  }

  const hasActiveEvents = useMemo(() => (events||[]).length > 0, [events]);

  async function deleteGroup() {
    setMsg("");
    if (!canCreate) return setMsg("Sem permissões.");
    if (!group?.id)  return setMsg("Grupo inválido.");
    if (hasActiveEvents) return setMsg("Não podes eliminar: existem eventos ativos.");
    if (!window.confirm(`Eliminar o grupo "${group.name}"?`)) return;
    const del = await supabase.from("groups").delete().eq("id",group.id);
    if (del.error) return setMsg("Eliminar grupo: " + del.error.message);
    nav("/dashboard", { replace:true });
  }

  if (!ctx.profile) return <Page><div style={{ padding:20 }}>A carregar…</div></Page>;
  if (loading)       return <Page><div style={{ padding:20 }}>A carregar…</div></Page>;

  return (
    <Page>
      <Header kicker="Grupo" title={group?.name || "Grupo"}
        right={canCreate ? <Pill label={role.toUpperCase()} tone="dark" /> : <Pill label="PLAYER" tone="gray" />} />

      <div style={{ padding:"0 14px" }}>
        {msg && (
          <Card style={{ marginTop:12, borderColor:"rgba(239,68,68,0.25)", background:"rgba(239,68,68,0.06)" }}>
            <div style={{ fontSize:13, color: msg.includes("✅") ? colors.sub : "#991B1B", fontWeight:700 }}>{msg}</div>
          </Card>
        )}

        {/* Convite do grupo */}
        {canCreate && (
          <>
            <SectionTitle>Convite do grupo</SectionTitle>
            <Card>
              <div style={{ fontWeight:700, marginBottom:6 }}>Link do grupo</div>
              <div style={{ fontSize:13, color:colors.muted, wordBreak:"break-all", marginBottom:12 }}>
                {group?.invite_token ? groupInviteUrl() : "— (sem token)"}
              </div>
              <PrimaryButton onClick={copyGroupInvite} disabled={!group?.invite_token}>
                Copiar link do grupo
              </PrimaryButton>
            </Card>
          </>
        )}

        {/* Criar evento */}
        {canCreate && (
          <>
            <SectionTitle>Criar evento</SectionTitle>
            <Card>
              <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Futebol 7" />
              <Input label="Data / hora" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              <Input label="Local" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Campo / Pavilhão" />
              <Input label="Nº mínimo de jogadores" type="number" min={2} value={needed} onChange={e => setNeeded(e.target.value)} />
              <div style={{ marginTop:12, display:"flex", gap:10, alignItems:"center" }}>
                <input id="teams_enabled" type="checkbox" checked={teamsEnabled} onChange={e => setTeamsEnabled(e.target.checked)} />
                <label htmlFor="teams_enabled" style={{ fontWeight:600, color:colors.text, fontSize:14 }}>Criar equipas equilibradas</label>
              </div>
              <div style={{ marginTop:12 }}>
                <PrimaryButton onClick={createEvent}>Criar evento</PrimaryButton>
              </div>
            </Card>
          </>
        )}

        {/* Eventos ativos */}
        <SectionTitle>Eventos ativos</SectionTitle>
        <div style={{ display:"grid", gap:10 }}>
          {events.length === 0 ? (
            <Card>
              <div style={{ color:colors.muted, fontSize:13 }}>Sem eventos ativos.</div>
            </Card>
          ) : events.map(e => (
            <Card key={e.id} onClick={() => nav(`/events/${e.id}`)}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{e.title || "Evento"}</div>
                  <div style={{ color:colors.muted, fontSize:13 }}>
                    {e.starts_at ? formatDT(e.starts_at) : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexDirection:"column", alignItems:"flex-end" }}>
                  <Pill label="Ativo" tone="green" />
                  {e.teams_enabled && <Pill label="Equipas" tone="gray" />}
                </div>
              </div>
              <div style={{ marginTop:8, color:colors.muted, fontSize:12 }}>Toca para ver confirmados e convite.</div>
            </Card>
          ))}
        </div>

        {/* Gestão */}
        {canCreate && (
          <>
            <SectionTitle>Gestão</SectionTitle>
            <Card>
              <div style={{ color:colors.muted, fontSize:13, marginBottom:12 }}>
                {hasActiveEvents ? "Não podes eliminar: existem eventos ativos." : "Podes eliminar este grupo (não há eventos ativos)."}
              </div>
              <div style={{ display:"grid", gap:10 }}>
                <GhostButton onClick={deleteGroup} disabled={hasActiveEvents}>Eliminar grupo</GhostButton>
                <GhostButton onClick={() => nav("/dashboard")}>← Voltar ao Menu</GhostButton>
              </div>
            </Card>
          </>
        )}

        {!canCreate && (
          <div style={{ marginTop:14, paddingBottom:20 }}>
            <GhostButton onClick={() => nav("/dashboard")}>← Voltar ao Menu</GhostButton>
          </div>
        )}
      </div>
    </Page>
  );
}
