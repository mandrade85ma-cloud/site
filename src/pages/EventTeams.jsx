import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Card,
  GhostButton,
  Header,
  Input,
  Page,
  Pill,
  PrimaryButton,
  SectionTitle,
  colors,
} from "../ui/ui";

/* =========================
   Algoritmo de equipas
========================= */
function buildBalancedTeams(players) {
  const warnings = [];

  const goalkeepers = players.filter(p => p.is_goalkeeper);
  const fieldPlayers = players.filter(p => !p.is_goalkeeper);

  goalkeepers.sort((a, b) => (b.rating ?? 3) - (a.rating ?? 3));
  fieldPlayers.sort((a, b) => (b.rating ?? 3) - (a.rating ?? 3));

  const teamA = [];
  const teamB = [];

  // 1 GR por equipa (se existir)
  if (goalkeepers.length >= 2) {
    teamA.push(goalkeepers[0]);
    teamB.push(goalkeepers[1]);
    if (goalkeepers.length > 2) {
      warnings.push(`Existem ${goalkeepers.length} GR. Só 2 foram usados.`);
      fieldPlayers.push(...goalkeepers.slice(2));
    }
  } else if (goalkeepers.length === 1) {
    teamA.push(goalkeepers[0]);
    warnings.push("Só existe 1 guarda-redes.");
  } else {
    warnings.push("Não há guarda-redes marcados.");
  }

  const sum = arr => arr.reduce((acc, p) => acc + (p.rating || 0), 0);

  for (const p of fieldPlayers) {
    const sumA = sum(teamA);
    const sumB = sum(teamB);

    if (sumA < sumB) teamA.push(p);
    else if (sumB < sumA) teamB.push(p);
    else {
      teamA.length <= teamB.length ? teamA.push(p) : teamB.push(p);
    }
  }

  const sumA = sum(teamA);
  const sumB = sum(teamB);

  return {
    teamA,
    teamB,
    stats: {
      sumA,
      sumB,
      avgA: teamA.length ? +(sumA / teamA.length).toFixed(2) : 0,
      avgB: teamB.length ? +(sumB / teamB.length).toFixed(2) : 0,
      diff: Math.abs(sumA - sumB),
    },
    warnings,
  };
}

