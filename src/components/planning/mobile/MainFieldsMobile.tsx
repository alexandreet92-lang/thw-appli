'use client'
// ══════════════════════════════════════════════════════════════════
// Écran principal MOBILE en cartes (maquette mock7) : Sport (icônes
// couleur sport + segmentés), Type de séance (chips), Date & Heure
// (lignes à chevron → sélecteurs natifs), Effort perçu + Durée (gros
// chiffres + jauges), Tes repères, Description. Mêmes champs, setters et
// règles que MainFields (desktop) — seul le rendu change.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IconChevronRight, IconPencil } from '@tabler/icons-react'
import { SPORT_ICON, sportKeyFromType } from '@/components/icons/SportIcon'
import {
  type SportType, type CyclingSub, type RunningSub, type RunFamily,
  SPORT_SHORT, CYCLING_SUB_LABEL, RUNNING_SUB_LABEL, RUN_FAMILY_LABEL, RUN_FAMILY_TYPES, TRAINING_TYPES,
} from '@/app/planning/page'
import { sportColor, fmtDur, parseDurInput } from './editorial'
import { Gauge } from './ui'
import { MCard, MSeg, mChip, HAIR } from './mobileKit'
import { useI18n } from '@/lib/i18n'
import { listContinuationKeyDown } from '@/lib/ui/listContinuation'

const SPORTS: SportType[] = ['run', 'bike', 'swim', 'hyrox', 'gym', 'rowing', 'elliptique', 'hybrid', 'boxe', 'mobilite', 'autres']
const RPE_DESC = ['planning.rpeVeryEasy', 'planning.rpeVeryEasy', 'planning.rpeEasy', 'planning.rpeEasy', 'planning.rpeModerate', 'planning.rpeModerate', 'planning.rpeSustained', 'planning.rpeHard', 'planning.rpeVeryHard', 'planning.rpeMaximal']
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' }

export interface MainFieldsMobileProps {
  reserveMode?: boolean
  programMode?: boolean
  sport: SportType; accent: string; onSportChange: (s: SportType) => void
  lockSport?: boolean
  cyclingSub: CyclingSub; setCyclingSub: (s: CyclingSub) => void
  runningSub: RunningSub; setRunningSub: (s: RunningSub) => void
  runFamily?: RunFamily; setRunFamily?: (f: RunFamily) => void
  brickRun: boolean; setBrickRun: (b: boolean) => void
  onBrickButton?: () => void
  trainingTypes: string[]; setTrainingTypes: (t: string[]) => void
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void
  dur: number; setDur: (n: number) => void
  rpe: number; setRpe: (n: number) => void
  desc: string; setDesc: (v: string) => void
  athlete: { ftp: number | null; lthrBike: number | null; lthrRun: number | null; runThresholdPaceStr: string | null; swimCSSStr: string | null; hrMax: number | null } | null
}

/** Pastille d'icône sport : teinte légère + icône couleur sport ; sélection = disque plein + icône blanche. */
function SportDisc({ sport, on }: { sport: SportType; on: boolean }) {
  const key = sportKeyFromType(sport)
  const cfg = key ? SPORT_ICON[key] : undefined
  const col = sportColor(sport)
  if (!cfg) return <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--sem-field)' }} />
  const { Icon } = cfg
  return (
    <span style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
      background: on ? col : `color-mix(in srgb, ${col} 14%, transparent)` }}>
      <Icon size={22} stroke={2.1} color={on ? 'var(--on-primary)' : col} />
    </span>
  )
}

