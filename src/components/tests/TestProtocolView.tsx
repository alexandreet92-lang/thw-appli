'use client'
// Vue LECTURE SEULE du protocole d'un test (le « procédé » vu dans la page
// Performance). Partagée par le Calendrier et le Planning pour afficher le
// déroulé exact d'un test avant de le planifier. Rend objectif, conditions,
// échauffement, étapes, erreurs fréquentes et fréquence conseillée.
import type { TestProtocol } from '@/lib/tests/protocols'

const HEAD: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px', display: 'flex', alignItems: 'center', gap: 6 }

function Section({ label, color, items }: { label: string; color: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p style={{ ...HEAD, color }}>{label}</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-mid)' }}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

export default function TestProtocolView({ proto, accent = 'var(--primary)' }: { proto: TestProtocol; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 12, padding: '12px 14px' }}>
        <p style={{ ...HEAD, color: accent }}>Objectif</p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', margin: 0 }}>{proto.objectif}</p>
      </div>
      {proto.avertissement && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '11px 14px' }}>
          <p style={{ ...HEAD, color: '#ef4444' }}>Avertissement</p>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)', margin: 0 }}>{proto.avertissement}</p>
        </div>
      )}
      <Section label="Conditions" color="var(--text)" items={proto.conditions} />
      <Section label="Échauffement" color="#f59e0b" items={proto.echauffement} />
      <Section label="Déroulé du test" color={accent} items={proto.etapes} />
      <Section label="Erreurs fréquentes" color="#ef4444" items={proto.erreurs} />
      {proto.frequence && (
        <div>
          <p style={{ ...HEAD, color: 'var(--text-dim)' }}>Fréquence conseillée</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-mid)', margin: 0 }}>{proto.frequence}</p>
        </div>
      )}
    </div>
  )
}
