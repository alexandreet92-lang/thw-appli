'use client'

// Vue Messagerie complète (liste des fils + conversation), réutilisée côté
// coach (role='coach') et côté athlète (role='athlete'). Deux volets sur
// desktop, un seul (liste → conversation) sur mobile.

import { useEffect, useState, useCallback } from 'react'
import { getCoachThreads, getAthleteThreads, type Thread } from '@/lib/coach/messages'
import { MessageThread } from './MessageThread'
import { GroupChat, NewGroupModal } from './GroupChat'
import { listMyGroups, type GroupSummary } from '@/lib/messages/groups'
import { useI18n, currentLocale } from '@/lib/i18n'

type Translate = (key: string, vars?: Record<string, string | number>) => string
const fmtWhen = (d: string, t: Translate) => { if (!d) return ''; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400_000); if (days <= 0) return t('w3d.today'); if (days === 1) return t('w3d.yesterday'); if (days < 7) return t('w3d.days_short', { n: days }); try { return new Date(d).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }) } catch { return '' } }

export function MessagesView({ role, title, subtitle }: { role: 'coach' | 'athlete'; title: string; subtitle: string }) {
  const { t } = useI18n()
  const [threads, setThreads] = useState<Thread[]>([])
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [selGroup, setSelGroup] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  const load = useCallback(async () => {
    try {
      const [th, gr] = await Promise.all([
        role === 'coach' ? getCoachThreads() : getAthleteThreads(),
        listMyGroups(),
      ])
      setThreads(th); setGroups(gr)
    }
    catch { /* silencieux */ } finally { setLoading(false) }
  }, [role])
  useEffect(() => { void load() }, [load])
  // Deep-link depuis une notification : /coach/messages?thread=<otherId> (ou
  // /messages?thread=…) ouvre directement la conversation avec cette personne.
  useEffect(() => {
    if (loading) return
    try {
      const wanted = new URLSearchParams(window.location.search).get('thread')
      if (wanted && threads.some(t => t.otherId === wanted)) { setSelId(wanted); setSelGroup(null) }
    } catch { /* pas de deep-link */ }
  }, [loading, threads])
  const loadGroups = useCallback(async () => { try { setGroups(await listMyGroups()) } catch { /* */ } }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  const sel = threads.find(t => t.otherId === selId) ?? null
  const selectedGroup = groups.find(g => g.id === selGroup) ?? null
  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }
  const secLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }
  const fmtGroupWhen = (d: string | null) => d ? fmtWhen(d, t) : ''

  const groupsSection = (
    <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
      <div style={secLabel}>
        <span>{t('w3d.groups')}</span>
        <button onClick={() => setShowNew(true)} aria-label={t('w3d.new_group')} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      {groups.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '2px 13px 12px' }}>{t('w3d.create_group_hint')}</div>
      ) : groups.map(g => (
        <button key={g.id} onClick={() => { setSelGroup(g.id); setSelId(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', border: 'none', background: selGroup === g.id ? 'var(--bg-card2)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: 'color-mix(in srgb, var(--primary) 13%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              {g.lastAt && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtGroupWhen(g.lastAt)}</span>}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.lastBody || (g.memberCount > 1 ? t('w3d.members_count', { n: g.memberCount }) : t('w3d.member_count', { n: g.memberCount }))}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const listPane = (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {groupsSection}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: 16 }}>{t('w3d.loading')}</p>
      ) : threads.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: 20, textAlign: 'center' }}>
          {role === 'coach' ? t('w3d.no_athlete_invite') : t('w3d.no_coach_add')}
        </p>
      ) : threads.map(th => (
        <button key={th.otherId} data-guide="coach-thread" onClick={() => { setSelId(th.otherId); setSelGroup(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', border: 'none', borderBottom: '1px solid var(--border)', background: sel?.otherId === th.otherId ? 'var(--bg-alt)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}>
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {th.avatar ? <img src={th.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : th.name.slice(0, 1).toUpperCase()}
            {th.unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card)' }}>{th.unread > 9 ? '9+' : th.unread}</span>}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.name}</span>
              {th.lastAt && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtWhen(th.lastAt, t)}</span>}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.lastBody || t('w3d.start_conversation')}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const threadPane = sel && (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        {isNarrow && (
          <button onClick={() => setSelId(null)} aria-label={t('w3d.back')} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {sel.avatar ? <img src={sel.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sel.name.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{sel.name}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}><MessageThread coachId={sel.coachId} athleteId={sel.athleteId} /></div>
    </div>
  )

  const groupPane = selectedGroup && (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <GroupChat group={selectedGroup} onChanged={loadGroups} onClosed={() => setSelGroup(null)} />
    </div>
  )

  const rightPane = selectedGroup ? groupPane : sel ? threadPane : null

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 30px', boxSizing: 'border-box', fontFamily: 'var(--font-body)', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{title}</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>{subtitle}</p>
      {isNarrow ? (
        <div style={{ flex: 1, minHeight: 0 }}>{rightPane ?? listPane}</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{listPane}</div>
          {rightPane ?? <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>{t('w3d.choose_conversation')}</div>}
        </div>
      )}
      {showNew && <NewGroupModal asAdmin={role === 'coach'} onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setSelGroup(id); setSelId(null); void loadGroups() }} />}
    </div>
  )
}
