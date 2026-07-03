'use client'
// Frise de périodisation. readOnly (page) = lecture seule. Éditable (surpage Gantt) = drag
// move + poignées resize, pilotés en refs DOM + pointermove (60 fps, jamais de setState
// pendant le move ; persistance au pointerup, calage sur la grille des semaines). Mois +
// semaines (jour/mois, aucun numéro ISO) + courses réelles (planned_races) + segments blocs.
// Surfaces/textes = tokens de thème (jour/nuit) ; cyan/sport/rouge = couleurs assumées.
import { useMemo, useRef, useState, useEffect } from 'react'
import { BLOC_SPORT_KEYS, SPORT_LABELS, SPORT_COLORS } from '@/lib/constants/blocTypes'
import { getWeekStart, getWeekEnd, isoWeekYear } from '@/lib/utils/weekDates'
import { loadBlocs, upsertBloc } from '@/app/planning/trainingBlocks'
import type { TrainingBlocData } from '@/types/trainingBloc'
import { buildFriseWindow, LABEL_WIDTH, COLS, TODAY_INDEX } from './friseModel'
import { usePlannedRaces, type RaceData } from './usePlannedRaces'
import { useI18n } from '@/lib/i18n'

const RED = '#ef4444', CY = '#22d3ee' // race/today = couleurs fonctionnelles assumées
const GRID = `${LABEL_WIDTH}px repeat(${COLS},1fr)`
const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Décalage vertical alterné des badges course pour éviter les chevauchements (< 2 colonnes).
function assignRaceLevels(races: RaceData[], indexOf: (s: string) => number) {
  const sorted = [...races].map(r => ({ r, idx: indexOf(r.date) })).filter(x => x.idx >= 0 && x.idx < COLS)
    .sort((a, b) => new Date(a.r.date).getTime() - new Date(b.r.date).getTime())
  const placed: { idx: number; level: number }[] = []
  return sorted.map(({ r, idx }) => {
    const used = placed.filter(p => Math.abs(p.idx - idx) < 2).map(p => p.level)
    let level = 0; while (used.includes(level)) level++
    placed.push({ idx, level }); return { r, idx, level }
  })
}

