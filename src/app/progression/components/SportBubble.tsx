'use client'

import { useRef } from 'react'

export interface SportDef {
  id: string
  label: string
  gradient: string
  comingSoon?: boolean
  pos: { left: string; top: string }
  floatDelay: string
}

export function SportBubble({ sport, onClick }: { sport: SportDef; onClick: (el: HTMLButtonElement) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      className="prog-bubble"
      style={{ background: sport.gradient, left: sport.pos.left, top: sport.pos.top, animationDelay: sport.floatDelay }}
      onClick={() => ref.current && onClick(ref.current)}
      aria-label={`Voir ta progression en ${sport.label}`}
    >
      <span className="prog-bubble-label">{sport.label}</span>
      {sport.comingSoon && <span className="prog-bubble-soon">À venir</span>}
    </button>
  )
}
