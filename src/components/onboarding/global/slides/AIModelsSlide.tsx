'use client'
import { useI18n } from '@/lib/i18n'

const MODELS = [
  { name: 'Hermès',  color: '#d4a017', icon: '/logos/logo_3bras.png', level: 1, desc: 'onboarding.g.aiModels.hermesDesc' },
  { name: 'Athéna',  color: '#5b6fff', icon: '/logos/logo_4bras.png', level: 2, desc: 'onboarding.g.aiModels.athenaDesc' },
  { name: 'Zeus',    color: '#8b5cf6', icon: '/logos/logo_6bras.png', level: 3, desc: 'onboarding.g.aiModels.zeusDesc' },
]

export const AI_MODELS_META = {
  badge: 'onboarding.g.aiModels.badge',
  title: 'onboarding.g.aiModels.title',
  description: 'onboarding.g.aiModels.desc',
  keyPoints: [
    'onboarding.g.aiModels.kp1',
    'onboarding.g.aiModels.kp2',
    'onboarding.g.aiModels.kp3',
  ],
}

export function AIModelsVisual() {
  const { t } = useI18n()
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
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif' }}>{t(m.desc)}</p>
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
