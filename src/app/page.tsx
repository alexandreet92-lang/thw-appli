import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
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

// ── Logique de recommandation ─────────────────────
function getRecommendation(tsb: number, readiness: number) {
  if (readiness >= 75 && tsb > -10) {
    return {
      text: 'Tu peux faire une séance intense aujourd\'hui',
      sub: 'Forme et récupération au vert — profite-en',
      color: '#00c8e0',
      bg: 'rgba(0,200,224,0.08)',
      border: 'rgba(0,200,224,0.20)',
      icon: '🚀',
    }
  }
  if (readiness >= 55 && tsb > -20) {
    return {
      text: 'Privilégie une séance modérée',
      sub: 'Légère fatigue détectée — évite les efforts max',
      color: '#ffb340',
      bg: 'rgba(255,179,64,0.08)',
      border: 'rgba(255,179,64,0.20)',
      icon: '⚡',
    }
  }
  return {
    text: 'Récupération recommandée aujourd\'hui',
    sub: 'Charge élevée — une séance légère ou repos',
    color: '#ff5f5f',
    bg: 'rgba(255,95,95,0.08)',
    border: 'rgba(255,95,95,0.20)',
    icon: '🔄',
  }
}

// ── TSB zone ──────────────────────────────────────
function getTSBZone(tsb: number) {
  if (tsb > 5)   return { label: 'Forme optimale',      color: '#00c8e0', bg: 'rgba(0,200,224,0.10)' }
  if (tsb > -10) return { label: 'Zone de charge',       color: '#ffb340', bg: 'rgba(255,179,64,0.10)' }
  if (tsb > -25) return { label: 'Fatigue élevée',       color: '#ff5f5f', bg: 'rgba(255,95,95,0.10)' }
  return               { label: 'Risque de surmenage',   color: '#cc0000', bg: 'rgba(200,0,0,0.10)' }
}

// ── Readiness Ring ────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const r = 35
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c
  return (
    <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="7"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke="url(#rg)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}/>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00c8e0"/>
            <stop offset="100%" stopColor="#5b6fff"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 22, lineHeight: 1, color: '#00c8e0' }}>
          {score}
        </span>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
          /100
        </span>
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────
function ProgressBar({ label, value, pct, color }: {
  label: string; value: string; pct: number; color: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--border)' }}>
        <div className={color} style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }}/>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════