/* =========================
   COMPONENTE
========================= */
export default function EventTeams({ ctx }) {
  const { eventId } = useParams();
  const nav = useNavigate();

  const role = ctx.profile?.role;
  const canManage = role === "admin" || role === "organizer";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]); // confirmados
  const [form, setForm] = useState({});
  const [generated, setGenerated] = useState(null);

  /* =========================
     LOAD
  ========================= */
  useEffect(() => {
    if (!ctx.session) {
      nav("/login");
      return;
    }
    if (!canManage) {
      nav(`/events/${eventId}`);
      return;
    }

    (async () => {
      setLoading(true);
      setMsg("");

      const ev = await supabase
        .from("events")
        .select("id,title,teams_enabled,status")
        .eq("id", eventId)
        .maybeSingle();

      if (ev.error || !ev.data) {
        setMsg("Evento não encontrado.");
        setLoading(false);
        return;
      }

      if (!ev.data.teams_enabled) {
        setMsg("Este evento não tem equipas equilibradas.");
        setLoading(false);
        return;
      }

      setEvent(ev.data);

      const rs = await supabase
        .from("event_rsvps")
        .select("user_id, profiles:user_id (name)")
        .eq("event_id", eventId)
        .eq("rsvp", "accepted");

      const list = (rs.data || []).map(r => ({
        user_id: r.user_id,
        name: r.profiles?.name || r.user_id,
      }));

      setPlayers(list);

      const rat = await supabase
        .from("event_player_ratings")
        .select("user_id,rating,is_goalkeeper")
        .eq("event_id", eventId);

      const map = {};
      for (const p of list) {
        const ex = rat.data?.find(r => r.user_id === p.user_id);
        map[p.user_id] = {
          rating: ex?.rating ?? 3,
          is_goalkeeper: ex?.is_goalkeeper ?? false,
        };
      }

      setForm(map);
      setLoading(false);
    })();
  }, [ctx.session, eventId]);

  /* =========================
     VALIDAR
  ========================= */
  const canSave = useMemo(() => {
    return players.every(p => {
      const v = form[p.user_id];
      return v && Number(v.rating) >= 1 && Number(v.rating) <= 5;
    });
  }, [players, form]);

  /* =========================
     GUARDAR RATINGS
  ========================= */
  async function saveRatings() {
    setMsg("");

    const payload = players.map(p => ({
      event_id: eventId,
      user_id: p.user_id,
      rating: Number(form[p.user_id].rating),
      is_goalkeeper: !!form[p.user_id].is_goalkeeper,
    }));

    const { error } = await supabase
      .from("event_player_ratings")
      .upsert(payload, { onConflict: "event_id,user_id" });

    if (error) return setMsg("Guardar ratings:"+ error.message);
    setMsg("Ratings guardados ✅");
  }

  /* =========================
     GERAR EQUIPAS
  ========================= */
  async function generateTeams() {
    setMsg("");

    const playersFinal = players.map(p => ({
      ...p,
      rating: Number(form[p.user_id].rating),
      is_goalkeeper: !!form[p.user_id].is_goalkeeper,
    }));

    const result = buildBalancedTeams(playersFinal);
    setGenerated(result);

    await supabase.from("event_teams").upsert(
      {
        event_id: eventId,
        team_a: result.teamA,
        team_b: result.teamB,
        stats: result.stats,
        created_by: ctx.profile.id,
      },
      { onConflict: "event_id" }
    );
  }

  /* =========================
     UI
  ========================= */
  if (loading) return <Page><div>A carregar equipas…</div></Page>;

  return (
    <Page>
      <Header
        kicker="Evento"
        title="Equipas equilibradas"
        right={<Pill label="Organizer/Admin" tone="dark" />}
      />

      {msg && (
        <Card style={{ background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontWeight: 800 }}>{msg}</div>
        </Card>
      )}

      <SectionTitle>Jogadores confirmados</SectionTitle>

      <div style={{ display: "grid", gap: 12 }}>
        {players.map(p => {
          const v = form[p.user_id];
          return (
            <Card key={p.user_id}>
              <div style={{ fontWeight: 900 }}>{p.name}</div>

              <Input
                label="Rating (1–5)"
                value={v.rating}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    [p.user_id]: { ...f[p.user_id], rating: e.target.value },
                  }))
                }
              />

              <label style={{ fontWeight: 900 }}>
                <input
                  type="checkbox"
                  checked={v.is_goalkeeper}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      [p.user_id]: { ...f[p.user_id], is_goalkeeper: e.target.checked },
                    }))
                  }
                />{" "}
                🧤 Guarda-redes
              </label>
            </Card>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <PrimaryButton onClick={saveRatings} disabled={!canSave}>
          Guardar ratings
        </PrimaryButton>
        <GhostButton onClick={generateTeams} disabled={!canSave}>
          Gerar equipas
        </GhostButton>
        <GhostButton onClick={() => nav(`/events/${eventId}`)}>
          Voltar ao evento
        </GhostButton>
      </div>

      {generated && (
  <>
    <SectionTitle>Resultado</SectionTitle>

    {/* Totais gerais */}
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Equipa A</div>
          <div style={{ color: colors.sub, fontWeight: 800, marginTop: 4 }}>
            Soma: <b>{generated.stats.sumA}</b> · Média: <b>{generated.stats.avgA}</b>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900 }}>Equipa B</div>
          <div style={{ color: colors.sub, fontWeight: 800, marginTop: 4 }}>
            Soma: <b>{generated.stats.sumB}</b> · Média: <b>{generated.stats.avgB}</b>
          </div>
        </div>

        <div style={{ alignSelf: "center" }}>
          <div style={{ fontWeight: 900 }}>Diferença</div>
          <div style={{ color: colors.sub, fontWeight: 800, marginTop: 4 }}>
            <b>{generated.stats.diff}</b>
          </div>
        </div>
      </div>
    </Card>

    {/* Cards por equipa */}
    <div
      style={{
        marginTop: 10,
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      }}
    >
      {/* A */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Equipa A</div>
          <div style={{ color: colors.sub, fontWeight: 800, fontSize: 12 }}>
            {generated.teamA.length} jogadores
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {generated.teamA.map((p) => (
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

              <div
                style={{
                  minWidth: 36,
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  background: "rgba(17,24,39,0.08)",
                }}
              >
                {p.rating}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* B */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Equipa B</div>
          <div style={{ color: colors.sub, fontWeight: 800, fontSize: 12 }}>
            {generated.teamB.length} jogadores
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {generated.teamB.map((p) => (
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

              <div
                style={{
                  minWidth: 36,
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  background: "rgba(17,24,39,0.08)",
                }}
              >
                {p.rating}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>
)}
    </Page>
  );
}
