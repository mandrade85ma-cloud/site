import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function GroupInvite({ ctx }) {
  const { token } = useParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState("A validar convite...");

  useEffect(() => {
    (async () => {
      if (!ctx.session) {
        setMsg("Faz login para entrares no grupo.");
        nav("/login", { replace: true, state: { returnTo: `/g/${token}` } });
        return;
      }

      const { error } = await supabase.rpc("accept_group_invite", { p_token: token });
      if (error) {
        setMsg("Erro: " + error.message);
        return;
      }

      setMsg("Entraste no grupo ✅");
      setTimeout(() => nav("/dashboard", { replace: true }), 700);
    })();
  }, [ctx.session, token]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2>Convite para grupo</h2>
      <p>{msg}</p>
    </div>
  );
}

