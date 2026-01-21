// src/pages/EventInvite.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Card,
  GhostButton,
  Header,
  Page,
  Pill,
  PrimaryButton,
  SectionTitle,
  colors,
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

export default function EventInvite({ ctx }) {
  const { token } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [event, setEvent] = useState(null); // {id,title,starts_at,location,needed_players,status,created_by}
  const [organizerName, setOrganizerName] = useState("");
  const [myRsvp, setMyRsvp] = useState(null); // accepted | declined | null

  async function load() {
    setLoading(true);
    setMsg("");
    setEvent(null);
    setOrganizerName("");
    setMyRsvp(null);

    if (!token || token === "undefined") {
      setMsg("Convite inválido.");
      setLoading(false);
      return;
    }

    // Precisa de login para responder (MVP)
    if (!ctx.session) {
      setLoading(false);
      return;
    }

    // 1) evento via RPC (bypass RLS controlado)
    const rpc = await supabase.rpc("get_event_by_token", { p_token: token });

    if (rpc.error) {
      setMsg("Convite inválido.");
      setLoading(false);
      return;
    }

    const row = rpc.data?.[0] || null;
    if (!row) {
      setMsg("Convite não encontrado.");
      setLoading(false);
      return;
    }

    const ev = {
      id: row.event_id,
      title: row.title,
      starts_at: row.starts_at,
      location: row.location,
      needed_players: row.needed_players,
      status: row.status,
      created_by: row.created_by, // organizer/admin que criou
    };

    setEvent(ev);

    // 2) nome do criador (organizer/admin)
    if (ev.created_by) {
      const org = await supabase
        .from("profiles")
        .select("name")
        .eq("id", ev.created_by)
        .limit(1);

      const n = org.data?.[0]?.name;
      setOrganizerName(n && n.trim() ? n : "");
    }

    // 3) RSVP atual do user
    const uid = ctx.session.user.id;
    const mine = await supabase
      .from("event_rsvps")
      .select("rsvp")
      .eq("event_id", ev.id)
      .eq("user_id", uid)
      .limit(1);

    if (!mine.error) setMyRsvp(mine.data?.[0]?.rsvp || null);

    setLoading(false);
  }

  async function setRsvp(value) {
    setMsg("");

    const uid = ctx.session?.user?.id;
    if (!uid) {
      nav("/login", { state: { returnTo: `/e/${token}` } });
      return;
    }

    if (!event?.id) return setMsg("Convite inválido.");

    if (event.status && event.status !== "scheduled") {
      setMsg("Este evento já não está ativo.");
      return;
    }

    const { error } = await supabase
      .from("event_rsvps")
      .upsert(
        { event_id: event.id, user_id: uid, rsvp: value },
        { onConflict: "event_id,user_id" }
      );

    if (error) return setMsg("Não foi possível guardar a resposta.");

    setMyRsvp(value);
    setMsg(value === "accepted" ? "Confirmado ✅" : "Recusado ❌");

    // ✅ força o fluxo certo: agora o dashboard lista por RSVP
    nav("/dashboard", { replace: true });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ctx.session?.user?.id]);

  if (!ctx.session) {
    return (
      <Page>
        <Header kicker="JOGA" title="Convite" right={<Pill label="Login" tone="gray" />} />

        <Card>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Faz login para responder</div>
          <div style={{ marginTop: 6, color: colors.sub, fontWeight: 700 }}>
            Este convite só permite confirmar presença depois do login.
          </div>

          <div style={{ marginTop: 12 }}>
            <PrimaryButton onClick={() => nav("/login", { state: { returnTo: `/e/${token}` } })}>
              Ir para login
            </PrimaryButton>
          </div>
        </Card>
      </Page>
    );
  }

  if (loading) return <Page><div>A carregar convite…</div></Page>;

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
      <Header kicker="Convite" title="Evento" right={statusPill} />

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

      {!event ? (
        <Card>
          <div style={{ fontWeight: 900 }}>Convite inválido</div>
          <div style={{ marginTop: 6, color: colors.sub, fontWeight: 700 }}>
            O link pode ter expirado.
          </div>
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{event.title || "Evento"}</div>

            <div style={{ marginTop: 6, color: colors.sub, fontWeight: 800 }}>
              {event.starts_at ? formatDT(event.starts_at) : ""}
              {event.location ? ` · ${event.location}` : ""}
              {typeof event.needed_players === "number" ? ` · mínimo ${event.needed_players}` : ""}
            </div>

            <div style={{ marginTop: 10, color: colors.sub, fontWeight: 800 }}>
              <b>Organizador:</b> {organizerName || "—"}
            </div>

            {event.status === "scheduled" ? (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <PrimaryButton onClick={() => setRsvp("accepted")}>✅ Aceitar</PrimaryButton>
                <GhostButton onClick={() => setRsvp("declined")}>❌ Recusar</GhostButton>
              </div>
            ) : (
              <div style={{ marginTop: 12, color: colors.sub, fontWeight: 800 }}>
                Este evento já não está ativo.
              </div>
            )}
          </Card>

          <SectionTitle>A tua resposta</SectionTitle>
          <Card>
            <div style={{ fontWeight: 900 }}>
              {myRsvp === "accepted"
                ? "✅ Confirmado"
                : myRsvp === "declined"
                ? "❌ Recusado"
                : "⏳ Ainda não respondeste"}
            </div>

            {event?.id && (
              <div style={{ marginTop: 12 }}>
                <GhostButton onClick={() => nav(`/events/${event.id}`)}>
                  Ver detalhe do evento
                </GhostButton>
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
