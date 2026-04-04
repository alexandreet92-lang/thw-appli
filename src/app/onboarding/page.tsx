'use client'

import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id:'premium', label:'Premium', monthly:'15€/mois', annual:'129€/an', save:'28%',
    color:'#00c8e0', gradient:'linear-gradient(135deg,#00c8e0,#38bdf8)',
    features:['Suivi entraînements complet','Zones personnalisées','Connexions apps (5)','Export PDF','Historique 1 an'],
  },
  {
    id:'pro', label:'Pro', monthly:'29€/mois', annual:'199€/an', save:'43%',
    color:'#a855f7', gradient:'linear-gradient(135deg,#a855f7,#6366f1)',
    features:['Tout Premium','Connexions illimitées','Coach IA avancé','Analyses biomécanique','Historique illimité'],
    highlighted: true,
  },
  {
    id:'expert', label:'Expert', monthly:'49€/mois', annual:'349€/an', save:'41%',
    color:'#f97316', gradient:'linear-gradient(135deg,#f97316,#ef4444)',
    features:['Tout Pro','Multi-athlètes (équipe)','Dashboard coach','API accès','Support prioritaire'],
  },
]

export default function SelectPlanPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:12, color:'#fff' }}>THW</div>
        <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16 }}>THW Coaching</span>
      </div>

      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, background:'rgba(255,179,64,0.12)', border:'1px solid rgba(255,179,64,0.3)', marginBottom:14 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#ffb340' }}>⏰ Essai expiré</span>
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, margin:'0 0 10px', letterSpacing:'-0.02em' }}>Choisir un abonnement</h1>
        <p style={{ fontSize:14, color:'var(--text-dim)', margin:0, maxWidth:400 }}>
          Ton essai gratuit est terminé. Continue à progresser avec THW Coaching.
        </p>
      </div>

      {/* Plans */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:480 }}>
        {PLANS.map(p => (
          <div key={p.id} style={{ position:'relative', padding:'20px', borderRadius:16, background:'var(--bg-card)', border:`2px solid ${p.highlighted?p.color:'var(--border)'}`, boxShadow:p.highlighted?`0 0 0 1px ${p.color}33`:'var(--shadow-card)' }}>
            {p.highlighted && (
              <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', padding:'3px 14px', borderRadius:20, background:p.gradient, color:'#fff', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
                RECOMMANDÉ
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:p.color }}>{p.label}</span>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:15, fontWeight:700, color:'var(--text)', margin:0 }}>{p.annual}</p>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{p.monthly} · <span style={{ color:'#22c55e', fontWeight:600 }}>-{p.save}</span></p>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
              {p.features.map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:p.color, fontSize:12 }}>✓</span>
                  <span style={{ fontSize:12, color:'var(--text-mid)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={()=>{ /* TODO: lien Stripe */ alert(`Redirection Stripe — ${p.label}`) }}
              style={{ width:'100%', padding:'12px', borderRadius:11, background:p.gradient, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Choisir {p.label}
            </button>
            <p style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center', margin:'8px 0 0' }}>Paiement sécurisé via Stripe</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:20, textAlign:'center' }}>
        Aucun engagement · Résiliation à tout moment
      </p>
    </div>
  )
}
