// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

import ResetPassword from "./pages/ResetPassword";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Group from "./pages/Group";
import AuthCallback from "./pages/AuthCallback";
import GroupInvite from "./pages/GroupInvite";
import EventDetail from "./pages/EventDetail";
import EventInvite from "./pages/EventInvite";
import EventTeams from "./pages/EventTeams";
import EventTeamsView from "./pages/EventTeamsView";

import logo from "./assets/joga-logo.png";

function isUuid(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function App() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);

  // ✅ trocar ?code= por sessão (PKCE)
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (!error) {
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }
      }
    })();
  }, []);

  // ✅ sessão
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ profile (à prova de "undefined")
  useEffect(() => {
    (async () => {
      setBooting(true);

      const uid = session?.user?.id;

      // sem sessão -> limpa e segue
      if (!uid || !isUuid(uid)) {
        setProfile(null);
        setBooting(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        console.error("[profiles select] error:", error);
        setProfile(null);
        setBooting(false);
        return;
      }

      if (!data) {
        // não existe profile ainda -> onboarding
        setProfile(null);
        setBooting(false);
        nav("/onboarding", { replace: true });
        return;
      }

      // existe, mas sem nome -> onboarding
      if (!data.name || data.name.trim().length < 2) {
        setProfile(data);
        setBooting(false);
        nav("/onboarding", { replace: true });
        return;
      }

      setProfile(data);
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

async function logout() {
  try {
    await supabase.auth.signOut();
  } finally {
    // força estado limpo no client
    setProfile(null);
    setSession(null);
    nav("/login", { replace: true });
  }
}

  const ctx = { session, profile, setProfile };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <header
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  }}
>
  {/* LOGO */}
  <div
    onClick={() => nav("/dashboard")}
    style={{
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
    }}
  >
    <img
      src={logo}
      alt="JOGA"
      style={{
        height: 90,
        width: "auto",
        display: "block",
      }}
    />
  </div>

  {/* AÇÕES */}
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {session ? (
      <>
        <span style={{ opacity: 0.7, fontSize: 14 }}>{profile?.name}</span>
        <button onClick={logout}>Sair</button>
      </>
    ) : (
      <button onClick={() => nav("/login")}>Login</button>
    )}
  </div>
</header>

      <hr />


      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login ctx={ctx} />} />
        <Route path="/onboarding" element={<Onboarding ctx={ctx} />} />

        {/* ✅ se ainda está a arrancar profile, evita páginas “a meio” */}
        <Route
          path="/dashboard"
          element={
            booting ? (
              <div style={{ padding: 20 }}>A carregar…</div>
            ) : (
              <Dashboard ctx={ctx} />
            )
          }
        />

        <Route
          path="/groups/:groupId"
          element={booting ? <div style={{ padding: 20 }}>A carregar…</div> : <Group ctx={ctx} />}
        />

        <Route
          path="/events/:eventId"
          element={booting ? <div style={{ padding: 20 }}>A carregar…</div> : <EventDetail ctx={ctx} />}
        />

        <Route path="/events/:eventId/teams" element={<EventTeams ctx={ctx} />} />
        <Route path="/e/:token" element={<EventInvite ctx={ctx} />} />
        <Route path="/g/:token" element={<GroupInvite ctx={ctx} />} />
        <Route path="/events/:eventId/teams-view" element={<EventTeamsView ctx={ctx} />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="*" element={<div>404</div>} />
        
      </Routes>
    </div>
  );
}
