'use client'

// Bandeau résumé de l'onglet Entraînement (refonte design system / pages denses) :
// KPI Volume / Séances / TSS en rangée nue (chiffres neutres, barres neutres
// animées), Volume par discipline (couleur sport = remplissage fonctionnel),
// Aujourd'hui (filet sport 3px, pas de bloc teinté plein). Présentationnel :
// toutes les valeurs sont calculées en amont et passées en props. Tokens uniquement.

import { AnimatedBar, CountUp } from '@/components/ui/AnimatedBar'
import { useI18n } from '@/lib/i18n'

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
// Durée « Xh YY » — toujours heures + minutes, zéro décimale (1.5h → 1h30, 9.6h → 9h36).
const hms = (min: number) => { const m = Math.max(0, Math.round(min)); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` }
const hh = (h: number) => hms(h * 60)
const mm = (min: number) => hms(min)

interface SportStat { sport: string; doneH: number; plannedH: number; doneTSS: number; plannedTSS: number; doneSM: number; plannedSM: number; doneSN: number; plannedSN: number }
interface SportCount { sport: string; done: number; planned: number }
interface Sess { id: string; sport: string; title: string; time: string; durationMin: number; tss?: number | null; status: string }

interface Props<S extends Sess> {
  plannedMin: number; doneMin: number
  plannedN: number; doneN: number
  plannedTSS: number; doneTSS: number
  plannedSM: number; doneSM: number; plannedSN: number; doneSN: number
  sportCounts: SportCount[]
  sportStats: SportStat[]
  today: { day: string; date: string } | null
  todaySessions: S[]
  onOpen10w: () => void
  onOpenSession: (s: S) => void
  isModified: (s: S) => boolean
  /** Slot rendu entre « Volume par discipline » et « Aujourd'hui » (ex. Training Bloc). */
  belowVolume?: React.ReactNode
}

const label: React.CSSProperties = { fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }
const prevu: React.CSSProperties = { fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', margin: '0 0 var(--space-1)' }
const big: React.CSSProperties = { fontFamily: FB, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }
const w10: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', padding: 0 }
const miniLbl: React.CSSProperties = { width: 36, fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', flexShrink: 0 }
const track: React.CSSProperties = { flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }
const valS: React.CSSProperties = { width: 110, textAlign: 'right', fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }
const strongS: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 }

function Dot({ sport, size = 7 }: { sport: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: sv(sport), display: 'inline-block', flexShrink: 0 }} />
}

export function TrainingSummary<S extends Sess>(p: Props<S>) {
  const { t } = useI18n()
  const volPct = p.plannedMin ? Math.min(p.doneMin / p.plannedMin * 100, 100) : 0
  // Si doneTSS=0 (séances pas encore done + pas d'activités Strava), on affiche la charge
  // planifiée dans la jauge pour qu'elle ne reste pas vide. Sinon ratio done/planned classique.
  const smPct = p.plannedSM > 0 ? Math.min((p.doneSM > 0 ? p.doneSM : p.plannedSM) / p.plannedSM * 100, 100) : 0
  const snPct = p.plannedSN > 0 ? Math.min((p.doneSN > 0 ? p.doneSN : p.plannedSN) / p.plannedSN * 100, 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* KPI — rangée nue, chiffres neutres, barres neutres animées */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={label}>{t('planning.volume')}</p>
            <button onClick={p.onOpen10w} style={w10}>{t('planning.tenWeeks')}</button>
          </div>
          <p style={prevu}>{t('planning.planned')} {mm(p.plannedMin)}</p>
          <p className="tnum" style={big}>{mm(p.doneMin)}</p>
          <AnimatedBar pct={volPct} color="var(--text-mid)" height={5} />
          <p className="tnum" style={{ ...prevu, margin: 'var(--space-1) 0 0' }}>{t('planning.percentDone', { n: Math.round(volPct) })}</p>
        </div>
        <div>
          <p style={label}>{t('planning.sessions')}</p>
          <p style={prevu}>{t('planning.planned')} {p.plannedN}</p>
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
          <p style={label}>SM <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('planning.metabShort')}</span></p>
          <p style={prevu}>{t('planning.planned')} {p.plannedSM}</p>
          <p className="tnum" style={{ ...big, color: 'var(--primary)' }}><CountUp value={p.doneSM} /></p>
          <AnimatedBar pct={smPct} color="var(--primary)" height={5} />
        </div>
        <div>
          <p style={label}>SN <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('planning.neuroShort')}</span></p>
          <p style={prevu}>{t('planning.planned')} {p.plannedSN}</p>
          <p className="tnum" style={{ ...big, color: 'var(--sport-gym)' }}><CountUp value={p.doneSN} /></p>
          <AnimatedBar pct={snPct} color="var(--sport-gym)" height={5} />
        </div>
      </div>

      {/* Volume par discipline — 2 barres par sport (VOL. + TSS), à plat (pas de carte) */}
      {p.sportStats.length > 0 && (
        <div>
          <p style={{ ...label, marginBottom: 'var(--space-3)' }}>{t('planning.volumeByDiscipline')}</p>
          {p.sportStats.map(s => {
            const volPct = s.plannedH > 0 ? Math.min(s.doneH / s.plannedH * 100, 100) : 0
            const smPctS = s.plannedSM > 0 ? Math.min((s.doneSM > 0 ? s.doneSM : s.plannedSM) / s.plannedSM * 100, 100) : 0
            const c = sv(s.sport)
            return (
              <div key={s.sport} style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <Dot sport={s.sport} /><span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{SPORT_LABEL[s.sport] ?? s.sport}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <span style={miniLbl}>{t('planning.volShort')}</span>
                  <div style={track}><div style={{ width: `${volPct}%`, height: '100%', borderRadius: 3, background: c, animation: 'barFill 0.9s cubic-bezier(0.25,1,0.5,1) both' }} /></div>
                  <span className="tnum" style={valS}><strong style={strongS}>{hh(s.doneH)}</strong> / {hh(s.plannedH)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={miniLbl}>SM</span>
                  <div style={track}><div style={{ width: `${smPctS}%`, height: '100%', borderRadius: 3, background: 'var(--primary)', animation: 'barFill 0.9s cubic-bezier(0.25,1,0.5,1) both' }} /></div>
                  <span className="tnum" style={valS}><strong style={strongS}>{Math.round(s.doneSM)}</strong> / {s.plannedSM > 0 ? Math.round(s.plannedSM) : '--'} · SN {Math.round(s.doneSN)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Training Bloc / Planification — juste sous le volume par discipline */}
      {p.belowVolume}

      {/* Aujourd'hui — carte sombre, filet gauche sport 3px, statut discret à droite (maquette) */}
      {p.todaySessions.length > 0 && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }}>{t('planning.today')}{p.today ? ` — ${p.today.day} ${p.today.date}` : ''}</p>
          {p.todaySessions.map(s => (
            <div key={s.id} onClick={() => p.onOpenSession(s)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card2)', borderRadius: 12, padding: '12px 14px', marginBottom: 7, borderLeft: `3px solid ${sv(s.sport)}`, cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FB, fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{s.title}</div>
                <div className="tnum" style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{s.time} · {mm(s.durationMin)}{s.tss ? ` · SM ${s.tss}` : ''}</div>
              </div>
              {s.status !== 'done' && p.isModified(s) && <span title={t('planning.modifiedByYou')} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
              <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{s.status === 'done' ? t('planning.done') : t('planning.todo')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
