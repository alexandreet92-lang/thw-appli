'use client'
// Carte d'exercice (Muscu / Hyrox) — éditorial clair. Filet gauche coloré
// (pattern muscu ou rouge hyrox), tag, champs adaptatifs. Mute l'ExerciseItem.
import { IconX } from '@tabler/icons-react'
import { type ExerciseItem, type ExoCategory, MUSCU_PATTERNS, PATTERN_VAR, PATTERN_LABEL_KEY, fmtSec } from './strength'
import { secToPace, paceToSec } from './editorial'
import { Stepper, FieldLabel } from './ui'
import { useI18n } from '@/lib/i18n'

function NumField({ label, value, unit, step = 1, min = 0, onChange }: {
  label: string; value: number | undefined; unit?: string; step?: number; min?: number; onChange: (n: number) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Stepper value={String(value ?? 0)} unit={unit}
        onChange={v => onChange(Math.max(min, parseInt(v) || 0))}
        onDec={() => onChange(Math.max(min, (value ?? 0) - step))}
        onInc={() => onChange((value ?? 0) + step)} />
    </div>
  )
}

export function ExerciseCard({ variant, item, index, accent, circuitType, onChange, onRemove }: {
  variant: 'muscu' | 'hyrox'; item: ExerciseItem; index: number; accent: string
  circuitType?: string
  onChange: (e: ExerciseItem) => void; onRemove: () => void
}) {
  const { t } = useI18n()
  const set = (patch: Partial<ExerciseItem>) => onChange({ ...item, ...patch })
  // Principe de chaque type : en Séries on règle les séries par exo ; en Lap/
  // Superset c'est le circuit qui porte les tours (l'exo n'a que ses reps) ;
  // en EMOM/Tabata la cadence est imposée (pas de repos par exo).
  const ct = circuitType ?? 'series'
  const showSets = ct === 'series'
  const showRest = ct !== 'emom' && ct !== 'tabata'
  // Reps vs Temps (gainage / core) : mode dérivé de targetTimeSec (undefined = reps).
  // Bascule Temps → seed 30s ; Reps → efface le temps cible.
  const timeMode = item.targetTimeSec != null
  const setMode = (m: 'reps' | 'time') =>
    set(m === 'time' ? { targetTimeSec: item.targetTimeSec ?? 30 } : { targetTimeSec: undefined })
  const rule = variant === 'muscu' ? PATTERN_VAR[item.category] : 'var(--pat-hyrox)'
  const isStation = variant === 'hyrox' && item.exoId !== 'custom'
  const isRun = /run|course|cours/i.test(item.name)

  return (
    <div style={{ background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderLeft: `3px solid ${rule}`, borderRadius: 'var(--se-r)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* En-tête : #num · nom · tag · ✕ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span className="se-tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-dim)', flexShrink: 0 }}>#{index + 1}</span>
        <input value={item.name} onChange={e => set({ name: e.target.value })} placeholder={t('planning.exerciseNamePlaceholder')}
          className="se-fr" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 15, fontWeight: 600, padding: 0 }} />
        <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--se-dim)', border: '1px solid var(--se-rule)', borderRadius: 6, padding: '2px 7px' }}>
          {variant === 'muscu' ? t(PATTERN_LABEL_KEY[item.category]) : isStation ? t('planning.station') : t('planning.free')}
        </span>
        <button type="button" onClick={onRemove} aria-label={t('planning.remove')} style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}><IconX size={16} /></button>
      </div>

      {/* Champs */}
      {variant === 'muscu' ? (
        <>
          <div className="se-fgrid">
            {showSets && <NumField label={t('planning.sets')} value={item.sets} min={1} onChange={n => set({ sets: n })} />}
            {/* Reps ⇄ Temps : toggle en guise de label (gainage / core = temps) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, minHeight: 16 }}>
                <div style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 999, background: 'var(--se-card2)', border: '1px solid var(--se-rule)' }}>
                  {([['reps', t('planning.repsShort')], ['time', t('planning.time')]] as const).map(([m, label]) => {
                    const on = (timeMode ? 'time' : 'reps') === m
                    return (
                      <button key={m} type="button" onClick={() => setMode(m)}
                        style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '2px 9px', fontSize: 9, fontWeight: on ? 700 : 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: on ? 'var(--se-card)' : 'transparent', color: on ? accent : 'var(--se-dim)', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{label}</button>
                    )
                  })}
                </div>
              </div>
              {timeMode ? (
                <Stepper value={fmtSec(item.targetTimeSec ?? 0)}
                  onChange={v => { const mm = v.match(/^(\d+):(\d{1,2})$/); set({ targetTimeSec: mm ? (+mm[1]) * 60 + (+mm[2]) : (parseInt(v) || 0) }) }}
                  onDec={() => set({ targetTimeSec: Math.max(0, (item.targetTimeSec ?? 0) - 5) })}
                  onInc={() => set({ targetTimeSec: (item.targetTimeSec ?? 0) + 5 })} />
              ) : (
                <Stepper value={String(item.reps ?? 0)}
                  onChange={v => set({ reps: Math.max(0, parseInt(v) || 0) })}
                  onDec={() => set({ reps: Math.max(0, (item.reps ?? 0) - 1) })}
                  onInc={() => set({ reps: (item.reps ?? 0) + 1 })} />
              )}
            </div>
            <NumField label={t('planning.load')} unit="kg" value={item.weightKg ?? 0} step={2} onChange={n => set({ weightKg: n })} />
            {showRest && <NumField label={ct === 'series' ? t('planning.rest') : t('planning.restAfter')} unit="s" value={item.restSec} step={15} onChange={n => set({ restSec: n })} />}
          </div>
          {/* Sélecteur de pattern */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MUSCU_PATTERNS.map(p => {
              const on = item.category === p
              return <button key={p} type="button" onClick={() => set({ category: p })}
                style={{ border: `1px solid ${on ? accent : 'var(--se-rule)'}`, background: on ? accent : 'transparent', color: on ? '#fff' : 'var(--se-dim)', borderRadius: 999, padding: '4px 11px', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>{t(PATTERN_LABEL_KEY[p])}</button>
            })}
          </div>
        </>
      ) : (
        <>
          <div className="se-fgrid">
            <NumField label={t('planning.distance')} unit="m" value={item.distanceM ?? 0} step={50} onChange={n => set({ distanceM: n })} />
            <NumField label={t('planning.load')} unit="kg" value={item.weightKg ?? 0} step={2} onChange={n => set({ weightKg: n })} />
            <div>
              <FieldLabel>{t('planning.targetTime')}</FieldLabel>
              <Stepper value={fmtSec(item.targetTimeSec ?? 0)}
                onChange={v => { const m = v.match(/^(\d+):(\d{1,2})$/); set({ targetTimeSec: m ? (+m[1]) * 60 + (+m[2]) : (parseInt(v) || 0) }) }}
                onDec={() => set({ targetTimeSec: Math.max(0, (item.targetTimeSec ?? 0) - 5) })}
                onInc={() => set({ targetTimeSec: (item.targetTimeSec ?? 0) + 5 })} />
            </div>
            <NumField label={t('planning.rest')} unit="s" value={item.restSec} step={15} onChange={n => set({ restSec: n })} />
          </div>
          {isRun && (
            <div>
              <FieldLabel right={<span style={{ fontSize: 9, color: 'var(--se-dim)' }}>{t('planning.derivedDistanceTime')}</span>}>{t('planning.pacePerKm')}</FieldLabel>
              <Stepper value={item.distanceM && item.targetTimeSec ? secToPace(item.targetTimeSec / (item.distanceM / 1000)) : '0:00'} unit="/km"
                onChange={v => { const ps = paceToSec(v); if (!isNaN(ps) && item.distanceM) set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) }}
                onDec={() => { if (item.distanceM && item.targetTimeSec) { const ps = item.targetTimeSec / (item.distanceM / 1000) - 5; set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) } }}
                onInc={() => { if (item.distanceM && item.targetTimeSec) { const ps = item.targetTimeSec / (item.distanceM / 1000) + 5; set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) } }} />
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <input value={item.notes ?? ''} onChange={e => set({ notes: e.target.value })} placeholder={t('planning.notesPlaceholder')}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--se-card2)', border: '1px solid var(--se-rule)', borderRadius: 9, padding: '8px 10px', fontSize: 12, color: 'var(--se-text)', outline: 'none' }} />
    </div>
  )
}

// helper exporté pour typer une catégorie depuis l'extérieur si besoin
export type { ExoCategory }
