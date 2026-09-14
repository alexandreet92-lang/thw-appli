'use client'

// Vue Messagerie complète (liste des fils + conversation), réutilisée côté
// coach (role='coach') et côté athlète (role='athlete'). Deux volets sur
// desktop, un seul (liste → conversation) sur mobile.

import { useEffect, useState, useCallback } from 'react'
import { getCoachThreads, getAthleteThreads, type Thread } from '@/lib/coach/messages'
import { MessageThread } from './MessageThread'
import { GroupChat } from './GroupChat'
import { listMyGroups, type GroupSummary } from '@/lib/messages/groups'
import { useI18n, currentLocale } from '@/lib/i18n'

type Translate = (key: string, vars?: Record<string, string | number>) => string
const fmtWhen = (d: string, t: Translate) => { if (!d) return ''; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400_000); if (days <= 0) return t('w3d.today'); if (days === 1) return t('w3d.yesterday'); if (days < 7) return t('w3d.days_short', { n: days }); try { return new Date(d).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }) } catch { return '' } }

// Dégradé d'avatar déterministe (initiales) — même personne = même couleur. design-allow-color
const AV_GRADS = [
  'linear-gradient(135deg,#06B6D4,#5b6fff)', 'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#06B6D4)', 'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#f97316,#f43f5e)', 'linear-gradient(135deg,#3b82f6,#06b6d4)',
] // design-allow-color
const gradFor = (s: string) => AV_GRADS[Math.abs([...(s || '?')].reduce((a, c) => a + c.charCodeAt(0), 0)) % AV_GRADS.length]

// Ligne de conversation (personne) : avatar dégradé, nom, aperçu, heure, non-lus.
function PersonRow({ name, avatar, preview, when, unread, active, onClick }: {
  name: string; avatar?: string | null; preview: string; when?: string; unread?: number; active: boolean; onClick: () => void
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase()
  return (
    <button onClick={onClick} className="thw-press msg-row"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: 'none', background: active ? 'var(--bg-alt)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)', borderRadius: 14, transition: 'background .15s' }}>
      <span style={{ position: 'relative', flexShrink: 0 }}>
        <span style={{ width: 46, height: 46, borderRadius: '50%', background: avatar ? 'var(--bg-alt)' : gradFor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#fff', fontWeight: 800, fontSize: 17 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
        </span>
        {!!unread && unread > 0 && <span style={{ position: 'absolute', top: -1, right: -1, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card)' }}>{unread > 9 ? '9+' : unread}</span>}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: unread ? 800 : 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>{name}</span>
          {when && <span style={{ fontSize: 11, fontWeight: unread ? 700 : 500, color: unread ? 'var(--primary)' : 'var(--text-dim)', flexShrink: 0 }}>{when}</span>}
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: unread ? 'var(--text-mid)' : 'var(--text-dim)', fontWeight: unread ? 600 : 400, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
      </span>
    </button>
  )
}

export function MessagesView({ role, title, subtitle, initialThread, initialGroup, onBack }: { role: 'coach' | 'athlete'; title: string; subtitle: string; initialThread?: string | null; initialGroup?: string | null; onBack?: () => void }) {
  const { t } = useI18n()
  const [threads, setThreads] = useState<Thread[]>([])
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [selGroup, setSelGroup] = useState<string | null>(null)
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
  // Ouverture directe d'une conversation (ex. bouton « Message » d'un membre).
  useEffect(() => {
    if (loading || !initialThread) return
    if (threads.some(t => t.otherId === initialThread)) { setSelId(initialThread); setSelGroup(null) }
  }, [loading, initialThread, threads])
  // Ouverture directe d'un DM (groupe à 2) — ex. bouton « Message » d'un membre.
  useEffect(() => {
    if (!initialGroup) return
    if (groups.some(g => g.id === initialGroup)) { setSelGroup(initialGroup); setSelId(null) }
    else void load()
  }, [initialGroup, groups, load])
  const loadGroups = useCallback(async () => { try { setGroups(await listMyGroups()) } catch { /* */ } }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  const sel = threads.find(t => t.otherId === selId) ?? null
  const selectedGroup = groups.find(g => g.id === selGroup) ?? null
  const dms = groups.filter(g => g.isDm)
  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }
  const fmtGroupWhen = (d: string | null) => d ? fmtWhen(d, t) : ''

  // Liste des personnes : DM 1-1 (communauté) + fils coach/athlète, sans le bloc
  // « Groupes ». On appuie sur une personne → ouvre la conversation.
  const empty = !loading && dms.length === 0 && threads.length === 0
  const rows: React.ReactNode[] = [
    ...dms.map(g => (
      <PersonRow key={`g-${g.id}`} name={g.name} avatar={g.dmAvatar} preview={g.lastBody || t('w3d.start_conversation')}
        when={fmtGroupWhen(g.lastAt)} active={selGroup === g.id} onClick={() => { setSelGroup(g.id); setSelId(null) }} />
    )),
    ...threads.map(th => (
      <PersonRow key={`t-${th.otherId}`} name={th.name} avatar={th.avatar} preview={th.lastBody || t('w3d.start_conversation')}
        when={th.lastAt ? fmtWhen(th.lastAt, t) : ''} unread={th.unread} active={sel?.otherId === th.otherId}
        onClick={() => { setSelId(th.otherId); setSelGroup(null) }} />
    )),
  ]
  const listPane = (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: empty || loading ? 0 : 6 }}>
      {loading && <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: 18 }}>{t('w3d.loading')}</p>}
      {empty && (
        <div style={{ padding: '44px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w3d.start_conversation')}</p>
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i}>
          {row}
          {i < rows.length - 1 && <div style={{ height: 1, background: 'var(--border)', margin: '0 12px 0 70px' }} />}
        </div>
      ))}
    </div>
  )

  const threadPane = sel && (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {isNarrow && (
          <button onClick={() => setSelId(null)} aria-label={t('w3d.back')} className="thw-press" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--bg-alt)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <span style={{ width: 38, height: 38, borderRadius: '50%', background: sel.avatar ? 'var(--bg-alt)' : gradFor(sel.name), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: 15 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {sel.avatar ? <img src={sel.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sel.name.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.name}</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{role === 'coach' ? t('w3d.athlete_role') : t('w3d.coach_role')}</span>
        </span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 4px' }}>
        {onBack && (
          <button onClick={onBack} aria-label={t('w3d.back')} style={{ width: 34, height: 34, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display)' }}>{title}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 16px', paddingLeft: onBack ? 44 : 0 }}>{subtitle}</p>
      {isNarrow ? (
        // Mobile : liste ⇄ conversation qui glissent horizontalement (droite→gauche
        // à l'ouverture, gauche→droite au retour).
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, minHeight: 0, overflowY: 'auto', transform: rightPane ? 'translateX(-22%)' : 'translateX(0)', opacity: rightPane ? 0 : 1, transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1), opacity 0.26s ease', pointerEvents: rightPane ? 'none' : 'auto' }}>
            {listPane}
          </div>
          <div style={{ position: 'absolute', inset: 0, minHeight: 0, display: 'flex', flexDirection: 'column', transform: rightPane ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)', pointerEvents: rightPane ? 'auto' : 'none' }}>
            {rightPane}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{listPane}</div>
          {rightPane ?? <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>{t('w3d.choose_conversation')}</div>}
        </div>
      )}
    </div>
  )
}
