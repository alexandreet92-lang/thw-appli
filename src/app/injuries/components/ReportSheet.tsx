'use client'
// Feuille « Signaler » — création d'un signalement. Champs soignés, sévérité en
// segmenté (point de couleur fonctionnel), sliders 0-10, date → « ≈ N j ».
import { useState } from 'react'
import { Sheet, primaryBtn } from './Sheet'
import { SEV, STRUCTURES, SIDES, type Severity, type Side, type Structure, type Mechanism, type Evolution } from '../types'
import type { NewInjury } from '../useInjuries'
import { daysSince } from '../lib'

const FB = 'var(--font-body)'
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '9px 11px', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none' }
const labelStyle: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 'var(--space-1)' }
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

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
  const [severity, setSeverity] = useState<Severity>('gene')
  const [zone, setZone] = useState('')
  const [side, setSide] = useState<Side>('central')
  const [structure, setStructure] = useState<Structure>('muscle')
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

  return (
    <Sheet title="Signaler" onClose={onClose}
      footer={<button onClick={() => void save()} disabled={!zone.trim() || saving} style={{ ...primaryBtn, opacity: zone.trim() && !saving ? 1 : 0.5 }}>{saving ? 'Enregistrement…' : 'Enregistrer le signalement'}</button>}>
      <Field label="Sévérité"><Seg value={severity} onChange={v => setSeverity(v as Severity)} options={(['gene', 'douleur', 'blessure'] as Severity[]).map(v => ({ v, label: SEV[v].label, color: SEV[v].varc }))} /></Field>
      <Field label="Zone"><input value={zone} onChange={e => setZone(e.target.value)} placeholder="ex : Ischio-jambier" style={inputStyle} /></Field>
      <Field label="Côté"><Seg value={side} onChange={v => setSide(v as Side)} options={SIDES.map(v => ({ v, label: cap(v) }))} /></Field>
      <Field label="Structure"><Seg value={structure} onChange={v => setStructure(v as Structure)} options={STRUCTURES.map(v => ({ v, label: cap(v) }))} /></Field>
      <Field label="Précision (optionnel)"><input value={precision} onChange={e => setPrecision(e.target.value)} placeholder="ex : insertion basse" style={inputStyle} /></Field>
      <Slider label="Intensité au repos" value={ir} onChange={setIr} />
      <Slider label="Intensité à l'effort" value={ie} onChange={setIe} />
      <Field label={`Date d'apparition  ·  ≈ ${daysSince(date)} j`}><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label="Mécanisme"><Seg value={mechanism} onChange={v => setMechanism(v as Mechanism)} options={[{ v: 'soudaine', label: 'Soudaine' }, { v: 'progressive', label: 'Progressive' }]} /></Field>
      <Field label="Activité d'origine (optionnel)"><input value={activity} onChange={e => setActivity(e.target.value)} placeholder="ex : Running" style={inputStyle} /></Field>
      <Field label="Évolution"><Seg value={evolution} onChange={v => setEvolution(v as Evolution)} options={[{ v: 'aggrave', label: "S'aggrave" }, { v: 'stable', label: 'Stable' }, { v: 'ameliore', label: "S'améliore" }]} /></Field>
      <Field label="Description (optionnel)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Contexte, ressenti…" style={{ ...inputStyle, resize: 'vertical' }} /></Field>
    </Sheet>
  )
}
