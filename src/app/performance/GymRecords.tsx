'use client'
// Records/Muscu (DS) : un bloc par exercice, une ligne par type suivi avec jauge
// horizontale (teinte muscu modérée) + valeur neutre. « + Exercice » + Modifier.
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { GymEditSheet } from './GymEditSheet'
import { AddExerciseSheet } from './AddExerciseSheet'
import { MCard, MHBar, MPrimary, MetaButton, NUM, FB } from './mobile/kit'
import { allExercises, isCustom, removeCustom, deleteGym, fetchGym, fmtValue, typeLabel, type GymExercise, type GymRec } from './gymShared'

const GYM = '#8b5cf6' // design-allow-color — teinte sport muscu sanctionnée

export function GymRecords({ recordYear, onSelect, selectedDatum, mobile }: {
  recordYear: string
  onSelect?: (label: string, value: string) => void
  selectedDatum?: { label: string; value: string } | null
  /** Mobile : une carte par exercice, une jauge par type, « + Ajouter un exercice ». */
  mobile?: boolean
}) {
  const { t: tr } = useI18n()
  const [records, setRecords] = useState<GymRec[]>([])
  const [exercises, setExercises] = useState<GymExercise[]>([])
  const [mounted, setMounted] = useState(false)
  const [edit, setEdit] = useState<{ exercise: string; types: string[]; type: string } | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => { setExercises(allExercises()); void fetchGym().then(setRecords); const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])

  // Meilleur record (valeur la plus haute) pour un exercice + type, filtré par année.
  function best(name: string, type: string): GymRec | null {
    const label = `${name} — ${type}`
    const rs = records.filter(r => r.distance_label === label && (recordYear === 'All Time' || r.achieved_at.slice(0, 4) === recordYear))
    if (!rs.length) return null
    return [...rs].sort((a, b) => (Number(b.performance) || 0) - (Number(a.performance) || 0))[0]
  }

  // Max par type (toutes barres visibles confondues) pour normaliser les jauges.
  const perTypeMax = useMemo(() => {
    const m: Record<string, number> = {}
    for (const ex of exercises) for (const t of ex.types) {
      const v = Number(best(ex.name, t)?.performance) || 0
      if (v > (m[t] ?? 0)) m[t] = v
    }
    return m
  }, [exercises, records, recordYear])

  function onSaved(rec: GymRec) { setRecords(prev => [rec, ...prev.filter(r => r.id !== rec.id)]) }

  // Exercice personnalisé : retiré de la liste + ses records supprimés.
  async function removeExercise(name: string) {
    if (!window.confirm(tr('performance.deleteExerciseConfirm'))) return
    const ids = records.filter(r => r.distance_label.startsWith(`${name} — `)).map(r => r.id)
    if (!(await deleteGym(ids))) return
    removeCustom(name)
    setExercises(allExercises())
    setRecords(prev => prev.filter(r => !ids.includes(r.id)))
  }

  const sheets = (
    <>
      {edit && (
        <GymEditSheet exercise={edit.exercise} types={edit.types} initialType={edit.type}
          getBest={t => best(edit.exercise, t)} onClose={() => setEdit(null)} onSaved={onSaved}
          onDeleted={id => setRecords(prev => prev.filter(r => r.id !== id))} />
      )}
      {adding && <AddExerciseSheet onClose={() => setAdding(false)} onAdded={() => setExercises(allExercises())} />}
    </>
  )

  if (mobile) {
    return (
      <>
        {exercises.map(ex => (
          <MCard key={ex.name} title={ex.name}
            meta={isCustom(ex.name) ? <MetaButton onClick={() => void removeExercise(ex.name)}>{tr('perf.delete')}</MetaButton> : undefined}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ex.types.map(t => {
                const b = best(ex.name, t)
                const v = Number(b?.performance) || 0
                const max = perTypeMax[t] || 1
                return (
                  <button key={t} type="button" data-no-fx onClick={() => setEdit({ exercise: ex.name, types: ex.types, type: t })}
                    aria-label={`${tr('performance.edit')} ${ex.name} ${typeLabel(t)}`}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: '8px 0', minHeight: 44, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FB }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, width: '100%' }}>
                      <b style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{typeLabel(t)}</b>
                      <span style={{ ...NUM, fontSize: 15, color: b ? 'var(--text-mid)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>{b ? fmtValue(v, t) : '—'}</span>
                    </span>
                    <MHBar pct={(v / max) * 100} color="var(--sport-gym)" />
                  </button>
                )
              })}
            </div>
          </MCard>
        ))}
        <MPrimary onClick={() => setAdding(true)}>+ {tr('perfm.addExercise')}</MPrimary>
        {sheets}
      </>
    )
  }

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setAdding(true)} style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ {tr('performance.exercise')}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {exercises.map(ex => (
          <div key={ex.name} style={card}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '0 0 12px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{ex.name}</h3>
              {isCustom(ex.name) && (
                <button onClick={() => void removeExercise(ex.name)}
                  style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>{tr('perf.delete')}</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ex.types.map(t => {
                const b = best(ex.name, t)
                const v = Number(b?.performance) || 0
                const display = b ? fmtValue(v, t) : '—'
                const max = perTypeMax[t] || 1
                const sel = selectedDatum?.label === `${ex.name} — ${t}` && selectedDatum?.value === display
                return (
                  <div key={t} onClick={() => b && onSelect?.(`${ex.name} — ${t}`, display)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', borderRadius: 'var(--r-sm)', background: sel ? 'var(--bg-card2)' : 'transparent', cursor: b && onSelect ? 'pointer' : 'default' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)', width: 96, flexShrink: 0 }}>{typeLabel(t)}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 'var(--r-pill)', background: 'var(--bg-card2)', overflow: 'hidden' }}>
                      <div style={{ width: mounted ? `${(v / max) * 100}%` : '0%', height: '100%', background: GYM, opacity: 0.5, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                    </div>
                    <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: b ? 'var(--text)' : 'var(--text-dim)', width: 58, textAlign: 'right', flexShrink: 0 }}>{display}</span>
                    <button onClick={e => { e.stopPropagation(); setEdit({ exercise: ex.name, types: ex.types, type: t }) }}
                      style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>{tr('performance.edit')}</button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {sheets}
    </div>
  )
}
