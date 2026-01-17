import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, GhostButton, Header, Page, Pill, PrimaryButton, SectionTitle, colors } from "../ui/ui";

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

export default function EventDetail({ ctx }) {
  const { eventId } = useParams();
  const nav = useNavigate();

  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const role = ctx.profile?.role || "player";
  const canManage = role === "admin" || role === "organizer";
  const isPlayer = role === "player";

  function inviteUrl() {
    if (!event?.invite_token) return "";
    return `${window.location.origin}/e/${event.invite_token}`;
  }

  async function copyInvite() {
    setMsg("");
    const url = inviteUrl();
    if (!url) return setMsg("Este evento ainda não tem token.");
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Convite copiado ✅");
    } catch {
      window.prompt("Copia o link:", url);
    }
  }

  async function load() {
    setLoading(true);
    setMsg("");

    if (!eventId || eventId === "undefined") {
      setMsg("EventId inválido.");
      setLoading(false);
      return;
    }

    const ev = await supabase
      .from("events")
      .select("id, created_by, title, starts_at, location, needed_players, teams_enabled, status, invite_token")
      .eq("id", eventId)
      .maybeSingle();

    if (ev.error) {
      setMsg("Evento: " + ev.error.message);
      setLoading(false);
      return;
    }

    if (!ev.data) {
      setMsg("Evento não encontrado (ou sem permissões).");
      setLoading(false);
      return;
    }

    setEvent(ev.data);

    const rs = await supabase
      .from("event_rsvps")
      .select("user_id, rsvp, created_at, profiles:user_id (name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (rs.error) setMsg((p) => (p ? p + " | " : "") + "RSVP: " + rs.error.message);
    setRsvps(rs.data || []);

    setLoading(false);
  }

  useEffect(() => {
    if (!ctx.session) nav("/login", { replace: true });
  }, [ctx.session]);

  useEffect(() => {
    if (!ctx.profile?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.profile?.id, eventId]);

  const acceptedList = useMemo(
    () =>
      (rsvps || [])
        .filter((r) => r.rsvp === "accepted")
        .map((r) => ({ user_id: r.user_id, name: r.profiles?.name || r.user_id })),
    [rsvps]
  );

  const declinedList = useMemo(
    () =>
      (rsvps || [])
        .filter((r) => r.rsvp === "declined")
        .map((r) => ({ user_id: r.user_id, name: r.profiles?.name || r.user_id })),
    [rsvps]
  );

  const acceptedCount = acceptedList.length;
  const needed = Number(event?.needed_players || 0);
  const missing = Math.max(0, needed - acceptedCount);

  const myUserId = ctx.session?.user?.id;
  const myRsvp = useMemo(() => {
    if (!myUserId) return null;
    const row = (rsvps || []).find((r) => r.user_id === myUserId);
    return row?.rsvp || null;
  }, [rsvps, myUserId]);

  async function setRsvp(value) {
    setMsg("");

    if (!isPlayer) {
      setMsg("Como admin/organizer, usa convites. RSVP é só para players.");
      return;
    }

    const uid = ctx.session?.user?.id;
    if (!uid) return nav("/login", { replace: true });
    if (!event?.id) return setMsg("Evento inválido.");

    if (event.status && event.status !== "scheduled") return setMsg("Evento não está ativo.");

    const { error } = await supabase
      .from("event_rsvps")
      .upsert({ event_id: event.id, user_id: uid, rsvp: value }, { onConflict: "event_id,user_id" });

    if (error) return setMsg("RSVP: " + error.message);

    await load();
    setMsg(value === "accepted" ? "Confirmado ✅" : "Recusado ❌");
  }

  async function cancelEvent() {
    setMsg("");
    if (!canManage) return setMsg("Sem permissões para cancelar.");
    if (!event?.id) return setMsg("Evento inválido.");

    const ok = window.confirm("Cancelar este evento? Vai deixar de estar ativo.");
    if (!ok) return;

    const { data, error } = await supabase
      .from("events")
      .update({ status: "cancelled" })
      .eq("id", event.id)
      .select("id,status")
      .maybeSingle();

    if (error) return setMsg("Cancelar: " + error.message);
    if (!data) return setMsg("Cancelar bloqueado por permissões.");

    nav("/dashboard", { replace: true });
  }

  async function archiveEvent() {
    setMsg("");
    if (!canManage) return setMsg("Sem permissões para arquivar.");
    if (!event?.id) return setMsg("Evento inválido.");

    const ok = window.confirm("Arquivar este evento? Vai deixar de aparecer nos ativos.");
    if (!ok) return;

    const { data, error } = await supabase
      .from("events")
      .update({ status: "archived" })
      .eq("id", event.id)
      .select("id,status")
      .maybeSingle();

    if (error) return setMsg("Arquivar: " + error.message);
    if (!data) return setMsg("Arquivar bloqueado por permissões.");

    nav("/dashboard", { replace: true });
  }

  if (!ctx.profile) return <Page><div>A carregar…</div></Page>;
  if (loading) return <Page><div>A carregar evento…</div></Page>;

  const statusPill =
    event?.status === "scheduled" ? (
      <Pill label="🟢 Ativo" tone="green" />
    ) : event?.status === "cancelled" ? (
      <Pill label="🔴 Cancelado" tone="red" />
    ) : (
      <Pill label="⚪ Arquivado" tone="gray" />
    );

  return (
    <Page>
      <Header kicker="Evento" title={event?.title || "Evento"} right={statusPill} />

      {msg && (
        <Card style={{ marginTop: 12, borderRadius: 16, borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontSize: 13, color: "#991B1B", fontWeight: 800 }}>{msg}</div>
        </Card>
      )}

      <Card style={{ marginTop: 12 }}>
        <div style={{ color: colors.sub, fontSize: 13, fontWeight: 800 }}>
          {event.starts_at ? formatDT(event.starts_at) : ""}
          {event.location ? ` · ${event.location}` : ""}
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 44, fontWeight: 900 }}>{acceptedCount}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: colors.sub }}>/</div>
          <div style={{ fontSize: 44, fontWeight: 900 }}>{needed || 0}</div>
          <div style={{ marginLeft: 6, fontWeight: 900, color: colors.sub }}>confirmados</div>
        </div>

        <div style={{ marginTop: 6, color: colors.sub, fontWeight: 900 }}>
          {missing > 0 ? `Faltam ${missing} jogadores` : "Mínimo atingido ✅"}
        </div>

        {event.status === "scheduled" && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {isPlayer && (
              <>
                <PrimaryButton onClick={() => setRsvp("accepted")} disabled={myRsvp === "accepted"}>
                  ✅ Aceitar
                </PrimaryButton>
                <GhostButton onClick={() => setRsvp("declined")} disabled={myRsvp === "declined"}>
                  ❌ Recusar
                </GhostButton>
              </>
            )}

            {event.teams_enabled && (
  <GhostButton
    onClick={() =>
      nav(
        canManage
          ? `/events/${event.id}/teams`       // admin / organizer
          : `/events/${event.id}/teams-view`  // player
      )
    }
  >
    ⚽ Equipas
  </GhostButton>
)}

            {canManage && (
              <>
                <GhostButton onClick={copyInvite}>Copiar convite</GhostButton>
                <GhostButton onClick={archiveEvent}>⚪ Arquivar</GhostButton>
                <GhostButton onClick={cancelEvent}>🔴 Cancelar</GhostButton>
              </>
            )}
          </div>
        )}
      </Card>

      {canManage && (
        <>
          <SectionTitle>Convite</SectionTitle>
          <Card>
            <div style={{ fontWeight: 900 }}>Link do convite</div>
            <div style={{ marginTop: 6, color: colors.sub, fontWeight: 800, wordBreak: "break-all" }}>
              {event.invite_token ? inviteUrl() : "— (sem token)"}
            </div>
            <div style={{ marginTop: 12 }}>
              <PrimaryButton onClick={copyInvite} disabled={!event.invite_token}>Copiar convite</PrimaryButton>
            </div>
          </Card>
        </>
      )}

      {isPlayer && (
        <>
          <SectionTitle>A tua resposta</SectionTitle>
          <Card>
            <div style={{ fontWeight: 900 }}>
              {myRsvp === "accepted" ? "✅ Confirmado" : myRsvp === "declined" ? "❌ Recusado" : "⏳ Ainda não respondeste"}
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Confirmados (ordem de chegada)</SectionTitle>
      <Card>
        {acceptedList.length === 0 ? (
          <div style={{ color: colors.sub, fontWeight: 800 }}>Sem confirmados.</div>
        ) : (
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {acceptedList.map((p) => (
              <li key={p.user_id} style={{ padding: "6px 0", fontWeight: 900 }}>{p.name}</li>
            ))}
          </ol>
        )}
      </Card>

      <SectionTitle>Recusados</SectionTitle>
      <Card>
        {declinedList.length === 0 ? (
          <div style={{ color: colors.sub, fontWeight: 800 }}>Sem recusas.</div>
        ) : (
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {declinedList.map((p) => (
              <li key={p.user_id} style={{ padding: "6px 0", fontWeight: 900 }}>{p.name}</li>
            ))}
          </ol>
        )}
      </Card>

      <div style={{ marginTop: 14 }}>
        <GhostButton onClick={() => nav("/dashboard")}>Voltar ao menu</GhostButton>
      </div>
    </Page>
  );
}
