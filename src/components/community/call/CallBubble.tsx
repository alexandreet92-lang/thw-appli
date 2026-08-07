'use client'
// ══════════════════════════════════════════════════════════════════════════
// Bulle d'appel flottante (globale) : visible quand un appel est actif ET réduit.
// Déplaçable, montre les visages/participants en petit + micro / agrandir /
// raccrocher. « Agrandir » ramène sur la page communauté en plein écran.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCall } from './CallProvider'
import { PersonTile, RoundBtn, MicIcon, MicOffIcon, PhoneDownIcon, ExpandIcon } from './callUi'

const FB = 'var(--font-body)'
const W = 220

export function CallBubble() {
  const call = useCall()
  const router = useRouter()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  // Position initiale : haut-droite, sous les boutons flottants du shell.
  useEffect(() => {
    if (pos || typeof window === 'undefined') return
    setPos({ x: window.innerWidth - W - 16, y: 70 })
  }, [pos])

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!drag.current) return
      const x = Math.max(8, Math.min(window.innerWidth - W - 8, e.clientX - drag.current.dx))
      const y = Math.max(8, Math.min(window.innerHeight - 80, e.clientY - drag.current.dy))
      setPos({ x, y })
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  if (!call.active || call.showingFull || !pos) return null

  const tiles = call.people.slice(0, 4)
  const connecting = call.status === 'connecting'

  function expand() { router.push('/community'); call.expand() }

  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, width: W, zIndex: 2000, borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)', boxShadow: 'var(--shadow-card)' }}>
      {/* Poignée de déplacement */}
      <div onPointerDown={e => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px var(--space-3)', cursor: 'grab', touchAction: 'none' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: connecting ? 'var(--text-dim)' : 'var(--sport-run)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{call.title}</span>
        <button onClick={expand} aria-label="Agrandir" title="Agrandir" style={{ width: 24, height: 24, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExpandIcon /></button>
      </div>

      {/* Vignettes participants */}
      <div style={{ padding: '0 var(--space-2)', display: 'grid', gridTemplateColumns: tiles.length > 1 ? '1fr 1fr' : '1fr', gap: 4 }}>
        {connecting
          ? <div style={{ height: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)' }} />
          : tiles.map(t => <PersonTile key={t.key} tile={t} compact />)}
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
        <RoundBtn size={36} on={call.micOn} label={call.micOn ? 'Couper le micro' : 'Activer le micro'} onClick={call.toggleMic}>
          {call.micOn ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
        </RoundBtn>
        <button onClick={call.leave} aria-label="Quitter" title="Quitter"
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PhoneDownIcon size={15} />
        </button>
      </div>
    </div>
  )
}
