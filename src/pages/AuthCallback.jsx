import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    // Para password login isto não é usado.
    // Se alguém cair aqui por link antigo, manda para login.
    nav("/login", { replace: true });
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2>Callback</h2>
      <p>Esta rota já não é usada. A redirecionar...</p>
    </div>
  );
}
