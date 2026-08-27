'use client'
// ══════════════════════════════════════════════════════════════
// Fiches personnalisées — UI. Côté coach : bâtir une fiche (champs libres) +
// voir les réponses. Côté athlète : carte listant les fiches à remplir + modale.
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createCustomForm, listFormsForAthlete, deleteCustomForm,
  listMyForms, submitFormResponses,
  type CustomForm, type FormField, type FieldType,
} from '@/lib/coach/custom-forms'
import { useI18n } from '@/lib/i18n'

const TYPES: { v: FieldType; l: string }[] = [
  { v: 'text', l: 'Texte court' }, { v: 'textarea', l: 'Texte long' }, { v: 'number', l: 'Nombre' },
  { v: 'scale', l: 'Échelle 1–5' }, { v: 'bool', l: 'Oui / Non' }, { v: 'select', l: 'Choix' },
]
const uid = () => Math.random().toString(36).slice(2, 9)
const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16 }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-body)' }
const fmtDate = (d: string | null) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' } }

// ── Builder (modale) ──────────────────────────────────────────
function Builder({ athleteId, athleteName, onClose, onCreated }: { athleteId: string; athleteName: string; onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState<FormField[]>([{ id: uid(), label: '', type: 'text' }])
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const patch = (id: string, p: Partial<FormField>) => setFields(f => f.map(x => x.id === id ? { ...x, ...p } : x))
  const valid = title.trim() && fields.some(f => f.label.trim())

  async function save() {
    if (!valid || busy) return
    setBusy(true)
    const clean = fields.filter(f => f.label.trim()).map(f => ({ ...f, label: f.label.trim(), options: f.type === 'select' ? (f.options ?? []).filter(Boolean) : undefined }))
    const res = await createCustomForm(athleteId, title, clean, athleteName)
    setBusy(false)
    if (res) onCreated()
  }
  if (!mounted) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: 'min(520px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
        <div style={{ flexShrink: 0, padding: '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{t('w2d.newFormFor', { name: athleteName })}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{t('w2d.builderHint')}</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder={t('w2d.formTitlePlaceholder')} style={{ ...inp, fontSize: 15, marginBottom: 14 }} />
          {fields.map((f, i) => (
            <div key={f.id} style={{ ...card, background: 'var(--bg-card2)', padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={f.label} onChange={e => patch(f.id, { label: e.target.value })} placeholder={t('w2d.questionN', { n: i + 1 })} style={{ ...inp, flex: 1 }} />
                <select value={f.type} onChange={e => patch(f.id, { type: e.target.value as FieldType })} style={{ ...inp, width: 130, cursor: 'pointer' }}>
                  {TYPES.map(ft => <option key={ft.v} value={ft.v}>{t(`w2d.ftype_${ft.v}`)}</option>)}
                </select>
                {fields.length > 1 && <button onClick={() => setFields(x => x.filter(y => y.id !== f.id))} aria-label={t('w2d.remove')} style={{ width: 34, borderRadius: 9, border: 'none', background: 'var(--bg-card)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>✕</button>}
              </div>
              {f.type === 'select' && (
                <input value={(f.options ?? []).join(', ')} onChange={e => patch(f.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder={t('w2d.optionsPlaceholder')} style={{ ...inp, fontSize: 12.5 }} />
              )}
            </div>
          ))}
          <button onClick={() => setFields(f => [...f, { id: uid(), label: '', type: 'text' }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font-body)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {t('w2d.addField')}
          </button>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w2d.cancel')}</button>
          <button onClick={() => void save()} disabled={!valid || busy} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: valid && !busy ? 'var(--primary)' : 'var(--bg-card2)', color: valid && !busy ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: valid && !busy ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>{t('w2d.sendToAthlete')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Coach : section fiches dans la bulle « Fiche » ────────────
export function CoachFormsSection({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const { t } = useI18n()
  const [forms, setForms] = useState<CustomForm[] | null>(null)
  const [build, setBuild] = useState(false)
  const load = () => { void listFormsForAthlete(athleteId).then(setForms) }
  useEffect(() => { load() }, [athleteId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ ...card, borderStyle: forms && forms.length ? 'solid' : 'dashed' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: forms && forms.length ? 12 : 4 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t('w2d.customForms')}</div>
        <button onClick={() => setBuild(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          {t('w2d.createForm')}
        </button>
      </div>
      {forms === null ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w2d.loading')}</div>
        : forms.length === 0 ? <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>{t('w2d.customFormsEmpty')}</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {forms.map(f => (
              <div key={f.id} style={{ ...card, background: 'var(--bg-card2)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{f.title}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: f.status === 'filled' ? '#22c55e' : 'var(--text-dim)', border: `1px solid ${f.status === 'filled' ? '#22c55e' : 'var(--border)'}` }}>{f.status === 'filled' ? t('w2d.filledOn', { date: fmtDate(f.filledAt) }) : t('w2d.pending')}</span>
                  <button onClick={async () => { if (confirm(t('w2d.confirmDeleteForm'))) { await deleteCustomForm(f.id); load() } }} aria-label={t('w2d.delete')} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.fields.map(fl => (
                    <div key={fl.id} style={{ fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-dim)' }}>{fl.label} : </span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{f.responses && f.responses[fl.id] !== undefined && f.responses[fl.id] !== '' ? String(f.responses[fl.id]) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      {build && <Builder athleteId={athleteId} athleteName={athleteName} onClose={() => setBuild(false)} onCreated={() => { setBuild(false); load() }} />}
    </div>
  )
}

// ── Athlète : carte « fiches à remplir » (dashboard) ──────────
export function AthleteFormsCard() {
  const { t } = useI18n()
  const [forms, setForms] = useState<CustomForm[]>([])
  const [fill, setFill] = useState<CustomForm | null>(null)
  const load = () => { void listMyForms().then(setForms) }
  useEffect(() => { load() }, [])
  const pending = forms.filter(f => f.status === 'sent')
  if (forms.length === 0) return null

  return (
    <div style={{ ...card }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{t('w2d.coachForms')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{pending.length > 0 ? t(pending.length > 1 ? 'w2d.formsToFillPlural' : 'w2d.formsToFillSingular', { n: pending.length }) : t('w2d.allUpToDate')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {forms.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--bg-card2)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
              <span style={{ fontSize: 11.5, color: f.status === 'filled' ? '#22c55e' : 'var(--primary)' }}>{f.status === 'filled' ? t('w2d.filledThanks') : t(f.fields.length > 1 ? 'w2d.questionsCountPlural' : 'w2d.questionsCountSingular', { n: f.fields.length })}</span>
            </span>
            <button onClick={() => setFill(f)} style={{ padding: '7px 13px', borderRadius: 10, border: f.status === 'filled' ? '1px solid var(--border)' : 'none', background: f.status === 'filled' ? 'var(--bg-card)' : 'var(--primary)', color: f.status === 'filled' ? 'var(--text-mid)' : 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>{f.status === 'filled' ? t('w2d.view') : t('w2d.fill')}</button>
          </div>
        ))}
      </div>
      {fill && <FillModal form={fill} onClose={() => setFill(null)} onDone={() => { setFill(null); load() }} />}
    </div>
  )
}

function FillModal({ form, onClose, onDone }: { form: CustomForm; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const [vals, setVals] = useState<Record<string, string | number | boolean>>(form.responses ?? {})
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const set = (id: string, v: string | number | boolean) => setVals(s => ({ ...s, [id]: v }))
  async function submit() { if (busy) return; setBusy(true); const ok = await submitFormResponses(form.id, vals); setBusy(false); if (ok) onDone() }
  if (!mounted) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: 'min(500px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
        <div style={{ flexShrink: 0, padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{form.title}</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.fields.map(f => (
            <div key={f.id}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>{f.label}</label>
              {f.type === 'textarea' ? <textarea value={String(vals[f.id] ?? '')} onChange={e => set(f.id, e.target.value)} rows={3} placeholder={f.placeholder} style={{ ...inp, resize: 'vertical' }} />
                : f.type === 'number' ? <input type="number" inputMode="decimal" value={String(vals[f.id] ?? '')} onChange={e => set(f.id, e.target.value)} style={inp} />
                : f.type === 'bool' ? (
                  <div style={{ display: 'flex', gap: 8 }}>{['Oui', 'Non'].map(o => <button key={o} onClick={() => set(f.id, o)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, background: vals[f.id] === o ? 'var(--primary-dim)' : 'var(--bg-card2)', color: vals[f.id] === o ? 'var(--primary)' : 'var(--text-mid)' }}>{o}</button>)}</div>
                ) : f.type === 'scale' ? (
                  <div style={{ display: 'flex', gap: 6 }}>{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => set(f.id, n)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: vals[f.id] === n ? 'var(--primary-dim)' : 'var(--bg-card2)', color: vals[f.id] === n ? 'var(--primary)' : 'var(--text-mid)' }}>{n}</button>)}</div>
                ) : f.type === 'select' ? (
                  <select value={String(vals[f.id] ?? '')} onChange={e => set(f.id, e.target.value)} style={{ ...inp, cursor: 'pointer' }}><option value="">—</option>{(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select>
                ) : <input value={String(vals[f.id] ?? '')} onChange={e => set(f.id, e.target.value)} placeholder={f.placeholder} style={inp} />}
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w2d.close')}</button>
          <button onClick={() => void submit()} disabled={busy} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{form.status === 'filled' ? t('w2d.update') : t('w2d.send')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
