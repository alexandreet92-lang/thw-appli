'use client'

const CARDS = [
  { id:'hrv',  icon:'💓', label:'HRV',        sub:'Variabilité cardiaque',           device:'Garmin, Whoop ou Oura' },
  { id:'rhr',  icon:'❤️', label:'FC repos',   sub:'Fréquence cardiaque au repos',    device:'Garmin, Polar ou Whoop' },
  { id:'spo2', icon:'🩸', label:'SpO2',       sub:'Saturation en oxygène',           device:'Garmin ou Oura' },
  { id:'temp', icon:'🌡️', label:'Température', sub:'Température corporelle nocturne', device:'Oura' },
]

export default function PhysioSection() {
  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Physiologie</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Données physiologiques</h2>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12 }}>
        {CARDS.map(c => (
          <div key={c.id} style={{
            padding:'18px 16px', borderRadius:14,
            background:'var(--bg-card2)', border:'1px dashed var(--border)',
            display:'flex', flexDirection:'column' as const, alignItems:'center', gap:6, textAlign:'center' as const,
            opacity:0.75,
          }}>
            <span style={{ fontSize:28 }}>{c.icon}</span>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color:'var(--text-dim)' }}>{c.label}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:0 }}>{c.sub}</p>
            <span style={{ padding:'3px 9px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:9,color:'var(--text-dim)',lineHeight:1.4 }}>
              🔜 {c.device}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
