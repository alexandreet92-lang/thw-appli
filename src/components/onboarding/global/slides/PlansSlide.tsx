'use client'

const PLANS = [
  {
    name: 'Premium', price: '14€', model: 'Hermès', color: '#06B6D4',
    trial: '14j gratuits',
    features: ['30 messages/mois', '2 plans/mois', '6 mois historique'],
    highlighted: false,
  },
  {
    name: 'Pro', price: '26€', model: 'Athéna', color: '#8B5CF6',
    trial: null,
    features: ['100 messages/mois', '6 plans/mois', '24 mois historique'],
    highlighted: true,
  },
  {
    name: 'Expert', price: '49€', model: 'Zeus', color: '#F59E0B',
    trial: null,
    features: ['300 messages/mois', '20 plans/mois', 'Historique illimité'],
    highlighted: false,
  },
]

export const PLANS_META = {
  badge: 'Abonnements',
  title: 'Choisis ton niveau',
  description: "14 jours d'essai Premium offerts. Sans engagement, sans carte bancaire. Accède à toutes les fonctionnalités pour découvrir Hybrid.",
  keyPoints: [
    '14 jours Premium gratuits dès l\'inscription',
    'Pas de carte bancaire requise pour l\'essai',
    'Upgrade ou downgrade à tout moment',
  ],
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export function PlansVisual() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', padding: '0 4px' }}>
      <style>{`
        @keyframes go-slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      {PLANS.map((plan, i) => (
        <div key={plan.name} style={{
          flex: 1, padding: '14px 10px', borderRadius: 16, position: 'relative',
          background: plan.highlighted
            ? `linear-gradient(160deg, rgba(${hexRgb(plan.color)},0.18), rgba(${hexRgb(plan.color)},0.05))`
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${plan.highlighted ? `rgba(${hexRgb(plan.color)},0.5)` : 'rgba(255,255,255,0.1)'}`,
          animation: `go-slide-up 0.4s ${i * 0.1}s cubic-bezier(0.16,1,0.3,1) both`,
        }}>
          {plan.highlighted && (
            <div style={{
              position: 'absolute', top: -10, left: '50%',
              transform: 'translateX(-50%)',
              background: `linear-gradient(135deg, ${plan.color}, #EC4899)`,
              borderRadius: 20, padding: '2px 10px',
              fontSize: 9, fontWeight: 700, color: 'white',
              whiteSpace: 'nowrap', letterSpacing: 0.5,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              POPULAIRE
            </div>
          )}

          <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: '0 0 2px', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
            {plan.name}
          </p>
          <p style={{ fontSize: 11, color: plan.color, margin: '0 0 6px', textAlign: 'center', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
            {plan.price}/mois
          </p>

          {plan.trial && (
            <div style={{ background: `rgba(${hexRgb(plan.color)},0.15)`, borderRadius: 6, padding: '3px 6px', marginBottom: 8, textAlign: 'center' }}>
              <span style={{ fontSize: 9, color: plan.color, fontWeight: 700, letterSpacing: 0.5, fontFamily: 'DM Sans, sans-serif' }}>
                {plan.trial.toUpperCase()}
              </span>
            </div>
          )}

          <p style={{ fontSize: 10, color: `rgba(${hexRgb(plan.color)},0.8)`, margin: '0 0 8px', textAlign: 'center', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            {plan.model}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {plan.features.map((f, j) => (
              <div key={j} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: `rgba(${hexRgb(plan.color)},0.25)`, border: `1px solid rgba(${hexRgb(plan.color)},0.4)`, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
