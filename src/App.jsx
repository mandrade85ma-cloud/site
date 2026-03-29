// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

import ResetPassword   from "./pages/ResetPassword";
import Login           from "./pages/Login";
import Onboarding      from "./pages/Onboarding";
import Dashboard       from "./pages/Dashboard";
import Group           from "./pages/Group";
import AuthCallback    from "./pages/AuthCallback";
import GroupInvite     from "./pages/GroupInvite";
import EventDetail     from "./pages/EventDetail";
import EventInvite     from "./pages/EventInvite";
import EventTeams      from "./pages/EventTeams";
import EventTeamsView  from "./pages/EventTeamsView";

function isUuid(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f6f2", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, color:"#22a050" }}>A carregar...</div>
    </div>
  );
}

export default function App() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);

  // PKCE code exchange
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

  // Sessão
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Profile
  useEffect(() => {
    (async () => {
      setBooting(true);
      const uid = session?.user?.id;
      if (!uid || !isUuid(uid)) { setProfile(null); setBooting(false); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) { console.error("[profiles]", error); setProfile(null); setBooting(false); return; }
      if (!data || !data.name || data.name.trim().length < 2) {
        setProfile(data ?? null); setBooting(false);
        nav("/onboarding", { replace:true }); return;
      }
      setProfile(data); setBooting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function logout() {
    try { await supabase.auth.signOut(); }
    finally { setProfile(null); setSession(null); nav("/login", { replace:true }); }
  }

  const ctx = { session, profile, setProfile, logout };

  return (
    <Routes>
      <Route path="/"              element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"         element={<Login ctx={ctx} />} />
      <Route path="/onboarding"    element={<Onboarding ctx={ctx} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset"         element={<ResetPassword />} />

      <Route path="/dashboard"     element={booting ? <Loader /> : <Dashboard ctx={ctx} />} />
      <Route path="/groups/:groupId" element={booting ? <Loader /> : <Group ctx={ctx} />} />
      <Route path="/events/:eventId" element={booting ? <Loader /> : <EventDetail ctx={ctx} />} />
      <Route path="/events/:eventId/teams"      element={<EventTeams ctx={ctx} />} />
      <Route path="/events/:eventId/teams-view" element={<EventTeamsView ctx={ctx} />} />
      <Route path="/e/:token"      element={<EventInvite ctx={ctx} />} />
      <Route path="/g/:token"      element={<GroupInvite ctx={ctx} />} />
      <Route path="*"              element={<div style={{ padding:40, textAlign:"center" }}>404 — Página não encontrada</div>} />
    </Routes>
  );
}
