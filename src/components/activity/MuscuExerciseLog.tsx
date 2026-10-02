'use client'

// ══════════════════════════════════════════════════════════════════
// MuscuExerciseLog — journal d'exercices muscu saisi manuellement.
// Couvre le cas « séance NON enregistrée depuis l'app » : l'athlète saisit
// ses exercices (nom, séries, répétitions, charge, récup) et le nombre de
// circuits ; le nombre d'exercices est calculé automatiquement et affiché.
// Persisté en base via activity_extras (RLS user-scoped, multi-appareils).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useActivityExtras, type Exo, type StrengthLog } from '@/lib/activity/extras'
import { ExercisePicker } from '@/components/planning/mobile/ExercisePicker'
import type { ExoDefinition } from '@/components/planning/exercises'
import { useI18n } from '@/lib/i18n'
import { useIsMobile, AM_CARD, AM_INPUT, AM_LABEL, AmSheet, HAIRLINE, amChip, roundBtnStyle, Ico, ICON } from './ActivityMobileKit'

const GYM = 'var(--sport-gym)'
const EMPTY: StrengthLog = { circuits: '1', exos: [] }
// Tokens --se-* (utilisés par ExercisePicker) mappés sur le thème de l'app.
const seVars = {
  ['--se-card']: 'var(--bg-card)', ['--se-card2']: 'var(--bg-card2)',
  ['--se-text']: 'var(--text)', ['--se-dim']: 'var(--text-dim)',
  ['--se-rule']: 'var(--border)', ['--se-r']: '12px',
} as React.CSSProperties

let seq = 0
function newExo(): Exo {
  seq += 1
  return { id: `exo-${seq}`, name: '', sets: '', reps: '', load: '', rest: '' }
}
function exoFromDef(def: ExoDefinition): Exo {
  seq += 1
  return { id: `exo-${seq}`, name: def.name, sets: String(def.defaultSets), reps: String(def.defaultReps), load: '', rest: String(def.defaultRestSec) }
}

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  padding: '7px 9px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box',
}

