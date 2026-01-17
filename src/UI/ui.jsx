// src/ui/ui.js
export const colors = {
  bg: "#F6F7F9",
  card: "#FFFFFF",
  text: "#111827",
  sub: "#2A4A34",
  line: "#E5E7EB",
  green: "#16C172",
  dark: "#0F1115",
};

export function Page({ children, style }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: 18,
        color: colors.text,
        ...style,
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

export function Header({ kicker, title, right }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          {kicker && <div style={{ fontSize: 12, color: colors.sub, marginBottom: 6 }}>{kicker}</div>}
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.3 }}>{title}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

export function Card({ children, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.card,
        border: `1px solid ${colors.line}`,
        borderRadius: 22,
        padding: 14,
        boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{children}</div>
      {right}
    </div>
  );
}

export function Pill({ label, tone }) {
  const map = {
    green: { bg: "rgba(22,193,114,0.14)", fg: colors.green },
    gray: { bg: "rgba(107,114,128,0.14)", fg: colors.sub },
    dark: { bg: "rgba(15,17,21,0.10)", fg: colors.dark },
    red: { bg: "rgba(239,68,68,0.12)", fg: "#EF4444" },
  };
  const s = map[tone] || map.gray;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.fg,
        border: `1px solid rgba(17,24,39,0.06)`,
      }}
    >
      {label}
    </span>
  );
}

export function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 46,
        borderRadius: 14,
        border: "none",
        background: disabled ? "rgba(22,193,114,0.35)" : colors.green,
        color: "#0B0F0D",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 46,
        borderRadius: 14,
        border: `1px solid ${colors.line}`,
        background: "#fff",
        color: colors.text,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.sub, marginBottom: 6 }}>{label}</div>
      <input
        {...props}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 14,
          border: `1px solid ${colors.line}`,
          padding: "0 12px",
          outline: "none",
        }}
      />
    </div>
  );
}
