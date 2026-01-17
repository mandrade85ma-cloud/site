// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login({ ctx }) {
  const nav = useNavigate();
  const location = useLocation();

  // se vieres de /g/:token ou outro fluxo, volta para lá
  const returnTo = location.state?.returnTo || "/dashboard";

  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Se já houver sessão, sai do login
  useEffect(() => {
    if (ctx?.session) nav(returnTo, { replace: true });
  }, [ctx?.session, returnTo, nav]);

  async function signIn() {
    setMsg("");
    const e = email.trim().toLowerCase();

    if (!e.includes("@")) return setMsg("Email inválido.");
    if (!password) return setMsg("Mete a password.");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });
    setLoading(false);

    if (error) return setMsg(error.message);

    nav(returnTo, { replace: true });
  }

  async function signUp() {
    setMsg("");
    const n = name.trim();
    const e = email.trim().toLowerCase();

    if (n.length < 2) return setMsg("Indica o teu nome.");
    if (!e.includes("@")) return setMsg("Email inválido.");
    if (!password || password.length < 8) return setMsg("Password mínimo 8 caracteres.");

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
    });

    if (error) {
      setLoading(false);
      return setMsg(error.message);
    }

    const userId = data?.user?.id;
    if (!userId) {
      setLoading(false);
      return setMsg("Conta criada. Faz login para continuar.");
    }

    // criar perfil já com nome (evita onboarding neste fluxo)
    const { error: perr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        name: n,
        role: "player",
      },
      { onConflict: "id" }
    );

    setLoading(false);

    if (perr) return setMsg("Conta criada, mas falhou criar perfil: " + perr.message);

    setMsg("Conta criada ✅ Agora entra.");
    setMode("signin");
    setPassword("");
  }

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2 style={{ marginTop: 0 }}>
        {mode === "signin" ? "Entrar" : "Criar conta"}
      </h2>

      {mode === "signup" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
      )}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <button
        onClick={mode === "signin" ? signIn : signUp}
        disabled={loading}
        style={{ width: "100%", padding: 10 }}
      >
        {loading ? "Aguarda..." : mode === "signin" ? "Entrar" : "Criar conta"}
      </button>

      <div style={{ marginTop: 12 }}>
        {mode === "signin" ? (
          <span>
            Ainda não tens conta?{" "}
            <button
              onClick={() => {
                setMsg("");
                setMode("signup");
              }}
              style={{ marginLeft: 6 }}
            >
              Criar conta
            </button>
          </span>
        ) : (
          <span>
            Já tens conta?{" "}
            <button
              onClick={() => {
                setMsg("");
                setMode("signin");
              }}
              style={{ marginLeft: 6 }}
            >
              Entrar
            </button>
          </span>
        )}
      </div>

      {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}
    </div>
  );
}
