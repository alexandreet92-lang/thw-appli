'use client'
// Feuille « Signaler » — création d'un signalement. Champs soignés, sévérité en
// segmenté (point de couleur fonctionnel), sliders 0-10, date → « ≈ N j ».
import { useState } from 'react'
import { Sheet, primaryBtn } from './Sheet'
import { SEV, STRUCTURES, SIDES, severityFromScore, type Severity, type Side, type Structure, type Mechanism, type Evolution } from '../types'
import type { NewInjury } from '../useInjuries'
import { daysSince, severityColor } from '../lib'
import { useI18n } from '@/lib/i18n'
import { MBlock, MField, MPills, SegTrack, SliderRow, SoftInput, SoftTextarea, PillButton } from './mobileUi'

const FB = 'var(--font-body)'
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '9px 11px', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none' }
const labelStyle: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 'var(--space-1)' }
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
// Zones fréquentes — sélection rapide pour fiabiliser la saisie (évite les fautes
// et les doublons type « Sous le pied ggauche »). Champ libre conservé au-dessous.
const COMMON_ZONES = ['Cheville', 'Genou', 'Cuisse', 'Ischio-jambiers', 'Mollet', 'Tendon d’Achille', 'Pied', 'Hanche', 'Aine', 'Bas du dos', 'Haut du dos', 'Nuque', 'Épaule', 'Coude', 'Poignet']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 'var(--space-4)' }}><label style={labelStyle}>{label}</label>{children}</div>
}
function Seg({ value, options, onChange }: { value: string; options: { v: string; label: string; color?: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
      {options.map(o => {
        const a = o.v === value
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', background: a ? 'var(--bg-card2)' : 'transparent', color: a ? 'var(--text)' : 'var(--text-dim)', fontFamily: FB, fontSize: 12, fontWeight: a ? 600 : 500 }}>
            {o.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: o.color }} />}{o.label}
          </button>
        )
      })}
    </div>
  )
}
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <span style={labelStyle}>{label}</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text)' }}>{value}/10</span>
      </div>
      <input type="range" min={0} max={10} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
    </div>
  )
}

