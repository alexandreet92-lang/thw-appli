'use client'
// Surpage « Trouver des athlètes » — recherche de profils à suivre (nom/username),
// bouton Suivre/Suivi. Point d'entrée du graphe social (le fil se remplit ensuite).
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { Avatar } from '@/components/shared/Sidebar'
import { searchPeople, getFollowingIds, toggleFollow, type Person } from '@/lib/social/follows'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de surpage

export function PeopleSearchSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => { void getFollowingIds().then(setFollowing) }, [])
  useEffect(() => {
    let off = false
    const id = setTimeout(() => { void searchPeople(q).then(r => { if (!off) setPeople(r) }) }, 220)
    return () => { off = true; clearTimeout(id) }
  }, [q])

  const close = () => { setClosing(true); setTimeout(onClose, 220) }
  async function toggle(id: string) {
    setBusy(id)
    try {
      const now = await toggleFollow(id, following.has(id))
      setFollowing(prev => { const n = new Set(prev); now ? n.add(id) : n.delete(id); return n })
    } catch { /* ignore */ } finally { setBusy(null) }
  }
  const list = useMemo(() => people ?? [], [people])

  return createPortal(
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'}
        style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 56px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('w3f.find_athletes')}</h2>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('w3f.name_or_username')}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
          {people === null ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', padding: '0 4px' }}>{t('w3f.searching')}</p>
          ) : list.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', padding: '0 4px' }}>{t('w3f.no_athletes')}</p>
          ) : list.map(p => {
            const isF = following.has(p.id)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 12 }}>
                <Avatar url={p.avatar} name={p.name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  {(p.username || p.sports.length > 0) && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username ? `@${p.username}` : ''}{p.username && p.sports.length ? ' · ' : ''}{p.sports.slice(0, 3).join(', ')}</div>}
                </div>
                <button onClick={() => void toggle(p.id)} disabled={busy === p.id}
                  style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600,
                    border: isF ? '1px solid var(--border-mid)' : 'none', background: isF ? 'transparent' : 'var(--primary)', color: isF ? 'var(--text-mid)' : 'var(--on-primary)' }}>
                  {isF ? t('w3f.following') : t('w3f.follow')}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
