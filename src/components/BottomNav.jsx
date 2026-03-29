import { useNavigate, useLocation } from "react-router-dom"

const ITEMS = [
  { id: "home",          icon: "🏠", label: "Início",  path: "/" },
  { id: "events",        icon: "📅", label: "Eventos", path: "/events/new" },
  { id: "notifications", icon: "🔔", label: "Alertas", path: "/notifications" },
  { id: "profile",       icon: "👤", label: "Perfil",  path: "/profile" },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <div style={{ background:"#fff", borderTop:"1px solid #e2e5de", display:"flex", padding:"8px 0 4px", position:"sticky", bottom:0, zIndex:20 }}>
      {ITEMS.map(item => {
        const active = pathname === item.path
        return (
          <div key={item.id} onClick={() => navigate(item.path)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", padding:"4px 0" }}>
            <div style={{ fontSize:19, lineHeight:1 }}>{item.icon}</div>
            <div style={{ fontSize:10, color: active ? "#22a050" : "#6b7068", fontWeight: active ? 500 : 400 }}>{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}
