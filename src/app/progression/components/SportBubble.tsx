'use client'

import { useRef } from 'react'
import { useI18n } from '@/lib/i18n'

export interface SportDef {
  id: string
  label: string
  gradient: string
  comingSoon?: boolean
  pos: { left: string; top: string }
  floatDelay: string
}

export function SportBubble({ sport, onClick }: { sport: SportDef; onClick: (el: HTMLButtonElement) => void }) {
  const { t } = useI18n()
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      className="prog-bubble"
      style={{ background: sport.gradient, left: sport.pos.left, top: sport.pos.top, animationDelay: sport.floatDelay }}
      onClick={() => ref.current && onClick(ref.current)}
      aria-label={t('progression.bubbleAria', { sport: sport.label })}
    >
      <span className="prog-bubble-label">{sport.label}</span>
      {sport.comingSoon && <span className="prog-bubble-soon">{t('progression.comingSoon')}</span>}
    </button>
  )
}
