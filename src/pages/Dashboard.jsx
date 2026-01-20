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

  // criar grupo
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
      setLoading(false);
      return;
    }

    const uid = ctx.profile.id;

    // 1) Admin: vê tudo
    if (isAdmin) {
      const all = await supabase
        .from("groups")
        .select("id,name,owner_id,created_at")
        .order("created_at", { ascending: false });

      if (all.error) setMsg("Grupos: " + all.error.message);
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

    const memberGroups = (memberOf.data || [])
      .map((r) => r.groups)
      .filter(Boolean);

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

    // merge sem duplicados
    const map = new Map();
    for (const g of [...ownedGroups, ...memberGroups]) {
      if (g?.id) map.set(g.id, g);
    }

    // ordenar por created_at desc (fallback)
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
  }, [ctx.session]);

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
      <Header kicker="Menu" title="Grupos" right={rolePill} />

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
            <div style={{ color: colors.sub, fontWeight: 800 }}>
              Não tens grupos ainda.
            </div>
            <div style={{ color: colors.sub, fontWeight: 700, marginTop: 6 }}>
              Se foste convidado, abre o link do convite.
            </div>
          </Card>
        ) : (
          groups.map((g) => (
            <Card key={g.id} onClick={() => nav(`/groups/${g.id}`)}>
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