export default function DashboardPage() {
  const now = new Date()
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const reco    = getRecommendation(LOAD.tsb, RECOVERY.score)
  const tsbZone = getTSBZone(LOAD.tsb)

  return (
    <div style={{ padding: '32px', maxWidth: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            Bonjour, Thomas 👋
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>
            <span style={{ textTransform: 'capitalize' }}>{weekDay}</span> {dateStr} · Semaine 12 · Phase de construction
            <span style={{ color: '#00c8e0', fontWeight: 500, marginLeft: 8 }}>· {formatTime(now)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
            Nouvelle séance
          </Button>
        </div>
      </div>

      {/* ── 1. RECOMMANDATION DU JOUR ── */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: reco.bg,
        border: `1px solid ${reco.border}`,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: reco.bg, border: `1px solid ${reco.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {reco.icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 14, color: reco.color, margin: 0 }}>
            {reco.text}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            {reco.sub}
          </p>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20,
          background: reco.bg, border: `1px solid ${reco.border}`,
          fontSize: 11, fontWeight: 600, color: reco.color,
          textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
        }}>
          Auj. recommandé
        </div>
      </div>

      {/* ── 2. KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="CTL · Forme" value={LOAD.ctl} unit="pts" variant="brand"
          sub={<span style={{ color: '#00c8e0' }}>↑ +3 cette semaine</span>}/>

        {/* ATL avec zone couleur */}
        <Card variant="red">
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
            ATL · Fatigue
          </p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: '#ff5f5f' }}>
            {LOAD.atl}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>pts</span>
          </p>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#ff5f5f' }}>↓ Charge élevée</span>
          </div>
        </Card>

        {/* TSB avec zone */}
        <Card variant="blue">
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
            TSB · Forme nette
          </p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: '#5b6fff' }}>
            {LOAD.tsb}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>pts</span>
          </p>
          <div style={{ marginTop: 8 }}>
            <span style={{
              display: 'inline-block', padding: '3px 8px', borderRadius: 20,
              background: tsbZone.bg, color: tsbZone.color,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
            }}>
              {tsbZone.label}
            </span>
          </div>
        </Card>

        <StatCard label="Volume S12" value={LOAD.volume} unit="h" variant="orange"
          sub={<span style={{ color: '#00c8e0' }}>↑ +1.2h vs S11</span>}/>
      </div>

      {/* ── 3. Charge + Droite ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 24 }}>

        {/* Graph charge */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
              Charge hebdomadaire — 8 semaines
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {['TSS', 'Volume', 'RPE'].map((t, i) => (
                <span key={t} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 7,
                  border: '1px solid',
                  borderColor: i === 0 ? 'rgba(0,200,224,0.3)' : 'var(--border)',
                  background: i === 0 ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)',
                  color: i === 0 ? '#00c8e0' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {WEEK_BARS.map((b) => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${b.pct}%`,
                  borderRadius: '4px 4px 0 0',
                  background: b.type === 'current'
                    ? 'linear-gradient(180deg,rgba(0,200,224,0.9),rgba(0,200,224,0.35))'
                    : b.type === 'recovery'
                      ? 'linear-gradient(180deg,rgba(0,200,224,0.5),rgba(0,200,224,0.15))'
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
            <span>Réalisé : <strong style={{ color: '#00c8e0', fontFamily: 'DM Mono,monospace' }}>487 TSS</strong></span>
            <span>Cible semaine : <strong style={{ color: 'var(--text-mid)', fontFamily: 'DM Mono,monospace' }}>520 TSS</strong></span>
          </div>
        </Card>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Aujourd'hui amélioré */}
          <Card>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 12 }}>
              Aujourd'hui
            </h2>
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--bg-card2)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(0,200,224,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
                }}>
                  🏃
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Tempo Z3 — 10km
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>17h00 · 60min · 65 TSS</p>
                </div>
              </div>

              {/* Badge adapté + bouton */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 20,
                  background: 'rgba(0,200,224,0.10)',
                  border: '1px solid rgba(0,200,224,0.20)',
                  fontSize: 10, fontWeight: 600, color: '#00c8e0',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  ✓ Adaptée à ta forme
                </span>
                <button style={{
                  padding: '6px 14px', borderRadius: 9,
                  background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
                  border: 'none', cursor: 'pointer',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  fontFamily: 'DM Sans,sans-serif',
                  boxShadow: '0 2px 10px rgba(0,200,224,0.3)',
                }}>
                  Démarrer →
                </button>
              </div>
            </div>
          </Card>

          {/* Readiness amélioré */}
          <Card>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 12 }}>
              Readiness
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <ReadinessRing score={RECOVERY.score} />
              <div style={{ flex: 1 }}>
                <ProgressBar label="Sommeil" value={RECOVERY.sleep} pct={RECOVERY.sleepPct} color="bg-[#5b6fff]"/>
                <ProgressBar label="HRV" value={RECOVERY.hrv} pct={RECOVERY.hrvPct} color="bg-[#00c8e0]"/>
                <ProgressBar label="FC repos" value={RECOVERY.hr} pct={RECOVERY.hrPct} color="bg-[#00e5ff]"/>
              </div>
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 9,
              background: 'rgba(0,200,224,0.07)',
              border: '1px solid rgba(0,200,224,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c8e0', flexShrink: 0, boxShadow: '0 0 6px rgba(0,200,224,0.5)' }}/>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#00c8e0' }}>
                  {getReadinessLabel(RECOVERY.score)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                  · Séance intensive possible
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 4. Séances récentes ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
          Séances récentes
        </h2>
        <button style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tout voir →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {SESSIONS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
            transition: 'all 0.2s',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(0,200,224,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
            }}>
              {s.sport}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.meta}</p>
            </div>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c8e0', flexShrink: 0, boxShadow: '0 0 6px rgba(0,200,224,0.4)' }}/>
          </div>
        ))}
      </div>

    </div>
  )
}
