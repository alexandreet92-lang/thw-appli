'use client'
// ══════════════════════════════════════════════════════════════════
// Carte de bloc (mobile) — repliée (filet zone + badge Zx + cible +
// durée/distance + ⋮) ou dépliée (steppers adaptatifs par sport).
// Logique métier inchangée : on ne fait que muter le MBlock (durationMin
// reste canonique pour SM/SN).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { IconDotsVertical, IconCopy, IconTrash } from '@tabler/icons-react'
import type { SportType } from '@/app/planning/page'
import { zColor, fmtMMSS, mmssToMin, bumpPaceOrWatts, pctFtp, pctOfThreshold, pctOfCss, type AthleteRefs } from './editorial'
import { recalc, BLOCK_NAME, type MBlock } from './blocks'
import { Stepper, Segmented, FieldLabel } from './ui'

function pctVmaToZone(p: number): number {
  if (p < 80) return 1; if (p < 87) return 2; if (p < 95) return 3
  if (p < 102) return 4; if (p < 110) return 5; if (p < 120) return 6; return 7
}

export function BlockCard({ block: b, sport, accent, refs, expanded, onToggle, onChange, onRemove, onDuplicate }: {
  block: MBlock; sport: SportType; accent: string; refs: AthleteRefs
  expanded: boolean; onToggle: () => void
  onChange: (b: MBlock) => void; onRemove: () => void; onDuplicate: () => void
}) {
  const [menu, setMenu] = useState(false)
  const isIv = b.mode === 'interval'
  const set = (patch: Partial<MBlock>) => onChange(recalc(sport, { ...b, ...patch }))

  const name = b.label || BLOCK_NAME[b.type] || (isIv ? 'Intervalle' : 'Bloc')
  const z = b.zone
  // Cible affichée (détail discret)
  const target = sport === 'bike'
    ? (b.value ? `${b.value} W` : `Z${z}`)
    : sport === 'swim'
      ? (b.value ? `${b.value}/100m` : `Z${z}`)
      : (b.value ? `${b.value}/km` : `Z${z}`)
  const repsLabel = isIv && b.reps ? ` · ${b.reps} × ${b.inputMode === 'distance' && b.distanceM ? `${b.distanceM}m` : fmtMMSS(b.effortMin ?? 0)}` : ''
  // Valeur de droite : distance (par rép) si mode distance, sinon durée totale
  const rightVal = b.inputMode === 'distance' && b.distanceM
    ? { num: String(b.distanceM), unit: 'm' }
    : { num: String(Math.round(b.durationMin)), unit: 'min' }

  // ── Champs adaptatifs (dépliés) ─────────────────────────────────
  const effortUnit = b.effortUnit ?? (sport === 'bike' ? 'watts' : 'pace')
  const distMode = b.inputMode === 'distance'

  const eqWatts = sport === 'bike' && effortUnit === 'watts' ? pctFtp(parseInt(b.value || '0') || 0, refs) : null
  const eqRun = sport === 'run' && effortUnit === 'pace' ? pctOfThreshold(b.value ? mmssToMin(b.value) * 60 : 0, refs) : null
  const eqSwim = sport === 'swim' ? pctOfCss(b.value ? mmssToMin(b.value) * 60 : 0, refs) : null

  function effortField() {
    if (sport === 'bike') {
      return effortUnit === 'zone'
        ? <Field label="Zone"><Stepper value={String(z)} onChange={v => set({ zone: Math.max(1, Math.min(7, parseInt(v) || 1)), value: '' })} onDec={() => set({ zone: Math.max(1, z - 1), value: '' })} onInc={() => set({ zone: Math.min(7, z + 1), value: '' })} /></Field>
        : <Field label="Watts" eq={eqWatts != null ? `≈ ${eqWatts}% FTP · Z${z}` : `Z${z}`}>
            <Stepper value={b.value} unit="W" onChange={v => set({ value: v })} onDec={() => set({ value: String(Math.max(0, (parseInt(b.value || '0') || 0) - 5)) })} onInc={() => set({ value: String((parseInt(b.value || '0') || 0) + 5) })} />
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
    return <Field label={sport === 'swim' ? 'Allure cible' : 'Allure cible'} eq={eqTxt}>
      <Stepper value={b.value} unit={sport === 'swim' ? '/100m' : '/km'} onChange={v => set({ value: v })} onDec={() => set({ value: bumpPaceOrWatts(b.value, -1) })} onInc={() => set({ value: bumpPaceOrWatts(b.value, 1) })} />
    </Field>
  }

  function amountField() {
    // Durée OU distance pour l'effort
    if (distMode) {
      const cur = isIv ? (b.distanceM ?? 0) : (b.distanceM ?? 0)
      return <Field label="Distance"><Stepper value={String(cur)} unit="m" onChange={v => set({ distanceM: parseInt(v) || 0 })} onDec={() => set({ distanceM: Math.max(0, cur - (sport === 'swim' ? 25 : 100)) })} onInc={() => set({ distanceM: cur + (sport === 'swim' ? 25 : 100) })} /></Field>
    }
    const cur = isIv ? (b.effortMin ?? 0) : b.durationMin
    return <Field label={isIv ? 'Durée effort' : 'Durée'}>
      <Stepper value={fmtMMSS(cur)} onChange={v => set(isIv ? { effortMin: mmssToMin(v) } : { durationMin: mmssToMin(v) })}
        onDec={() => set(isIv ? { effortMin: Math.max(0.25, (b.effortMin ?? 0) - 0.25) } : { durationMin: Math.max(0.25, b.durationMin - 1) })}
        onInc={() => set(isIv ? { effortMin: (b.effortMin ?? 0) + 0.25 } : { durationMin: b.durationMin + 1 })} />
    </Field>
  }

  const showDistToggle = sport === 'run' || sport === 'swim'

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
              <button type="button" onClick={() => { setMenu(false); onDuplicate() }} style={menuBtn}><IconCopy size={15} /> Dupliquer</button>
              <button type="button" onClick={() => { setMenu(false); onRemove() }} style={{ ...menuBtn, color: '#ff5f5f' }}><IconTrash size={15} /> Supprimer</button>
            </div>
          )}
        </div>
      </div>
      {/* Déplié */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--se-rule-soft)', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom + presets de type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input value={b.label} placeholder={BLOCK_NAME[b.type] ?? 'Nom du bloc'} onChange={e => set({ label: e.target.value })}
              className="se-fr" style={{ flex: 1, minWidth: 120, background: 'transparent', border: 'none', borderBottom: '1px solid var(--se-rule)', outline: 'none', color: 'var(--se-text)', fontSize: 15, fontWeight: 600, padding: '2px 0' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['warmup', 'effort', 'recovery'] as const).map(t => (
                <button key={t} type="button" onClick={() => set({ type: t, label: '', zone: t === 'warmup' ? 2 : t === 'recovery' ? 1 : b.zone })}
                  style={{ border: `1px solid ${b.type === t ? accent : 'var(--se-rule)'}`, background: 'transparent', color: b.type === t ? accent : 'var(--se-dim)', borderRadius: 999, padding: '4px 9px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  {t === 'warmup' ? 'Échauf.' : t === 'recovery' ? 'Récup' : 'Effort'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>{isIv ? (sport === 'swim' ? 'Série' : 'Intervalle') : 'Effort'}</span>
            {sport === 'bike' && <Segmented accent={accent} value={effortUnit === 'zone' ? 'zone' : 'watts'} onChange={u => set({ effortUnit: u })} options={[{ key: 'watts', label: 'Watts' }, { key: 'zone', label: 'Zone' }]} />}
            {sport === 'run' && <Segmented accent={accent} value={effortUnit === 'pctvma' ? 'pctvma' : 'pace'} onChange={u => set({ effortUnit: u })} options={[{ key: 'pace', label: 'Allure' }, { key: 'pctvma', label: '%VMA' }]} />}
            {sport === 'swim' && showDistToggle && <Segmented accent={accent} value={distMode ? 'distance' : 'time'} onChange={m => set({ inputMode: m })} options={[{ key: 'distance', label: 'Distance' }, { key: 'time', label: 'Temps' }]} />}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {isIv && <Field label="Répétitions"><Stepper value={String(b.reps ?? 1)} onChange={v => set({ reps: Math.max(1, parseInt(v) || 1) })} onDec={() => set({ reps: Math.max(1, (b.reps ?? 1) - 1) })} onInc={() => set({ reps: (b.reps ?? 1) + 1 })} /></Field>}
            {amountField()}
            {!isIv && sport !== 'bike' && showDistToggle && (
              <Field label="Mode"><Segmented accent={accent} value={distMode ? 'distance' : 'time'} onChange={m => set({ inputMode: m })} options={[{ key: 'distance', label: 'Distance' }, { key: 'time', label: 'Temps' }]} /></Field>
            )}
            {effortField()}
            {sport === 'swim'
              ? <Field label="Nage" opt><Segmented accent={accent} value={(b.nage ?? 'Crawl') as 'Crawl'} onChange={n => set({ nage: n })} options={[{ key: 'Crawl', label: 'Crawl' }, { key: 'Dos', label: 'Dos' }]} /></Field>
              : <Field label="FC cible" opt><Stepper value={b.hrAvg} unit="bpm" placeholder="—" onChange={v => set({ hrAvg: v })} onDec={() => set({ hrAvg: String(Math.max(0, (parseInt(b.hrAvg || '0') || 0) - 1)) })} onInc={() => set({ hrAvg: String((parseInt(b.hrAvg || '0') || 0) + 1) })} /></Field>}
          </div>

          {isIv && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 4, borderTop: '1px solid var(--se-rule-soft)' }}>
              <Field label="Récup durée"><Stepper value={fmtMMSS(b.recoveryMin ?? 0)} onChange={v => set({ recoveryMin: mmssToMin(v) })} onDec={() => set({ recoveryMin: Math.max(0, (b.recoveryMin ?? 0) - 0.25) })} onInc={() => set({ recoveryMin: (b.recoveryMin ?? 0) + 0.25 })} /></Field>
              {sport === 'run'
                ? <Field label="Type récup"><Segmented accent={accent} value={(b.recoveryStyle ?? 'trot') as 'trot'} onChange={s => set({ recoveryStyle: s })} options={[{ key: 'trot', label: 'Trot' }, { key: 'marche', label: 'Marche' }]} /></Field>
                : sport === 'bike'
                  ? <Field label="Récup watts"><Stepper value={b.recoveryValue ?? ''} unit="W" onChange={v => set({ recoveryValue: v })} onDec={() => set({ recoveryValue: String(Math.max(0, (parseInt(b.recoveryValue || '0') || 0) - 5)) })} onInc={() => set({ recoveryValue: String((parseInt(b.recoveryValue || '0') || 0) + 5) })} /></Field>
                  : <Field label="Repos" opt><Stepper value={fmtMMSS(b.recoveryMin ?? 0)} onChange={v => set({ recoveryMin: mmssToMin(v) })} onDec={() => set({ recoveryMin: Math.max(0, (b.recoveryMin ?? 0) - 0.25) })} onInc={() => set({ recoveryMin: (b.recoveryMin ?? 0) + 0.25 })} /></Field>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, eq, opt, children }: { label: string; eq?: string; opt?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel right={opt ? <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--se-dim)', border: '1px solid var(--se-rule)', borderRadius: 5, padding: '1px 5px' }}>OPTION</span> : undefined}>{label}</FieldLabel>
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
