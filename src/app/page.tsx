'use client'

import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatTime, getReadinessLabel } from '@/lib/utils'

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
  { sport: '🚴', name: 'Sweet Spot — 2×20min',  meta: 'Hier · 1h45 · 247W · 122 TSS' },
  { sport: '🏃', name: 'Endurance fondamentale', meta: "Sam · 1h20 · 4'42/km · 68 TSS" },
  { sport: '🏊', name: 'Technique + 6×100m',     meta: "Ven · 55min · 1'28/100m · 45 TSS" },
  { sport: '🏋️', name: 'Hyrox Simulation',       meta: 'Jeu · 1h05 · 890m Ski Erg · 88 TSS' },
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
    usage: 'Un ATL élevé = tu as beaucoup travaillé récemment. Surveille l\'écart avec le CTL.',
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
    icon: '🚀', color: '#00c8e0',
    bg: 'rgba(0,200,224,0.08)', border: 'rgba(0,200,224,0.20)',
  }
  if (readiness >= 55 && tsb > -20) return {
    text: 'Privilégie une séance modérée',
    icon: '⚡', color: '#ffb340',
    bg: 'rgba(255,179,64,0.08)', border: 'rgba(255,179,64,0.20)',
  }
  return {
    text: 'Récupération recommandée',
    icon: '🔄', color: '#ff5f5f',
    bg: 'rgba(255,95,95,0.08)', border: 'rgba(255,95,95,0.20)',
  }
}

function getTSBZone(tsb: number) {
  if (tsb > 5)   return { label: 'Forme optimale',    color: '#00c8e0', bg: 'rgba(0,200,224,0.10)' }
  if (tsb > -10) return { label: 'Zone de charge',    color: '#ffb340', bg: 'rgba(255,179,64,0.10)' }
  if (tsb > -25) return { label: 'Fatigue élevée',    color: '#ff5f5f', bg: 'rgba(255,95,95,0.10)' }
  return               { label: 'Risque surmenage',   color: '#cc0000', bg: 'rgba(200,0,0,0.10)' }
}

function ReadinessRing({ score }: { score: number }) {
  const r = 35, c = 2 * Math.PI * r, off = c - (score / 100) * c
  return (
    <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke="url(#rg)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}/>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00c8e0"/>
            <stop offset="100%" stopColor="#5b6fff"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 20, lineHeight: 1, color: '#00c8e0' }}>{score}</span>
        <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>/100</span>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, overflow: 'hidden', background: 'var(--border)' }}>
        <div className={color} style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }}/>
      </div>
    </div>
  )
}

// ── Modal d'info ──────────────────────────────────
function InfoModal({ metric, onClose }: { metric: string; onClose: () => void }) {
  const info = METRIC_INFO[metric]
  if (!info) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: '1px solid var(--border-mid)',
          padding: 28, maxWidth: 420, width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0, color: '#00c8e0' }}>
            {info.title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18 }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 16 }}>
          {info.description}
        </p>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,200,224,0.07)', border: '1px solid rgba(0,200,224,0.15)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#00c8e0', marginBottom: 4 }}>💡 Comment l'utiliser</p>
          <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5, margin: 0 }}>{info.usage}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '10px',
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          Compris
        </button>
      </div>
    </div>
  )
}

// ── Stat card avec bouton info ────────────────────
function MetricCard({
  label, metricKey, value, unit, sub, valueColor, onInfo
}: {
  label: string; metricKey?: string; value: string | number; unit: string;
  sub: React.ReactNode; valueColor: string; onInfo?: (key: string) => void
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16, padding: '18px 20px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>
          {label}
        </p>
        {metricKey && onInfo && (
          <button
            onClick={() => onInfo(metricKey)}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              color: 'var(--text-dim)', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ?
          </button>
        )}
      </div>
      <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: valueColor, margin: 0 }}>
        {value}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>{unit}</span>
      </p>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>{sub}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
