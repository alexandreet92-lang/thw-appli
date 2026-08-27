'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille coulissante de création d'espace (createPortal sur document.body).
// Gating : l'UI masque/verrouille selon les entitlements, MAIS la vérification
// dure reste côté serveur (POST /api/community/spaces). Free → écran d'upsell.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { uploadCommunityMedia } from '@/lib/community/messages'
import { SpaceBadge } from './SpaceBadge'
import type { CommunityEntitlements } from '@/lib/subscriptions/tier-limits'
import type { CommunitySport } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SPORTS: { value: CommunitySport | ''; label: string }[] = [
  { value: '', label: 'Aucun' },
  { value: 'running', label: 'Running' },
  { value: 'trail', label: 'Trail' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'hyrox', label: 'Hyrox' },
  { value: 'gym', label: 'Gym' },
  { value: 'combat', label: 'Sport de combat' },
]

export function CreateSpaceSheet({
  ent, onClose, onCreated,
}: {
  ent: CommunityEntitlements
  onClose: () => void
  onCreated: (space: { id: string; slug: string }) => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState<CommunitySport | ''>('')
  const [isPublic, setIsPublic] = useState(true)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/community/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          sport: sport || null,
          isPublic,
          iconUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.error ?? t('w1g.createFailed')); setBusy(false); return }
      onCreated({ id: data.id, slug: data.slug })
    } catch {
      setError(t('w1g.networkError')); setBusy(false)
    }
  }

  const scrim = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', padding: 'var(--space-6) var(--space-6) var(--space-8)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-5)' }} />

        {!ent.canCreate ? (
          <Upsell onClose={onClose} />
        ) : (
          <>
            <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-1)' }}>{t('w1g.createSpace')}</h2>
            <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 var(--space-5)' }}>
              {t('w1g.createSpaceTagline')} {Number.isFinite(ent.maxMembers) ? t('w1g.upToMembers', { n: ent.maxMembers }) : t('w1g.unlimitedMembers')}
            </p>

            <Field label={t('w1g.logoOptional')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <SpaceBadge space={{ name: name || '?', iconUrl }} size={56} radius="var(--r-md)" />
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const f = e.target.files?.[0]; e.target.value = ''
                    if (!f) return
                    setLogoBusy(true); setError(null)
                    const att = await uploadCommunityMedia(f)
                    setLogoBusy(false)
                    if (att?.url) setIconUrl(att.url); else setError(t('w1g.logoUploadFailed'))
                  }} />
                <button type="button" onClick={() => logoRef.current?.click()} disabled={logoBusy}
                  style={{ height: 36, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: logoBusy ? 'default' : 'pointer' }}>
                  {logoBusy ? t('w1g.uploading') : iconUrl ? t('w1g.change') : t('w1g.chooseImage')}
                </button>
                {iconUrl && !logoBusy && (
                  <button type="button" onClick={() => setIconUrl(null)}
                    style={{ height: 36, padding: '0 var(--space-3)', border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12.5, cursor: 'pointer' }}>{t('w1g.remove')}</button>
                )}
              </div>
            </Field>

            <Field label={t('w1g.name')}>
              <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder={t('w1g.namePlaceholder')} style={inputStyle} />
            </Field>

            <Field label={t('w1g.description')}>
              <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 400))} placeholder={t('w1g.descriptionPlaceholder')} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} />
            </Field>

            <Field label={t('w1g.sportOptional')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {SPORTS.map(s => (
                  <button key={s.value || 'none'} type="button" onClick={() => setSport(s.value)}
                    style={{ height: 36, padding: '0 var(--space-4)', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 500, background: sport === s.value ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: sport === s.value ? 'var(--primary)' : 'var(--text-mid)' }}>{s.label}</button>
                ))}
              </div>
            </Field>

            <Field label={t('w1g.visibility')}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <VisBtn active={isPublic} onClick={() => setIsPublic(true)} title={t('w1g.public')} sub={t('w1g.publicSub')} />
                <VisBtn active={!isPublic} onClick={() => { if (ent.canPrivate) setIsPublic(false) }} disabled={!ent.canPrivate} title={t('w1g.private')} sub={ent.canPrivate ? t('w1g.privateSub') : t('w1g.proOnly')} />
              </div>
            </Field>

            {error && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--charge-hard)', margin: 'var(--space-2) 0 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.cancel')}</button>
              <button onClick={() => void submit()} disabled={!name.trim() || busy}
                style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: name.trim() && !busy ? 'pointer' : 'default', opacity: name.trim() && !busy ? 1 : 0.6 }}>
                {busy ? t('w1g.creating') : t('w1g.createSpaceBtn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(scrim, document.body)
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB, fontSize: 13.5,
  color: 'var(--text)', outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{ display: 'block', fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>{label}</label>
      {children}
    </div>
  )
}

function VisBtn({ active, onClick, disabled, title, sub }: { active: boolean; onClick: () => void; disabled?: boolean; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ flex: 1, textAlign: 'left', padding: 'var(--space-3) var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', cursor: disabled ? 'default' : 'pointer', background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ display: 'block', fontFamily: FB, fontSize: 13, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text)' }}>{title}</span>
      <span style={{ display: 'block', fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</span>
    </button>
  )
}

function Upsell({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-4) var(--space-2) var(--space-2)' }}>
      <div style={{ fontSize: 34, marginBottom: 'var(--space-3)' }}>✨</div>
      <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>{t('w1g.upsellTitle')}</h2>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 auto var(--space-5)', maxWidth: 360, lineHeight: 1.5 }}>
        {t('w1g.upsellBody')}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
        <button onClick={onClose} style={{ height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.later')}</button>
        <a href="/settings/subscription" style={{ height: 44, display: 'inline-flex', alignItems: 'center', padding: '0 var(--space-5)', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>{t('w1g.seePlans')}</a>
      </div>
    </div>
  )
}
