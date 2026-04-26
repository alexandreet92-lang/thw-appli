'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { formatTime, getReadinessLabel } from '@/lib/utils'
import { CountUp } from '@/components/ui/AnimatedBar'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — inline (replaces deleted @/styles/design-system)
// ─────────────────────────────────────────────────────────────

/** Convert hex color + alpha to rgba string */
function alpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

const C = {
  brand:    '#00c8e0',
  brandAlt: '#5b6fff',
  ctl:      '#22c55e',   // fitness — green
  atl:      '#f97316',   // fatigue — orange
  tsb:      '#00c8e0',   // balance — brand
  volume:   '#a78bfa',   // load volume — violet
  danger:   '#ef4444',
  success:  '#22c55e',
  sport: {
    running: '#f97316',
    cycling: '#3b82f6',
    hyrox:   '#ec4899',
    swim:    '#06b6d4',
  },
} as const

const SP = [0, 4, 8, 12, 16, 20, 24, 28] as const   // space scale

const R = {
  pill: '999px',
  xl:   '20px',
  lg:   '16px',
  md:   '12px',
  sm:   '8px',
} as const

const SH = {
  elevated: 'var(--shadow)',
  card:     'var(--shadow-card)',
} as const

const cardBase: React.CSSProperties = {
  background:   'var(--bg-card)',
  border:       '1px solid var(--border)',
  borderRadius: R.lg,
  padding:      '20px 24px',
  boxShadow:    SH.card,
}

const cardCompact: React.CSSProperties = {
  background:   'var(--bg-card)',
  border:       '1px solid var(--border)',
  borderRadius: R.md,
  padding:      '14px 16px',
  boxShadow:    SH.card,
}

