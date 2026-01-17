// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Card,
  Header,
  Input,
  Page,
  Pill,
  PrimaryButton,
  SectionTitle,
  colors,
  GhostButton,
} from "../ui/ui";

function formatDT(dt) {
  try {
    return new Date(dt).toLocaleString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function makeToken(len = 18) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Dashboard({ ctx }) {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [events, setEvents] = useState([]);

  // criar evento (admin/organizer)
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [needed, setNeeded] = useState(10);
  const [teamsEnabled, setTeamsEnabled] = useState(false);

  const role = ctx.profile?.role || "player";
  const isAdmin = role === "admin";
  const isOrganizer = role === "organizer";
  const canCreate = isAdmin || isOrganizer;

  // segurança: se não há sessão, volta ao login
  useEffect(() => {
    if (!ctx.session) nav("/login", { replace: true });
  }, [ctx.session]);

  async function load() {
    setMsg("");
    setLoading(true);

    try {
      if (!ctx.session?.user?.id) {
        setMsg("Sem sessão.");
        setEvents([]);
        return;
      }

      if (!ctx.profile?.id) {
        setMsg("Perfil ainda a carregar…");
        setEvents([]);
        return;
      }

      console.log("[dashboard] role=", role, "uid=", ctx.session.user.id);

      // ADMIN: vê todos
      if (isAdmin) {
        const q = await supabase
          .from("events")
          .select("id,title,starts_at,location,needed_players,status,teams_enabled,invite_token,created_by,created_at")
          .eq("status", "scheduled")
          .order("starts_at", { ascending: true });

        if (q.error) throw q.error;
        setEvents(q.data || []);
        return;
      }

      // ORGANIZER: vê os seus
      if (isOrganizer) {
        const q = await supabase
          .from("events")
          .select("id,title,starts_at,location,needed_players,status,teams_enabled,invite_token,created_by,created_at")
          .eq("created_by", ctx.profile.id)
          .eq("status", "scheduled")
          .order("starts_at", { ascending: true });

        if (q.error) throw q.error;
        setEvents(q.data || []);
        return;
      }

      // PLAYER: vê eventos onde tem RSVP
      const rs = await supabase
        .from("event_rsvps")
        .select("event_id, events:event_id (id,title,starts_at,location,needed_players,status,teams_enabled,invite_token,created_by,created_at)")
        .eq("user_id", ctx.profile.id);

      if (rs.error) throw rs.error;

      const list = (rs.data || [])
        .map((r) => r.events)
        .filter(Boolean)
        .filter((e) => e.status === "scheduled")
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

      setEvents(list);
    } catch (e) {
      console.error("[dashboard] load error:", e);
      setMsg(e?.message ? `Erro: ${e.message}` : "Erro a carregar.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // só carrega quando profile já existe (evita loops)
    if (!ctx.profile?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.profile?.id]);

  async function createEvent() {
    setMsg("");

    if (!canCreate) return setMsg("Sem permissões para criar eventos.");

    const t = (title || "").trim();
    if (!t) return setMsg("Mete o título.");
    if (!startsAt) return setMsg("Mete data/hora.");
    const loc = (location || "").trim();
    if (!loc) return setMsg("Mete o local.");

    const n = Number(needed);
    if (!Number.isFinite(n) || n < 2) return setMsg("Nº mínimo inválido (>=2).");

    const inviteToken = makeToken();

    const ins = await supabase.from("events").insert({
      created_by: ctx.profile.id,
      title: t,
      starts_at: new Date(startsAt).toISOString(),
      location: loc,
      needed_players: n,
      teams_enabled: !!teamsEnabled,
      status: "scheduled",
      invite_token: inviteToken,
    });

    if (ins.error) return setMsg("Criar evento: " + ins.error.message);

    setTitle("");
    setStartsAt("");
    setLocation("");
    setNeeded(10);
    setTeamsEnabled(false);

    await load();
    setMsg("Evento criado ✅");
  }

  const rolePill = useMemo(() => {
    if (isAdmin) return <Pill label="ADMIN" tone="dark" />;
    if (isOrganizer) return <Pill label="ORGANIZER" tone="dark" />;
    return <Pill label="PLAYER" tone="gray" />;
  }, [isAdmin, isOrganizer]);

  if (!ctx.profile) {
    return (
      <Page>
        <div style={{ padding: 20 }}>A carregar perfil…</div>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <Header kicker="Menu" title="JOGA" right={rolePill} />

        <Card>
          <div style={{ fontWeight: 900 }}>A carregar…</div>
          <div style={{ marginTop: 6, color: colors.sub, fontWeight: 800 }}>
            {msg || "—"}
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Header kicker="Menu" title="" right={rolePill} />

      {msg && (
        <Card
          style={{
            borderRadius: 16,
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.06)",
          }}
        >
          <div style={{ fontSize: 13, color: "#991B1B", fontWeight: 800 }}>{msg}</div>
        </Card>
      )}

      {canCreate && (
        <>
          <SectionTitle>Criar evento</SectionTitle>
          <Card>
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              label="Data / hora"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input label="Local" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input
              label="Nº mínimo"
              type="number"
              min={2}
              value={needed}
              onChange={(e) => setNeeded(e.target.value)}
            />

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <input
                id="teams_enabled"
                type="checkbox"
                checked={teamsEnabled}
                onChange={(e) => setTeamsEnabled(e.target.checked)}
              />
              <label htmlFor="teams_enabled" style={{ fontWeight: 900, color: colors.text }}>
                Equipas equilibradas
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <PrimaryButton onClick={createEvent}>Criar evento</PrimaryButton>
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Eventos ativos</SectionTitle>
      <div style={{ display: "grid", gap: 12 }}>
        {events.length === 0 ? (
          <Card>
            <div style={{ color: colors.sub, fontWeight: 800 }}>Sem eventos ativos.</div>
          </Card>
        ) : (
          events.map((e) => (
            <Card key={e.id} onClick={() => nav(`/events/${e.id}`)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{e.title || "Evento"}</div>
                  <div style={{ color: colors.sub, marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                    {e.starts_at ? formatDT(e.starts_at) : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                  <Pill label="🟢 Ativo" tone="green" />
                  {e.teams_enabled ? <Pill label="⚽ Equipas" tone="gray" /> : null}
                </div>
              </div>

              <div style={{ marginTop: 10, color: colors.sub, fontSize: 12, fontWeight: 800 }}>
                Abre para ver detalhe e convite.
              </div>
            </Card>
          ))
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <GhostButton onClick={load}>Recarregar</GhostButton>
      </div>
    </Page>
  );
}
