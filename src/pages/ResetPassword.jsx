import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("Abre o link do email para definir a nova password.");

  useEffect(() => {
    // Quando o user vem do link de recovery, o Supabase cria uma sessão temporária.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setMsg("Sessão de recuperação detectada. Define a nova password.");
    });
  }, []);

  async function setNewPassword() {
    setMsg("");
    if (pw1.length < 8) return setMsg("Password mínimo 8 caracteres.");
    if (pw1 !== pw2) return setMsg("Passwords não coincidem.");

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) return setMsg(error.message);

    setMsg("Password atualizada ✅ A redirecionar para login...");
    setTimeout(() => nav("/login", { replace: true }), 800);
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2>Reset Password</h2>
      <p>{msg}</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <input
          type="password"
          placeholder="Nova password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
        />
        <input
          type="password"
          placeholder="Repetir nova password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        <button onClick={setNewPassword}>Guardar</button>
      </div>
    </div>
  );
}