// Typography helpers
const TY = {
  h1:       { fontFamily: "'Syne', sans-serif",    fontSize: 24, fontWeight: 800, lineHeight: 1.2 } as React.CSSProperties,
  h3:       { fontFamily: "'Syne', sans-serif",    fontSize: 15, fontWeight: 700, lineHeight: 1.3 } as React.CSSProperties,
  body:     { fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5 }                 as React.CSSProperties,
  bodySm:   { fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.5 }                 as React.CSSProperties,
  bodyXs:   { fontFamily: "'DM Sans', sans-serif", fontSize: 11, lineHeight: 1.4 }                 as React.CSSProperties,
  label:    { fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' } as React.CSSProperties,
  monoSm:   { fontFamily: "'DM Mono', monospace",  fontSize: 13, fontWeight: 500 }                 as React.CSSProperties,
  monoXs:   { fontFamily: "'DM Mono', monospace",  fontSize: 11, fontWeight: 500 }                 as React.CSSProperties,
  metricLg: { fontFamily: "'Syne', sans-serif",    fontSize: 36, fontWeight: 800, lineHeight: 1 }  as React.CSSProperties,
  metricMd: { fontFamily: "'Syne', sans-serif",    fontSize: 28, fontWeight: 800, lineHeight: 1 }  as React.CSSProperties,
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA  (CTL/ATL/TSB — calcul EWMA en cours d'implémentation)
// ─────────────────────────────────────────────────────────────

const LOAD = { ctl: 84, atl: 91, tsb: -7, volume: 12.4 }

const RECOVERY = {
  score: 75, sleep: '7h 20', hrv: '58 ms', hr: '44 bpm',
  sleepPct: 74, hrvPct: 68, hrPct: 85,
}

const WEEK_BARS = [
  { label: 'S5',  pct: 55, type: 'build'    },
  { label: 'S6',  pct: 70, type: 'build'    },
  { label: 'S7',  pct: 42, type: 'recovery' },
  { label: 'S8',  pct: 78, type: 'build'    },
  { label: 'S9',  pct: 85, type: 'build'    },
  { label: 'S10', pct: 44, type: 'recovery' },
  { label: 'S11', pct: 90, type: 'build'    },
  { label: 'S12', pct: 75, type: 'current'  },
]

const SESSIONS = [
  { abbr: 'BIKE', name: 'Sweet Spot — 2×20min',   meta: 'Hier · 1h45 · 247W · 122 TSS',           accentColor: C.sport.cycling },
  { abbr: 'RUN',  name: 'Endurance fondamentale',  meta: "Sam · 1h20 · 4'42/km · 68 TSS",          accentColor: C.sport.running },
  { abbr: 'NAT',  name: 'Technique + 6×100m',      meta: "Ven · 55min · 1'28/100m · 45 TSS",       accentColor: C.sport.swim    },
  { abbr: 'HRX',  name: 'Hyrox Simulation',        meta: 'Jeu · 1h05 · 890m Ski Erg · 88 TSS',     accentColor: C.sport.hyrox  },
]

// ─────────────────────────────────────────────────────────────
// METRIC INFO (pour les modales ?)
// ─────────────────────────────────────────────────────────────

const METRIC_INFO: Record<string, { title: string; description: string; usage: string }> = {
  CTL: {
    title: 'CTL — Chronic Training Load (Forme)',
    description: 'Moyenne pondérée exponentielle de ta charge sur 42 jours. Représente ton niveau de forme aérobie à long terme.',
    usage: 'Plus le CTL est élevé, meilleure est ta condition physique générale. Un CTL en hausse indique une progression.',
  },
  ATL: {
    title: 'ATL — Acute Training Load (Fatigue)',
    description: 'Moyenne pondérée exponentielle de ta charge sur 7 jours. Représente ta fatigue récente.',
    usage: "Un ATL élevé = tu as beaucoup travaillé récemment. Surveille l'écart avec le CTL.",
  },
  TSB: {
    title: 'TSB — Training Stress Balance (Forme nette)',
    description: 'TSB = CTL − ATL. Indique si tu es frais ou fatigué. Calculé chaque jour automatiquement.',
    usage: '> +5 : Forme optimale. Entre −10 et +5 : Zone productive. < −25 : Risque de surmenage.',
  },
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getRecommendation(tsb: number, readiness: number) {
  if (readiness >= 75 && tsb > -10) return {
    text: 'Séance intense possible aujourd\'hui',
    dot: C.brand,
    color: C.brand,
    bg:   alpha(C.brand, 0.08),
    border: alpha(C.brand, 0.20),
  }
  if (readiness >= 55 && tsb > -20) return {
    text: 'Privilégie une séance modérée',
    dot: C.volume,
    color: C.volume,
    bg:   alpha(C.volume, 0.08),
    border: alpha(C.volume, 0.20),
  }
  return {
    text: 'Récupération recommandée',
    dot: C.danger,
    color: C.danger,
    bg:   alpha(C.danger, 0.08),
    border: alpha(C.danger, 0.20),
  }
}

function getTSBZone(tsb: number) {
  if (tsb > 5)   return { label: 'Forme optimale',  color: C.ctl,    bg: alpha(C.ctl,    0.10) }
  if (tsb > -10) return { label: 'Zone de charge',  color: C.volume, bg: alpha(C.volume, 0.10) }
  if (tsb > -25) return { label: 'Fatigue élevée',  color: C.danger, bg: alpha(C.danger, 0.10) }
  return               { label: 'Risque surmenage', color: '#cc0000', bg: 'rgba(200,0,0,0.10)' }
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function ReadinessRing({ score }: { score: number }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const r = 36
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 84, height: 84 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
        <circle
          cx="42" cy="42" r={r}
          fill="none" stroke="url(#rg)" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={ready ? off : c}
          style={{
            transition: 'stroke-dashoffset 1.1s cubic-bezier(0.25,1,0.5,1)',
            willChange: 'stroke-dashoffset',
          }}
        />
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={C.brand}/>
            <stop offset="100%" stopColor={C.brandAlt}/>
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ ...TY.metricMd, color: C.brand }}>{score}</span>
        <span style={{ ...TY.label, color: 'var(--text-dim)' }}>/100</span>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, pct, barColor }: {
  label: string; value: string; pct: number; barColor: string
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ ...TY.bodyXs, color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ ...TY.monoXs, color: 'var(--text)' }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: R.pill, overflow: 'hidden', background: 'var(--border)' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: R.pill,
          background: barColor,
          transformOrigin: 'left center',
          transform: ready ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 1.1s cubic-bezier(0.25,1,0.5,1)',
          willChange: 'transform',
        }}/>
      </div>
    </div>
  )
}

