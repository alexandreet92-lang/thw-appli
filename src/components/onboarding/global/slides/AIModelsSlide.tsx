'use client'

const MODELS = [
  { name: 'Hermès',  color: '#d4a017', icon: '/logos/logo_3bras.png', level: 1, desc: 'Rapide et direct — Réponses immédiates, va droit au but.' },
  { name: 'Athéna',  color: '#5b6fff', icon: '/logos/logo_4bras.png', level: 2, desc: 'Analyse approfondie — Coach intelligent, données croisées, conseils précis.' },
  { name: 'Zeus',    color: '#8b5cf6', icon: '/logos/logo_6bras.png', level: 3, desc: 'Vision stratégique — Analyse maximale, profondeur et précision sans limite.' },
]

export const AI_MODELS_META = {
  badge: '3 Modèles IA',
  title: '3 niveaux d\'intelligence',
  description: 'Choisis le modèle adapté à chaque situation. Plus tu montes en niveau, plus l\'analyse est précise et détaillée.',
  keyPoints: [
    'Hermès : réponses rapides pour les décisions immédiates',
    'Athéna : coaching approfondi et personnalisé',
    'Zeus : analyse expert, ultra-précise et stratégique',
  ],
}

export function AIModelsVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
      <style>{`
        @keyframes go-slide-right { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      {MODELS.map((m, i) => (
        <div key={m.name} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 14px', borderRadius: 14,
          background: `rgba(${hexRgb(m.color)}, 0.08)`,
          border: `1px solid rgba(${hexRgb(m.color)}, 0.25)`,
          animation: `go-slide-right 0.4s ${i * 0.15}s cubic-bezier(0.16,1,0.3,1) both`,
        }}>
          <img src={m.icon} alt={m.name} style={{ width: 38, height: 38, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif' }}>{m.name}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3].map(j => (
                  <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: j <= m.level ? m.color : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif' }}>{m.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
