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
} from "../ui/ui";

function formatDT(dt) {
  try {
    return new Date(dt).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Dashboard({ ctx }) {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [groups, setGroups] = useState([]);
  const [myEvents, setMyEvents] = useState([]);

  const [groupName, setGroupName] = useState("");

  const role = ctx.profile?.role || "player";
  const isAdmin = role === "admin";
  const isOrganizer = role === "organizer";
  const canCreateGroups = isAdmin || isOrganizer;

  async function load() {
    setLoading(true);
    setMsg("");

    if (!ctx.profile?.id) {
      setGroups([]);
      setMyEvents([]);
      setLoading(false);
      return;
    }

    const uid = ctx.profile.id;

    // 0) Eventos ativos onde confirmaste (qualquer role)
    // (isto resolve o “aceitei e depois desaparece”)
    const ev = await supabase
      .from("event_rsvps")
      .select("event_id, events:event_id (id,title,starts_at,location,status,group_id,teams_enabled)")
      .eq("user_id", uid)
      .eq("rsvp", "accepted");

    if (ev.error) {
      setMsg((p) => (p ? p + " | " : "") + "Meus eventos: " + ev.error.message);
      setMyEvents([]);
    } else {
      const list = (ev.data || [])
        .map((r) => r.events)
        .filter((e) => e && e.status === "scheduled")
        .sort((a, b) => {
          const da = a?.starts_at ? new Date(a.starts_at).getTime() : 0;
          const db = b?.starts_at ? new Date(b.starts_at).getTime() : 0;
          return da - db;
        });
      setMyEvents(list);
    }

    // 1) Admin: vê tudo
    if (isAdmin) {
      const all = await supabase
        .from("groups")
        .select("id,name,owner_id,created_at")
        .order("created_at", { ascending: false });

      if (all.error) setMsg((p) => (p ? p + " | " : "") + "Grupos: " + all.error.message);
      setGroups(all.data || []);
      setLoading(false);
      return;
    }

    // 2) Todos: grupos onde é member
    const memberOf = await supabase
      .from("group_members")
      .select("group_id, groups:group_id (id,name,owner_id,created_at)")
      .eq("user_id", uid);

    if (memberOf.error) {
      setMsg((p) => (p ? p + " | " : "") + "Membro de: " + memberOf.error.message);
    }

    const memberGroups = (memberOf.data || []).map((r) => r.groups).filter(Boolean);

    // 3) Organizer: também vê grupos que criou
    let ownedGroups = [];
    if (isOrganizer) {
      const mine = await supabase
        .from("groups")
        .select("id,name,owner_id,created_at")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });

      if (mine.error) {
        setMsg((p) => (p ? p + " | " : "") + "Meus: " + mine.error.message);
      }
      ownedGroups = mine.data || [];
    }

    const map = new Map();
    for (const g of [...ownedGroups, ...memberGroups]) {
      if (g?.id) map.set(g.id, g);
    }

    const merged = Array.from(map.values()).sort((a, b) => {
      const da = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    setGroups(merged);
    setLoading(false);
  }

  useEffect(() => {
    if (!ctx.session) nav("/login", { replace: true });
  }, [ctx.session, nav]);

  useEffect(() => {
    if (!ctx.profile) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.profile?.id, ctx.profile?.role]);

  async function createGroup() {
    setMsg("");

    if (!canCreateGroups) return setMsg("Só admin/organizer pode criar grupos.");

    const n = groupName.trim();
    if (n.length < 2) return setMsg("Nome do grupo muito curto.");

    const ins = await supabase
      .from("groups")
      .insert({
        name: n,
        owner_id: ctx.profile.id,
      })
      .select("id")
      .single();

    if (ins.error) return setMsg("Criar grupo: " + ins.error.message);

    setGroupName("");
    await load();
    if (ins.data?.id) nav(`/groups/${ins.data.id}`);
  }

  const rolePill = useMemo(() => {
    if (isAdmin) return <Pill label="Admin" tone="dark" />;
    if (isOrganizer) return <Pill label="Organizer" tone="gray" />;
    return <Pill label="Player" tone="gray" />;
  }, [isAdmin, isOrganizer]);

  if (!ctx.profile) return <Page><div>A carregar…</div></Page>;
  if (loading) return <Page><div>A carregar…</div></Page>;

  return (
    <Page>
      <Header kicker="Menu" title="JOGA" right={rolePill} />

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

      <SectionTitle>Próximos eventos</SectionTitle>
      <div style={{ display: "grid", gap: 12 }}>
        {myEvents.length === 0 ? (
          <Card>
            <div style={{ color: colors.sub, fontWeight: 800 }}>
              Ainda não tens eventos confirmados.
            </div>
            <div style={{ color: colors.sub, fontWeight: 700, marginTop: 6 }}>
              Entra num grupo via link /g/:token ou responde a um convite.
            </div>
          </Card>
        ) : (
          myEvents.map((e) => (
            <Card key={e.id} onClick={() => nav(`/events/${e.id}`)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{e.title || "Evento"}</div>
                  <div style={{ color: colors.sub, fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                    {e.starts_at ? formatDT(e.starts_at) : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <Pill label="🟢 Ativo" tone="green" />
                  {e.teams_enabled ? <Pill label="⚽ Equipas" tone="gray" /> : null}
                </div>
              </div>
              <div style={{ marginTop: 10, color: colors.sub, fontWeight: 700, fontSize: 12 }}>
                Toca para abrir o evento.
              </div>
            </Card>
          ))
        )}
      </div>

      {canCreateGroups && (
        <>
          <SectionTitle>Criar grupo</SectionTitle>
          <Card>
            <Input
              label="Nome do grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Albogas 6F"
            />
            <div style={{ marginTop: 12 }}>
              <PrimaryButton onClick={createGroup}>Criar grupo</PrimaryButton>
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Os teus grupos</SectionTitle>
      <div style={{ display: "grid", gap: 12 }}>
        {groups.length === 0 ? (
          <Card>
            <div style={{ color: colors.sub, fontWeight: 800 }}>Não tens grupos ainda.</div>
            <div style={{ color: colors.sub, fontWeight: 700, marginTop: 6 }}>
              Se foste convidado, abre o link /g/:token.
            </div>
          </Card>
        ) : (
          groups.map((g) => (
            <Card key={g.id} onClick={() => nav(`/groups/${g.id}`)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{g.name || "Grupo"}</div>
                  <div style={{ color: colors.sub, fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                    {g.created_at ? `Criado ${formatDT(g.created_at)}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  {g.owner_id === ctx.profile.id ? (
                    <Pill label="Dono" tone="green" />
                  ) : (
                    <Pill label="Membro" tone="gray" />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10, color: colors.sub, fontWeight: 700, fontSize: 12 }}>
                Toca para ver eventos ativos.
              </div>
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}
