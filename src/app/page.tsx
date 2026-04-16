'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { cn, formatTime, getReadinessLabel } from '@/lib/utils'
import {
  color, type, space, radius, shadow, alpha, cardBase, cardCompact,
} from '@/styles/design-system'

const LOAD = { ctl: 84, atl: 91, tsb: -7, volume: 12.4 }
const RECOVERY = {
  score: 75, sleep: '7h 20', hrv: '58ms', hr: '44bpm',
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
  { sport: '🚴', name: 'Sweet Spot — 2×20min',  meta: 'Hier · 1h45 · 247W · 122 TSS', accentColor: color.sport.cycling },
  { sport: '🏃', name: 'Endurance fondamentale', meta: "Sam · 1h20 · 4'42/km · 68 TSS",  accentColor: color.sport.running },
  { sport: '🏊', name: 'Technique + 6×100m',     meta: "Ven · 55min · 1'28/100m · 45 TSS", accentColor: color.brand },
  { sport: '🏋️', name: 'Hyrox Simulation',       meta: 'Jeu · 1h05 · 890m Ski Erg · 88 TSS', accentColor: color.sport.hyrox },
]

const METRIC_INFO: Record<string, { title: string; description: string; usage: string }> = {
  CTL: {
    title: 'CTL — Charge Training Load (Forme)',
    description: 'Moyenne pondérée de ta charge sur 42 jours. Représente ton niveau de forme aérobie à long terme.',
    usage: 'Plus le CTL est élevé, meilleure est ta condition physique générale. Un CTL en hausse = progression.',
  },
  ATL: {
    title: 'ATL — Acute Training Load (Fatigue)',
    description: 'Moyenne pondérée de ta charge sur 7 jours. Représente ta fatigue récente.',
    usage: "Un ATL élevé = tu as beaucoup travaillé récemment. Surveille l'écart avec le CTL.",
  },
  TSB: {
    title: 'TSB — Training Stress Balance (Forme nette)',
    description: 'TSB = CTL - ATL. Indique si tu es frais ou fatigué. Calculé chaque jour automatiquement.',
    usage: '> +5 : Forme optimale. Entre -10 et +5 : Zone productive. < -25 : Risque de surmenage.',
  },
}

function getRecommendation(tsb: number, readiness: number) {
  if (readiness >= 75 && tsb > -10) return {
    text: 'Séance intense possible aujourd\'hui',
    icon: '🚀', color: color.brand,
    bg: alpha(color.brand, 0.08), border: alpha(color.brand, 0.20),
  }
  if (readiness >= 55 && tsb > -20) return {
    text: 'Privilégie une séance modérée',
    icon: '⚡', color: color.volume,
    bg: alpha(color.volume, 0.08), border: alpha(color.volume, 0.20),
  }
  return {
    text: 'Récupération recommandée',
    icon: '🔄', color: color.danger,
    bg: alpha(color.danger, 0.08), border: alpha(color.danger, 0.20),
  }
}

function getTSBZone(tsb: number) {
  if (tsb > 5)   return { label: 'Forme optimale',    color: color.ctl, bg: alpha(color.ctl, 0.10) }
  if (tsb > -10) return { label: 'Zone de charge',    color: color.volume, bg: alpha(color.volume, 0.10) }
  if (tsb > -25) return { label: 'Fatigue élevée',    color: color.danger, bg: alpha(color.danger, 0.10) }
  return               { label: 'Risque surmenage',   color: '#cc0000', bg: 'rgba(200,0,0,0.10)' }
}

// ─── Readiness ring ──────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const [ready, setReady] = useState(false)

  // Déclenche la transition CSS au prochain frame après le mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const r = 36, c = 2 * Math.PI * r, off = c - (score / 100) * c

  return (
    <div className="relative flex-shrink-0" style={{ width: 84, height: 84 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
        {/* Démarre à offset = c (anneau vide), transite vers la valeur réelle */}
        <circle
          cx="42" cy="42" r={r}
          fill="none" stroke="url(#rg)" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={ready ? off : c}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color.brand}/>
            <stop offset="100%" stopColor={color.brandAlt}/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ ...type.metricMd, color: color.brand }}>{score}</span>
        <span style={{ ...type.label, color: 'var(--text-dim)' }}>/100</span>
      </div>
    </div>
  )
}

// ─── Progress bar ────────────────────────────────────────────────
function ProgressBar({ label, value, pct, barColor }: { label: string; value: string; pct: number; barColor: string }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ ...type.bodyXs, color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ ...type.monoXs, color: 'var(--text)' }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: radius.pill, overflow: 'hidden', background: 'var(--border)' }}>
        {/* Démarre à 0, transite vers la vraie valeur au mount */}
        <div style={{
          height: '100%',
          width: ready ? `${pct}%` : '0%',
          borderRadius: radius.pill,
          background: barColor,
          transition: 'width 0.8s ease-out',
        }}/>
      </div>
    </div>
  )
}