export default function DashboardPage() {
  const [infoModal, setInfoModal] = useState<string | null>(null)
  const now     = new Date()
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const reco    = getRecommendation(LOAD.tsb, RECOVERY.score)
  const tsbZone = getTSBZone(LOAD.tsb)

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {/* Modal */}
      {infoModal && <InfoModal metric={infoModal} onClose={() => setInfoModal(null)} />}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            Bonjour, Thomas 👋
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5, margin: '5px 0 0' }}>
            <span style={{ textTransform: 'capitalize' }}>{weekDay}</span> {dateStr} · Semaine 12
            <span style={{ color: '#00c8e0', fontWeight: 500, marginLeft: 8 }}>· {formatTime(now)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Recommandation compacte sur desktop */}
          <div
            className="hidden md:flex"
            style={{
              alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 999,
              background: reco.bg, border: `1px solid ${reco.border}`,
              fontSize: 12, fontWeight: 500, color: reco.color,
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
          padding: '10px 14px', borderRadius: 12,
          background: reco.bg, border: `1px solid ${reco.border}`,
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>{reco.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: reco.color }}>{reco.text}</span>
      </div>

      {/* ── KPIs — 4 cols desktop / 2 cols mobile ── */}
      <div
        style={{
          display: 'grid',
          gap: 12,
          marginBottom: 20,
        }}
        className="grid-cols-2 md:grid-cols-4"
      >
        <MetricCard
          label="CTL · Forme" metricKey="CTL"
          value={LOAD.ctl} unit="pts" valueColor="#00c8e0"
          sub={<span style={{ color: '#00c8e0' }}>↑ +3 cette semaine</span>}
          onInfo={setInfoModal}
        />
        <MetricCard
          label="ATL · Fatigue" metricKey="ATL"
          value={LOAD.atl} unit="pts" valueColor="#ff5f5f"
          sub={<span style={{ color: '#ff5f5f' }}>↓ Charge élevée</span>}
          onInfo={setInfoModal}
        />
        <MetricCard
          label="TSB · Forme nette" metricKey="TSB"
          value={LOAD.tsb} unit="pts" valueColor="#5b6fff"
          sub={
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 20,
              background: tsbZone.bg, color: tsbZone.color,
              fontSize: 10, fontWeight: 600,
            }}>
              {tsbZone.label}
            </span>
          }
          onInfo={setInfoModal}
        />
        <MetricCard
          label="Volume S12"
          value={LOAD.volume} unit="h" valueColor="#ffb340"
          sub={<span style={{ color: '#00c8e0' }}>↑ +1.2h vs S11</span>}
        />
      </div>

      {/* ── DESKTOP : Charge + Colonne droite ── */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Graph charge */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
              Charge hebdomadaire — 8 semaines
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {WEEK_BARS.map((b) => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${b.pct}%`, borderRadius: '4px 4px 0 0',
                  background: b.type === 'current'
                    ? 'linear-gradient(180deg,rgba(0,200,224,0.9),rgba(0,200,224,0.35))'
                    : b.type === 'recovery'
                      ? 'linear-gradient(180deg,rgba(0,200,224,0.45),rgba(0,200,224,0.12))'
                      : 'linear-gradient(180deg,rgba(91,111,255,0.55),rgba(91,111,255,0.18))',
                  border: b.type === 'current' ? '1px solid rgba(0,200,224,0.5)' : 'none',
                  boxShadow: b.type === 'current' ? '0 0 12px rgba(0,200,224,0.25)' : 'none',
                }}/>
                <span style={{
                  fontSize: 10, fontFamily: 'DM Mono,monospace',
                  color: b.type === 'current' ? '#00c8e0' : 'var(--text-dim)',
                  fontWeight: b.type === 'current' ? 600 : 400,
                }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
            <span>Réalisé : <strong style={{ color: '#00c8e0', fontFamily: 'DM Mono,monospace' }}>487 TSS</strong></span>
            <span>Cible : <strong style={{ color: 'var(--text-mid)', fontFamily: 'DM Mono,monospace' }}>520 TSS</strong></span>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Aujourd'hui */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 12px' }}>
              Aujourd'hui
            </h2>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,200,224,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏃</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Tempo Z3 — 10km</p>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>17h00 · 60min · 65 TSS</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ padding: '3px 9px', borderRadius: 20, background: 'rgba(0,200,224,0.10)', border: '1px solid rgba(0,200,224,0.20)', fontSize: 10, fontWeight: 600, color: '#00c8e0', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  ✓ Adaptée
                </span>
                <button style={{ padding: '6px 14px', borderRadius: 9, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>
                  Démarrer →
                </button>
              </div>
            </div>
          </div>

          {/* Readiness */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 12px' }}>
              Readiness
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <ReadinessRing score={RECOVERY.score} />
              <div style={{ flex: 1 }}>
                <ProgressBar label="Sommeil" value={RECOVERY.sleep} pct={RECOVERY.sleepPct} color="bg-[#5b6fff]"/>
                <ProgressBar label="HRV" value={RECOVERY.hrv} pct={RECOVERY.hrvPct} color="bg-[#00c8e0]"/>
                <ProgressBar label="FC repos" value={RECOVERY.hr} pct={RECOVERY.hrPct} color="bg-[#00e5ff]"/>
              </div>
            </div>
            <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(0,200,224,0.07)', border: '1px solid rgba(0,200,224,0.15)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00c8e0', flexShrink: 0 }}/>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#00c8e0' }}>{getReadinessLabel(RECOVERY.score)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>· Séance intensive possible</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE : Charge seule ── */}
      <div className="md:hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 12px' }}>
          Charge hebdomadaire — 8 sem.
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
          {WEEK_BARS.map((b) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: `${b.pct}%`, borderRadius: '3px 3px 0 0',
                background: b.type === 'current'
                  ? 'linear-gradient(180deg,rgba(0,200,224,0.9),rgba(0,200,224,0.35))'
                  : b.type === 'recovery'
                    ? 'linear-gradient(180deg,rgba(0,200,224,0.45),rgba(0,200,224,0.12))'
                    : 'linear-gradient(180deg,rgba(91,111,255,0.55),rgba(91,111,255,0.18))',
                border: b.type === 'current' ? '1px solid rgba(0,200,224,0.5)' : 'none',
              }}/>
              <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: b.type === 'current' ? '#00c8e0' : 'var(--text-dim)' }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Réalisé : <strong style={{ color: '#00c8e0' }}>487 TSS</strong></span>
          <span>Cible : <strong style={{ color: 'var(--text-mid)' }}>520 TSS</strong></span>
        </div>
      </div>

      {/* ── MOBILE : Readiness + Aujourd'hui côte à côte ── */}
      <div className="md:hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>

        {/* Readiness */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-card)' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 10px' }}>Readiness</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <ReadinessRing score={RECOVERY.score} />
            <div style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(0,200,224,0.10)', border: '1px solid rgba(0,200,224,0.20)', fontSize: 11, fontWeight: 600, color: '#00c8e0', textAlign: 'center' }}>
              {getReadinessLabel(RECOVERY.score)}
            </div>
          </div>
        </div>

        {/* Aujourd'hui */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-card)' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 10px' }}>Aujourd'hui</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,200,224,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🏃</div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>Tempo Z3</p>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '1px 0 0' }}>17h · 60min</p>
            </div>
          </div>
          <button style={{ width: '100%', padding: '8px', borderRadius: 9, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>
            Démarrer →
          </button>
        </div>
      </div>

      {/* ── Séances récentes ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
          Séances récentes
        </h2>
        <button style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tout voir →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {SESSIONS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,200,224,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {s.sport}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '2px 0 0' }}>{s.meta}</p>
            </div>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00c8e0', flexShrink: 0 }}/>
          </div>
        ))}
      </div>

    </div>
  )
}
