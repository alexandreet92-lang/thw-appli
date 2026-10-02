'use client'
// Feuille « Trouver des athlètes » — recherche de profils à suivre (nom /
// pseudo), Suivre / Suivi. Point d'entrée du graphe social (le fil se remplit
// ensuite). Ligne → profil public (/u/[id], règle d'interconnexion).
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Check, Users } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { searchPeople, getFollowingIds, toggleFollow, type Person } from '@/lib/social/follows'
import { CmSheet, CmCard, CmAvatar, CmSkel, CmEmpty, FB, stagger } from '@/components/community/kit'

export function PeopleSearchSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { void getFollowingIds().then(setFollowing) }, [])
  useEffect(() => {
    let off = false
    const id = setTimeout(() => { void searchPeople(q).then(r => { if (!off) setPeople(r) }) }, 220)
    return () => { off = true; clearTimeout(id) }
  }, [q])

  async function toggle(id: string) {
    setBusy(id)
    const was = following.has(id)
    haptic(was ? 'light' : 'success')
    setFollowing(prev => { const n = new Set(prev); if (was) n.delete(id); else n.add(id); return n })
    try {
      const now = await toggleFollow(id, was)
      setFollowing(prev => { const n = new Set(prev); if (now) n.add(id); else n.delete(id); return n })
    } catch {
      setFollowing(prev => { const n = new Set(prev); if (was) n.add(id); else n.delete(id); return n })
    } finally { setBusy(null) }
  }
  const list = useMemo(() => people ?? [], [people])

  return (
    <CmSheet full onClose={onClose} title={t('w3f.find_athletes')} zIndex={15200}>
      <div style={{ position: 'relative', margin: '2px 0 14px' }}>
        <Search size={17} strokeWidth={2.2} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('w3f.name_or_username')} className="cm-input" style={{ paddingLeft: 40 }} />
      </div>
      {people === null ? (
        <CmCard style={{ padding: '6px 16px' }}>
          {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}><CmSkel h={42} w={42} r="50%" /><CmSkel h={14} w="50%" /></div>)}
        </CmCard>
      ) : list.length === 0 ? (
        <CmEmpty icon={<Users size={26} strokeWidth={2} />} title={t('w3f.no_athletes')} />
      ) : (
        <CmCard style={{ overflow: 'hidden' }}>
          {list.map((p, i) => {
            const isF = following.has(p.id)
            const sub = [p.username ? `@${p.username}` : null, p.sports.slice(0, 3).join(', ') || null].filter(Boolean).join(' · ')
            return (
              <div key={p.id} className="cm-in" style={{ ...stagger(i, 0, 22), display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 14px 10px 16px', borderTop: i ? '1px solid var(--border)' : 'none', fontFamily: FB }}>
                <Link href={`/u/${p.id}`} onClick={() => haptic('light')} className="cm-press" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                  <CmAvatar name={p.name} url={p.avatar} seed={p.id} size={42} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: 750, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {sub && <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
                  </span>
                </Link>
                <button type="button" onClick={() => void toggle(p.id)} disabled={busy === p.id} className="cm-btn cm-press"
                  style={{ flexShrink: 0, height: 38, padding: '0 15px', borderRadius: 'var(--r-pill)', fontFamily: FB, fontSize: 14, fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: isF ? 'var(--surface-chip)' : 'var(--primary)', color: isF ? 'var(--text-mid)' : 'var(--on-primary)' }}>
                  {isF && <Check size={14} strokeWidth={2.8} />}{isF ? t('w3f.following') : t('w3f.follow')}
                </button>
              </div>
            )
          })}
        </CmCard>
      )}
    </CmSheet>
  )
}
