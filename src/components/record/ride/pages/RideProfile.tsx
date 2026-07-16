'use client'
// Page 3 — Profil de séance. Barres cibles + trace réelle + curseur, puis la
// liste des intervalles (en cours surligné, faits estompés).
import ProfileChart from '../charts/ProfileChart'
import { zoneIndex, ZONES } from '../zones'
import type { RideView } from '../viewModel'

export default function RideProfile({ v }: { v: RideView }) {
  const curIdx = v.current ? v.plan?.blocks.indexOf(v.current) ?? -1 : -1
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>Profil de séance</div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 10, height: 150, flexShrink: 0 }}>
        <ProfileChart plan={v.plan} samples={v.samples} ftp={v.ftp} t={v.t} />
      </div>

      {!v.plan && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-mid)', fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>
          Sortie libre — aucune séance planifiée aujourd&apos;hui. La trace réelle est enregistrée.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', marginTop: 12, minHeight: 0 }}>
        {v.plan?.blocks.map((b, i) => {
          const zc = ZONES[zoneIndex(b.targetW, v.ftp)].token
          const state = i === curIdx ? 'now' : i < curIdx ? 'done' : 'todo'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px',
              borderBottom: '1px solid var(--border)',
              background: state === 'now' ? 'var(--primary-dim)' : 'transparent',
              borderRadius: state === 'now' ? 'var(--r-sm)' : 0,
            }}>
              <span style={{ width: 4, height: 26, borderRadius: 3, background: zc, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: state === 'now' ? 'var(--text)' : state === 'done' ? 'var(--text-dim)' : 'var(--text-mid)' }}>
                {b.name}{b.of ? ` ${b.rep}/${b.of}` : ''}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{b.targetW} W · {Math.round(b.durationS / 60)} min</span>
            </div>
          )
        })}
      </div>
    </>
  )
}
