'use client'
// ══════════════════════════════════════════════════════════════════════════
// Découvrir des groupes (comme Discord) : recherche + cartes. Public → entrée
// directe. Privé → demande à rejoindre (le créateur accepte).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Search, Lock, Check, Compass } from 'lucide-react'
import { discoverSpaces, requestJoin, type DiscoverSpace } from '@/lib/community/discover'
import { joinSpace } from '@/lib/community/spaces'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { SpaceBadge } from './SpaceBadge'
import { CmSheet, CmSkel, CmEmpty, CARD_BG, SOFT_SHADOW, TNUM, FB, stagger } from './kit'

export function DiscoverSheet({ onClose, onJoined }: { onClose: () => void; onJoined: (spaceId: string) => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [items, setItems] = useState<DiscoverSpace[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // Recherche (débounce léger).
  useEffect(() => {
    let alive = true
    const id = setTimeout(() => { void discoverSpaces(q).then(r => { if (alive) setItems(r) }) }, q ? 220 : 0)
    return () => { alive = false; clearTimeout(id) }
  }, [q])

  async function act(s: DiscoverSpace) {
    setBusy(s.id)
    if (s.isPublic) {
      const ok = await joinSpace(s.id)
      setBusy(null)
      if (ok) { haptic('success'); onJoined(s.id) }
    } else {
      const ok = await requestJoin(s.id)
      setBusy(null)
      if (ok) { haptic('success'); setItems(prev => prev?.map(x => x.id === s.id ? { ...x, myStatus: 'requested' } : x) ?? prev) }
    }
  }

  return (
    <CmSheet full onClose={onClose} title={t('w3e.search_group')}>
      <div style={{ position: 'relative', margin: '2px 0 14px' }}>
        <Search size={17} strokeWidth={2.2} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value.slice(0, 80))} placeholder={t('w3e.ph_group_name')} className="cm-input" style={{ paddingLeft: 40 }} />
      </div>
      {items === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3].map(i => <CmSkel key={i} h={78} r="var(--r-lg)" />)}</div>
      ) : items.length === 0 ? (
        <CmEmpty icon={<Compass size={28} strokeWidth={1.8} />} title={t('w3e.no_group_found')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((s, i) => (
            <div key={s.id} className="cm-in" style={{ ...stagger(i), display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW, fontFamily: FB }}>
              <SpaceBadge space={{ name: s.name, iconUrl: s.iconUrl, slug: s.slug }} size={52} radius="var(--r-md)" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  {!s.isPublic && <Lock size={13} strokeWidth={2.4} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
                </span>
                <span style={{ ...TNUM, display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 2 }}>
                  {s.memberCount > 1 ? t('w3e.member_count_other', { n: s.memberCount }) : t('w3e.member_count_one', { n: s.memberCount })}{s.isPublic ? ` · ${t('w3e.public')}` : ` · ${t('w3e.private')}`}
                </span>
              </span>
              {s.myStatus === 'member' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 750, color: 'var(--text-mid)', flexShrink: 0 }}><Check size={15} strokeWidth={2.8} />{t('w3e.member')}</span>
              ) : s.myStatus === 'requested' ? (
                <span className="cm-in" style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-mid)', flexShrink: 0 }}>{t('w3e.request_sent')}</span>
              ) : (
                <button type="button" onClick={() => void act(s)} disabled={busy === s.id} className="cm-btn cm-press"
                  style={{ height: 40, padding: '0 16px', borderRadius: 'var(--r-pill)', flexShrink: 0, fontSize: 14.5, fontWeight: 750,
                    background: s.isPublic ? 'var(--primary)' : 'var(--surface-chip)', color: s.isPublic ? 'var(--on-primary)' : 'var(--text)', opacity: busy === s.id ? 0.6 : 1 }}>
                  {busy === s.id ? '…' : s.isPublic ? t('w3e.join') : t('w3e.request')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </CmSheet>
  )
}
