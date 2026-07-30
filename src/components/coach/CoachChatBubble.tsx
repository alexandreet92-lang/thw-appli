'use client'

// Bulle de chat flottante côté ATHLÈTE : accès rapide à la conversation avec
// son/ses coach(s), depuis n'importe quelle page. Ne s'affiche que si
// l'athlète a au moins un coach accepté ; masquée dans l'espace coach, sur la
// page Messages et les écrans plein écran.

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getAthleteThreads, getUnreadTotal, type Thread } from '@/lib/coach/messages'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { MessageThread } from './MessageThread'

export function CoachChatBubble() {
  const pathname = usePathname()
  const [threads, setThreads] = useState<Thread[]>([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hidden = !pathname || pathname.startsWith('/coach') || pathname.startsWith('/messages') || pathname.startsWith('/record') || isFullscreenRoute(pathname) || pathname.startsWith('/topup')

  const loadThreads = useCallback(async () => {
    try { const t = await getAthleteThreads(); setThreads(t); if (t.length === 1) setSelId(t[0].otherId) }
    catch { /* silencieux */ } finally { setReady(true) }
  }, [])
  useEffect(() => { if (!hidden) void loadThreads() }, [hidden, loadThreads])

  // Sondage léger du nombre de non-lus.
  useEffect(() => {
    if (hidden) return
    const tick = () => { void getUnreadTotal().then(setUnread).catch(() => {}) }
    tick()
    pollRef.current = setInterval(tick, 20000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [hidden])

  // À l'ouverture, on rafraîchit les fils et on remet le compteur à 0 (lu).
  useEffect(() => { if (open) { void loadThreads(); setUnread(0) } }, [open, loadThreads])

  if (hidden || !ready || threads.length === 0) return null
  const sel = threads.find(t => t.otherId === selId) ?? null
  const single = threads.length === 1

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Messages du coach"
          style={{ position: 'fixed', right: 16, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 1200, width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', boxShadow: '0 6px 22px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {unread > 0 && <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg)' }}>{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}

      {/* Panneau */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.25)' }} />
          <div style={{ position: 'fixed', zIndex: 1201, right: 16, bottom: 'calc(84px + env(safe-area-inset-bottom))', width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 160px))', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 18px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* En-tête */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              {sel && !single && (
                <button onClick={() => setSelId(null)} aria-label="Retour" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1, fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel ? sel.name : 'Mon coach'}</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Corps : liste (si plusieurs coachs) ou conversation */}
            {sel ? (
              <div style={{ flex: 1, minHeight: 0 }}><MessageThread coachId={sel.coachId} athleteId={sel.athleteId} compact /></div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {threads.map(t => (
                  <button key={t.otherId} onClick={() => setSelId(t.otherId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.avatar ? <img src={t.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastBody || 'Démarrer la conversation'}</span>
                    </span>
                    {t.unread > 0 && <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.unread}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
