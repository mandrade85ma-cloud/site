// src/pages/Onboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, Header, Input, Page, PrimaryButton, colors } from "./ui/ui.jsx";

export default function Onboarding({ ctx }) {
  const nav = useNavigate();

  const [name, setName] = useState(ctx.profile?.name || "");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx.session) nav("/login", { replace: true });
    if (ctx.profile?.name) setName(ctx.profile.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.session, ctx.profile?.id]);

  async function save() {
    setMsg("");

    if (!ctx.session?.user?.id) {
      nav("/login", { replace: true });
      return;
    }

    const n = (name || "").trim();
    if (n.length < 2) return setMsg("Indica o teu nome (mínimo 2 letras).");

    setSaving(true);

    // ✅ Nunca passamos UUID do client — a função usa auth.uid()
    const { data, error } = await supabase.rpc("upsert_my_name", { p_name: n });

    setSaving(false);

    if (error) {
      if (String(error.message || "").includes("NO_AUTH")) return setMsg("Sessão inválida. Faz logout/login.");
      if (String(error.message || "").includes("INVALID_NAME")) return setMsg("Nome inválido.");
      return setMsg("Erro: " + error.message);
    }

    // ✅ RPC devolve a row inteira do profile
    if (data) ctx.setProfile(data);

    nav("/dashboard", { replace: true });
  }

  return (
    <Page>
      <Header kicker="JOGA" title="Onboarding" />

      <Card style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Indica o teu nome</div>
        <div style={{ marginTop: 6, color: colors.sub, fontWeight: 700 }}>
          Isto aparece nos grupos e nos eventos.
        </div>

        <div style={{ marginTop: 12 }}>
          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Miguel Andrade"
          />
        </div>

        {msg && (
          <div
            style={{
              marginTop: 12,
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12,
              padding: 10,
              color: "#991B1B",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {msg}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "A guardar…" : "Guardar"}
          </PrimaryButton>
        </div>
      </Card>
    </Page>
  );
}