export function FriseV1({ readOnly = true, reloadToken = 0, onEdited }: { readOnly?: boolean; reloadToken?: number; onEdited?: () => void }) {
  const { t } = useI18n()
  const W = useMemo(() => buildFriseWindow(), [])
  const { races } = usePlannedRaces()
  const [blocs, setBlocs] = useState<TrainingBlocData[]>(() => loadBlocs())
  useEffect(() => { setBlocs(loadBlocs()) }, [reloadToken])
  const drag = useRef<{ id: string; mode: 'move' | 'l' | 'r'; startX: number; colW: number; s0: number; w0: number; el: HTMLElement } | null>(null)

  const raceLevels = useMemo(() => assignRaceLevels(races, W.indexOfDate), [races, W])
  const raceZoneH = raceLevels.some(r => r.level > 0) ? 52 : 30

  function compute(d: NonNullable<typeof drag.current>, clientX: number) {
    const delta = Math.round((clientX - d.startX) / d.colW)
    let s = d.s0, w = d.w0
    if (d.mode === 'move') s = d.s0 + delta
    else if (d.mode === 'l') { s = d.s0 + delta; w = d.w0 - delta; if (w < 1) { w = 1; s = d.s0 + d.w0 - 1 } }
    else w = Math.max(1, d.w0 + delta)
    return { s, w }
  }
  function onMove(e: PointerEvent) {
    const d = drag.current; if (!d) return
    const { s, w } = compute(d, e.clientX)
    d.el.style.left = `${(s / COLS) * 100}%`; d.el.style.width = `${(w / COLS) * 100}%`
  }
  function onUp(e: PointerEvent) {
    const d = drag.current; if (!d) return
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp)
    const { s, w } = compute(d, e.clientX)
    const { year, week } = isoWeekYear(W.mondayAtIndex(s))
    const cur = loadBlocs().find(b => b.id === d.id)
    if (cur) { setBlocs(upsertBloc({ ...cur, startYear: year, startWeek: week, durationWeeks: w })); onEdited?.() }
    drag.current = null
  }
  function onDown(e: React.PointerEvent, b: TrainingBlocData, mode: 'move' | 'l' | 'r') {
    if (readOnly) return
    e.preventDefault(); e.stopPropagation()
    const seg = (e.currentTarget as HTMLElement).closest('[data-seg]') as HTMLElement
    const track = seg.parentElement as HTMLElement
    drag.current = { id: b.id, mode, startX: e.clientX, colW: track.getBoundingClientRect().width / COLS, s0: W.indexOfBloc(b.startYear, b.startWeek), w0: b.durationWeeks, el: seg }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)
  }

  const handle = (side: 'l' | 'r', b: TrainingBlocData) => (
    <span onPointerDown={e => onDown(e, b, side)} style={{ position: 'absolute', [side === 'l' ? 'left' : 'right']: 0, top: 0, bottom: 0, width: 9, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
      <span style={{ width: 2, height: 12, background: 'rgba(255,255,255,.4)', borderRadius: 2 }} />
    </span>
  )

  return (
    <div style={{ position: 'relative', minWidth: 680 }}>
      {/* Mois */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, marginBottom: 3 }}>
        <div />
        {W.months.map(m => (
          <div key={m.key} style={{ gridColumn: `span ${m.count}`, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: m.isActive ? 'var(--text-mid)' : 'var(--text-dim)', textAlign: 'center' }}>{m.label}</div>
        ))}
      </div>
      {/* Semaines (jour / mois) */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, marginBottom: 10 }}>
        <div />
        {W.cols.map(c => (
          <div key={c.idx} style={{ textAlign: 'center', padding: '3px 2px', borderRadius: 6, background: c.isCurrent ? CY : 'transparent' }}>
            <span style={{ fontSize: 10, fontWeight: c.isCurrent ? 800 : 700, color: c.isCurrent ? '#fff' : 'var(--text-dim)', display: 'block' }}>{c.day}</span>
            <span style={{ fontSize: 8.5, display: 'block', marginTop: 1, color: c.isCurrent ? 'rgba(255,255,255,.75)' : 'var(--text-dim)' }}>{c.month}</span>
          </div>
        ))}
      </div>
      {/* Courses (décalage vertical alterné) */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, marginBottom: 6 }}>
        <div />
        <div style={{ gridColumn: '2 / span 12', position: 'relative', height: raceZoneH }}>
          {races.length === 0 && <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{t('planning.noRaceAddInCalendar')}</span>}
          {raceLevels.map(({ r, idx, level }) => {
            const m = new Date(r.date); m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
            const sun = new Date(m); sun.setDate(m.getDate() + 6)
            return (
              <div key={r.id} style={{ position: 'absolute', top: level * 24, left: `${((idx + 0.5) / COLS) * 100}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 - level }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: RED, background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,.15)' }}>{r.name} · {fmt(m)}–{fmt(sun)}</div>
                {level === 0 && <div style={{ width: 1.5, height: 8, background: 'rgba(239,68,68,.5)', marginTop: 2 }} />}
              </div>
            )
          })}
        </div>
      </div>
      {/* Pistes sport */}
      <div style={{ position: 'relative' }}>
        {BLOC_SPORT_KEYS.map(sport => {
          const list = blocs.filter(b => b.sport === sport); if (list.length === 0) return null
          const color = SPORT_COLORS[sport]
          return (
            <div key={sport} style={{ display: 'grid', gridTemplateColumns: GRID, marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)', height: 34 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{SPORT_LABELS[sport]}
              </div>
              <div style={{ gridColumn: '2 / span 12', position: 'relative', height: 34, borderRadius: 7, background: 'var(--bg-card2)' }}>
                {races.map(r => { const idx = W.indexOfDate(r.date); if (idx < 0 || idx >= COLS) return null
                  return <div key={r.id} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(idx / COLS) * 100}%`, width: `${(1 / COLS) * 100}%`, background: 'rgba(239,68,68,.06)', borderLeft: '1px dashed rgba(239,68,68,.2)', borderRight: '1px dashed rgba(239,68,68,.2)', pointerEvents: 'none' }} /> })}
                {list.map(b => {
                  const segStart = W.indexOfBloc(b.startYear, b.startWeek), segEnd = segStart + b.durationWeeks
                  if (segEnd <= 0 || segStart >= COLS) return null
                  const cs = Math.max(0, segStart), ce = Math.min(COLS, segEnd)
                  const left = `${(cs / COLS) * 100}%`, width = `${((ce - cs) / COLS) * 100}%`
                  const future = segStart > TODAY_INDEX
                  const range = `${fmt(getWeekStart(b.startYear, b.startWeek))} – ${fmt(getWeekEnd(b.startYear, b.startWeek + b.durationWeeks - 1))}`
                  const label = b.name || b.focus[0] || '—'
                  const base: React.CSSProperties = { position: 'absolute', top: 5, bottom: 5, left, width, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', overflow: 'hidden', cursor: readOnly ? 'default' : 'grab', touchAction: 'none' }
                  if (future) return (
                    <div key={b.id} data-seg onPointerDown={e => onDown(e, b, 'move')} style={{ ...base, border: `1.5px dashed ${color}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                      <span style={{ fontSize: 8.5, color: 'var(--text-dim)', marginLeft: 7, flexShrink: 0, whiteSpace: 'nowrap' }}>{range}</span>
                    </div>
                  )
                  return (
                    <div key={b.id} data-seg onPointerDown={e => onDown(e, b, 'move')} style={{ ...base, background: `linear-gradient(90deg, ${color}cc, ${color})` }}>
                      {!readOnly && handle('l', b)}
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: readOnly ? 0 : 6 }}>{label}</span>
                      <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.6)', marginLeft: 7, flexShrink: 0, whiteSpace: 'nowrap' }}>{range}</span>
                      {!readOnly && handle('r', b)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* Aujourd'hui */}
        <div style={{ position: 'absolute', top: -46, bottom: 0, left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${(TODAY_INDEX + 0.5) / COLS})`, pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: CY, marginLeft: -4, boxShadow: '0 0 0 3px rgba(34,211,238,.2)' }} />
          <div style={{ width: 2, height: 'calc(100% - 10px)', background: CY, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  )
}