/** Durée → gros nombre + petite unité (« 40 min » / « 1h05 »). */
function durParts(min: number): { big: string; small: string } {
  const h = Math.floor((min || 0) / 60), m = Math.round((min || 0) % 60)
  if (h === 0) return { big: String(m), small: 'min' }
  return { big: m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`, small: '' }
}

export function MainFieldsMobile(p: MainFieldsMobileProps) {
  const { t: tr, lang } = useI18n()
  const trainTypes = p.sport === 'run' ? RUN_FAMILY_TYPES[p.runFamily ?? 'endurance'] : (TRAINING_TYPES[p.sport] ?? [])
  const rpeIdx = Math.max(0, Math.min(9, Math.round(p.rpe) - 1))
  const [durEdit, setDurEdit] = useState(false)
  const descRef = useRef<HTMLTextAreaElement | null>(null)
  const sportRowRef = useRef<HTMLDivElement | null>(null)

  // Description : hauteur auto (jamais de double défilement sur mobile).
  useLayoutEffect(() => {
    const el = descRef.current; if (!el) return
    el.style.height = 'auto'; el.style.height = `${Math.max(120, el.scrollHeight)}px`
  }, [p.desc])
  // Sport sélectionné visible dans la rangée défilante.
  useEffect(() => {
    const row = sportRowRef.current; if (!row) return
    const el = row.querySelector<HTMLElement>('[data-on="1"]')
    if (el) row.scrollLeft = Math.max(0, el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2)
  }, [p.sport])

  // Mini-stats par sport (réfs manquantes masquées) — identiques à MainFields.
  const stats: { label: string; value: string }[] = []
  const a = p.athlete
  if (a) {
    if (p.sport === 'bike') { if (a.ftp) stats.push({ label: 'FTP', value: `${a.ftp} W` }); if (a.lthrBike) stats.push({ label: 'LTHR', value: `${a.lthrBike}` }) }
    else if (p.sport === 'run') { if (a.runThresholdPaceStr) stats.push({ label: tr('planning.threshold'), value: `${a.runThresholdPaceStr}/km` }); if (a.lthrRun) stats.push({ label: 'LTHR', value: `${a.lthrRun}` }) }
    else if (p.sport === 'swim') { if (a.swimCSSStr) stats.push({ label: 'CSS', value: `${a.swimCSSStr}/100m` }) }
    if (a.hrMax) stats.push({ label: tr('planning.hrMax'), value: `${a.hrMax}` })
  }

  const showSportRow = !p.reserveMode || !!p.programMode
  const hasSub = p.sport === 'bike' || p.sport === 'run'
  const dateLabel = (() => {
    if (!p.date) return '—'
    const d = new Date(`${p.date}T12:00:00`)
    if (isNaN(d.getTime())) return p.date
    const s = d.toLocaleDateString(LOCALE[lang] ?? 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()
  const dp = durParts(p.dur)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Sport ── */}
      {(showSportRow || hasSub) && (
        <MCard data-guide="builder-sport" title={showSportRow ? tr('planning.sport') : undefined}>
          {showSportRow && (
            <div ref={sportRowRef} className="sem-noscroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', margin: '0 -16px', padding: '0 12px', scrollSnapType: 'x proximity' }}>
              {SPORTS.map(s => {
                const on = s === p.sport
                const locked = !!p.lockSport && !on
                return (
                  <button key={s} type="button" data-on={on ? '1' : '0'} disabled={locked} aria-pressed={on}
                    onClick={() => { if (!locked) p.onSportChange(s) }}
                    title={locked ? tr('planning.brickRunOnly') : undefined}
                    style={{ border: 'none', background: 'transparent', cursor: locked ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 0 2px', width: 64, flexShrink: 0, opacity: locked ? 0.3 : 1, scrollSnapAlign: 'start' }}>
                    <SportDisc sport={s} on={on} />
                    <span style={{ fontSize: 12, fontWeight: on ? 800 : 600, color: on ? 'var(--text)' : 'var(--text-mid)', whiteSpace: 'nowrap' }}>{SPORT_SHORT[s]}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Sous-discipline (vélo) */}
          {p.sport === 'bike' && (
            <div style={{ marginTop: showSportRow ? 14 : 0 }}>
              <MSeg fit value={p.cyclingSub} onChange={k => p.setCyclingSub(k)}
                options={(Object.keys(CYCLING_SUB_LABEL) as CyclingSub[]).map(k => ({ key: k, label: CYCLING_SUB_LABEL[k] }))} />
            </div>
          )}

          {/* Famille de course (Endurance Run / Sprints / Intervals Strides) + Dehors / Tapis */}
          {p.sport === 'run' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: showSportRow ? 14 : 0 }}>
              <MSeg fit small value={p.runFamily ?? 'endurance'} onChange={k => p.setRunFamily?.(k)}
                options={(Object.keys(RUN_FAMILY_LABEL) as RunFamily[]).map(k => ({ key: k, label: RUN_FAMILY_LABEL[k] }))} />
              <MSeg value={p.runningSub} onChange={k => p.setRunningSub(k)}
                options={(Object.keys(RUNNING_SUB_LABEL) as RunningSub[]).map(k => ({ key: k, label: RUNNING_SUB_LABEL[k] }))} />
            </div>
          )}

          {/* Brick Run : enchaînement vélo → course à pied */}
          {p.sport === 'bike' && !p.reserveMode && (() => {
            const run = sportColor('run')
            return (
              <button type="button" onClick={() => (p.onBrickButton ? p.onBrickButton() : p.setBrickRun(!p.brickRun))} title={tr('planning.brickRunTitle')}
                aria-pressed={p.brickRun}
                style={{ ...mChip(false), marginTop: 10, minHeight: 44,
                  background: p.brickRun ? `color-mix(in srgb, ${run} 14%, transparent)` : 'var(--sem-field)',
                  color: p.brickRun ? run : 'var(--text-mid)' }}>
                {p.brickRun ? '✓' : '+'} Brick Run
                <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{tr('planning.bikeToRun')}</span>
              </button>
            )
          })()}
        </MCard>
      )}

      {/* ── Type de séance ── */}
      {trainTypes.length > 0 && (
        <MCard data-guide="builder-type" title={tr('planning.sessionType')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trainTypes.map(t => {
              const on = p.trainingTypes.includes(t)
              return (
                <button key={t} type="button" aria-pressed={on}
                  onClick={() => p.setTrainingTypes(on ? p.trainingTypes.filter(x => x !== t) : [...p.trainingTypes, t])}
                  style={mChip(on)}>{t}</button>
              )
            })}
          </div>
        </MCard>
      )}

      {/* ── Date & Heure (masqué en réserve) — le champ natif couvre la ligne ── */}
      {!p.reserveMode && (
        <MCard style={{ padding: '4px 16px' }}>
          <PickerRow label={tr('planning.date')} value={dateLabel}>
            <input type="date" value={p.date} onChange={e => p.setDate(e.target.value)} aria-label={tr('planning.date')} style={nativeOverlay} />
          </PickerRow>
          <div style={{ borderTop: HAIR }} />
          <PickerRow label={tr('planning.hour')} value={p.time || '—'}>
            <input type="time" value={p.time} onChange={e => p.setTime(e.target.value)} aria-label={tr('planning.hour')} style={nativeOverlay} />
          </PickerRow>
        </MCard>
      )}

      {/* ── Effort perçu + Durée ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'stretch' }}>
        <MCard style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={smallHead}>{tr('planning.perceivedEffort')}</span>
          <div className="se-tnum" style={bigNum}>{p.rpe}<small style={bigUnit}>/10</small></div>
          <span style={subLine}>{tr(RPE_DESC[rpeIdx])}</span>
          <div style={{ marginTop: 'auto', paddingTop: 6 }}>
            <Gauge value={p.rpe} min={0.5} max={10} step={0.5} onChange={p.setRpe} color="var(--primary)" />
          </div>
        </MCard>

        <MCard style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={smallHead}>{tr('planning.duration')}</span>
          {durEdit ? (
            <input autoFocus defaultValue={fmtDur(p.dur)} placeholder="2h00" inputMode="text" aria-label={tr('planning.duration')}
              onBlur={e => { const v = parseDurInput(e.target.value); if (v != null) p.setDur(Math.max(5, Math.min(600, v))); setDurEdit(false) }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              className="se-tnum"
              style={{ ...bigNum, width: '100%', minWidth: 0, boxSizing: 'border-box', background: 'var(--sem-field)', border: 'none', outline: 'none', borderRadius: 'var(--r-sm)', padding: '2px 8px', fontSize: 28, color: 'var(--text)' }} />
          ) : (
            <button type="button" onClick={() => setDurEdit(true)} aria-label={tr('planning.duration')}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'text', textAlign: 'left', display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--text)', minHeight: 44 }}>
              <span className="se-tnum" style={bigNum}>{dp.big}{dp.small && <small style={bigUnit}> {dp.small}</small>}</span>
              <IconPencil size={14} color="var(--text-dim)" style={{ alignSelf: 'center' }} />
            </button>
          )}
          <div style={{ marginTop: 'auto', paddingTop: 6 }}>
            <Gauge value={p.dur} min={5} max={600} step={5} onChange={n => p.setDur(n)} color="var(--primary)" />
          </div>
        </MCard>
      </div>

      {/* ── Tes repères ── */}
      {stats.length > 0 && (
        <MCard title={tr('sem.yourRefs')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ minWidth: 0, textAlign: i === stats.length - 1 && stats.length > 1 ? 'right' : 'left' }}>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{s.label}</span>
                <span className="se-tnum" style={{ display: 'block', marginTop: 2, fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </MCard>
      )}

      {/* ── Description (auto-continuation de liste conservée) ── */}
      <MCard title={tr('planning.description')}>
        <textarea ref={descRef} value={p.desc} onChange={e => p.setDesc(e.target.value)} rows={5}
          onKeyDown={e => listContinuationKeyDown(e, p.desc, p.setDesc)}
          placeholder={tr('planning.notesConsignes')}
          style={{ display: 'block', width: '100%', minHeight: 120, resize: 'none', overflow: 'hidden', background: 'transparent', border: 'none', padding: 0, fontSize: 15, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55 }} />
      </MCard>
    </div>
  )
}

/** Ligne « Libellé ……… valeur › » ; un champ natif transparent la recouvre (ouvre le sélecteur iOS). */
function PickerRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      <span className="se-tnum" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 600, color: 'var(--text-mid)', whiteSpace: 'nowrap', minWidth: 0 }}>
        {value}<IconChevronRight size={17} color="var(--text-dim)" />
      </span>
      {children}
    </div>
  )
}

const nativeOverlay: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer',
  border: 'none', background: 'transparent', fontSize: 16, margin: 0, padding: 0, WebkitAppearance: 'none',
}
const smallHead: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8 }
const bigNum: React.CSSProperties = { fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' }
const bigUnit: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }
const subLine: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginTop: 6 }
