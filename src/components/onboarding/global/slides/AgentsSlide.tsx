'use client'

const PAGE_AGENTS = [
  { label: 'Planning',      color: '#10B981' },
  { label: 'Récupération',  color: '#06B6D4' },
  { label: 'Nutrition',     color: '#F59E0B' },
  { label: 'Séances',       color: '#8B5CF6' },
]

export const AGENTS_META = {
  badge: 'Agents IA',
  title: 'Des assistants spécialisés',
  description: "THW Coach répond à tout. Les agents de page sont des assistants dédiés à chaque domaine — Planning, Récupération, Nutrition… 4 autres arrivent bientôt.",
  keyPoints: [
    'Chaque agent maîtrise son domaine à la perfection',
    'Accès direct depuis chaque page de l\'app',
    'Mémoire de tes données et de ton historique',
  ],
}

export function AgentsVisual() {
  return (
    <div style={{ padding: '0 4px' }}>
      {/* Carte principale THW Coach */}
      <div style={{
        padding: '16px', borderRadius: 18, marginBottom: 12,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08))',
        border: '1px solid rgba(16,185,129,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #10B981, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <img src="/logos/logo_4bras.png" alt="THW" style={{ width: 28, height: 28 }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0, fontFamily: 'Syne, sans-serif' }}>THW Coach</p>
            <p style={{ fontSize: 11, color: '#10B981', margin: '2px 0 0', fontWeight: 700, letterSpacing: 0.5, fontFamily: 'DM Sans, sans-serif' }}>DISPONIBLE</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
          Assistant IA principal avec 3 modèles (Hermès, Athéna, Zeus). Accessible depuis toute l&apos;app.
        </p>
      </div>

      {/* 4 agents page disponibles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PAGE_AGENTS.map((a, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 12,
            background: `rgba(${hexRgb(a.color)}, 0.07)`,
            border: `1px solid rgba(${hexRgb(a.color)}, 0.2)`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif' }}>{a.label}</span>
          </div>
        ))}
        {[0,1,2,3].map(i => (
          <div key={`soon-${i}`} style={{
            padding: '10px 12px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'DM Sans, sans-serif' }}>Bientôt…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
