'use client'
// ══════════════════════════════════════════════════════════════════
// Carte de bloc (mobile) — repliée (filet zone + badge Zx + cible +
// durée/distance + ⋮) ou dépliée (steppers adaptatifs par sport).
// Logique métier inchangée : on ne fait que muter le MBlock (durationMin
// reste canonique pour SM/SN).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { IconDotsVertical, IconCopy, IconTrash } from '@tabler/icons-react'
import type { SportType, RunningSub } from '@/app/planning/page'
import { zColor, fmtMMSS, mmssToMin, bumpPaceOrWatts, pctFtp, pctOfThreshold, pctOfCss, paceToSec, secToPace, type AthleteRefs } from './editorial'
import { recalc, kmhEquivalent, durFromDistance, BLOCK_NAME_KEY, SWIM_EQUIPMENT, HYPOXIE_DISTANCES, HYPOXIE_STROKES, type MBlock } from './blocks'
import { Stepper, Segmented, FieldLabel } from './ui'
import { useI18n } from '@/lib/i18n'

function pctVmaToZone(p: number): number {
  if (p < 80) return 1; if (p < 87) return 2; if (p < 95) return 3
  if (p < 102) return 4; if (p < 110) return 5; if (p < 120) return 6; return 7
}

export function BlockCard({ block: b, sport, runningSub, accent, refs, riderKg, expanded, onToggle, onChange, onRemove, onDuplicate }: {
  block: MBlock; sport: SportType; runningSub?: RunningSub; accent: string; refs: AthleteRefs; riderKg?: number
  expanded: boolean; onToggle: () => void
  onChange: (b: MBlock) => void; onRemove: () => void; onDuplicate: () => void
}) {
  const { t: tr } = useI18n()
  const [menu, setMenu] = useState(false)
  const isIv = b.mode === 'interval'
  const isProg = b.mode === 'progressive'
  const isTest = b.mode === 'test'
  const isTreadmill = sport === 'run' && runningSub === 'treadmill'
  const set = (patch: Partial<MBlock>) => onChange(recalc(sport, { ...b, ...patch }, refs))

  // W/kg (vélo) — affiché uniquement si le poids de l'athlète est renseigné.
  const wkgOf = (watts: number): string | null =>
    riderKg && riderKg > 0 && watts > 0 ? `${(watts / riderKg).toFixed(1).replace('.', ',')} W/kg` : null
  const wkg = sport === 'bike' ? wkgOf(parseInt(b.value || '0') || 0) : null

  // Progressif : résumé « 6 × 5:00 · −10 s/km » + allure d'arrivée (dernier palier).
  const progSummary = isProg ? `${b.progSteps ?? 0} × ${fmtMMSS(b.progStepMin ?? 0)} · −${b.progStepSec ?? 0} s/km` : ''
  const progEndEq = (() => {
    if (!isProg) return undefined
    const startSec = paceToSec(b.value || '')
    if (isNaN(startSec)) return undefined
    const steps = Math.max(1, b.progSteps ?? 1)
    const endSec = Math.max(120, startSec - (steps - 1) * (b.progStepSec ?? 0))
    return `${b.value || '—'} → ${secToPace(endSec)} /km · ${fmtMMSS(b.durationMin)}`
  })()

  const name = b.label || (BLOCK_NAME_KEY[b.type] ? tr(BLOCK_NAME_KEY[b.type]) : '') || (isIv ? tr('planning.interval') : tr('planning.bloc'))
  const z = b.zone
  // Vitesse km/h → équivalent plat (pente incluse), pour l'affichage tapis.
  const kmhVal = parseFloat(b.value || '0') || 0
  const kmhEq = b.effortUnit === 'kmh' && kmhVal > 0 ? kmhEquivalent(kmhVal, b.inclinePct ?? 0) : 0
  const fr1 = (n: number) => n.toFixed(1).replace('.', ',')
  // Cible affichée (détail discret). Tapis : vitesse · pente · équivalent plat.
  const testTarget = b.testType === 'cp20'
    ? '20 min · à fond'
    : `Rampe · départ ${b.rampStartWatts ?? 100} W · +${b.rampStepWatts ?? 20} W/${b.rampStepMin ?? 2}min`
  const target = isTest ? testTarget : sport === 'bike'
    ? (b.value ? `${b.value} W` : `Z${z}`)
    : sport === 'rowing'
      ? (b.effortUnit === 'watts' ? (b.value ? `${b.value} W` : `Z${z}`) : (b.value ? `${b.value}/500m` : `Z${z}`))
      : sport === 'elliptique'
        ? (b.effortUnit === 'watts' ? (b.value ? `${b.value} W` : `Z${z}`) : `Z${z}${b.machineLevel ? ` · niv. ${b.machineLevel}` : ''}`)
        : sport === 'swim'
          ? (b.hypoxie?.mode === 'strokes'
              ? `${tr('planning.breathEveryEq', { n: String(b.hypoxie.breathEvery ?? 6) })}`
              : b.hypoxie
                ? tr('planning.hypoxie')
                : b.value ? `${b.value}/100m` : `Z${z}`)
          : b.effortUnit === 'kmh'
            ? (b.value ? `${b.value} km/h${b.inclinePct ? ` · ${fr1(b.inclinePct)}% · ≈${fr1(kmhEq)} km/h` : ''}` : `Z${z}`)
            : (b.value ? `${b.value}/km` : `Z${z}`)
  const repsLabel = isProg
    ? ` · ${progSummary}`
    : isIv && b.reps ? ` · ${b.reps} × ${b.inputMode === 'distance' && b.distanceM ? `${b.distanceM}m` : fmtMMSS(b.effortMin ?? 0)}` : ''
  // Valeur de droite : progressif → durée totale ; distance (par rép) si mode
  // distance ; mm:ss si durée fractionnée (1:30 ≠ « 2 min ») ; sinon minutes.
  const rightVal = isProg
    ? { num: String(Math.round(b.durationMin)), unit: 'min' }
    : b.inputMode === 'distance' && b.distanceM
      ? { num: String(b.distanceM), unit: 'm' }
      : Number.isInteger(b.durationMin)
        ? { num: String(b.durationMin), unit: 'min' }
        : { num: fmtMMSS(b.durationMin), unit: '' }

  // ── Champs adaptatifs (dépliés) ─────────────────────────────────
  const effortUnit = b.effortUnit ?? (sport === 'bike' ? 'watts' : sport === 'elliptique' ? 'zone' : isTreadmill ? 'kmh' : 'pace')
  const distMode = b.inputMode === 'distance'

  const eqWatts = sport === 'bike' && effortUnit === 'watts' ? pctFtp(parseInt(b.value || '0') || 0, refs) : null
  const eqRun = sport === 'run' && effortUnit === 'pace' ? pctOfThreshold(b.value ? mmssToMin(b.value) * 60 : 0, refs) : null
  const eqSwim = sport === 'swim' ? pctOfCss(b.value ? mmssToMin(b.value) * 60 : 0, refs) : null

  // ── Intervalle progressif : une allure/vitesse/watts par répétition ──
  const stepUnit = sport === 'bike' ? 'W' : effortUnit === 'kmh' ? 'km/h' : sport === 'swim' ? '/100m' : '/km'
  const canProgressive = isIv && (b.reps ?? 1) > 1 && (sport === 'run' || sport === 'bike')
  function bumpEffort(v: string, dir: 1 | -1): string {
    if (sport === 'bike') return String(Math.max(0, (parseInt(v || '0') || 0) + dir * 5))
    if (effortUnit === 'kmh') return String(Math.max(0, Math.round(((parseFloat(v || '0') || 0) + dir * 0.5) * 10) / 10))
    return bumpPaceOrWatts(v, dir)
  }
  function setRep(r: number, val: string) {
    const src = b.repValues ?? Array.from({ length: b.reps ?? 1 }, () => b.value)
    const arr = src.slice(); arr[r] = val
    set({ progressive: true, repValues: arr })
  }
  function progressiveEditor() {
    return (
      <div style={{ gridColumn: '1 / -1' }}>
        <FieldLabel>{tr('planning.perRepPace')}</FieldLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {Array.from({ length: b.reps ?? 1 }, (_, r) => {
            const val = b.repValues?.[r] ?? b.value
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 46, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--se-dim)' }}>{tr('planning.repShort')} {r + 1}</span>
                <div style={{ flex: 1 }}>
                  <Stepper value={val} unit={stepUnit} onChange={v => setRep(r, v)} onDec={() => setRep(r, bumpEffort(val, -1))} onInc={() => setRep(r, bumpEffort(val, 1))} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function effortField() {
    if (sport === 'bike') {
      return effortUnit === 'zone'
        ? <Field label={tr('planning.zone')}><Stepper value={String(z)} onChange={v => set({ zone: Math.max(1, Math.min(7, parseInt(v) || 1)), value: '' })} onDec={() => set({ zone: Math.max(1, z - 1), value: '' })} onInc={() => set({ zone: Math.min(7, z + 1), value: '' })} /></Field>
        : <Field label={tr('planning.watts')} eq={`${eqWatts != null ? `≈ ${eqWatts}% FTP · ` : ''}Z${z}${wkg ? ` · ${wkg}` : ''}`}>
            <Stepper value={b.value} unit="W" onChange={v => set({ value: v })} onDec={() => set({ value: String(Math.max(0, (parseInt(b.value || '0') || 0) - 5)) })} onInc={() => set({ value: String((parseInt(b.value || '0') || 0) + 5) })} />
          </Field>
    }
    // tapis : vitesse en km/h (priorité) — dérive dénivelé via la pente
    if (sport === 'run' && effortUnit === 'kmh') {
      const kmh = parseFloat(b.value || '0') || 0
      const eqTxt = b.inclinePct ? `≈ ${fr1(kmhEq)} km/h à plat · Z${z}` : `Z${z}`
      return <Field label="Vitesse" eq={eqTxt}>
        <Stepper value={b.value} unit="km/h" onChange={v => set({ value: v })}
          onDec={() => set({ value: String(Math.max(0, Math.round((kmh - 0.5) * 10) / 10)) })}
          onInc={() => set({ value: String(Math.round((kmh + 0.5) * 10) / 10) })} />
      </Field>
    }
    // aviron : allure /500m (ou watts) — jamais /km
    if (sport === 'rowing') {
      return effortUnit === 'watts'
        ? <Field label={tr('planning.watts')} eq={`Z${z}`}>
            <Stepper value={b.value} unit="W" onChange={v => set({ value: v })} onDec={() => set({ value: String(Math.max(0, (parseInt(b.value || '0') || 0) - 5)) })} onInc={() => set({ value: String((parseInt(b.value || '0') || 0) + 5) })} />
          </Field>
        : <Field label={tr('planning.targetPace')} eq={`Z${z}`}>
            <Stepper value={b.value} unit="/500m" onChange={v => set({ value: v })} onDec={() => set({ value: bumpPaceOrWatts(b.value, -1) })} onInc={() => set({ value: bumpPaceOrWatts(b.value, 1) })} />
          </Field>
    }
    // elliptique : NIVEAU de difficulté machine + zone (jamais d'allure /km).
    if (sport === 'elliptique') {
      return effortUnit === 'watts'
        ? <Field label={tr('planning.watts')} eq={`Z${z}`}>
            <Stepper value={b.value} unit="W" onChange={v => set({ value: v })} onDec={() => set({ value: String(Math.max(0, (parseInt(b.value || '0') || 0) - 5)) })} onInc={() => set({ value: String((parseInt(b.value || '0') || 0) + 5) })} />
          </Field>
        : <Field label={tr('planning.zone')}>
            <Stepper value={String(z)} onChange={v => set({ zone: Math.max(1, Math.min(7, parseInt(v) || 1)), value: '' })} onDec={() => set({ zone: Math.max(1, z - 1), value: '' })} onInc={() => set({ zone: Math.min(7, z + 1), value: '' })} />
          </Field>
    }
    // course / natation : allure
    if (sport === 'run' && effortUnit === 'pctvma') {
      const p = parseInt(b.value.replace('%', '') || '0') || 0
      return <Field label="% VMA" eq={`Z${z}`}>
        <Stepper value={String(p)} unit="%" onChange={v => { const np = parseInt(v) || 0; set({ value: `${np}%`, zone: pctVmaToZone(np) }) }} onDec={() => { const np = Math.max(0, p - 1); set({ value: `${np}%`, zone: pctVmaToZone(np) }) }} onInc={() => { const np = p + 1; set({ value: `${np}%`, zone: pctVmaToZone(np) }) }} />
      </Field>
    }
    const eqTxt = sport === 'run' ? (eqRun != null ? `≈ ${eqRun}% seuil · Z${z}` : `Z${z}`) : (eqSwim != null ? `≈ ${eqSwim}% CSS · Z${z}` : `Z${z}`)
    return <Field label={tr('planning.targetPace')} eq={eqTxt}>
      <Stepper value={b.value} unit={sport === 'swim' ? '/100m' : '/km'} onChange={v => set({ value: v })} onDec={() => set({ value: bumpPaceOrWatts(b.value, -1) })} onInc={() => set({ value: bumpPaceOrWatts(b.value, 1) })} />
    </Field>
  }

  // Temps estimé pour la distance saisie (distance × allure cible) — course & natation.
  const estMin = distMode ? durFromDistance(sport, b.distanceM ?? 0, b.value) : 0
  const estEq = estMin > 0 ? tr(isIv ? 'planning.estTimePerRep' : 'planning.estTime', { t: fmtMMSS(estMin) }) : undefined

  function amountField() {
    // Hypoxie par distance : apnées calibrées 12,5 / 25 / 50 / 100 m.
    if (b.hypoxie?.mode === 'distance') {
      return <Field label={tr('planning.distance')} eq={estEq}>
        <Segmented accent={accent} value={String(b.distanceM ?? 25)} onChange={v => set({ distanceM: parseFloat(v) })}
          options={HYPOXIE_DISTANCES.map(d => ({ key: String(d), label: `${String(d).replace('.', ',')}m` }))} />
      </Field>
    }
    // Durée OU distance pour l'effort
    if (distMode) {
      const cur = isIv ? (b.distanceM ?? 0) : (b.distanceM ?? 0)
      return <Field label={tr('planning.distance')} eq={estEq}><Stepper value={String(cur)} unit="m" onChange={v => set({ distanceM: parseInt(v) || 0 })} onDec={() => set({ distanceM: Math.max(0, cur - (sport === 'swim' ? 25 : 100)) })} onInc={() => set({ distanceM: cur + (sport === 'swim' ? 25 : 100) })} /></Field>
    }
    const cur = isIv ? (b.effortMin ?? 0) : b.durationMin
    return <Field label={isIv ? tr('planning.effortDuration') : tr('planning.duration')}>
      <Stepper value={fmtMMSS(cur)} onChange={v => set(isIv ? { effortMin: mmssToMin(v) } : { durationMin: mmssToMin(v) })}
        onDec={() => set(isIv ? { effortMin: Math.max(0.25, (b.effortMin ?? 0) - 0.25) } : { durationMin: Math.max(0.25, b.durationMin - 1) })}
        onInc={() => set(isIv ? { effortMin: (b.effortMin ?? 0) + 0.25 } : { durationMin: b.durationMin + 1 })} />
    </Field>
  }

  const showDistToggle = sport === 'run' || sport === 'swim' || sport === 'rowing'

  return (
    <div style={{ background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderLeft: `3px solid ${zColor(z)}`, borderRadius: 'var(--se-r)', overflow: 'hidden' }}>
      {/* Ligne repliée */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', cursor: 'pointer' }}>
        <span style={{ width: 22, fontSize: 10, fontWeight: 700, color: zColor(z), letterSpacing: '0.04em' }}>Z{z}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="se-fr" style={{ fontSize: 16, fontWeight: 600, color: 'var(--se-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}<span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400, color: 'var(--se-dim)' }}>{repsLabel}{repsLabel ? '' : ` · ${target}`}</span>
          </div>
        </div>
        <div className="se-fr se-tnum" style={{ fontSize: 18, fontWeight: 600, color: 'var(--se-text)', flexShrink: 0 }}>
          {rightVal.num}<span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 400, color: 'var(--se-dim)' }}> {rightVal.unit}</span>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); setMenu(m => !m) }} style={{ border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}><IconDotsVertical size={18} /></button>
          {menu && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 26, zIndex: 5, background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <button type="button" onClick={() => { setMenu(false); onDuplicate() }} style={menuBtn}><IconCopy size={15} /> {tr('planning.duplicate')}</button>
              <button type="button" onClick={() => { setMenu(false); onRemove() }} style={{ ...menuBtn, color: '#ff5f5f' }}><IconTrash size={15} /> {tr('planning.delete')}</button>
            </div>
          )}
        </div>
      </div>
      {/* Déplié */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--se-rule-soft)', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom + presets de type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input value={b.label} placeholder={BLOCK_NAME_KEY[b.type] ? tr(BLOCK_NAME_KEY[b.type]) : tr('planning.blocName')} onChange={e => set({ label: e.target.value })}
              className="se-fr" style={{ flex: 1, minWidth: 120, background: 'transparent', border: 'none', borderBottom: '1px solid var(--se-rule)', outline: 'none', color: 'var(--se-text)', fontSize: 15, fontWeight: 600, padding: '2px 0' }} />
            {!isTest && (
              <div style={{ display: 'flex', gap: 4 }}>
                {(['warmup', 'effort', 'recovery'] as const).map(t => (
                  <button key={t} type="button" onClick={() => set({ type: t, label: '', zone: t === 'warmup' ? 2 : t === 'recovery' ? 1 : b.zone })}
                    style={{ border: `1px solid ${b.type === t ? accent : 'var(--se-rule)'}`, background: 'transparent', color: b.type === t ? accent : 'var(--se-dim)', borderRadius: 999, padding: '4px 9px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    {t === 'warmup' ? tr('planning.warmupShort') : t === 'recovery' ? tr('planning.recovery') : tr('planning.effort')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Éditeur de bloc TEST (vélo) ── */}
          {isTest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Segmented accent={accent} value={b.testType === 'cp20' ? 'cp20' : 'ramp'}
                onChange={tt => set(tt === 'cp20'
                  ? { testType: 'cp20', label: b.label && b.label !== 'Ramp test' ? b.label : 'Test CP20' }
                  : { testType: 'ramp', rampStartWatts: b.rampStartWatts ?? 100, rampStepWatts: b.rampStepWatts ?? 20, rampStepMin: b.rampStepMin ?? 2, label: b.label && b.label !== 'Test CP20' ? b.label : 'Ramp test' })}
                options={[{ key: 'ramp', label: 'Ramp test' }, { key: 'cp20', label: 'CP20' }]} />

              {b.testType === 'cp20' ? (
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--se-dim)' }}>
                  20 min à fond, <strong style={{ color: 'var(--se-text)' }}>sans puissance imposée</strong> — objectif&nbsp;: la meilleure moyenne de watts possible. Le CP20 sert à estimer la FTP (~95&nbsp;% de la moyenne).
                </p>
              ) : (
                <>
                  <div className="se-fgrid">
                    <Field label="Palier de départ">
                      <Stepper value={String(b.rampStartWatts ?? 100)} unit="W" onChange={v => set({ rampStartWatts: Math.max(0, parseInt(v) || 0) })}
                        onDec={() => set({ rampStartWatts: Math.max(0, (b.rampStartWatts ?? 100) - 5) })} onInc={() => set({ rampStartWatts: (b.rampStartWatts ?? 100) + 5 })} />
                    </Field>
                    <Field label="Incrément / palier">
                      <Stepper value={String(b.rampStepWatts ?? 20)} unit="W" onChange={v => set({ rampStepWatts: Math.max(1, parseInt(v) || 1) })}
                        onDec={() => set({ rampStepWatts: Math.max(1, (b.rampStepWatts ?? 20) - 5) })} onInc={() => set({ rampStepWatts: (b.rampStepWatts ?? 20) + 5 })} />
                    </Field>
                    <Field label="Durée d’un palier">
                      <Stepper value={fmtMMSS(b.rampStepMin ?? 2)} onChange={v => set({ rampStepMin: Math.max(0.5, mmssToMin(v)) })}
                        onDec={() => set({ rampStepMin: Math.max(0.5, (b.rampStepMin ?? 2) - 0.5) })} onInc={() => set({ rampStepMin: (b.rampStepMin ?? 2) + 0.5 })} />
                    </Field>
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--se-dim)' }}>
                    Paliers <strong style={{ color: 'var(--se-text)' }}>+{b.rampStepWatts ?? 20} W toutes les {fmtMMSS(b.rampStepMin ?? 2)}</strong> jusqu’à l’épuisement. En séance, un bouton <strong style={{ color: 'var(--se-text)' }}>« Stop test »</strong> renverra directement au bloc de récupération suivant.
                  </p>
                </>
              )}

              {/* FC + cadence cibles (communes aux deux tests) */}
              <div className="se-fgrid">
                <Field label={tr('planning.targetHr')} opt><Stepper value={b.hrAvg} unit="bpm" placeholder="—" onChange={v => set({ hrAvg: v })} onDec={() => set({ hrAvg: String(Math.max(0, (parseInt(b.hrAvg || '0') || 0) - 1)) })} onInc={() => set({ hrAvg: String((parseInt(b.hrAvg || '0') || 0) + 1) })} /></Field>
                <Field label="Cadence" opt><Stepper value={b.cadence ?? ''} unit="rpm" placeholder="—" onChange={v => set({ cadence: v })} onDec={() => set({ cadence: String(Math.max(0, (parseInt(b.cadence || '0') || 0) - 1)) })} onInc={() => set({ cadence: String((parseInt(b.cadence || '0') || 0) + 1) })} /></Field>
              </div>
            </div>
          )}
          {!isTest && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>{isProg ? tr('planning.progressive') : isIv ? (sport === 'swim' ? tr('planning.series') : tr('planning.interval')) : tr('planning.effort')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {canProgressive && (
                <button type="button" onClick={() => set({ progressive: !b.progressive, ...(b.progressive ? { repValues: undefined } : {}) })} title={tr('planning.progressive')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${b.progressive ? accent : 'var(--se-rule)'}`, background: 'transparent', color: b.progressive ? accent : 'var(--se-dim)', borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  ↗ {tr('planning.progressive')}
                </button>
              )}
              {sport === 'bike' && <Segmented accent={accent} value={effortUnit === 'zone' ? 'zone' : 'watts'} onChange={u => set({ effortUnit: u })} options={[{ key: 'watts', label: tr('planning.watts') }, { key: 'zone', label: tr('planning.zone') }]} />}
              {sport === 'rowing' && <Segmented accent={accent} value={effortUnit === 'watts' ? 'watts' : 'pace'} onChange={u => set({ effortUnit: u, value: '' })} options={[{ key: 'pace', label: '/500m' }, { key: 'watts', label: tr('planning.watts') }]} />}
              {sport === 'elliptique' && <Segmented accent={accent} value={effortUnit === 'watts' ? 'watts' : 'zone'} onChange={u => set({ effortUnit: u, value: '' })} options={[{ key: 'zone', label: tr('planning.zone') }, { key: 'watts', label: tr('planning.watts') }]} />}
              {sport === 'run' && !isProg && (isTreadmill
                ? <Segmented accent={accent} value={effortUnit === 'pctvma' ? 'pctvma' : effortUnit === 'pace' ? 'pace' : 'kmh'} onChange={u => set({ effortUnit: u, value: '', repValues: undefined })} options={[{ key: 'kmh', label: 'km/h' }, { key: 'pace', label: tr('planning.pace') }, { key: 'pctvma', label: '%VMA' }]} />
                : <Segmented accent={accent} value={effortUnit === 'pctvma' ? 'pctvma' : effortUnit === 'kmh' ? 'kmh' : 'pace'} onChange={u => set({ effortUnit: u, value: '', repValues: undefined })} options={[{ key: 'pace', label: tr('planning.pace') }, { key: 'kmh', label: 'km/h' }, { key: 'pctvma', label: '%VMA' }]} />)}
              {sport === 'swim' && !b.hypoxie && showDistToggle && <Segmented accent={accent} value={distMode ? 'distance' : 'time'} onChange={m => set({ inputMode: m })} options={[{ key: 'distance', label: tr('planning.distance') }, { key: 'time', label: tr('planning.time') }]} />}
              {b.hypoxie && <Segmented accent={accent} value={b.hypoxie.mode}
                onChange={m => set({
                  inputMode: 'distance',
                  hypoxie: m === 'strokes'
                    ? { mode: 'strokes', breathEvery: b.hypoxie!.breathEvery ?? 6, recovery: b.hypoxie!.recovery ?? 'stop' }
                    : { ...b.hypoxie!, mode: 'distance' },
                  // Bascule coups de bras → distance libre par défaut (100 m), apnée → 25 m.
                  distanceM: m === 'strokes' ? (b.distanceM && b.distanceM > 12.5 ? b.distanceM : 100) : ((HYPOXIE_DISTANCES as readonly number[]).includes(b.distanceM ?? 0) ? b.distanceM : 25),
                })}
                options={[{ key: 'distance', label: tr('planning.byDistanceMode') }, { key: 'strokes', label: tr('planning.byStrokes') }]} />}
            </div>
          </div>

          <div className="se-fgrid">
            {isProg && (<>
              <Field label={tr('planning.steps')}><Stepper value={String(b.progSteps ?? 1)} onChange={v => set({ progSteps: Math.max(1, parseInt(v) || 1) })} onDec={() => set({ progSteps: Math.max(1, (b.progSteps ?? 1) - 1) })} onInc={() => set({ progSteps: (b.progSteps ?? 1) + 1 })} /></Field>
              <Field label={tr('planning.stepDuration')}><Stepper value={fmtMMSS(b.progStepMin ?? 0)} onChange={v => set({ progStepMin: mmssToMin(v) })} onDec={() => set({ progStepMin: Math.max(0.5, (b.progStepMin ?? 0) - 0.5) })} onInc={() => set({ progStepMin: (b.progStepMin ?? 0) + 0.5 })} /></Field>
              <Field label={tr('planning.startPace')} eq={eqRun != null ? `≈ ${eqRun}% seuil · Z${z}` : `Z${z}`}><Stepper value={b.value} unit="/km" onChange={v => set({ value: v })} onDec={() => set({ value: bumpPaceOrWatts(b.value, -1) })} onInc={() => set({ value: bumpPaceOrWatts(b.value, 1) })} /></Field>
              <Field label={tr('planning.paceStep')} eq={progEndEq}><Stepper value={String(b.progStepSec ?? 0)} unit="s/km" onChange={v => set({ progStepSec: Math.max(0, parseInt(v) || 0) })} onDec={() => set({ progStepSec: Math.max(0, (b.progStepSec ?? 0) - 5) })} onInc={() => set({ progStepSec: (b.progStepSec ?? 0) + 5 })} /></Field>
              <Field label={tr('planning.targetHr')} opt><Stepper value={b.hrAvg} unit="bpm" placeholder="—" onChange={v => set({ hrAvg: v })} onDec={() => set({ hrAvg: String(Math.max(0, (parseInt(b.hrAvg || '0') || 0) - 1)) })} onInc={() => set({ hrAvg: String((parseInt(b.hrAvg || '0') || 0) + 1) })} /></Field>
            </>)}
            {!isProg && (<>
            {isIv && <Field label={tr('planning.reps')}><Stepper value={String(b.reps ?? 1)} onChange={v => set({ reps: Math.max(1, parseInt(v) || 1) })} onDec={() => set({ reps: Math.max(1, (b.reps ?? 1) - 1) })} onInc={() => set({ reps: (b.reps ?? 1) + 1 })} /></Field>}
            {amountField()}
            {b.hypoxie?.mode === 'strokes' && (
              <Field label={tr('planning.breathEvery')} eq={tr('planning.breathEveryEq', { n: String(b.hypoxie.breathEvery ?? 6) })}>
                <Segmented accent={accent} value={String(b.hypoxie.breathEvery ?? 6)}
                  onChange={v => set({ hypoxie: { ...b.hypoxie!, breathEvery: parseInt(v) || 6 } })}
                  options={HYPOXIE_STROKES.map(n => ({ key: String(n), label: String(n) }))} />
              </Field>
            )}
            {/* Distance OU temps — course & aviron, blocs simples ET intervalles
                (natation utilise le sélecteur d'en-tête ci-dessus). */}
            {sport !== 'bike' && sport !== 'swim' && showDistToggle && !(isTreadmill && effortUnit === 'kmh') && (
              <Field label={tr('planning.mode')}><Segmented accent={accent} value={distMode ? 'distance' : 'time'} onChange={m => set({ inputMode: m })} options={[{ key: 'distance', label: tr('planning.distance') }, { key: 'time', label: tr('planning.time') }]} /></Field>
            )}
            {b.progressive && isIv ? progressiveEditor() : effortField()}
            {sport === 'elliptique' && (
              <Field label={tr('planning.machineLevel')} opt>
                <Stepper value={String(b.machineLevel ?? 0)} unit="niv." placeholder="—" onChange={v => set({ machineLevel: Math.max(0, parseInt(v) || 0) })}
                  onDec={() => set({ machineLevel: Math.max(0, (b.machineLevel ?? 0) - 1) })}
                  onInc={() => set({ machineLevel: (b.machineLevel ?? 0) + 1 })} />
              </Field>
            )}
            {isTreadmill && (
              <Field label="Pente" eq={(b.elevationM ?? 0) > 0 ? `D+ ${b.elevationM} m` : undefined}>
                <Stepper value={String(b.inclinePct ?? 0)} unit="%" onChange={v => set({ inclinePct: Math.max(0, parseFloat(v.replace(',', '.')) || 0) })}
                  onDec={() => set({ inclinePct: Math.max(0, Math.round(((b.inclinePct ?? 0) - 0.5) * 10) / 10) })}
                  onInc={() => set({ inclinePct: Math.round(((b.inclinePct ?? 0) + 0.5) * 10) / 10 })} />
              </Field>
            )}
            {sport === 'swim'
              ? <Field label={tr('planning.stroke')} opt><Segmented accent={accent} value={(b.nage ?? 'Crawl') as 'Crawl'} onChange={n => set({ nage: n })} options={[{ key: 'Crawl', label: 'Crawl' }, { key: 'Dos', label: 'Dos' }]} /></Field>
              : <Field label={tr('planning.targetHr')} opt><Stepper value={b.hrAvg} unit="bpm" placeholder="—" onChange={v => set({ hrAvg: v })} onDec={() => set({ hrAvg: String(Math.max(0, (parseInt(b.hrAvg || '0') || 0) - 1)) })} onInc={() => set({ hrAvg: String((parseInt(b.hrAvg || '0') || 0) + 1) })} /></Field>}
            {/* Cadence cible (vélo) — visible aussi en direct pendant la séance */}
            {sport === 'bike' && <Field label="Cadence" opt><Stepper value={b.cadence ?? ''} unit="rpm" placeholder="—" onChange={v => set({ cadence: v })} onDec={() => set({ cadence: String(Math.max(0, (parseInt(b.cadence || '0') || 0) - 1)) })} onInc={() => set({ cadence: String((parseInt(b.cadence || '0') || 0) + 1) })} /></Field>}
            </>)}
          </div>
          </>)}

          {isIv && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 4, borderTop: '1px solid var(--se-rule-soft)' }}>
              <Field label={tr('planning.recoveryDuration')}><Stepper value={fmtMMSS(b.recoveryMin ?? 0)} onChange={v => set({ recoveryMin: mmssToMin(v) })} onDec={() => set({ recoveryMin: Math.max(0, (b.recoveryMin ?? 0) - 0.25) })} onInc={() => set({ recoveryMin: (b.recoveryMin ?? 0) + 0.25 })} /></Field>
              {sport === 'run'
                ? <>
                    <Field label={tr('planning.recoveryType')}><Segmented accent={accent} value={(b.recoveryStyle ?? 'trot') as 'trot'} onChange={s => set({ recoveryStyle: s })} options={[{ key: 'trot', label: tr('planning.jog') }, { key: 'marche', label: tr('planning.walk') }]} /></Field>
                    <Field label={tr('planning.recoveryPace')} opt>
                      <Stepper value={b.recoveryValue ?? ''} unit={effortUnit === 'kmh' ? 'km/h' : '/km'} placeholder="—"
                        onChange={v => set({ recoveryValue: v })}
                        onDec={() => set({ recoveryValue: bumpEffort(b.recoveryValue ?? '', -1) })}
                        onInc={() => set({ recoveryValue: bumpEffort(b.recoveryValue ?? '', 1) })} />
                    </Field>
                  </>
                : sport === 'bike'
                  ? <Field label={tr('planning.recoveryWatts')}><Stepper value={b.recoveryValue ?? ''} unit="W" onChange={v => set({ recoveryValue: v })} onDec={() => set({ recoveryValue: String(Math.max(0, (parseInt(b.recoveryValue || '0') || 0) - 5)) })} onInc={() => set({ recoveryValue: String((parseInt(b.recoveryValue || '0') || 0) + 5) })} /></Field>
                  : b.hypoxie
                    ? <Field label={tr('planning.hypoxieRecovery')}><Segmented accent={accent} value={(b.hypoxie.recovery ?? 'stop') as 'stop'} onChange={r => set({ hypoxie: { ...b.hypoxie!, recovery: r as 'stop' | 'continue' } })} options={[{ key: 'stop', label: tr('planning.recoveryStop') }, { key: 'continue', label: tr('planning.recoveryContinue') }]} /></Field>
                    : <Field label={tr('planning.rest')} opt><Stepper value={fmtMMSS(b.recoveryMin ?? 0)} onChange={v => set({ recoveryMin: mmssToMin(v) })} onDec={() => set({ recoveryMin: Math.max(0, (b.recoveryMin ?? 0) - 0.25) })} onInc={() => set({ recoveryMin: (b.recoveryMin ?? 0) + 0.25 })} /></Field>}
            </div>
          )}

          {/* Natation : matériel du bloc (multi-sélection) */}
          {sport === 'swim' && (
            <Field label={tr('planning.equipment')} opt>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SWIM_EQUIPMENT.map(eq => {
                  const active = (b.equipment ?? []).includes(eq)
                  return (
                    <button key={eq} type="button"
                      onClick={() => set({ equipment: active ? (b.equipment ?? []).filter(x => x !== eq) : [...(b.equipment ?? []), eq] })}
                      style={{ border: `1px solid ${active ? accent : 'var(--se-rule)'}`, background: active ? `${accent}14` : 'transparent', color: active ? accent : 'var(--se-dim)', borderRadius: 999, padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {eq}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, eq, opt, children }: { label: string; eq?: string; opt?: boolean; children: React.ReactNode }) {
  const { t: tr } = useI18n()
  return (
    <div>
      <FieldLabel right={opt ? <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--se-dim)', border: '1px solid var(--se-rule)', borderRadius: 5, padding: '1px 5px' }}>{tr('planning.option')}</span> : undefined}>{label}</FieldLabel>
      {children}
      {eq && <p style={{ margin: '5px 2px 0', fontSize: 10, color: 'var(--se-dim)' }}>{eq}</p>}
    </div>
  )
}

const menuBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '9px 14px',
  border: 'none', background: 'transparent', color: 'var(--se-text)', fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
}
