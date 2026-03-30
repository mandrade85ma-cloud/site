// src/ui/ui.jsx
export const colors = {
  bg:     "#f5f6f2",
  card:   "#ffffff",
  text:   "#111410",
  sub:    "#1a7a3c",
  line:   "#e2e5de",
  green:  "#22a050",
  dark:   "#0e5c2a",
  muted:  "#6b7068",
  orange: "#d4621a",
  accent: "#f0c233",
};

/* ── Page wrapper responsivo ────────────────────────── */
export function Page({ children, style }) {
  return (
    <div className="page-container" style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      fontFamily: "'DM Sans',system-ui,sans-serif",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────── */
export function Header({ kicker, title, right, sub, onBack }) {
  return (
    <div style={{ background: colors.dark, padding: "18px 20px 20px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 0%,#1a7a3c55 0%,transparent 60%)", pointerEvents: "none" }} />
      {onBack && (
        <button onClick={onBack} style={{
          position: "relative", display: "flex", alignItems: "center", gap: 6,
          color: "rgba(255,255,255,0.65)", fontSize: 13, background: "none",
          border: "none", cursor: "pointer", marginBottom: 12, padding: 0,
        }}>
          <span style={{ width: 20, height: 20, border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>←</span>
          Voltar
        </button>
      )}
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {kicker && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{kicker}</div>}
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Syne',system-ui,sans-serif", lineHeight: 1.15, wordBreak: "break-word" }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{sub}</div>}
        </div>
        {right && <div style={{ flexShrink: 0, marginLeft: 12 }}>{right}</div>}
      </div>
    </div>
  );
}

/* ── Card ────────────────────────────────────────────── */
export function Card({ children, onClick, style }) {
  return (
    <div onClick={onClick}
      style={{ background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 14, padding: 14, cursor: onClick ? "pointer" : "default", transition: "border-color .15s", ...style }}
      onMouseEnter={onClick ? e => e.currentTarget.style.borderColor = colors.green : undefined}
      onMouseLeave={onClick ? e => e.currentTarget.style.borderColor = colors.line  : undefined}>
      {children}
    </div>
  );
}

/* ── SectionTitle ───────────────────────────────────── */
export function SectionTitle({ children, right, onRightClick }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, fontFamily: "'Syne',system-ui,sans-serif" }}>{children}</div>
      {right && <div onClick={onRightClick} style={{ fontSize: 12, color: colors.green, fontWeight: 500, cursor: onRightClick ? "pointer" : "default" }}>{right}</div>}
    </div>
  );
}

/* ── Pill ────────────────────────────────────────────── */
export function Pill({ label, tone }) {
  const map = {
    green:  { bg: "#e8f5ee", fg: "#1a7a3c" },
    gray:   { bg: "#f0f0ee", fg: "#6b7068" },
    dark:   { bg: "#e8f5ee", fg: "#0e5c2a" },
    red:    { bg: "#fde8e8", fg: "#a02020" },
    amber:  { bg: "#fff7e0", fg: "#854F0B" },
    orange: { bg: "#fdf0e8", fg: "#7a3a10" },
  };
  const s = map[tone] ?? map.gray;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/* ── PrimaryButton ───────────────────────────────────── */
export function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", height: 46, borderRadius: 10, border: "none",
      background: disabled ? "#c8dfc8" : colors.green,
      color: disabled ? "#8aaa8a" : "#fff",
      fontWeight: 700, fontSize: 14,
      fontFamily: "'Syne',system-ui,sans-serif",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.02em", transition: "background .15s",
      ...style,
    }}>
      {children}
    </button>
  );
}

/* ── GhostButton ─────────────────────────────────────── */
export function GhostButton({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", height: 46, borderRadius: 10,
      border: `1.5px solid ${colors.line}`,
      background: "#fff", color: colors.text,
      fontWeight: 600, fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color .15s",
      ...style,
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = colors.green)}
    onMouseLeave={e => !disabled && (e.currentTarget.style.borderColor = colors.line)}>
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────── */
export function Input({ label, ...props }) {
  return (
    <div style={{ marginTop: 10 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>}
      <input {...props} style={{
        width: "100%", height: 44, borderRadius: 9,
        border: `1.5px solid ${colors.line}`,
        padding: "0 14px", outline: "none",
        fontSize: 14, color: colors.text,
        background: "#fafbf9",
        fontFamily: "inherit",
        transition: "border-color .15s",
        boxSizing: "border-box",
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = colors.green; props.onFocus?.(e); }}
      onBlur={e  => { e.target.style.borderColor = colors.line;  props.onBlur?.(e);  }} />
    </div>
  );
}

/* ── BottomNav ───────────────────────────────────────── 
   Usa só rotas existentes no App.jsx:
   /dashboard, /groups/:id, /onboarding
────────────────────────────────────────────────────── */
export function BottomNav({ active, firstGroupId }) {
  const items = [
    { id: "home",    icon: "🏠", label: "Início",  path: "/dashboard" },
    { id: "group",   icon: "👥", label: "Grupo",   path: firstGroupId ? `/groups/${firstGroupId}` : null },
    { id: "invite",  icon: "🔗", label: "Convidar",path: firstGroupId ? `/groups/${firstGroupId}` : null },
    { id: "profile", icon: "👤", label: "Perfil",  path: "/onboarding" },
  ];

  return (
    <div style={{
      background: "#fff",
      borderTop: `1px solid ${colors.line}`,
      display: "flex",
      padding: "8px 0",
      paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
      position: "sticky",
      bottom: 0,
      zIndex: 20,
      flexShrink: 0,
    }}>
      {items.map(item => {
        const isActive = active === item.id;
        const enabled  = !!item.path;
        return (
          <div key={item.id}
            onClick={() => enabled && (window.location.href = item.path)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              cursor: enabled ? "pointer" : "default",
              padding: "4px 0",
              opacity: enabled ? 1 : 0.35,
            }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</div>
            <div style={{ fontSize: 10, color: isActive ? colors.green : colors.muted, fontWeight: isActive ? 500 : 400 }}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── ScorePill ───────────────────────────────────────── */
const LEVEL_COLORS = { 1:"#888780", 2:"#378ADD", 3:"#22a050", 4:"#BA7517", 5:"#D4537E" };
const LEVEL_EMOJIS = { 1:"🌱", 2:"⚡", 3:"🏅", 4:"🥇", 5:"👑" };
const LEVEL_LABELS = { 1:"Iniciante", 2:"Regular", 3:"Veterano", 4:"Elite", 5:"Lenda" };

export function ScorePill({ type, level = 1, score = 0, onClick }) {
  const color = LEVEL_COLORS[level];
  const label = type === "rep" ? "Reputação" : "Atitude";
  return (
    <div onClick={onClick} style={{
      flex: 1, display: "flex", alignItems: "center", gap: 8,
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 10, padding: "8px 12px",
      cursor: onClick ? "pointer" : "default",
      minWidth: 0,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{LEVEL_EMOJIS[level]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {LEVEL_LABELS[level]} N{level}
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, score)}%`, background: color, borderRadius: 3, transition: "width .6s ease" }} />
        </div>
      </div>
    </div>
  );
}
