'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille MEMBRES d'un salon : recherche, membres EN LIGNE puis HORS LIGNE en
// listes groupées (point de présence), badge de rôle. Un tap ouvre la feuille
// profil (MemberProfileSheet) par-dessus.
// ══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { MemberProfileSheet } from './MemberProfileSheet'
import { CmSheet, CmCard, CmLabel, CmAvatar, CmEmpty, RolePill, stagger } from './kit'
import type { CommunityMemberInfo } from '@/types/community'

export function MembersSheet({ title, members, onlineIds, onClose }: {
  title: string
  members: CommunityMemberInfo[]
  onlineIds: Set<string>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<CommunityMemberInfo | null>(null)
  const [q, setQ] = useState('')

  const { online, offline } = useMemo(() => {
    const term = q.trim().toLowerCase()
    const on: CommunityMemberInfo[] = [], off: CommunityMemberInfo[] = []
    for (const m of members) {
      if (term && !m.name.toLowerCase().includes(term)) continue
      ;(onlineIds.has(m.userId) ? on : off).push(m)
    }
    return { online: on, offline: off }
  }, [members, onlineIds, q])

  return (
    <>
      <CmSheet full onClose={onClose} title={t('w1g.mem.members')} sub={title} zIndex={15100}>
        <div style={{ position: 'relative', margin: '2px 0 4px' }}>
          <Search size={17} strokeWidth={2.2} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('cm.searchMember')} className="cm-input" style={{ paddingLeft: 40 }} />
        </div>
        {online.length > 0 && (
          <Section label={`${t('w1g.mem.online')} — ${online.length}`} list={online} online onPick={m => { haptic('light'); setSelected(m) }} />
        )}
        {offline.length > 0 && (
          <Section label={`${t('w1g.mem.offline')} — ${offline.length}`} list={offline} online={false} offset={online.length} onPick={m => { haptic('light'); setSelected(m) }} />
        )}
        {online.length + offline.length === 0 && <CmEmpty icon={<Users size={26} strokeWidth={2} />} title={t('w1g.mem.none')} />}
      </CmSheet>
      {selected && <MemberProfileSheet member={selected} online={onlineIds.has(selected.userId)} onClose={() => setSelected(null)} />}
    </>
  )
}

function Section({ label, list, online, offset = 0, onPick }: { label: string; list: CommunityMemberInfo[]; online: boolean; offset?: number; onPick: (m: CommunityMemberInfo) => void }) {
  return (
    <>
      <CmLabel>{label}</CmLabel>
      <CmCard style={{ overflow: 'hidden' }}>
        {list.map((m, i) => <MemberRow key={m.userId} m={m} online={online} first={i === 0} index={offset + i} onClick={() => onPick(m)} />)}
      </CmCard>
    </>
  )
}

function MemberRow({ m, online, first, index, onClick }: { m: CommunityMemberInfo; online: boolean; first: boolean; index: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="cm-btn cm-row cm-in"
      style={{ ...stagger(index, 60, 22), display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '9px 16px', boxSizing: 'border-box', textAlign: 'left', borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <span style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
        <CmAvatar name={m.name} url={m.avatar} seed={m.userId} size={40} dim={!online} />
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: online ? 'var(--success)' : 'var(--surface-bar)', boxShadow: '0 0 0 2.5px var(--surface-card)' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: online ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
      <RolePill role={m.role} />
    </button>
  )
}
