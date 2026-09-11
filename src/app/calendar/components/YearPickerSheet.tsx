'use client'
// ════════════════════════════════════════════════════════════════════
// YearPickerSheet — sélection de l'année : sur-page coulissante (bas → haut).
// Plage = année courante ± 100 ans. Défile jusqu'à l'année sélectionnée à
// l'ouverture. Rendu via portal (au-dessus du shell — la barre de bulles ne
// transparaît pas).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const RED = '#ef4444' // design-allow-color

interface Props {
  selected: number
  onSelect: (year: number) => void
  onClose: () => void
}

export default function YearPickerSheet({ selected, onSelect, onClose }: Props) {
  const { t } = useI18n()
  const cur = new Date().getFullYear()
  const years: number[] = []
  for (let y = cur - 100; y <= cur + 100; y++) years.push(y)

  const [shown, setShown] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const selRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    // Centre l'année sélectionnée à l'ouverture.
    const s = setTimeout(() => selRef.current?.scrollIntoView({ block: 'center' }), 60)
    return () => { cancelAnimationFrame(id); clearTimeout(s) }
  }, [])

  const close = () => { setShown(false); setTimeout(onClose, 280) }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }}>
      <div
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', opacity: shown ? 1 : 0, transition: 'opacity 0.28s' }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        maxHeight: '72dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0',
        boxShadow: '0 -10px 50px rgba(0,0,0,0.28)',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '12px auto 6px', flexShrink: 0 }} />
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, textAlign: 'center', margin: '2px 0 12px', flexShrink: 0 }}>
          {t('calendar.chooseYear')}
        </p>
        <div ref={listRef} style={{ overflowY: 'auto', padding: '0 20px 8px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          {years.map(y => {
            const on = y === selected
            return (
              <button
                key={y}
                ref={on ? selRef : undefined}
                onClick={() => { onSelect(y); close() }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                  padding: '13px 0', border: 'none', cursor: 'pointer', background: 'transparent',
                  fontFamily: 'Syne, sans-serif', fontSize: on ? 24 : 19,
                  fontWeight: on ? 800 : 500,
                  color: on ? RED : 'var(--text)',
                }}
              >
                {y}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
