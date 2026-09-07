'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détecteur d'appel entrant GLOBAL (bureau + mobile). Sonde les appels en cours
// dans tous les espaces de l'utilisateur ; quand un NOUVEL appel apparaît (auquel
// il ne participe pas), fait SONNER l'appareil et affiche une modale
// Répondre / Refuser (comme Discord / WhatsApp).
//   • Répondre → rejoint l'appel du canal + ouvre la communauté.
//   • Refuser  → ignore cet appel (ne resonne plus pour lui).
// La sonnerie s'arrête : à la réponse, au refus, si quelqu'un d'autre rejoint,
// si l'appel se termine, ou après 30 s. Monté dans CallProvider (utilise useCall).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useCall } from './CallProvider'
import { useI18n } from '@/lib/i18n'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { playRingtone, type Ring } from '@/lib/community/ringtone'

interface IncomingCall {
  channelId: string; channelName: string; spaceId: string; spaceName: string; participants: number; names: string[]
}

const POLL_MS = 7000
const NOTIF_KEY = 'thw_notif_banners' // même interrupteur que les bandeaux desktop

export function IncomingCallWatcher() {
  const { t } = useI18n()
  const router = useRouter()
  const call = useCall()
  const [mounted, setMounted] = useState(false)
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)

  const seenBaseline = useRef<Set<string> | null>(null)   // appels déjà en cours au démarrage → pas de sonnerie
  const dismissed = useRef<Set<string>>(new Set())        // refusés / traités
  const ringRef = useRef<Ring | null>(null)
  const ringPartRef = useRef<number>(0)                   // participants au moment où ça a sonné
  const uidRef = useRef<string | null>(null)
  // Miroir du canal courant pour le poller sans le remettre en dépendance d'effet.
  const currentChannel = useRef<string | null>(null)
  currentChannel.current = call.channelId

  useEffect(() => { setMounted(true) }, [])

  const stopRing = () => { ringRef.current?.stop(); ringRef.current = null }

  useEffect(() => {
    let stop = false

    const enabled = () => { try { return localStorage.getItem(NOTIF_KEY) !== '0' } catch { return true } }

    const poll = async () => {
      if (stop || !uidRef.current) return
      let calls: IncomingCall[] = []
      try {
        const res = await fetch('/api/community/incoming-calls', { method: 'POST' })
        if (!res.ok) return
        calls = ((await res.json()) as { calls?: IncomingCall[] }).calls ?? []
      } catch { return }
      if (stop) return

      // Baseline au premier passage : on ne sonne pas pour les appels déjà en cours.
      if (seenBaseline.current === null) {
        seenBaseline.current = new Set(calls.map(c => c.channelId))
        return
      }

      // La modale affichée est-elle toujours valable ?
      if (incoming) {
        const still = calls.find(c => c.channelId === incoming.channelId)
        if (!still) { stopRing(); setIncoming(null) }                       // appel terminé
        else if (still.participants > ringPartRef.current) { stopRing(); setIncoming(null) } // quelqu'un a rejoint
        return
      }

      if (!enabled()) return

      // Candidat : appel non refusé, auquel je ne participe pas, apparu APRÈS le démarrage.
      const cand = calls.find(c =>
        c.channelId !== currentChannel.current &&
        !dismissed.current.has(c.channelId) &&
        !seenBaseline.current!.has(c.channelId))
      if (cand) {
        ringPartRef.current = cand.participants
        setIncoming(cand)
        ringRef.current = playRingtone(30_000)
      }
      // Réintègre les appels terminés dans la baseline (pour resonner s'ils reprennent).
      const live = new Set(calls.map(c => c.channelId))
      for (const id of Array.from(seenBaseline.current)) if (!live.has(id)) seenBaseline.current.delete(id)
      for (const id of Array.from(dismissed.current)) if (!live.has(id)) dismissed.current.delete(id)
      for (const c of calls) if (!seenBaseline.current.has(c.channelId) && !dismissed.current.has(c.channelId) && c.channelId !== cand?.channelId) seenBaseline.current.add(c.channelId)
    }

    void (async () => {
      const u = await getCurrentUser()
      if (stop) return
      uidRef.current = u?.id ?? null
      if (uidRef.current) void poll()
    })()
    const iv = setInterval(() => { void poll() }, POLL_MS)
    return () => { stop = true; clearInterval(iv); stopRing() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  const answer = () => {
    if (!incoming) return
    stopRing()
    const target = incoming
    dismissed.current.add(target.channelId) // évite la resonnerie le temps de la jonction
    setIncoming(null)
    call.start({ channelId: target.channelId }, `#${target.channelName}`)
    router.push('/community')
  }
  const decline = () => {
    if (incoming) dismissed.current.add(incoming.channelId)
    stopRing()
    setIncoming(null)
  }

  if (!mounted || !incoming) return null

  const caller = incoming.names[0]
  const who = caller ? t('w2g.callingYou', { name: caller }) : t('w2g.incomingCallGeneric')

  const node = (
    <div role="dialog" aria-modal="true" aria-label={t('w2g.incomingCall')}
      style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 5000, width: 'min(360px, calc(100vw - 24px))', pointerEvents: 'auto' }}>
      <style>{`
        @keyframes icSlide { from { opacity:0; transform: translate(-50%, -18px); } to { opacity:1; transform: translate(-50%, 0); } }
        @keyframes icPulse { 0%,100% { box-shadow: 0 0 0 0 var(--primary-dim, rgba(6,182,212,0.35)); } 50% { box-shadow: 0 0 0 10px transparent; } }
        @media (prefers-reduced-motion: reduce) { .ic-card, .ic-avatar { animation: none !important; } }
      `}</style>
      <div className="ic-card" style={{
        animation: 'icSlide .3s cubic-bezier(0.22,0.61,0.36,1) both',
        background: 'var(--bg-elev, var(--bg-card))', border: '1px solid var(--border)', borderRadius: 18,
        boxShadow: 'var(--shadow-card, 0 12px 40px rgba(0,0,0,0.28))', padding: '16px 16px 14px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ic-avatar" aria-hidden style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, animation: 'icPulse 1.6s ease-out infinite' }}>
            {(caller || incoming.channelName).slice(0, 1).toUpperCase()}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--primary)' }}>{t('w2g.incomingCall')}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('w2g.inChannel', { channel: incoming.channelName })}{incoming.spaceName ? ` · ${incoming.spaceName}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={decline} style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-pill, 999px)', cursor: 'pointer', background: 'var(--danger-soft)', color: 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700 }}>
            {t('w2g.decline')}
          </button>
          <button onClick={answer} style={{ flex: 1.4, height: 44, border: 'none', borderRadius: 'var(--r-pill, 999px)', cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700 }}>
            {t('w2g.answer')}
          </button>
        </div>
      </div>
    </div>
  )
  return createPortal(node, document.body)
}
