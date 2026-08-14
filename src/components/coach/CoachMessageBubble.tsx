'use client'
// ══════════════════════════════════════════════════════════════
// CoachMessageBubble — panneau de messagerie flottant CÔTÉ COACH, ouvert pour
// UN athlète précis via l'event `thw:coach-msg` { athleteId, name, avatar }.
// Réutilise MessageThread (coachId = utilisateur courant). Monté sur les pages
// coach (roster, fiche planning) : le coach discute sans quitter la page.
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { MessageThread } from './MessageThread'
import { Avatar } from '@/components/shared/Sidebar'

interface Target { athleteId: string; name: string; avatar: string | null }

export function CoachMessageBubble() {
  const [coachId, setCoachId] = useState<string | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => { void getCurrentUser().then(u => setCoachId(u?.id ?? null)) }, [])
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail as Target | undefined; if (d?.athleteId) { setClosing(false); setTarget(d) } }
    window.addEventListener('thw:coach-msg', h)
    return () => window.removeEventListener('thw:coach-msg', h)
  }, [])

  function close() { setClosing(true); setTimeout(() => setTarget(null), 200) }

  if (!target || !coachId) return null

  return (
    <>
      <style>{`@keyframes cmbIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 12500, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)', opacity: closing ? 0 : 1, transition: 'opacity .2s' }} />
      <div style={{ position: 'fixed', zIndex: 12501, right: 'clamp(12px, 3vw, 28px)', bottom: 'calc(20px + env(safe-area-inset-bottom))', width: 'min(400px, calc(100vw - 24px))', height: 'min(600px, calc(100vh - 120px))', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.34)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: closing ? 'none' : 'cmbIn .22s cubic-bezier(.32,.72,0,1)', opacity: closing ? 0 : 1, transition: 'opacity .2s' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <Avatar url={target.avatar} name={target.name} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name}</div>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>Conversation</div>
          </div>
          <button onClick={close} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MessageThread coachId={coachId} athleteId={target.athleteId} compact />
        </div>
      </div>
    </>
  )
}

// Ouvre la bulle de messagerie coach pour un athlète.
export function openCoachMessage(t: Target) {
  window.dispatchEvent(new CustomEvent('thw:coach-msg', { detail: t }))
}
