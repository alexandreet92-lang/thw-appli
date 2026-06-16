'use client'

// ══════════════════════════════════════════════════════════════
// SleepHrvTab — onglet "Sommeil & HRV" scindé en deux états :
//  • HRV : données réelles (Polar · Nightly Recharge)
//  • Sommeil : EN ATTENTE d'activation de l'accès étendu Polar (pas une erreur)
// Tokens DS uniquement, série HRV via var(--rec-hrv).
// ══════════════════════════════════════════════════════════════

import { Moon, Hourglass } from 'lucide-react'
import type { HrvRow } from './useRecoveryData'

const NUM = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: "'zero' 0" }

function fmtDate(d: string): string {
  const dt = new Date(`${d}T12:00:00`)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function Spark({ vals }: { vals: number[] }) {
  if (vals.length < 2) return null
  const W = 320, H = 60, P = 5
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const pts = vals.map((v, i) => ({
    x: P + (i / (vals.length - 1)) * (W - 2 * P),
    y: H - P - ((v - min) / range) * (H - 2 * P),
  }))
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="none" stroke="var(--rec-hrv)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3} fill="var(--rec-hrv)" />
    </svg>
  )
}

function HrvCard({ rows }: { rows: HrvRow[] }) {
  const window = rows.slice(-21)
  const last = rows[rows.length - 1]
  const last7 = rows.slice(-7)
  const avg7 = last7.length ? Math.round(last7.reduce((s, r) => s + r.hrv, 0) / last7.length) : null
  const delta = last && avg7 != null ? Math.round(last.hrv - avg7) : 0
  const dColor = delta === 0 ? 'var(--text-dim)' : delta > 0 ? 'var(--charge-low)' : 'var(--charge-hard)'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--rec-hrv)', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Variabilité cardiaque (HRV)</h2>
      </div>

      {last ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ ...NUM, fontSize: 40, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              {Math.round(last.hrv)}<span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}> ms</span>
            </span>
            {avg7 != null && (
              <span style={{ ...NUM, fontSize: 12, fontWeight: 600, color: dColor }}>
                {delta > 0 ? '+' : ''}{delta} vs moy. 7j
              </span>
            )}
          </div>
          <Spark vals={window.map(r => r.hrv)} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', margin: '10px 0 0' }}>
            Source : Polar · Nightly Recharge — dernière nuit reçue le {fmtDate(last.date)}
          </p>
        </>
      ) : (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>
          En attente de la première nuit Nightly Recharge depuis Polar.
        </p>
      )}
    </div>
  )
}

function SleepPendingCard() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Moon size={16} color="var(--text-mid)" style={{ flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Sommeil détaillé</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', padding: '4px 10px', borderRadius: 999,
          background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
          <Hourglass size={11} color="var(--text-mid)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-mid)' }}>En attente</span>
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>
        Détail du sommeil en attente d&apos;activation côté Polar. L&apos;index des nuits est bien reçu,
        mais durée / phases / score nécessitent l&apos;accès étendu Polar (demande en cours).
      </p>
    </div>
  )
}

export default function SleepHrvTab({ rows }: { rows: HrvRow[]; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HrvCard rows={rows} />
      <SleepPendingCard />
    </div>
  )
}
