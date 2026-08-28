'use client'
// ══════════════════════════════════════════════════════════════════════════
// Recherche de groupes (comme Discord) : trouve n'importe quel groupe et
// rejoins-le. Public → entrée directe. Privé → demande à rejoindre (le créateur
// accepte). Sobre (Design System), portal sur document.body.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { discoverSpaces, requestJoin, type DiscoverSpace } from '@/lib/community/discover'
import { joinSpace } from '@/lib/community/spaces'
import { SpaceBadge } from './SpaceBadge'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function DiscoverSheet({ onClose, onJoined }: { onClose: () => void; onJoined: (spaceId: string) => void }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<DiscoverSpace[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Recherche (débounce léger).
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => { void discoverSpaces(q).then(r => { if (alive) setItems(r) }) }, q ? 220 : 0)
    return () => { alive = false; clearTimeout(t) }
  }, [q])
  if (!mounted) return null

  async function act(s: DiscoverSpace) {
    setBusy(s.id)
    if (s.isPublic) {
      const ok = await joinSpace(s.id)
      setBusy(null)
      if (ok) { onJoined(s.id); return }
      setItems(prev => prev)
    } else {
      const ok = await requestJoin(s.id)
      setBusy(null)
      if (ok) setItems(prev => prev?.map(x => x.id === s.id ? { ...x, myStatus: 'requested' } : x) ?? prev)
    }
  }

  const sheet = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 520, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', padding: 'var(--space-5) var(--space-5) var(--space-8)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-4)' }} />
        <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>{t('w3e.search_group')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input autoFocus value={q} onChange={e => setQ(e.target.value.slice(0, 80))} placeholder={t('w3e.ph_group_name')}
            style={{ flex: 1, height: 42, border: 'none', outline: 'none', background: 'transparent', fontFamily: FB, fontSize: 13.5, color: 'var(--text)' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items === null ? (
            [0, 1, 2].map(i => <span key={i} style={{ height: 60, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />)
          ) : items.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: 'var(--space-6)' }}>{t('w3e.no_group_found')}</p>
          ) : items.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)' }}>
              <SpaceBadge space={{ name: s.name, iconUrl: s.iconUrl, slug: s.slug }} size={40} radius="var(--r-md)" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  {!s.isPublic && <LockIcon />}
                </span>
                <span className="tnum" style={{ display: 'block', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{s.memberCount > 1 ? t('w3e.member_count_other', { n: s.memberCount }) : t('w3e.member_count_one', { n: s.memberCount })}{s.isPublic ? ` · ${t('w3e.public')}` : ` · ${t('w3e.private')}`}</span>
              </span>
              {s.myStatus === 'member' ? (
                <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--primary)' }}>{t('w3e.member')}</span>
              ) : s.myStatus === 'requested' ? (
                <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-mid)' }}>{t('w3e.request_sent')}</span>
              ) : (
                <button onClick={() => void act(s)} disabled={busy === s.id}
                  style={{ height: 34, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: busy === s.id ? 'default' : 'pointer', opacity: busy === s.id ? 0.6 : 1, flexShrink: 0 }}>
                  {busy === s.id ? '…' : s.isPublic ? t('w3e.join') : t('w3e.request')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
