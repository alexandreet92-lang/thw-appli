'use client'
// Builder Hyrox (mobile) : presets 8 stations + bandeau SM/SN/Temps/nb + groupes.
import { IconPlus } from '@tabler/icons-react'
import {
  type ExerciseItem, type ExoCircuit, hyroxStations, hyroxExtras, itemFromDef, customItem, targetTimeSec, fmtSec,
} from './strength'
import { Banner, BuilderHeader } from './ui'
import { GroupBuilder } from './GroupBuilder'
import { useI18n } from '@/lib/i18n'
import { useSeM, mChipSm, MCardHead } from './mobileKit'

export function HyroxBuilder(p: {
  accent: string
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  map: Record<string, string>; setMap: (m: Record<string, string>) => void
  sm: number; sn: number; builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const { t } = useI18n()
  const isM = useSeM()
  const chipS = (dashed: boolean): React.CSSProperties => isM
    ? { ...mChipSm(false), flexShrink: 0, color: dashed ? 'var(--primary)' : 'var(--text)' }
    : chip(p.accent, dashed)
  const firstCid = p.circuits[0]?.id ?? 'default'
  const add = (item: ExerciseItem) => { p.setExercises([...p.exercises, item]); p.setMap({ ...p.map, [item.id]: firstCid }) }
  const tt = targetTimeSec(p.exercises, p.circuits)
  const cells = [
    { label: t('planning.smMetab'), value: String(p.sm), color: '#22b8c4' },
    { label: t('planning.snNeuro'), value: String(p.sn), color: 'var(--pat-core)' },
    { label: t('planning.targetTime'), value: tt ? fmtSec(tt) : '—' },
    { label: t('planning.stations'), value: String(p.exercises.length) },
  ]

  const presets = (
    <div style={isM ? { marginBottom: 12, background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 16 } : { marginBottom: 16 }}>
      {isM ? <MCardHead>{t('planning.officialStations')}</MCardHead> : <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>{t('planning.officialStations')}</p>}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'] }}>
        {hyroxStations().map(def => (
          <button key={def.id} type="button" onClick={() => add(itemFromDef(def))}
            style={chipS(false)}>{def.name}</button>
        ))}
        <button type="button" onClick={() => add(customItem(t('planning.freeExercise'), 'hyrox'))} style={chipS(true)}>
          <IconPlus size={13} /> {t('planning.free')}
        </button>
      </div>
      {/* Exercices additionnels (hors 8 stations) — ergo alternatifs, renfo, sauts… */}
      {isM ? <div style={{ marginTop: 14 }}><MCardHead>Exercices additionnels</MCardHead></div> : <p style={{ margin: '14px 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>Exercices additionnels</p>}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' as const }}>
        {hyroxExtras().map(def => (
          <button key={def.id} type="button" onClick={() => add(itemFromDef(def))}
            style={chipS(false)}>{def.name}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <BuilderHeader accent={p.accent} tab={p.builderTab} onTab={p.onBuilderTab} />
      <GroupBuilder variant="hyrox" accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.map} setMap={p.setMap}
        banner={<Banner cells={cells} />} presets={presets} />
    </div>
  )
}

const chip = (accent: string, dashed: boolean): React.CSSProperties => ({
  flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
  border: dashed ? `1px dashed ${accent}` : '1px solid var(--se-rule)',
  background: dashed ? 'transparent' : 'var(--se-card)', color: dashed ? accent : 'var(--se-text)',
  borderRadius: 'var(--r-pill)', padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
})
