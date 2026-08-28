'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille de création d'un événement (createPortal). Titre, type, date/heure,
// lieu, description. Sobre, tokens uniquement ; bordure seulement sur les inputs.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createEvent } from '@/lib/community/events'
import type { EventKind } from '@/types/community'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const KINDS: EventKind[] = ['sortie', 'wod', 'defi', 'course', 'autre']

export function CreateEventSheet({ spaceId, onClose, onCreated }: {
  spaceId: string; onClose: () => void; onCreated: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<EventKind>('sortie')
  const [when, setWhen] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  async function submit() {
    if (!title.trim() || !when || busy) return
    setBusy(true); setError(null)
    const startsAt = new Date(when)
    if (isNaN(startsAt.getTime())) { setError(t('w3e.invalid_date')); setBusy(false); return }
    const ok = await createEvent({
      spaceId, title: title.trim(), kind, startsAt: startsAt.toISOString(),
      location: location.trim() || null, description: description.trim() || null,
    })
    if (ok) onCreated()
    else { setError(t('w3e.create_failed')); setBusy(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none',
  }

  const sheet = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', padding: 'var(--space-6) var(--space-6) var(--space-8)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-5)' }} />
        <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-5)' }}>{t('w3e.create_event')}</h2>

        <Field label={t('w3e.field_type')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {KINDS.map(k => (
              <button key={k} type="button" onClick={() => setKind(k)}
                style={{ height: 34, padding: '0 var(--space-4)', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 500, background: kind === k ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: kind === k ? 'var(--primary)' : 'var(--text-mid)' }}>{t(`w3e.eventkind_${k}`)}</button>
            ))}
          </div>
        </Field>
        <Field label={t('w3e.field_title')}><input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder={t('w3e.ph_event_title')} style={inputStyle} /></Field>
        <Field label={t('w3e.field_datetime')}><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={inputStyle} /></Field>
        <Field label={t('w3e.field_location')}><input value={location} onChange={e => setLocation(e.target.value.slice(0, 200))} placeholder={t('w3e.ph_event_location')} style={inputStyle} /></Field>
        <Field label={t('w3e.field_details')}><textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={3} placeholder={t('w3e.ph_event_details')} style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} /></Field>

        {error && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--charge-hard)', margin: 'var(--space-2) 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
          <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w3e.cancel')}</button>
          <button onClick={() => void submit()} disabled={!title.trim() || !when || busy}
            style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: title.trim() && when && !busy ? 'pointer' : 'default', opacity: title.trim() && when && !busy ? 1 : 0.6 }}>
            {busy ? t('w3e.creating') : t('w3e.create_event_btn')}
          </button>
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{ display: 'block', fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>{label}</label>
      {children}
    </div>
  )
}