// ─── Modal info ──────────────────────────────────────────────────
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
        padding: space[6],
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', borderRadius: radius.xl,
          border: '1px solid var(--border-mid)',
          padding: space[7], maxWidth: 440, width: '100%',
          boxShadow: shadow.elevated,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[4] }}>
          <h3 style={{ ...type.h3, color: color.brand, margin: 0 }}>{info.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ ...type.body, color: 'var(--text-mid)', marginBottom: space[4] }}>
          {info.description}
        </p>
        <div style={{ padding: `${space[3]}px ${space[4]}px`, borderRadius: radius.md, background: alpha(color.brand, 0.07), border: `1px solid ${alpha(color.brand, 0.15)}` }}>
          <p style={{ ...type.label, color: color.brand, marginBottom: space[1] }}>💡 Comment l'utiliser</p>
          <p style={{ ...type.bodySm, color: 'var(--text-mid)', margin: 0, marginTop: 6 }}>{info.usage}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: space[5], width: '100%', padding: '11px',
            background: `linear-gradient(135deg,${color.brand},${color.brandAlt})`,
            border: 'none', borderRadius: radius.md, color: '#fff',
            ...type.h3, cursor: 'pointer',
          }}
        >
          Compris
        </button>
      </div>
    </div>
  )
}

// ─── MetricCard ──────────────────────────────────────────────────
function MetricCard({
  label, metricKey, value, unit, sub, accentColor, onInfo,
}: {
  label: string; metricKey?: string; value: string | number; unit: string;
  sub: React.ReactNode; accentColor: string; onInfo?: (key: string) => void
}) {
  return (
    <div style={{
      ...cardBase,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* barre couleur en haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }}/>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] }}>
        <p style={{ ...type.label, color: 'var(--text-dim)', margin: 0 }}>{label}</p>
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

      {/* Valeur principale */}
      <p style={{ ...type.metricLg, color: accentColor, margin: 0 }}>
        {value}
        <span style={{ ...type.bodySm, color: 'var(--text-dim)', marginLeft: 5, fontWeight: 400 }}>{unit}</span>
      </p>

      <div style={{ marginTop: space[2], ...type.bodySm, color: 'var(--text-dim)' }}>{sub}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [infoModal, setInfoModal] = useState<string | null>(null)
  const now     = new Date()
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const reco    = getRecommendation(LOAD.tsb, RECOVERY.score)
  const tsbZone = getTSBZone(LOAD.tsb)

  return (
    <div style={{ padding: `${space[6]}px ${space[7]}px`, maxWidth: '100%' }}>

      {infoModal && <InfoModal metric={infoModal} onClose={() => setInfoModal(null)} />}

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: space[6], flexWrap: 'wrap', gap: space[3],
      }}>
        <div>
          <h1 style={{ ...type.h1, color: 'var(--text)', margin: 0 }}>
            Bonjour, Thomas 👋
          </h1>
          <p style={{ ...type.bodySm, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
            <span style={{ textTransform: 'capitalize' }}>{weekDay}</span> {dateStr} · Semaine 12
            <span style={{ color: color.brand, fontWeight: 500, marginLeft: 8 }}>· {formatTime(now)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: space[2], alignItems: 'center' }}>
          <div
            className="hidden md:flex"
            style={{
              alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: radius.pill,
              background: reco.bg, border: `1px solid ${reco.border}`,
              ...type.bodySm, fontWeight: 500, color: reco.color,
            }}
          >
            <span>{reco.icon}</span>
            {reco.text}
          </div>
          <Button variant="ghost">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            3
          </Button>
          <Button variant="primary">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
          padding: `${space[3]}px ${space[4]}px`, borderRadius: radius.md,
          background: reco.bg, border: `1px solid ${reco.border}`,
          marginBottom: space[4],
          display: 'flex', alignItems: 'center', gap: space[3],
        }}
      >
        <span style={{ fontSize: 18 }}>{reco.icon}</span>
        <span style={{ ...type.body, fontWeight: 500, color: reco.color }}>{reco.text}</span>
      </div>

      {/* ── KPIs — 4 cols desktop / 2 cols mobile ── */}
      <div
        style={{ display: 'grid', gap: space[3], marginBottom: space[5] }}
        className="grid-cols-2 md:grid-cols-4"
      >
        <MetricCard
          label="CTL · Forme" metricKey="CTL"
          value={LOAD.ctl} unit="pts" accentColor={color.ctl}
          sub={<span style={{ color: color.ctl }}>↑ +3 cette semaine</span>}
          onInfo={setInfoModal}
        />
        <MetricCard
          label="ATL · Fatigue" metricKey="ATL"
          value={LOAD.atl} unit="pts" accentColor={color.atl}
          sub={<span style={{ color: color.atl }}>↑ Charge élevée</span>}
          onInfo={setInfoModal}
        />
        <MetricCard
          label="TSB · Forme nette" metricKey="TSB"
          value={LOAD.tsb} unit="pts" accentColor={color.tsb}
          sub={
            <span style={{
              display: 'inline-block', padding: '2px 9px', borderRadius: radius.pill,
              background: tsbZone.bg, color: tsbZone.color,
              ...type.label,
            }}>
              {tsbZone.label}
            </span>
          }
          onInfo={setInfoModal}
        />
        <MetricCard
          label="Volume S12"
          value={LOAD.volume} unit="h" accentColor={color.volume}
          sub={<span style={{ color: color.ctl }}>↑ +1.2h vs S11</span>}
        />
      </div>

      {/* ── DESKTOP : Charge + Colonne droite ── */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr', gap: space[4], marginBottom: space[5] }}>

        {/* Graph charge */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[5] }}>
            <div>
              <h2 style={{ ...type.h3, color: 'var(--text)', margin: 0 }}>Charge hebdomadaire</h2>
              <p style={{ ...type.bodyXs, color: 'var(--text-dim)', margin: '4px 0 0' }}>8 dernières semaines · TSS</p>
            </div>
            <div style={{ display: 'flex', gap: space[4], ...type.bodyXs, color: 'var(--text-dim)' }}>
              <span>Réalisé&nbsp;
                <strong style={{ ...type.monoSm, color: color.brand }}>487</strong>
              </span>
              <span>Cible&nbsp;
                <strong style={{ ...type.monoSm, color: 'var(--text-mid)' }}>520</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 88 }}>
            {WEEK_BARS.map((b) => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%', height: `${b.pct}%`, borderRadius: '5px 5px 0 0',
                  background: b.type === 'current'
                    ? `linear-gradient(180deg,${color.brand},${alpha(color.brand, 0.35)})`
                    : b.type === 'recovery'
                      ? `linear-gradient(180deg,${alpha(color.brand, 0.45)},${alpha(color.brand, 0.12)})`
                      : `linear-gradient(180deg,${alpha(color.brandAlt, 0.55)},${alpha(color.brandAlt, 0.18)})`,
                  border: b.type === 'current' ? `1px solid ${alpha(color.brand, 0.5)}` : 'none',
                  boxShadow: b.type === 'current' ? `0 0 14px ${alpha(color.brand, 0.30)}` : 'none',
                }}/>
                <span style={{
                  ...type.monoXs,
                  color: b.type === 'current' ? color.brand : 'var(--text-dim)',
                  fontWeight: b.type === 'current' ? 700 : 400,
                }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>

          {/* Aujourd'hui */}
          <div style={{ ...cardBase }}>
            <h2 style={{ ...type.h3, color: 'var(--text-mid)', margin: `0 0 ${space[4]}px` }}>Aujourd'hui</h2>
            <div style={{ padding: `${space[3]}px ${space[4]}px`, borderRadius: radius.md, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space[3], marginBottom: space[3] }}>
                <div style={{
                  width: 40, height: 40, borderRadius: radius.md,
                  background: alpha(color.sport.running, 0.12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>🏃</div>
                <div>
                  <p style={{ ...type.body, fontWeight: 500, margin: 0 }}>Tempo Z3 — 10km</p>
                  <p style={{ ...type.bodyXs, color: 'var(--text-dim)', margin: '3px 0 0' }}>17h00 · 60min · 65 TSS</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
                <span style={{
                  padding: '3px 10px', borderRadius: radius.pill,
                  background: alpha(color.brand, 0.10), border: `1px solid ${alpha(color.brand, 0.20)}`,
                  ...type.label, color: color.brand,
                }}>
                  ✓ Adaptée
                </span>
                <button style={{
                  padding: '7px 16px', borderRadius: radius.md,
                  background: `linear-gradient(135deg,${color.brand},${color.brandAlt})`,
                  border: 'none', cursor: 'pointer', color: '#fff',
                  ...type.bodySm, fontWeight: 600,
                }}>
                  Démarrer →
                </button>
              </div>
            </div>
          </div>

          {/* Readiness */}
          <div style={{ ...cardBase }}>
            <h2 style={{ ...type.h3, color: 'var(--text-mid)', margin: `0 0 ${space[4]}px` }}>Readiness</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[4], marginBottom: space[3] }}>
              <ReadinessRing score={RECOVERY.score} />
              <div style={{ flex: 1 }}>
                <ProgressBar label="Sommeil" value={RECOVERY.sleep}  pct={RECOVERY.sleepPct} barColor={color.brandAlt}/>
                <ProgressBar label="HRV"     value={RECOVERY.hrv}    pct={RECOVERY.hrvPct}   barColor={color.brand}/>
                <ProgressBar label="FC repos" value={RECOVERY.hr}    pct={RECOVERY.hrPct}    barColor={color.success}/>
              </div>
            </div>
            <div style={{
              padding: `${space[2]}px ${space[3]}px`, borderRadius: radius.sm,
              background: alpha(color.brand, 0.07), border: `1px solid ${alpha(color.brand, 0.15)}`,
              display: 'flex', alignItems: 'center', gap: space[2],
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.brand, flexShrink: 0 }}/>
              <span style={{ ...type.bodySm, fontWeight: 600, color: color.brand }}>{getReadinessLabel(RECOVERY.score)}</span>
              <span style={{ ...type.bodyXs, color: 'var(--text-dim)' }}>· Séance intensive possible</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE : Charge seule ── */}
      <div className="md:hidden" style={{ ...cardCompact, marginBottom: space[3] }}>
        <h2 style={{ ...type.h3, color: 'var(--text-mid)', margin: `0 0 ${space[3]}px` }}>
          Charge hebdomadaire — 8 sem.
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
          {WEEK_BARS.map((b) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: `${b.pct}%`, borderRadius: '4px 4px 0 0',
                background: b.type === 'current'
                  ? `linear-gradient(180deg,${color.brand},${alpha(color.brand, 0.35)})`
                  : b.type === 'recovery'
                    ? `linear-gradient(180deg,${alpha(color.brand, 0.45)},${alpha(color.brand, 0.12)})`
                    : `linear-gradient(180deg,${alpha(color.brandAlt, 0.55)},${alpha(color.brandAlt, 0.18)})`,
                border: b.type === 'current' ? `1px solid ${alpha(color.brand, 0.5)}` : 'none',
              }}/>
              <span style={{ ...type.monoXs, fontSize: 9, color: b.type === 'current' ? color.brand : 'var(--text-dim)' }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: space[2], ...type.bodyXs, color: 'var(--text-dim)' }}>
          <span>Réalisé&nbsp;<strong style={{ color: color.brand }}>487 TSS</strong></span>
          <span>Cible&nbsp;<strong style={{ color: 'var(--text-mid)' }}>520 TSS</strong></span>
        </div>
      </div>

      {/* ── MOBILE : Readiness + Aujourd'hui ── */}
      <div className="md:hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space[3], marginBottom: space[4] }}>

        <div style={{ ...cardCompact }}>
          <h2 style={{ ...type.h3, fontSize: 12, color: 'var(--text-mid)', margin: `0 0 ${space[3]}px` }}>Readiness</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[2] }}>
            <ReadinessRing score={RECOVERY.score} />
            <div style={{
              padding: '4px 12px', borderRadius: radius.pill,
              background: alpha(color.brand, 0.10), border: `1px solid ${alpha(color.brand, 0.20)}`,
              ...type.label, color: color.brand, textAlign: 'center',
            }}>
              {getReadinessLabel(RECOVERY.score)}
            </div>
          </div>
        </div>

        <div style={{ ...cardCompact }}>
          <h2 style={{ ...type.h3, fontSize: 12, color: 'var(--text-mid)', margin: `0 0 ${space[3]}px` }}>Aujourd'hui</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2], marginBottom: space[3] }}>
            <div style={{ width: 34, height: 34, borderRadius: radius.sm, background: alpha(color.sport.running, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏃</div>
            <div>
              <p style={{ ...type.bodySm, fontWeight: 500, margin: 0 }}>Tempo Z3</p>
              <p style={{ ...type.bodyXs, color: 'var(--text-dim)', margin: '2px 0 0' }}>17h · 60min</p>
            </div>
          </div>
          <button style={{
            width: '100%', padding: '8px',
            borderRadius: radius.sm,
            background: `linear-gradient(135deg,${color.brand},${color.brandAlt})`,
            border: 'none', cursor: 'pointer', color: '#fff',
            ...type.bodySm, fontWeight: 600,
          }}>
            Démarrer →
          </button>
        </div>
      </div>

      {/* ── Séances récentes ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] }}>
        <h2 style={{ ...type.h3, color: 'var(--text)', margin: 0 }}>Séances récentes</h2>
        <button style={{ ...type.bodyXs, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tout voir →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: space[3] }}>
        {SESSIONS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: space[3],
            padding: `${space[4]}px`, borderRadius: radius.lg, cursor: 'pointer',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: shadow.card,
            transition: 'box-shadow 0.15s, border-color 0.15s',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: radius.md,
              background: alpha(s.accentColor, 0.10),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>
              {s.sport}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...type.bodySm, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </p>
              <p style={{ ...type.bodyXs, color: 'var(--text-dim)', margin: '3px 0 0' }}>{s.meta}</p>
            </div>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.accentColor, flexShrink: 0 }}/>
          </div>
        ))}
      </div>

    </div>
  )
}
