'use client'

// Bandeau résumé de l'onglet Entraînement (refonte design system / pages denses) :
// KPI Volume / Séances / TSS en rangée nue (chiffres neutres, barres neutres
// animées), Volume par discipline (couleur sport = remplissage fonctionnel),
// Aujourd'hui (filet sport 3px, pas de bloc teinté plein). Présentationnel :
// toutes les valeurs sont calculées en amont et passées en props. Tokens uniquement.

import { AnimatedBar, CountUp } from '@/components/ui/AnimatedBar'

const FB = 'var(--font-body)'
const SPORT_VAR: Record<string, string> = {
  run: 'var(--sport-run)', bike: 'var(--sport-bike)', swim: 'var(--sport-swim)',
  gym: 'var(--sport-gym)', hyrox: 'var(--sport-hyrox)', rowing: 'var(--sport-rowing)',
  elliptique: 'var(--text-mid)',
}
const SPORT_LABEL: Record<string, string> = {
  run: 'Running', bike: 'Cyclisme', swim: 'Natation', hyrox: 'Hyrox',
  gym: 'Musculation', rowing: 'Aviron', elliptique: 'Elliptique',
}
const sv = (s: string) => SPORT_VAR[s] ?? 'var(--text-mid)'
const hh = (h: number) => `${h.toFixed(1).replace('.', ',')} h`
const mm = (min: number) => hh(min / 60)

interface SportStat { sport: string; doneH: number; plannedH: number }
interface SportCount { sport: string; done: number; planned: number }
interface Sess { id: string; sport: string; title: string; time: string; durationMin: number; tss?: number | null; status: string }

interface Props<S extends Sess> {
  plannedMin: number; doneMin: number
  plannedN: number; doneN: number
  plannedTSS: number; doneTSS: number
  sportCounts: SportCount[]
  sportStats: SportStat[]
  today: { day: string; date: string } | null
  todaySessions: S[]
  onOpen10w: () => void
  onOpenSession: (s: S) => void
  isModified: (s: S) => boolean
}

const label: React.CSSProperties = { fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }
const prevu: React.CSSProperties = { fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', margin: '0 0 var(--space-1)' }
const big: React.CSSProperties = { fontFamily: FB, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }
const w10: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', padding: 0 }

function Dot({ sport, size = 7 }: { sport: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: sv(sport), display: 'inline-block', flexShrink: 0 }} />
}

export function TrainingSummary<S extends Sess>(p: Props<S>) {
  const volPct = p.plannedMin ? Math.min(p.doneMin / p.plannedMin * 100, 100) : 0
  const tssPct = p.plannedTSS ? Math.min(p.doneTSS / p.plannedTSS * 100, 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* KPI — rangée nue, chiffres neutres, barres neutres animées */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={label}>Volume</p>
            <button onClick={p.onOpen10w} style={w10}>10 sem.</button>
          </div>
          <p style={prevu}>Prévu {mm(p.plannedMin)}</p>
          <p className="tnum" style={big}>{mm(p.doneMin)}</p>
          <AnimatedBar pct={volPct} color="var(--text-mid)" height={5} />
          <p className="tnum" style={{ ...prevu, margin: 'var(--space-1) 0 0' }}>{Math.round(volPct)}% réalisé</p>
        </div>
        <div>
          <p style={label}>Séances</p>
          <p style={prevu}>Prévu {p.plannedN}</p>
          <p className="tnum" style={big}><CountUp value={p.doneN} /></p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {p.sportCounts.map(s => (
              <span key={s.sport} className="tnum" style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FB, fontSize: 10, color: 'var(--text-mid)' }}>
                <Dot sport={s.sport} size={6} />{s.done}/{s.planned}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={label}>TSS</p>
            <button onClick={p.onOpen10w} style={w10}>10 sem.</button>
          </div>
          <p style={prevu}>Prévu {p.plannedTSS} pts</p>
          <p className="tnum" style={big}><CountUp value={p.doneTSS} /> pts</p>
          <AnimatedBar pct={tssPct} color="var(--text-mid)" height={5} />
        </div>
      </div>

      {/* Volume par discipline — couleur sport en remplissage (fonctionnel) */}
      {p.sportStats.length > 0 && (
        <div>
          <p style={{ ...label, marginBottom: 'var(--space-3)' }}>Volume par discipline</p>
          {p.sportStats.map(s => {
            const pct = s.plannedH > 0 ? Math.min(s.doneH / s.plannedH * 100, 100) : 0
            return (
              <div key={s.sport} style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}><Dot sport={s.sport} />{SPORT_LABEL[s.sport] ?? s.sport}</span>
                  <span className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>{hh(s.doneH)} <span style={{ color: 'var(--text-dim)' }}>/ {hh(s.plannedH)}</span></span>
                </div>
                <AnimatedBar pct={pct} color={sv(s.sport)} height={6} />
              </div>
            )
          })}
        </div>
      )}

      {/* Aujourd'hui — filet sport 3px, fond neutre, statut en tag discret */}
      {p.todaySessions.length > 0 && (
        <div>
          <p style={{ ...label, marginBottom: 'var(--space-3)' }}>Aujourd&apos;hui{p.today ? ` — ${p.today.day} ${p.today.date}` : ''}</p>
          {p.todaySessions.map(s => (
            <div key={s.id} onClick={() => p.onOpenSession(s)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', cursor: 'pointer', marginBottom: 'var(--space-2)' }}>
              <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: sv(s.sport), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: FB, fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{s.title}</p>
                <p className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{s.time} · {mm(s.durationMin)}{s.tss ? ` · ${s.tss} TSS` : ''}</p>
              </div>
              {s.status !== 'done' && p.isModified(s) && <span title="Modifié par toi" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
              <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: s.status === 'done' ? 'var(--text-mid)' : 'var(--text-dim)' }}>{s.status === 'done' ? 'Fait' : 'À faire'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
