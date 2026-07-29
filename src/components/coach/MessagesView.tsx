'use client'

// Vue Messagerie complète (liste des fils + conversation), réutilisée côté
// coach (role='coach') et côté athlète (role='athlete'). Deux volets sur
// desktop, un seul (liste → conversation) sur mobile.

import { useEffect, useState, useCallback } from 'react'
import { getCoachThreads, getAthleteThreads, type Thread } from '@/lib/coach/messages'
import { MessageThread } from './MessageThread'

const fmtWhen = (d: string) => { if (!d) return ''; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400_000); if (days <= 0) return "aujourd'hui"; if (days === 1) return 'hier'; if (days < 7) return `${days} j`; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' } }

export function MessagesView({ role, title, subtitle }: { role: 'coach' | 'athlete'; title: string; subtitle: string }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [isNarrow, setIsNarrow] = useState(false)

  const load = useCallback(async () => {
    try { setThreads(role === 'coach' ? await getCoachThreads() : await getAthleteThreads()) }
    catch { /* silencieux */ } finally { setLoading(false) }
  }, [role])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  const sel = threads.find(t => t.otherId === selId) ?? null
  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }

  const listPane = (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: 16 }}>Chargement…</p>
      ) : threads.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: 20, textAlign: 'center' }}>
          {role === 'coach' ? 'Aucun athlète. Invite-en un depuis « Athlètes ».' : 'Aucun coach. Ajoute-en un via « Espace coach → Mes coachs ».'}
        </p>
      ) : threads.map(t => (
        <button key={t.otherId} onClick={() => setSelId(t.otherId)}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', border: 'none', borderBottom: '1px solid var(--border)', background: sel?.otherId === t.otherId ? 'var(--bg-alt)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'DM Sans,sans-serif' }}>
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.avatar ? <img src={t.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.name.slice(0, 1).toUpperCase()}
            {t.unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card)' }}>{t.unread > 9 ? '9+' : t.unread}</span>}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              {t.lastAt && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtWhen(t.lastAt)}</span>}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastBody || 'Démarrer la conversation'}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const threadPane = sel && (
    <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        {isNarrow && (
          <button onClick={() => setSelId(null)} aria-label="Retour" style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {sel.avatar ? <img src={sel.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sel.name.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{sel.name}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}><MessageThread coachId={sel.coachId} athleteId={sel.athleteId} /></div>
    </div>
  )

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 30px', boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'Syne,DM Sans,sans-serif' }}>{title}</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>{subtitle}</p>
      {isNarrow ? (
        <div style={{ flex: 1, minHeight: 0 }}>{sel ? threadPane : listPane}</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{listPane}</div>
          {sel ? threadPane : <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>Choisis une conversation.</div>}
        </div>
      )}
    </div>
  )
}
