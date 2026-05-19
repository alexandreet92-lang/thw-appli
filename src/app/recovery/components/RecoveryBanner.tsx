'use client'

import { useState, useEffect, type RefObject } from 'react'

const LS_KEY = 'rc_banner_dismissed'

interface Props {
  sourcesRef: RefObject<HTMLDivElement | null>
}

export default function RecoveryBanner({ sourcesRef }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) setVisible(true)
    } catch { setVisible(true) }
  }, [])

  function dismiss() {
    try { localStorage.setItem(LS_KEY, '1') } catch { /* noop */ }
    setVisible(false)
  }

  function scrollToSources() {
    sourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!visible) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 10,
      background: 'rgba(59,143,212,0.07)',
      borderLeft: '3px solid #3B8FD4',
      flexWrap: 'wrap' as const,
    }}>
      <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, flex: 1, lineHeight: 1.5 }}>
        Connecte un appareil de suivi{' '}
        <strong style={{ color: '#3B8FD4' }}>(Garmin, Whoop, Oura)</strong>{' '}
        pour débloquer HRV, sommeil détaillé et FC repos.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={scrollToSources}
          style={{
            padding: '5px 13px', borderRadius: 7,
            background: 'rgba(59,143,212,0.13)', border: '1px solid rgba(59,143,212,0.35)',
            color: '#3B8FD4', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Voir les sources
        </button>
        <button
          onClick={dismiss}
          style={{
            padding: '5px 8px', borderRadius: 7,
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
