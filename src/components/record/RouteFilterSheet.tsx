'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille de filtre (bas → haut) pour la bibliothèque de parcours : Distance,
// Dénivelé (double curseur) ou Sport (liste). Réinitialiser / Utiliser.
// Flow record → couleurs directes (hors design-system enforced).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ACCENT = '#06B6D4'

type Kind = 'dist' | 'elev' | 'sport'
export interface FilterState { dist: [number, number]; elev: [number, number]; sport: string }

const DIST_MAX = 160, ELEV_MAX = 3000
const SPORTS = [
  { id: 'all', label: 'Tous les sports' },
  { id: 'cycling', label: 'Vélo' },
  { id: 'mtb', label: 'VTT' },
  { id: 'trail', label: 'Trail' },
  { id: 'hiking', label: 'Randonnée' },
]

export default function RouteFilterSheet({ kind, value, onApply, onClose, isDark }: {
  kind: Kind
  value: FilterState
  onApply: (next: Partial<FilterState>) => void
  onClose: () => void
  isDark: boolean
}) {
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dist, setDist] = useState<[number, number]>(value.dist)
  const [elev, setElev] = useState<[number, number]>(value.elev)
  const [sport, setSport] = useState(value.sport)

  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }

  const bg = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280'
  const track = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'

  const title = kind === 'dist' ? 'Distance' : kind === 'elev' ? 'Dénivelé' : 'Sport'
  const reset = () => { if (kind === 'dist') setDist([0, DIST_MAX]); else if (kind === 'elev') setElev([0, ELEV_MAX]); else setSport('all') }
  const apply = () => {
    if (kind === 'dist') onApply({ dist }); else if (kind === 'elev') onApply({ elev }); else onApply({ sport })
    requestClose()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10020, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 560, background: bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '10px 20px calc(20px + env(safe-area-inset-bottom, 0px))', fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: track }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: text, fontFamily: 'var(--font-display)' }}>{title}</span>
          <button onClick={requestClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {kind === 'dist' && (
          <DualRange min={0} max={DIST_MAX} step={5} value={dist} onChange={setDist} fmt={v => v >= DIST_MAX ? `> ${DIST_MAX} km` : `${v} km`} text={text} dim={dim} track={track} />
        )}
        {kind === 'elev' && (
          <DualRange min={0} max={ELEV_MAX} step={50} value={elev} onChange={setElev} fmt={v => v >= ELEV_MAX ? `> ${ELEV_MAX} m` : `${v} m`} text={text} dim={dim} track={track} />
        )}
        {kind === 'sport' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
            {SPORTS.map(s => {
              const on = sport === s.id
              return (
                <button key={s.id} onClick={() => setSport(s.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? ACCENT : text }}>{s.label}</span>
                  {on && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 26, justifyContent: 'flex-end' }}>
          <button onClick={reset} style={{ height: 46, padding: '0 22px', borderRadius: 999, border: `1.5px solid ${ACCENT}`, background: 'transparent', color: ACCENT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Réinitialiser</button>
          <button onClick={apply} style={{ height: 46, padding: '0 30px', borderRadius: 999, border: 'none', background: ACCENT, color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Utiliser</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Double curseur (deux poignées) sur une piste — pointer events.
function DualRange({ min, max, step, value, onChange, fmt, text, dim, track }: {
  min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void
  fmt: (v: number) => string; text: string; dim: string; track: string
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<0 | 1 | null>(null)
  const [lo, hi] = value
  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const setFromClientX = (clientX: number) => {
    const el = barRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    let v = min + ratio * (max - min)
    v = Math.round(v / step) * step
    const which = dragging.current
    if (which === 0) onChange([Math.min(v, hi), hi])
    else if (which === 1) onChange([lo, Math.max(v, lo)])
  }
  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragging.current !== null) setFromClientX(e.clientX) }
    const up = () => { dragging.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  })

  const thumb = (which: 0 | 1, v: number): React.CSSProperties => ({
    position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)',
    width: 26, height: 26, borderRadius: '50%', background: '#111', border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', cursor: 'grab', touchAction: 'none',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: text }}>{fmt(lo)}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: text }}>{fmt(hi)}</span>
      </div>
      <div ref={barRef} style={{ position: 'relative', height: 26 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, borderRadius: 2, background: track, transform: 'translateY(-50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%`, height: 4, borderRadius: 2, background: ACCENT, transform: 'translateY(-50%)' }} />
        <div role="slider" aria-valuenow={lo} onPointerDown={e => { dragging.current = 0; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }} style={thumb(0, lo)} />
        <div role="slider" aria-valuenow={hi} onPointerDown={e => { dragging.current = 1; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }} style={thumb(1, hi)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: dim }}>{fmt(min)}</span>
        <span style={{ fontSize: 12, color: dim }}>{fmt(max)}</span>
      </div>
    </div>
  )
}
