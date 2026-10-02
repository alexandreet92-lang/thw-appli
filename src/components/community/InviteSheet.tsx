'use client'
// ══════════════════════════════════════════════════════════════════════════
// « Inviter » : invite dans l'espace des personnes que l'on suit / connaît.
// Liste les abonnements (par défaut) + recherche. Sélection multiple → envoie
// une invitation (notification + lien) via /api/community/invite.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { listFollowing, searchPeople, type Person } from '@/lib/social/follows'
import { CmSheet, CmPill, CmCard, CmAvatar, CmCheck, CmSkel, CmEmpty, FB, stagger } from './kit'

export function InviteSheet({ spaceId, spaceName, onClose }: {
  spaceId: string; spaceName?: string; onClose: () => void
}) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  // Liste par défaut = mes abonnements ; recherche = tous les profils.
  useEffect(() => {
    let alive = true
    const term = q.trim()
    const id = setTimeout(() => {
      const run = term ? searchPeople(term, 25) : listFollowing(100)
      void run.then(list => { if (alive) setPeople(list) })
    }, term ? 200 : 0)
    return () => { alive = false; clearTimeout(id) }
  }, [q])

  function toggle(id: string) {
    haptic('light')
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function invite(close: () => void) {
    if (selected.size === 0 || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/community/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, userIds: Array.from(selected) }),
      })
      const data = await res.json().catch(() => ({}))
      setDone(typeof data?.invited === 'number' ? data.invited : selected.size)
      haptic('success')
      setTimeout(close, 1100)
    } catch { setBusy(false) }
  }

  const list = useMemo(() => people ?? [], [people])

  return (
    <CmSheet full onClose={onClose} title={t('w1g.ch.inviteTitle')} sub={spaceName ?? t('w1g.ch.inviteSub')} zIndex={15500}
      footer={close => (
        <CmPill variant={done !== null ? 'dark' : 'primary'} full height={52} disabled={selected.size === 0 || busy || done !== null} onClick={() => void invite(close)} style={{ fontSize: 16 }}>
          {done !== null ? <><Check size={18} strokeWidth={2.6} />{t('w1g.ch.invited', { n: done })}</> : busy ? t('w1g.creating') : selected.size ? t('w1g.ch.inviteN', { n: selected.size }) : t('w1g.ch.invite')}
        </CmPill>
      )}>
      <div style={{ position: 'relative', margin: '2px 0 14px' }}>
        <Search size={17} strokeWidth={2.2} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('w1g.ch.inviteSearch')} className="cm-input" style={{ paddingLeft: 40 }} />
      </div>
      {people === null ? (
        <CmCard style={{ padding: '6px 16px' }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}><CmSkel h={40} w={40} r="50%" /><CmSkel h={14} w="50%" /></div>)}
        </CmCard>
      ) : list.length === 0 ? (
        <CmEmpty icon={<UserPlus size={26} strokeWidth={2} />} title={q.trim() ? t('w1g.ch.inviteNoResult') : t('w1g.ch.inviteNoFollowing')} />
      ) : (
        <CmCard style={{ overflow: 'hidden' }}>
          {list.map((p, i) => {
            const on = selected.has(p.id)
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on} className="cm-btn cm-row cm-in"
                style={{ ...stagger(i, 0, 22), display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 62, padding: '10px 16px', boxSizing: 'border-box', textAlign: 'left', borderTop: i ? '1px solid var(--border)' : 'none', fontFamily: FB }}>
                <CmAvatar name={p.name} url={p.avatar} seed={p.id} size={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {p.username && <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)' }}>@{p.username}</span>}
                </span>
                <CmCheck on={on} />
              </button>
            )
          })}
        </CmCard>
      )}
    </CmSheet>
  )
}