function InfoModal({ metric, onClose }: { metric: string; onClose: () => void }) {
  const info = METRIC_INFO[metric]
  if (!info) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: SP[6],
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', borderRadius: R.xl,
          border: '1px solid var(--border-mid)',
          padding: SP[7], maxWidth: 440, width: '100%',
          boxShadow: SH.elevated,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP[4] }}>
          <h3 style={{ ...TY.h3, color: C.brand, margin: 0 }}>{info.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ ...TY.body, color: 'var(--text-mid)', marginBottom: SP[4] }}>{info.description}</p>
        <div style={{ padding: `${SP[3]}px ${SP[4]}px`, borderRadius: R.md, background: alpha(C.brand, 0.07), border: `1px solid ${alpha(C.brand, 0.15)}` }}>
          <p style={{ ...TY.label, color: C.brand, marginBottom: SP[1] }}>Comment l'utiliser</p>
          <p style={{ ...TY.bodySm, color: 'var(--text-mid)', margin: 0, marginTop: 6 }}>{info.usage}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: SP[5], width: '100%', padding: '11px',
            background: `linear-gradient(135deg,${C.brand},${C.brandAlt})`,
            border: 'none', borderRadius: R.md, color: '#fff',
            ...TY.h3, cursor: 'pointer',
          }}
        >
          Compris
        </button>
      </div>
    </div>
  )
}

