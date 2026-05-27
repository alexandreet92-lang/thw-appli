'use client'

const ACTIONS = [
  { label: "Plan d'entraînement",  model: 'Zeus',   icon: '📋' },
  { label: 'Points faibles',       model: 'Athéna', icon: '🎯' },
  { label: 'Plan nutritionnel',    model: 'Athéna', icon: '🥗' },
  { label: "Guide de l'app",       model: 'Hermès', icon: '💡' },
  { label: 'Training Analyse',     model: 'Athéna', icon: '📊' },
  { label: 'Stratégie de course',  model: 'Athéna', icon: '🏁' },
]

export const QUICK_ACTIONS_META = {
  badge: 'Actions rapides',
  title: 'Actions instantanées',
  description: "Lance une analyse, génère un plan d'entraînement ou obtiens des conseils nutritionnels — en un seul tap depuis l'interface IA.",
  keyPoints: [
    "Génération de plan d'entraînement en 1 tap",
    'Analyse de tes données et points faibles',
    'Conseils personnalisés en temps réel',
  ],
}

export function QuickActionsVisual() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 4px' }}>
      <style>{`
        @keyframes go-scale-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      {ACTIONS.map((a, i) => (
        <div key={i} style={{
          padding: '12px', borderRadius: 14,
          background: 'rgba(249,115,22,0.07)',
          border: '1px solid rgba(249,115,22,0.2)',
          animation: `go-scale-in 0.3s ${i * 0.07}s cubic-bezier(0.34,1.56,0.64,1) both`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(249,115,22,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8, fontSize: 16,
          }}>
            {a.icon}
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: '0 0 3px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.3 }}>{a.label}</p>
          <p style={{ fontSize: 10, color: 'rgba(249,115,22,0.7)', margin: 0, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{a.model}</p>
        </div>
      ))}
    </div>
  )
}
