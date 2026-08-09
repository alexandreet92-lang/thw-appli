'use client'
// ══════════════════════════════════════════════════════════════
// Dashboard — aperçu des messages NON LUS (coach ou autre utilisateur).
// Rien à afficher → le composant ne rend rien (pas de bloc vide).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/shared/Sidebar'
import { getUnreadThreads, type Thread } from '@/lib/coach/messages'

function relTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function UnreadMessagesCard() {
  const [threads, setThreads] = useState<Thread[] | null>(null)
  useEffect(() => { let off = false; void getUnreadThreads().then(t => { if (!off) setThreads(t) }).catch(() => { if (!off) setThreads([]) }); return () => { off = true } }, [])

  if (!threads || threads.length === 0) return null
  const total = threads.reduce((n, t) => n + t.unread, 0)

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 20, padding: 'clamp(16px, 3vw, 22px)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ position: 'relative', color: 'var(--primary)', display: 'flex' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Messages non lus</span>
          <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{total}</span>
        </div>
        <Link href="/messages" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Tout voir →</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {threads.slice(0, 4).map(t => (
          <Link key={t.otherId} href="/messages"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 12, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar url={t.avatar} name={t.name} size={42} />
              <span style={{ position: 'absolute', right: -2, top: -2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>{t.unread}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <span className="tnum" style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{relTime(t.lastAt)}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastBody || 'Nouveau message'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
