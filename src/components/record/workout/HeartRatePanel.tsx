'use client'
// Panneau fréquence cardiaque dans l'enregistreur : BPM instant (gros), min/max
// (petit), courbe de fluctuation (SVG raw). Bouton de connexion au capteur BLE.
import type { HeartRateState } from '@/lib/record/useHeartRate'

const HR = '#ef4444'

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 40 }} />
  const w = 280, h = 40, pad = 3
  const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function HeartRatePanel({ hr, accent }: { hr: HeartRateState; accent: string }) {
  const connected = hr.status === 'connected'

  if (!connected) {
    return (
      <div style={{ margin: '12px 16px', padding: '12px 14px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={HR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.5-1.6 3-3.4 3-5.5A3.5 3.5 0 0 0 12 6 3.5 3.5 0 0 0 2 8.5c0 2.1 1.5 3.9 3 5.5l7 7 7-7z"/></svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Capteur cardio</p>
          <p style={{ fontSize: 11, color: 'var(--text-mid)', margin: '2px 0 0' }}>
            {!hr.supported ? 'Indisponible sur ce navigateur (Bluetooth non supporté)' : hr.status === 'connecting' ? 'Connexion…' : hr.status === 'error' ? 'Échec — réessayer' : 'Connecter pour suivre ta FC'}
          </p>
        </div>
        {hr.supported && (
          <button onClick={hr.connect} disabled={hr.status === 'connecting'} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, border: 'none', background: accent, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: hr.status === 'connecting' ? 0.6 : 1 }}>
            Connecter
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ margin: '12px 16px', padding: '14px 16px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: HR, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{hr.bpm ?? '—'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>bpm</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>Min</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>{hr.min ?? '—'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>Max</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>{hr.max ?? '—'}</p>
          </div>
        </div>
      </div>
      <Spark data={hr.samples} color={HR} />
    </div>
  )
}
