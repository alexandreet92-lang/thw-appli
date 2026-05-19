'use client'

// SVG icons monochromes
const IcoPulse = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 12 6 12 8 5 10 19 12 12 14 15 16 12 22 12" />
  </svg>
)
const IcoHeart = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
const IcoDrop = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
)
const IcoTherm = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
)

const CARDS = [
  { id:'hrv',  Icon: IcoPulse, label:'HRV',         sub:'Variabilité cardiaque',           device:'Garmin, Whoop ou Oura' },
  { id:'rhr',  Icon: IcoHeart, label:'FC repos',    sub:'Fréquence cardiaque au repos',    device:'Garmin, Polar ou Whoop' },
  { id:'spo2', Icon: IcoDrop,  label:'SpO2',        sub:'Saturation en oxygène',           device:'Garmin ou Oura' },
  { id:'temp', Icon: IcoTherm, label:'Température', sub:'Température corporelle nocturne', device:'Oura' },
]

export default function PhysioSection() {
  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Physiologie</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Données physiologiques</h2>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12 }}>
        {CARDS.map(({ id, Icon, label, sub, device }) => (
          <div key={id} style={{
            padding:'20px 16px', borderRadius:12,
            background:'var(--bg-card2)', border:'1px solid #E5E7EB',
            display:'flex', flexDirection:'column' as const, alignItems:'center',
            gap:8, textAlign:'center' as const,
            transition:'box-shadow 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
          >
            <div style={{ color:'#9CA3AF' }}><Icon /></div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color:'var(--text-dim)' }}>{label}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,lineHeight:1.4 }}>{sub}</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,margin:0,color:'var(--text-dim)' }}>—</p>
            <span style={{ padding:'3px 9px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:9,color:'var(--text-dim)',lineHeight:1.5 }}>
              Bientôt — {device}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
