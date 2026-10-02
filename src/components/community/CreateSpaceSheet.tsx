'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille de création d'espace (nouveau style : champs doux, puces, liste
// groupée). Gating : l'UI masque/verrouille selon les entitlements, MAIS la
// vérification dure reste côté serveur (POST /api/community/spaces).
// Free → écran d'upsell.
// ══════════════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Globe, Lock, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { uploadCommunityMedia } from '@/lib/community/messages'
import { SpaceBadge } from './SpaceBadge'
import { CmSheet, CmPill, CmChip, CmField, CmCheck, CmCard, FB } from './kit'
import type { CommunityEntitlements } from '@/lib/subscriptions/tier-limits'
import type { CommunitySport } from '@/types/community'

const SPORTS: { value: CommunitySport | ''; key: string }[] = [
  { value: '', key: 'cm.sportNone' },
  { value: 'running', key: 'cm.sportRunning' },
  { value: 'trail', key: 'cm.sportTrail' },
  { value: 'cycling', key: 'cm.sportCycling' },
  { value: 'triathlon', key: 'cm.sportTriathlon' },
  { value: 'hyrox', key: 'cm.sportHyrox' },
  { value: 'gym', key: 'cm.sportGym' },
  { value: 'combat', key: 'cm.sportCombat' },
]

export function CreateSpaceSheet({
  ent, onClose, onCreated,
}: {
  ent: CommunityEntitlements
  onClose: () => void
  onCreated: (space: { id: string; slug: string }) => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState<CommunitySport | ''>('')
  const [isPublic, setIsPublic] = useState(true)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

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
      haptic('success')
      onCreated({ id: data.id, slug: data.slug })
    } catch {
      setError(t('w1g.networkError')); setBusy(false)
    }
  }

  if (!ent.canCreate) {
    return (
      <CmSheet onClose={onClose} hideHeader surface="card"
        footer={close => (
          <>
            <Link href="/settings/subscription" className="cm-press" style={{ minHeight: 52, borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>{t('w1g.seePlans')}</Link>
            <CmPill variant="ghost" full onClick={close}>{t('w1g.later')}</CmPill>
          </>
        )}>
        <div className="cm-in" style={{ textAlign: 'center', padding: '18px 8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={32} strokeWidth={1.8} /></span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.015em', marginTop: 6 }}>{t('w1g.upsellTitle')}</span>
          <span style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, maxWidth: 360 }}>{t('w1g.upsellBody')}</span>
        </div>
      </CmSheet>
    )
  }

  return (
    <CmSheet onClose={onClose} title={t('w1g.createSpace')}
      sub={`${t('w1g.createSpaceTagline')} ${Number.isFinite(ent.maxMembers) ? t('w1g.upToMembers', { n: ent.maxMembers }) : t('w1g.unlimitedMembers')}`}
      footer={<CmPill variant="primary" full height={52} disabled={!name.trim() || busy} onClick={() => void submit()} style={{ fontSize: 16 }}>{busy ? t('w1g.creating') : t('w1g.createSpaceBtn')}</CmPill>}>
      {/* Logo */}
      <div className="cm-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            setLogoBusy(true); setError(null)
            const att = await uploadCommunityMedia(f)
            setLogoBusy(false)
            if (att?.url) setIconUrl(att.url); else setError(t('w1g.logoUploadFailed'))
          }} />
        <button type="button" onClick={() => logoRef.current?.click()} disabled={logoBusy} aria-label={t('w1g.logoOptional')} className="cm-btn cm-press" style={{ position: 'relative', lineHeight: 0 }}>
          <span className={logoBusy ? 'cm-shimmer' : undefined} style={{ display: 'block', lineHeight: 0 }}><SpaceBadge space={{ name: name || '?', iconUrl }} size={84} radius="calc(var(--r-lg) + 4px)" /></span>
          <span style={{ position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--surface-page)' }}>
            <Camera size={15} strokeWidth={2.2} />
          </span>
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {logoBusy ? t('w1g.uploading') : iconUrl
            ? <button type="button" className="cm-btn" onClick={() => setIconUrl(null)} style={{ color: 'var(--text-mid)', fontWeight: 650, fontSize: 13, minHeight: 32 }}>{t('w1g.remove')}</button>
            : t('w1g.logoOptional')}
        </span>
      </div>

      <CmField label={t('w1g.name')}>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder={t('w1g.namePlaceholder')} className="cm-input" />
      </CmField>
      <CmField label={t('w1g.description')}>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 400))} placeholder={t('w1g.descriptionPlaceholder')} rows={3} className="cm-input" style={{ resize: 'none', minHeight: 84 }} />
      </CmField>
      <CmField label={t('w1g.sportOptional')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPORTS.map(s => <CmChip key={s.value || 'none'} active={sport === s.value} onClick={() => setSport(s.value)}>{t(s.key)}</CmChip>)}
        </div>
      </CmField>
      <CmField label={t('w1g.visibility')}>
        <CmCard style={{ overflow: 'hidden' }}>
          <VisRow first active={isPublic} onClick={() => setIsPublic(true)} icon={<Globe size={18} strokeWidth={2} />} title={t('w1g.public')} sub={t('w1g.publicSub')} />
          <VisRow active={!isPublic} disabled={!ent.canPrivate} onClick={() => { if (ent.canPrivate) setIsPublic(false) }} icon={<Lock size={18} strokeWidth={2} />}
            title={t('w1g.private')} sub={ent.canPrivate ? t('w1g.privateSub') : t('w1g.proOnly')} />
        </CmCard>
      </CmField>
      {error && <p className="cm-in" style={{ margin: '14px 4px 0', fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>}
    </CmSheet>
  )
}

function VisRow({ active, onClick, disabled, icon, title, sub, first }: { active: boolean; onClick: () => void; disabled?: boolean; icon: React.ReactNode; title: string; sub: string; first?: boolean }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} disabled={disabled} className="cm-btn cm-row"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '10px 16px', boxSizing: 'border-box', textAlign: 'left', borderTop: first ? 'none' : '1px solid var(--border)', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 1 }}>{sub}</span>
      </span>
      <CmCheck on={active} />
    </button>
  )
}
