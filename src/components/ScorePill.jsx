const COLORS = { 1:"#888780", 2:"#378ADD", 3:"#22a050", 4:"#BA7517", 5:"#D4537E" }
const EMOJIS = { 1:"🌱", 2:"⚡", 3:"🏅", 4:"🥇", 5:"👑" }
const LABELS = { 1:"Iniciante", 2:"Regular", 3:"Veterano", 4:"Elite", 5:"Lenda" }

export default function ScorePill({ type, level = 1, score = 0, onClick }) {
  const color = COLORS[level]
  const pct   = Math.min(100, score)
  const label = type === "rep" ? "Reputação" : "Atitude"
  return (
    <div onClick={onClick} style={{ flex:1, display:"flex", alignItems:"center", gap:8,
      background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.14)",
      borderRadius:10, padding:"8px 12px", cursor:"pointer" }}>
      <span style={{ fontSize:18 }}>{EMOJIS[level]}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:800, color:"#fff" }}>{LABELS[level]} N{level}</div>
        <div style={{ height:3, background:"rgba(255,255,255,0.15)", borderRadius:3, marginTop:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width .6s ease" }} />
        </div>
      </div>
    </div>
  )
}
