// src/pages/EventTeamsView.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, GhostButton, Header, Page, Pill, SectionTitle, colors } from "../ui/ui";

export default function EventTeamsView({ ctx }) {
  const { eventId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState(null);

  useEffect(() => {
    if (!ctx.session) nav("/login", { replace: true });
  }, [ctx.session]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      setTeams(null);

      if (!eventId || eventId === "undefined") {
        setMsg("EventId inválido.");
        setLoading(false);
        return;
      }

      const ev = await supabase
        .from("events")
        .select("id,title,teams_enabled,status")
        .eq("id", eventId)
        .maybeSingle();

      if (ev.error) {
        setMsg("Evento: " + ev.error.message);
        setLoading(false);
        return;
      }
      if (!ev.data) {
        setMsg("Evento não encontrado.");
        setLoading(false);
        return;
      }
      setEvent(ev.data);

      if (!ev.data.teams_enabled) {
        setMsg("Este evento não tem equipas equilibradas.");
        setLoading(false);
        return;
      }

      const t = await supabase
        .from("event_teams")
        .select("team_a,team_b,stats,created_at")
        .eq("event_id", eventId)
        .maybeSingle();

      if (t.error) {
        setMsg("Equipas: " + t.error.message);
        setLoading(false);
        return;
      }
      if (!t.data) {
        setMsg("O organizador ainda não gerou as equipas.");
        setLoading(false);
        return;
      }

      setTeams(t.data);
      setLoading(false);
    })();
  }, [eventId, ctx.session?.user?.id]);

  if (loading) return <Page><div>A carregar equipas…</div></Page>;

  return (
    <Page>
      <Header kicker="Equipas" title={event?.title || "Evento"} right={<Pill label="⚽" tone="gray" />} />

      {msg && (
        <Card style={{ borderRadius: 16, borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontSize: 13, color: "#991B1B", fontWeight: 800 }}>{msg}</div>
        </Card>
      )}

      {!teams ? null : (
        <>
          <SectionTitle>Totais</SectionTitle>
          <Card>
            <div style={{ fontWeight: 900 }}>Equipa A — soma {teams.stats?.sumA} · média {teams.stats?.avgA}</div>
            <div style={{ fontWeight: 900, marginTop: 6 }}>Equipa B — soma {teams.stats?.sumB} · média {teams.stats?.avgB}</div>
            <div style={{ color: colors.sub, fontWeight: 800, marginTop: 8 }}>
              Diferença total: {teams.stats?.diff}
            </div>
          </Card>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Equipa A</div>
                <div style={{ color: colors.sub, fontWeight: 800, fontSize: 12 }}>
                  {(teams.team_a || []).length} jogadores
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(teams.team_a || []).map((p) => (
                  <div
                    key={p.user_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.06)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {p.name} {p.is_goalkeeper ? "🧤" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Equipa B</div>
                <div style={{ color: colors.sub, fontWeight: 800, fontSize: 12 }}>
                  {(teams.team_b || []).length} jogadores
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(teams.team_b || []).map((p) => (
                  <div
                    key={p.user_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.06)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {p.name} {p.is_goalkeeper ? "🧤" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <GhostButton onClick={() => nav(`/events/${eventId}`)}>Voltar ao evento</GhostButton>
      </div>
    </Page>
  );
}
