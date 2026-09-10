'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sélecteur de sport (feuille bas → haut) pour l'éditeur de parcours mobile.
// Liste : Course à pied, Trail, VTT, Vélo, Randonnée, Ski. Flow record →
// couleurs directes (hors design-system enforced).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconBike, IconMountain, IconRun, IconWalk, IconTrekking, IconSkiJumping } from '@tabler/icons-react'

const ACCENT = '#06B6D4'

export interface SportOption { id: string; label: string; Icon: typeof IconBike }

// Ordre demandé : Running, Trail, VTT, Vélo, Randonnée, Ski.
export const ROUTE_SPORTS: { id: string; Icon: typeof IconBike }[] = [
  { id: 'running', Icon: IconRun },
  { id: 'trail', Icon: IconTrekking },
  { id: 'mtb', Icon: IconMountain },
  { id: 'cycling', Icon: IconBike },
  { id: 'hiking', Icon: IconWalk },
  { id: 'ski', Icon: IconSkiJumping },
]

export default function SportPickerSheet({ title, sports, current, onPick, onClose, isDark }: {
  title: string
  sports: SportOption[]
  current: string
  onPick: (id: string) => void
  onClose: () => void
  isDark: boolean
}) {
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }

  const bg = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const track = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'
  const dim = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 20010, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 560, background: bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '10px 16px calc(18px + env(safe-area-inset-bottom, 0px))', fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: track }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 21, fontWeight: 800, color: text, fontFamily: 'var(--font-display)' }}>{title}</span>
          <button onClick={requestClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sports.map(({ id, label, Icon }) => {
            const on = current === id
            return (
              <button key={id} onClick={() => { onPick(id); requestClose() }} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: on ? (isDark ? 'rgba(6,182,212,0.16)' : 'rgba(6,182,212,0.10)') : 'transparent', fontFamily: 'DM Sans, sans-serif', textAlign: 'left',
              }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? ACCENT : surface, color: on ? '#fff' : dim }}>
                  <Icon size={21} stroke={1.9} />
                </span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: on ? 700 : 600, color: on ? ACCENT : text }}>{label}</span>
                {on && <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
