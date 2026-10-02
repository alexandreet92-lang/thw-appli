'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille de filtre (bas → haut) pour la bibliothèque de parcours : Distance,
// Dénivelé (double curseur) ou Sport (liste groupée). Réinitialiser / Utiliser.
// Feuille du kit record (glisser pour fermer), tokens uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { RkSheet, RkGroup, RkRow, RkIco, RK_ICON, RkCta, useSheetClose } from './kit/RecordKit'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'
import { ROUTE_SPORTS } from './routeSports'

type Kind = 'dist' | 'elev' | 'sport'
export interface FilterState { dist: [number, number]; elev: [number, number]; sport: string }

const DIST_MAX = 160, ELEV_MAX = 3000

export default function RouteFilterSheet({ kind, value, onApply, onClose, isDark }: {
  kind: Kind
  value: FilterState
  onApply: (next: Partial<FilterState>) => void
  onClose: () => void
  isDark: boolean
}) {
  const { t } = useI18n()
  const [open, close] = useSheetClose(onClose)
  const [dist, setDist] = useState<[number, number]>(value.dist)
  const [elev, setElev] = useState<[number, number]>(value.elev)
  const [sport, setSport] = useState(value.sport)

  const title = kind === 'dist' ? t('record.routeCreatorDistance') : kind === 'elev' ? t('record.routeFilterElev') : t('record.routeFilterSport')
  const reset = () => { haptic('light'); if (kind === 'dist') setDist([0, DIST_MAX]); else if (kind === 'elev') setElev([0, ELEV_MAX]); else setSport('all') }
  const apply = () => {
    haptic('medium')
    if (kind === 'dist') onApply({ dist }); else if (kind === 'elev') onApply({ elev }); else onApply({ sport })
    close()
  }

  const sports = [{ id: 'all', label: t('record.routeLibraryAllSports'), Icon: null }, ...ROUTE_SPORTS.map(s => ({ id: s.id, label: t(s.labelKey), Icon: s.Icon }))]

  return (
    <RkSheet open={open} onClose={close} title={title} isDark={isDark} zIndex={10030}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <RkCta variant="white" onClick={reset} style={{ flex: 1, boxShadow: 'none', background: 'var(--surface-chip)' }}>{t('record.routeFilterReset')}</RkCta>
          <RkCta variant="primary" onClick={apply} style={{ flex: 1.4 }}>{t('record.routeLibraryUse')}</RkCta>
        </div>
      }>
      {kind === 'dist' && (
        <DualRange min={0} max={DIST_MAX} step={5} value={dist} onChange={setDist} fmt={v => v >= DIST_MAX ? `> ${DIST_MAX} km` : `${v} km`} />
      )}
      {kind === 'elev' && (
        <DualRange min={0} max={ELEV_MAX} step={50} value={elev} onChange={setElev} fmt={v => v >= ELEV_MAX ? `> ${ELEV_MAX} m` : `${v} m`} />
      )}
      {kind === 'sport' && (
        <RkGroup>
          {sports.map(s => (
            <RkRow key={s.id} chevron={false} label={s.label}
              icon={<span style={{ width: 28, display: 'flex', justifyContent: 'center', color: 'var(--text-mid)' }}>{s.Icon ? <s.Icon size={20} stroke={1.9} /> : <RkIco d={RK_ICON.globe} size={19} />}</span>}
              onClick={() => setSport(s.id)}
              right={sport === s.id ? <span style={{ color: 'var(--primary)', display: 'flex' }}><RkIco d={RK_ICON.check} size={20} sw={2.6} /></span> : undefined} />
          ))}
        </RkGroup>
      )}
    </RkSheet>
  )
}

// Double curseur (deux poignées) sur une piste — pointer events.
function DualRange({ min, max, step, value, onChange, fmt }: {
  min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void
  fmt: (v: number) => string
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

  const thumb = (v: number): React.CSSProperties => ({
    position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)',
    width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-card)', boxShadow: 'var(--shadow-capsule)', cursor: 'grab', touchAction: 'none',
  })

  return (
    <div style={{ padding: '4px 8px 8px' }}>
      <div className="rk-num" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22, letterSpacing: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{fmt(lo)}</span>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{fmt(hi)}</span>
      </div>
      <div ref={barRef} style={{ position: 'relative', height: 30 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', transform: 'translateY(-50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%`, height: 6, borderRadius: 'var(--r-pill)', background: 'var(--primary)', transform: 'translateY(-50%)' }} />
        <div role="slider" aria-valuenow={lo} aria-valuemin={min} aria-valuemax={max} onPointerDown={e => { dragging.current = 0; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }} style={thumb(lo)} />
        <div role="slider" aria-valuenow={hi} aria-valuemin={min} aria-valuemax={max} onPointerDown={e => { dragging.current = 1; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }} style={thumb(hi)} />
      </div>
      <div className="rk-num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, letterSpacing: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{fmt(min)}</span>
        <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{fmt(max)}</span>
      </div>
    </div>
  )
}
