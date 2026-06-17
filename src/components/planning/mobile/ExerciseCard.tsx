'use client'
// Carte d'exercice (Muscu / Hyrox) — éditorial clair. Filet gauche coloré
// (pattern muscu ou rouge hyrox), tag, champs adaptatifs. Mute l'ExerciseItem.
import { IconX } from '@tabler/icons-react'
import { type ExerciseItem, type ExoCategory, MUSCU_PATTERNS, PATTERN_VAR, PATTERN_LABEL, fmtSec } from './strength'
import { secToPace, paceToSec } from './editorial'
import { Stepper, FieldLabel } from './ui'

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

export function ExerciseCard({ variant, item, index, accent, onChange, onRemove }: {
  variant: 'muscu' | 'hyrox'; item: ExerciseItem; index: number; accent: string
  onChange: (e: ExerciseItem) => void; onRemove: () => void
}) {
  const set = (patch: Partial<ExerciseItem>) => onChange({ ...item, ...patch })
  const rule = variant === 'muscu' ? PATTERN_VAR[item.category] : 'var(--pat-hyrox)'
  const isStation = variant === 'hyrox' && item.exoId !== 'custom'
  const isRun = /run|course|cours/i.test(item.name)

  return (
    <div style={{ background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderLeft: `3px solid ${rule}`, borderRadius: 'var(--se-r)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* En-tête : #num · nom · tag · ✕ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span className="se-tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-dim)', flexShrink: 0 }}>#{index + 1}</span>
        <input value={item.name} onChange={e => set({ name: e.target.value })} placeholder="Nom de l'exercice"
          className="se-fr" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 15, fontWeight: 600, padding: 0 }} />
        <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: rule, border: `1px solid ${rule}`, borderRadius: 6, padding: '2px 7px' }}>
          {variant === 'muscu' ? PATTERN_LABEL[item.category] : isStation ? 'Station' : 'Libre'}
        </span>
        <button type="button" onClick={onRemove} aria-label="Retirer" style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}><IconX size={16} /></button>
      </div>

      {/* Champs */}
      {variant === 'muscu' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label="Séries" value={item.sets} min={1} onChange={n => set({ sets: n })} />
            <NumField label="Reps" value={item.reps} min={0} onChange={n => set({ reps: n })} />
            <NumField label="Charge" unit="kg" value={item.weightKg ?? 0} step={2} onChange={n => set({ weightKg: n })} />
            <NumField label="Repos" unit="s" value={item.restSec} step={15} onChange={n => set({ restSec: n })} />
          </div>
          {/* Sélecteur de pattern */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MUSCU_PATTERNS.map(p => {
              const on = item.category === p
              return <button key={p} type="button" onClick={() => set({ category: p })}
                style={{ border: `1px solid ${on ? PATTERN_VAR[p] : 'var(--se-rule)'}`, background: on ? PATTERN_VAR[p] : 'transparent', color: on ? '#fff' : 'var(--se-dim)', borderRadius: 999, padding: '4px 11px', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>{PATTERN_LABEL[p]}</button>
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label="Distance" unit="m" value={item.distanceM ?? 0} step={50} onChange={n => set({ distanceM: n })} />
            <NumField label="Charge" unit="kg" value={item.weightKg ?? 0} step={2} onChange={n => set({ weightKg: n })} />
            <div>
              <FieldLabel>Temps cible</FieldLabel>
              <Stepper value={fmtSec(item.targetTimeSec ?? 0)}
                onChange={v => { const m = v.match(/^(\d+):(\d{1,2})$/); set({ targetTimeSec: m ? (+m[1]) * 60 + (+m[2]) : (parseInt(v) || 0) }) }}
                onDec={() => set({ targetTimeSec: Math.max(0, (item.targetTimeSec ?? 0) - 5) })}
                onInc={() => set({ targetTimeSec: (item.targetTimeSec ?? 0) + 5 })} />
            </div>
            <NumField label="Repos" unit="s" value={item.restSec} step={15} onChange={n => set({ restSec: n })} />
          </div>
          {isRun && (
            <div>
              <FieldLabel right={<span style={{ fontSize: 9, color: 'var(--se-dim)' }}>dérivée distance/temps</span>}>Allure /km</FieldLabel>
              <Stepper value={item.distanceM && item.targetTimeSec ? secToPace(item.targetTimeSec / (item.distanceM / 1000)) : '0:00'} unit="/km"
                onChange={v => { const ps = paceToSec(v); if (!isNaN(ps) && item.distanceM) set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) }}
                onDec={() => { if (item.distanceM && item.targetTimeSec) { const ps = item.targetTimeSec / (item.distanceM / 1000) - 5; set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) } }}
                onInc={() => { if (item.distanceM && item.targetTimeSec) { const ps = item.targetTimeSec / (item.distanceM / 1000) + 5; set({ targetTimeSec: Math.round(ps * item.distanceM / 1000) }) } }} />
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <input value={item.notes ?? ''} onChange={e => set({ notes: e.target.value })} placeholder="Notes / consignes (option)"
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--se-card2)', border: '1px solid var(--se-rule)', borderRadius: 9, padding: '8px 10px', fontSize: 12, color: 'var(--se-text)', outline: 'none' }} />
    </div>
  )
}

// helper exporté pour typer une catégorie depuis l'extérieur si besoin
export type { ExoCategory }