export function MuscuExerciseLog({ activityId }: { activityId: string }) {
  const { t } = useI18n()
  const { extras, save } = useActivityExtras(activityId)
  const log = extras.strength_log ?? EMPTY
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<StrengthLog>(EMPTY)
  const [editorShown, setEditorShown] = useState(false)
  const [pickShown, setPickShown] = useState(false)
  const mob = useIsMobile()

  useEffect(() => {
    if (open) { const r = requestAnimationFrame(() => setEditorShown(true)); return () => cancelAnimationFrame(r) }
    setEditorShown(false)
  }, [open])
  useEffect(() => {
    if (picking) { const r = requestAnimationFrame(() => setPickShown(true)); return () => cancelAnimationFrame(r) }
    setPickShown(false)
  }, [picking])
  const closeEditor = () => { setEditorShown(false); setTimeout(() => setOpen(false), 300) }
  const closePicker = () => { setPickShown(false); setTimeout(() => setPicking(false), 300) }

  const nbExos = log.exos.filter(e => e.name.trim()).length
  const nbCircuits = Math.max(1, Number(log.circuits) || 1)

  function openEditor() {
    // On part des exos existants (vide si aucun) → l'ajout se fait via la
    // bibliothèque ; plus de ligne « Exercice 1 » vide parasite.
    setDraft(JSON.parse(JSON.stringify(log)) as StrengthLog); setOpen(true)
  }
  function commit() {
    const cleaned: StrengthLog = { circuits: draft.circuits || '1', exos: draft.exos.filter(e => e.name.trim()) }
    void save({ strength_log: cleaned }); closeEditor()
  }
  function patchExo(id: string, k: keyof Exo, v: string) {
    setDraft(d => ({ ...d, exos: d.exos.map(e => e.id === id ? { ...e, [k]: v } : e) }))
  }

  // ── Mobile (Strava) : carte blanche, feuille du bas (au-dessus de la sur-page
  // « Modifier »), champs pleins doux, sélecteur plein écran à bouton rond. ──
  if (mob) {
    const mIn: React.CSSProperties = { ...AM_INPUT, minHeight: 44, padding: '0 12px', fontSize: 15 }
    return (
      <div style={{ ...AM_CARD }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: nbExos ? 8 : 0 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={AM_LABEL}>{t('activities.exercises')}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{nbExos || '—'}</div>
            </div>
            <div>
              <div style={AM_LABEL}>{t('activities.circuits')}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{nbExos ? nbCircuits : '—'}</div>
            </div>
          </div>
          <button onClick={openEditor} style={{ ...amChip(false), color: 'var(--primary)' }}>{nbExos ? t('activities.edit') : t('activities.enter')}</button>
        </div>
        {log.exos.filter(e => e.name.trim()).map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 48, borderTop: HAIRLINE, fontSize: 15 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
            <span style={{ color: 'var(--text-mid)', fontSize: 13, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {[e.sets && e.reps ? `${e.sets}×${e.reps}` : (e.sets || e.reps), e.load, e.rest && `${t('activities.restLabel')} ${e.rest}`].filter(Boolean).join(' · ')}
            </span>
          </div>
        ))}

        <AmSheet open={open} onClose={closeEditor} full title={t('activities.exercisesDone')}
          leftLabel={t('activities.cancel')} rightLabel={t('activities.save')} onRight={commit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 4px' }}>
            <span style={{ fontSize: 15, color: 'var(--text-mid)' }}>{t('activities.circuitCount')}</span>
            <input type="number" inputMode="numeric" min={1} value={draft.circuits} onChange={e => setDraft(d => ({ ...d, circuits: e.target.value }))} style={{ ...mIn, width: 88, textAlign: 'center' }} />
          </div>
          {draft.exos.map((e, i) => (
            <div key={e.id} style={{ paddingTop: 12, borderTop: HAIRLINE, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={e.name} onChange={ev => patchExo(e.id, 'name', ev.target.value)} placeholder={t('activities.exerciseN', { n: i + 1 })} style={{ ...mIn, flex: 1, fontWeight: 600 }} />
                <button onClick={() => setDraft(d => ({ ...d, exos: d.exos.filter(x => x.id !== e.id) }))} aria-label={t('activities.delete')}
                  style={{ width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico d={ICON.trash} size={18} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={e.sets} onChange={ev => patchExo(e.id, 'sets', ev.target.value)} placeholder={t('activities.sets')} style={mIn} />
                <input value={e.reps} onChange={ev => patchExo(e.id, 'reps', ev.target.value)} placeholder={t('activities.reps')} style={mIn} />
                <input value={e.load} onChange={ev => patchExo(e.id, 'load', ev.target.value)} placeholder={t('activities.load')} style={mIn} />
                <input value={e.rest} onChange={ev => patchExo(e.id, 'rest', ev.target.value)} placeholder={t('activities.rest')} style={mIn} />
              </div>
            </div>
          ))}
          <button onClick={() => setPicking(true)} style={{ ...amChip(false), width: '100%', color: 'var(--primary)', minHeight: 48 }}>{t('activities.addExerciseLibrary')}</button>
        </AmSheet>

        {picking && typeof document !== 'undefined' && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 18700, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', ...seVars, transform: pickShown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px' }}>
              <button onClick={closePicker} aria-label={t('activities.cancel')} style={roundBtnStyle}><Ico d={ICON.close} size={20} sw={2.2} /></button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{t('activities.addExercise')}</span>
              <span aria-hidden style={{ width: 44 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
              <ExercisePicker accent={GYM}
                onPick={def => { setDraft(d => ({ ...d, exos: [...d.exos, exoFromDef(def)] })); setPicking(false) }}
                onCustom={name => { if (name) { setDraft(d => ({ ...d, exos: [...d.exos, { ...newExo(), name }] })); setPicking(false) } }} />
            </div>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 16, margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: nbExos ? 12 : 0 }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{t('activities.exercises')}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{nbExos || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{t('activities.circuits')}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{nbExos ? nbCircuits : '—'}</div>
          </div>
        </div>
        <button onClick={openEditor} style={{
          fontSize: 12, color: GYM, background: 'none', border: '1px solid var(--border)',
          borderRadius: 'var(--r-pill)', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
        }}>{nbExos ? t('activities.edit') : t('activities.enter')}</button>
      </div>

      {nbExos > 0 && (
        <div>
          {log.exos.filter(e => e.name.trim()).map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {[e.sets && e.reps ? `${e.sets}×${e.reps}` : (e.sets || e.reps), e.load, e.rest && `${t('activities.restLabel')} ${e.rest}`].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div onClick={closeEditor} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' /* design-allow-color */, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', opacity: editorShown ? 1 : 0, transition: 'opacity 0.28s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg)',
            borderRadius: '18px 18px 0 0', padding: 20, boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' /* design-allow-color */,
            transform: editorShown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('activities.exercisesDone')}</h3>
              <button onClick={closeEditor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 20, padding: 4 }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('activities.circuitCount')}</span>
              <input type="number" min={1} value={draft.circuits} onChange={e => setDraft(d => ({ ...d, circuits: e.target.value }))} style={{ ...inputStyle, width: 70 }} />
            </div>

            {draft.exos.map((e, i) => (
              <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={e.name} onChange={ev => patchExo(e.id, 'name', ev.target.value)} placeholder={t('activities.exerciseN', { n: i + 1 })} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => setDraft(d => ({ ...d, exos: d.exos.filter(x => x.id !== e.id) }))} aria-label={t('activities.delete')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-dim)', cursor: 'pointer', padding: '0 10px', fontSize: 16 }}>−</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <input value={e.sets} onChange={ev => patchExo(e.id, 'sets', ev.target.value)} placeholder={t('activities.sets')} style={inputStyle} />
                  <input value={e.reps} onChange={ev => patchExo(e.id, 'reps', ev.target.value)} placeholder={t('activities.reps')} style={inputStyle} />
                  <input value={e.load} onChange={ev => patchExo(e.id, 'load', ev.target.value)} placeholder={t('activities.load')} style={inputStyle} />
                  <input value={e.rest} onChange={ev => patchExo(e.id, 'rest', ev.target.value)} placeholder={t('activities.rest')} style={inputStyle} />
                </div>
              </div>
            ))}

            <button onClick={() => setPicking(true)} style={{
              width: '100%', padding: '10px', borderRadius: 'var(--r-sm)', border: '1px dashed var(--border)',
              background: 'transparent', color: GYM, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
            }}>{t('activities.addExerciseLibrary')}</button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeEditor} style={{ flex: 1, padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{t('activities.cancel')}</button>
              <button onClick={commit} style={{ flex: 1, padding: '12px', borderRadius: 'var(--r-sm)', border: 'none', background: GYM, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{t('activities.save')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Sélecteur bibliothèque (mêmes exercices/variantes que Session & Planning) */}
      {picking && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', display: 'flex', flexDirection: 'column', ...seVars, transform: pickShown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={closePicker} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('activities.addExercise')}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 24px' }}>
            <ExercisePicker accent={GYM}
              onPick={def => { setDraft(d => ({ ...d, exos: [...d.exos, exoFromDef(def)] })); setPicking(false) }}
              onCustom={name => { if (name) { setDraft(d => ({ ...d, exos: [...d.exos, { ...newExo(), name }] })); setPicking(false) } }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