function MetricCard({
  label, metricKey, value, unit, sub, accentColor, onInfo, delay = 0,
}: {
  label: string; metricKey?: string; value: string | number; unit: string;
  sub: React.ReactNode; accentColor: string; onInfo?: (key: string) => void; delay?: number
}) {
  const isPositiveInt = typeof value === 'number' && value >= 0 && Number.isInteger(value)

  return (
    <div
      className="card-enter"
      style={{ ...cardBase, position: 'relative', overflow: 'hidden', animationDelay: `${delay}ms` }}
    >
      {/* couleur en haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${accentColor},transparent)`,
      }}/>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP[3] }}>
        <p style={{ ...TY.label, color: 'var(--text-dim)', margin: 0 }}>{label}</p>
        {metricKey && onInfo && (
          <button
            onClick={() => onInfo(metricKey)}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              color: 'var(--text-dim)', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >?</button>
        )}
      </div>

      <p style={{ ...TY.metricLg, color: accentColor, margin: 0 }}>
        {isPositiveInt ? <CountUp value={value as number}/> : value}
        <span style={{ ...TY.bodySm, color: 'var(--text-dim)', marginLeft: 5, fontWeight: 400 }}>{unit}</span>
      </p>

      <div style={{ marginTop: SP[2], ...TY.bodySm, color: 'var(--text-dim)' }}>{sub}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [infoModal, setInfoModal] = useState<string | null>(null)

  const now     = new Date()
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const reco    = getRecommendation(LOAD.tsb, RECOVERY.score)
  const tsbZone = getTSBZone(LOAD.tsb)

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {infoModal && <InfoModal metric={infoModal} onClose={() => setInfoModal(null)} />}

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: SP[6], flexWrap: 'wrap', gap: SP[3],
      }}>
        <div>
          <h1 style={{ ...TY.h1, color: 'var(--text)', margin: 0 }}>
            Bonjour, Thomas
          </h1>
          <p style={{ ...TY.bodySm, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
            <span style={{ textTransform: 'capitalize' }}>{weekDay}</span> {dateStr} · Semaine 12
            <span style={{ color: C.brand, fontWeight: 500, marginLeft: 8 }}>· {formatTime(now)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: SP[2], alignItems: 'center' }}>
          <div
            className="hidden md:flex"
            style={{
              alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: R.pill,
              background: reco.bg, border: `1px solid ${reco.border}`,
              ...TY.bodySm, fontWeight: 500, color: reco.color,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: reco.dot, display: 'inline-block', flexShrink: 0 }}/>
            {reco.text}
          </div>
          <Button variant="ghost">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            3
          </Button>
          <Button variant="primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span className="hidden md:inline">Nouvelle séance</span>
            <span className="md:hidden">+</span>
          </Button>
        </div>
      </div>

      {/* ── Recommandation mobile ── */}
      <div
        className="md:hidden"
        style={{
          padding: `${SP[3]}px ${SP[4]}px`, borderRadius: R.md,
          background: reco.bg, border: `1px solid ${reco.border}`,
          marginBottom: SP[4],
          display: 'flex', alignItems: 'center', gap: SP[3],
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: reco.dot, display: 'inline-block', flexShrink: 0 }}/>
        <span style={{ ...TY.body, fontWeight: 500, color: reco.color }}>{reco.text}</span>
      </div>

      {/* ── KPIs — 4 cols desktop / 2 cols mobile ── */}
      <div
        style={{ display: 'grid', gap: SP[3], marginBottom: SP[5] }}
        className="grid-cols-2 md:grid-cols-4"
      >
        <MetricCard
          label="CTL · Forme" metricKey="CTL"
          value={LOAD.ctl} unit="pts" accentColor={C.ctl}
          sub={<span style={{ color: C.ctl }}>↑ +3 cette semaine</span>}
          onInfo={setInfoModal} delay={0}
        />
        <MetricCard
          label="ATL · Fatigue" metricKey="ATL"
          value={LOAD.atl} unit="pts" accentColor={C.atl}
          sub={<span style={{ color: C.atl }}>↑ Charge élevée</span>}
          onInfo={setInfoModal} delay={80}
        />
        <MetricCard
          label="TSB · Forme nette" metricKey="TSB"
          value={LOAD.tsb} unit="pts" accentColor={C.tsb}
          sub={
            <span style={{
              display: 'inline-block', padding: '2px 9px', borderRadius: R.pill,
              background: tsbZone.bg, color: tsbZone.color,
              ...TY.label,
            }}>
              {tsbZone.label}
            </span>
          }
          onInfo={setInfoModal} delay={160}
        />
        <MetricCard
          label="Volume S12"
          value={LOAD.volume} unit="h" accentColor={C.volume}
          sub={<span style={{ color: C.ctl }}>↑ +1.2h vs S11</span>}
          delay={240}
        />
      </div>

      {/* ── DESKTOP : Charge + Colonne droite ── */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr', gap: SP[4], marginBottom: SP[5] }}>

        {/* Graphe charge */}
        <div className="card-enter" style={{ ...cardBase, animationDelay: '320ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP[5] }}>
            <div>
              <h2 style={{ ...TY.h3, color: 'var(--text)', margin: 0 }}>Charge hebdomadaire</h2>
              <p style={{ ...TY.bodyXs, color: 'var(--text-dim)', margin: '4px 0 0' }}>8 dernières semaines · TSS</p>
            </div>
            <div style={{ display: 'flex', gap: SP[4], ...TY.bodyXs, color: 'var(--text-dim)' }}>
              <span>Réalisé&nbsp;<strong style={{ ...TY.monoSm, color: C.brand }}>487</strong></span>
              <span>Cible&nbsp;<strong style={{ ...TY.monoSm, color: 'var(--text-mid)' }}>520</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 88 }}>
            {WEEK_BARS.map((b, i) => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%', height: `${b.pct}%`, borderRadius: '5px 5px 0 0',
                  background: b.type === 'current'
                    ? `linear-gradient(180deg,${C.brand},${alpha(C.brand, 0.35)})`
                    : b.type === 'recovery'
                      ? `linear-gradient(180deg,${alpha(C.brand, 0.45)},${alpha(C.brand, 0.12)})`
                      : `linear-gradient(180deg,${alpha(C.brandAlt, 0.55)},${alpha(C.brandAlt, 0.18)})`,
                  border: b.type === 'current' ? `1px solid ${alpha(C.brand, 0.5)}` : 'none',
                  boxShadow: b.type === 'current' ? `0 0 14px ${alpha(C.brand, 0.30)}` : 'none',
                  transformOrigin: 'bottom center',
                  animationName: 'chartBarEnter',
                  animationDuration: '0.7s',
                  animationTimingFunction: 'cubic-bezier(0.25,1,0.5,1)',
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: 'both',
                }}/>
                <span style={{
                  ...TY.monoXs,
                  color: b.type === 'current' ? C.brand : 'var(--text-dim)',
                  fontWeight: b.type === 'current' ? 700 : 400,
                }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP[3] }}>

          {/* Aujourd'hui */}
          <div className="card-enter" style={{ ...cardBase, animationDelay: '360ms' }}>
            <h2 style={{ ...TY.h3, color: 'var(--text-mid)', margin: `0 0 ${SP[4]}px` }}>Aujourd'hui</h2>
            <div style={{ padding: `${SP[3]}px ${SP[4]}px`, borderRadius: R.md, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SP[3], marginBottom: SP[3] }}>
                <div style={{
                  width: 40, height: 40, borderRadius: R.md,
                  background: alpha(C.sport.running, 0.12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 800, color: C.sport.running }}>RUN</span>
                </div>
                <div>
                  <p style={{ ...TY.body, fontWeight: 500, margin: 0 }}>Tempo Z3 — 10 km</p>
                  <p style={{ ...TY.bodyXs, color: 'var(--text-dim)', margin: '3px 0 0' }}>17h00 · 60 min · 65 TSS</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SP[2] }}>
                <span style={{
                  padding: '3px 10px', borderRadius: R.pill,
                  background: alpha(C.brand, 0.10), border: `1px solid ${alpha(C.brand, 0.20)}`,
                  ...TY.label, color: C.brand,
                }}>
                  Adaptée
                </span>
                <button style={{
                  padding: '7px 16px', borderRadius: R.md,
                  background: `linear-gradient(135deg,${C.brand},${C.brandAlt})`,
                  border: 'none', cursor: 'pointer', color: '#fff',
                  ...TY.bodySm, fontWeight: 600,
                }}>
                  Démarrer →
                </button>
              </div>
            </div>
          </div>

          {/* Readiness */}
          <div className="card-enter" style={{ ...cardBase, animationDelay: '420ms' }}>
            <h2 style={{ ...TY.h3, color: 'var(--text-mid)', margin: `0 0 ${SP[4]}px` }}>Readiness</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP[4], marginBottom: SP[3] }}>
              <ReadinessRing score={RECOVERY.score}/>
              <div style={{ flex: 1 }}>
                <ProgressBar label="Sommeil"  value={RECOVERY.sleep} pct={RECOVERY.sleepPct} barColor={C.brandAlt}/>
                <ProgressBar label="HRV"      value={RECOVERY.hrv}   pct={RECOVERY.hrvPct}   barColor={C.brand}/>
                <ProgressBar label="FC repos" value={RECOVERY.hr}    pct={RECOVERY.hrPct}    barColor={C.success}/>
              </div>
            </div>
            <div style={{
              padding: `${SP[2]}px ${SP[3]}px`, borderRadius: R.sm,
              background: alpha(C.brand, 0.07), border: `1px solid ${alpha(C.brand, 0.15)}`,
              display: 'flex', alignItems: 'center', gap: SP[2],
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brand, flexShrink: 0 }}/>
              <span style={{ ...TY.bodySm, fontWeight: 600, color: C.brand }}>{getReadinessLabel(RECOVERY.score)}</span>
              <span style={{ ...TY.bodyXs, color: 'var(--text-dim)' }}>· Séance intensive possible</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE : Charge ── */}
      <div className="md:hidden" style={{ ...cardCompact, marginBottom: SP[3] }}>
        <h2 style={{ ...TY.h3, color: 'var(--text-mid)', margin: `0 0 ${SP[3]}px` }}>
          Charge hebdomadaire — 8 sem.
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
          {WEEK_BARS.map((b, i) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: `${b.pct}%`, borderRadius: '4px 4px 0 0',
                background: b.type === 'current'
                  ? `linear-gradient(180deg,${C.brand},${alpha(C.brand, 0.35)})`
                  : b.type === 'recovery'
                    ? `linear-gradient(180deg,${alpha(C.brand, 0.45)},${alpha(C.brand, 0.12)})`
                    : `linear-gradient(180deg,${alpha(C.brandAlt, 0.55)},${alpha(C.brandAlt, 0.18)})`,
                border: b.type === 'current' ? `1px solid ${alpha(C.brand, 0.5)}` : 'none',
                transformOrigin: 'bottom center',
                animationName: 'chartBarEnter',
                animationDuration: '0.7s',
                animationTimingFunction: 'cubic-bezier(0.25,1,0.5,1)',
                animationDelay: `${i * 40}ms`,
                animationFillMode: 'both',
              }}/>
              <span style={{ ...TY.monoXs, fontSize: 9, color: b.type === 'current' ? C.brand : 'var(--text-dim)' }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: SP[2], ...TY.bodyXs, color: 'var(--text-dim)' }}>
          <span>Réalisé&nbsp;<strong style={{ color: C.brand }}>487 TSS</strong></span>
          <span>Cible&nbsp;<strong style={{ color: 'var(--text-mid)' }}>520 TSS</strong></span>
        </div>
      </div>

      {/* ── MOBILE : Readiness + Aujourd'hui ── */}
      <div className="md:hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP[3], marginBottom: SP[4] }}>

        <div style={{ ...cardCompact }}>
          <h2 style={{ ...TY.h3, fontSize: 12, color: 'var(--text-mid)', margin: `0 0 ${SP[3]}px` }}>Readiness</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP[2] }}>
            <ReadinessRing score={RECOVERY.score}/>
            <div style={{
              padding: '4px 12px', borderRadius: R.pill,
              background: alpha(C.brand, 0.10), border: `1px solid ${alpha(C.brand, 0.20)}`,
              ...TY.label, color: C.brand, textAlign: 'center',
            }}>
              {getReadinessLabel(RECOVERY.score)}
            </div>
          </div>
        </div>

        <div style={{ ...cardCompact }}>
          <h2 style={{ ...TY.h3, fontSize: 12, color: 'var(--text-mid)', margin: `0 0 ${SP[3]}px` }}>Aujourd'hui</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP[2], marginBottom: SP[3] }}>
            <div style={{
              width: 34, height: 34, borderRadius: R.sm,
              background: alpha(C.sport.running, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 9, fontWeight: 800, color: C.sport.running }}>RUN</span>
            </div>
            <div>
              <p style={{ ...TY.bodySm, fontWeight: 500, margin: 0 }}>Tempo Z3</p>
              <p style={{ ...TY.bodyXs, color: 'var(--text-dim)', margin: '2px 0 0' }}>17h · 60 min</p>
            </div>
          </div>
          <button style={{
            width: '100%', padding: '8px',
            borderRadius: R.sm,
            background: `linear-gradient(135deg,${C.brand},${C.brandAlt})`,
            border: 'none', cursor: 'pointer', color: '#fff',
            ...TY.bodySm, fontWeight: 600,
          }}>
            Démarrer →
          </button>
        </div>
      </div>

      {/* ── Séances récentes ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP[3] }}>
        <h2 style={{ ...TY.h3, color: 'var(--text)', margin: 0 }}>Séances récentes</h2>
        <button style={{ ...TY.bodyXs, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tout voir →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: SP[3] }}>
        {SESSIONS.map((s, i) => (
          <div key={i} className="card-enter" style={{
            display: 'flex', alignItems: 'center', gap: SP[3],
            padding: SP[4], borderRadius: R.lg, cursor: 'pointer',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: SH.card,
            animationDelay: `${480 + i * 80}ms`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: R.md,
              background: alpha(s.accentColor, 0.10),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 800, color: s.accentColor }}>
                {s.abbr}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...TY.bodySm, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </p>
              <p style={{ ...TY.bodyXs, color: 'var(--text-dim)', margin: '3px 0 0' }}>{s.meta}</p>
            </div>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.accentColor, flexShrink: 0 }}/>
          </div>
        ))}
      </div>

    </div>
  )
}
