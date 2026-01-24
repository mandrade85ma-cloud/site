// src/pages/GroupInvite.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, Header, Page, Pill, PrimaryButton, colors } from "../ui/ui";

export default function GroupInvite({ ctx }) {
  const { token } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [group, setGroup] = useState(null);

  async function load() {
    setLoading(true);
    setMsg("");
    setGroup(null);

    // 1) token válido?
    if (!token || token === "undefined" || token.length < 6) {
      setMsg("Convite inválido.");
      setLoading(false);
      return;
    }

    // 2) precisa de login
    if (!ctx.session?.user?.id) {
      setMsg("Faz login para entrar no grupo.");
      setLoading(false);
      return;
    }

    // 3) entrar via RPC (bypass RLS)
    const { data, error } = await supabase.rpc("join_group_by_token", { p_token: token });

    if (error) {
      const m = String(error.message || "");
      if (m.includes("INVALID_TOKEN")) setMsg("Convite inválido ou expirado.");
      else setMsg("Erro no convite: " + error.message);
      setLoading(false);
      return;
    }

    const gid = data?.[0]?.group_id;
    if (!gid) {
      setMsg("Convite inválido ou expirado.");
      setLoading(false);
      return;
    }

    // 4) buscar dados do grupo para mostrar (opcional)
    const g = await supabase.from("groups").select("id,name").eq("id", gid).maybeSingle();
    if (g.error || !g.data) {
      // mesmo que falhe ler, já entrou — segue para o grupo
      nav(`/groups/${gid}`, { replace: true });
      return;
    }

    setGroup(g.data);
    setMsg("Entraste no grupo ✅");
    setLoading(false);

    // 5) redireciona
    setTimeout(() => nav(`/groups/${gid}`, { replace: true }), 400);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ctx.session?.user?.id]);

  if (loading) return <Page><div style={{ padding: 16 }}>A carregar convite…</div></Page>;

  // Se não há sessão, mostra botão para login e volta ao convite depois
  if (!ctx.session) {
    return (
      <Page>
        <Header kicker="Convite" title="Grupo" right={<Pill label="Login" tone="gray" />} />
        <Card>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Faz login para entrar</div>
          <div style={{ marginTop: 6, color: colors.sub, fontWeight: 700 }}>
            Depois do login voltas automaticamente para este convite.
          </div>
          <div style={{ marginTop: 12 }}>
            <PrimaryButton onClick={() => nav("/login", { state: { returnTo: `/g/${token}` } })}>
              Ir para login
            </PrimaryButton>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Header kicker="Convite" title="Grupo" right={<Pill label="OK" tone="green" />} />

      {msg && (
        <Card style={{ borderRadius: 16, borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontSize: 13, color: "#991B1B", fontWeight: 800 }}>{msg}</div>
        </Card>
      )}

      {group && (
        <Card style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{group.name}</div>
          <div style={{ marginTop: 6, color: colors.sub, fontWeight: 700 }}>
            A abrir o grupo…
          </div>
        </Card>
      )}
    </Page>
  );
}