export function ReportSheet({ onClose, onSave }: { onClose: () => void; onSave: (inj: NewInjury) => Promise<string | null> }) {
  const { t } = useI18n()
  const [severity, setSeverity] = useState<Severity>('gene')
  const [zone, setZone] = useState('')
  const [side, setSide] = useState<Side>('central')
  const [structure, setStructure] = useState<Structure>('inconnu')
  const [precision, setPrecision] = useState('')
  const [ir, setIr] = useState(0)
  const [ie, setIe] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [mechanism, setMechanism] = useState<Mechanism>('progressive')
  const [activity, setActivity] = useState('')
  const [evolution, setEvolution] = useState<Evolution>('stable')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!zone.trim() || saving) return
    setSaving(true)
    const id = await onSave({
      severity, zone: zone.trim(), side, structure, precision: precision.trim() || null,
      intensity_rest: ir, intensity_effort: ie, onset_date: date, mechanism, activity: activity.trim() || null,
      evolution, description: description.trim() || null, phase: 'aigue', return_estimate_date: null,
      status: 'active', resolved_date: null, practitioner: null, next_appointment: null,
      rehab: [], impact: { avoid: [], ok: [] },
    })
    setSaving(false)
    if (id) onClose()
  }

  // ── Mobile : flux simplifié (maquette) — zone, intensité 0-10, origine, date.
  // L'intensité 0-10 (intensity_effort) pilote la carte et la courbe ; la
  // catégorie (gêne/douleur/blessure) en est déduite pour l'analyse et le coach.
  const canSave = !!zone.trim() && !saving
  const setScore = (v: number) => { setIe(v); setSeverity(severityFromScore(v)) }
  const mobile = (
    <>
      <MBlock>
        <MField label={t('injuries.fieldZone')}>
          <div style={{ marginBottom: 10 }}>
            <MPills value={COMMON_ZONES.find(z => z.toLowerCase() === zone.trim().toLowerCase()) ?? null} onChange={setZone}
              options={COMMON_ZONES.map(z => ({ v: z, l: z }))} scroll />
          </div>
          <SoftInput value={zone} onChange={setZone} placeholder={t('injuries.zonePlaceholder')} ariaLabel={t('injuries.fieldZone')} />
        </MField>
        <MField label={t('injuries.fieldSide')} last>
          <SegTrack value={side} onChange={v => setSide(v)} options={SIDES.map(v => ({ v, l: cap(v) }))} />
        </MField>
      </MBlock>
      <MBlock>
        <SliderRow label={t('injc.severity')} value={ie} onChange={setScore} color={severityColor(ie)} />
      </MBlock>
      <MBlock title={t('injc.reportHow')}>
        <MField label={t('injuries.fieldMechanism')}>
          <SegTrack value={mechanism} onChange={v => setMechanism(v)} options={[{ v: 'soudaine' as Mechanism, l: t('injuries.mechSudden') }, { v: 'progressive' as Mechanism, l: t('injuries.mechProgressive') }]} />
        </MField>
        <MField label={t('injuries.fieldActivity')}>
          <SoftInput value={activity} onChange={setActivity} placeholder={t('injuries.activityPlaceholder')} ariaLabel={t('injuries.fieldActivity')} />
        </MField>
        <MField label={t('injuries.fieldDescription')} last>
          <SoftTextarea value={description} onChange={setDescription} placeholder={t('injuries.descriptionPlaceholder')} ariaLabel={t('injuries.fieldDescription')} />
        </MField>
      </MBlock>
      <MBlock>
        <MField label={t('injuries.fieldOnsetDate', { days: daysSince(date) })} last>
          <SoftInput type="date" value={date} onChange={setDate} ariaLabel={t('injuries.fieldOnsetDate', { days: daysSince(date) })} />
        </MField>
      </MBlock>
    </>
  )
  const mobileFooter = (
    <PillButton onClick={() => void save()} disabled={!canSave}>{saving ? t('injuries.saving') : t('injuries.saveReport')}</PillButton>
  )

  return (
    <Sheet title={t('injuries.reportTitle')} onClose={onClose} mobile={mobile} mobileFooter={mobileFooter}
      footer={<button onClick={() => void save()} disabled={!zone.trim() || saving} style={{ ...primaryBtn, opacity: zone.trim() && !saving ? 1 : 0.5 }}>{saving ? t('injuries.saving') : t('injuries.saveReport')}</button>}>
      <Field label={t('injuries.fieldSeverity')}><Seg value={severity} onChange={v => setSeverity(v as Severity)} options={(['gene', 'douleur', 'blessure'] as Severity[]).map(v => ({ v, label: SEV[v].label, color: SEV[v].varc }))} /></Field>
      <Field label={t('injuries.fieldZone')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-2)' }}>
          {COMMON_ZONES.map(z => {
            const a = zone.trim().toLowerCase() === z.toLowerCase()
            return (
              <button key={z} type="button" onClick={() => setZone(z)} style={{ padding: '6px 11px', borderRadius: 'var(--r-pill)', border: `1px solid ${a ? 'var(--primary)' : 'var(--border)'}`, background: a ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'var(--bg-card2)', color: a ? 'var(--primary)' : 'var(--text-mid)', fontFamily: FB, fontSize: 12, fontWeight: a ? 600 : 500, cursor: 'pointer' }}>{z}</button>
            )
          })}
        </div>
        <input value={zone} onChange={e => setZone(e.target.value)} placeholder={t('injuries.zonePlaceholder')} style={inputStyle} />
      </Field>
      <Field label={t('injuries.fieldSide')}><Seg value={side} onChange={v => setSide(v as Side)} options={SIDES.map(v => ({ v, label: cap(v) }))} /></Field>
      <Field label={t('injuries.fieldStructure')}><Seg value={structure} onChange={v => setStructure(v as Structure)} options={STRUCTURES.map(v => ({ v, label: cap(v) }))} /></Field>
      <Field label={t('injuries.fieldPrecision')}><input value={precision} onChange={e => setPrecision(e.target.value)} placeholder={t('injuries.precisionPlaceholder')} style={inputStyle} /></Field>
      <Slider label={t('injuries.sliderRest')} value={ir} onChange={setIr} />
      <Slider label={t('injuries.sliderEffort')} value={ie} onChange={setIe} />
      <Field label={t('injuries.fieldOnsetDate', { days: daysSince(date) })}><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label={t('injuries.fieldMechanism')}><Seg value={mechanism} onChange={v => setMechanism(v as Mechanism)} options={[{ v: 'soudaine', label: t('injuries.mechSudden') }, { v: 'progressive', label: t('injuries.mechProgressive') }]} /></Field>
      <Field label={t('injuries.fieldActivity')}><input value={activity} onChange={e => setActivity(e.target.value)} placeholder={t('injuries.activityPlaceholder')} style={inputStyle} /></Field>
      <Field label={t('injuries.fieldEvolution')}><Seg value={evolution} onChange={v => setEvolution(v as Evolution)} options={[{ v: 'aggrave', label: t('injuries.evoWorse') }, { v: 'stable', label: t('injuries.evoStable') }, { v: 'ameliore', label: t('injuries.evoBetter') }]} /></Field>
      <Field label={t('injuries.fieldDescription')}><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('injuries.descriptionPlaceholder')} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
    </Sheet>
  )
}
