'use client'
// ════════════════════════════════════════════════════════════════════
// DayTimelineSheet — vue « jour » façon calendrier iOS (image 2), ouverte au
// tap sur un jour du planning. Bandeau semaine (L M M J V S D + dates, jour
// courant en rouge), titre du jour, timeline horaire avec les séances / tâches
// / activités positionnées à l'heure, trait d'heure courante (rouge), bouton
// « Aujourd'hui » et bouton retour. Sur-page coulissante (portal, au-dessus du
// shell → la barre de bulles ne transparaît pas).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const RED = '#ef4444' // design-allow-color
const START_H = 5
const END_H = 23
const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => i + START_H)
const CELL_H = 58

export interface DayTimelineItem {
  id: string
  label: string
  sublabel?: string
  color: string
  startHour: number
  startMin: number
  durationMin: number
  done?: boolean
  onClick?: () => void
}

interface Props {
  monthLabel: string
  weekDayLabels: string[]
  weekDates: number[]
  selectedDay: number
  todayIdx: number
  currentTime: Date
  dayTitle: string
  items: DayTimelineItem[]
  onSelectDay: (d: number) => void
  onToday: () => void
  onClose: () => void
}

export default function DayTimelineSheet({
  monthLabel, weekDayLabels, weekDates, selectedDay, todayIdx, currentTime, dayTitle, items,
  onSelectDay, onToday, onClose,
}: Props) {
  const [shown, setShown] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    // Défile jusqu'au 1er item (ou ~8h) à l'ouverture.
    const firstTop = items.length > 0
      ? Math.min(...items.map(it => (it.startHour - START_H + it.startMin / 60) * CELL_H))
      : (8 - START_H) * CELL_H
    const s = setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollTop = Math.max(0, firstTop - 40) }, 60)
    return () => { cancelAnimationFrame(id); clearTimeout(s) }
  }, [items])

  const close = () => { setShown(false); setTimeout(onClose, 280) }

  const isToday = selectedDay === todayIdx
  const nowH = currentTime.getHours() + currentTime.getMinutes() / 60
  const totalH = HOURS.length * CELL_H
  const nowTop = isToday ? Math.max(0, Math.min(totalH - 1, (nowH - START_H) * CELL_H)) : -1
  const nowLabel = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: shown ? 1 : 0, transition: 'opacity 0.28s' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* En-tête : retour + mois */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'calc(env(safe-area-inset-top) + 12px) 14px 8px', flexShrink: 0 }}>
          <button onClick={close} aria-label={monthLabel} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            cursor: 'pointer', color: RED, fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', padding: '4px 2px',
          }}>
            <svg width="11" height="18" viewBox="0 0 11 18"><path d="M9 2 L2 9 L9 16" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {monthLabel}
          </button>
        </div>

        {/* Bandeau semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {weekDates.map((dn, i) => {
            const dToday = i === todayIdx
            const sel = i === selectedDay
            return (
              <button key={i} onClick={() => onSelectDay(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: dToday ? RED : 'var(--text-dim)' }}>{weekDayLabels[i]}</span>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700,
                  background: dToday ? RED : (sel ? 'var(--bg-card2)' : 'transparent'),
                  border: sel && !dToday ? '1.5px solid var(--text)' : '1.5px solid transparent',
                  color: dToday ? '#fff' : 'var(--text)', // design-allow-color
                }}>{dn}</span>
              </button>
            )
          })}
        </div>

        {/* Titre du jour */}
        <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: isToday ? RED : 'var(--text)', fontFamily: 'Syne, sans-serif' }}>{dayTitle}</span>
        </div>

        {/* Timeline horaire */}
        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <div style={{ display: 'flex', height: totalH, position: 'relative' }}>
            {/* Colonne des heures */}
            <div style={{ width: 54, flexShrink: 0, position: 'relative', borderRight: '1px solid var(--border)' }}>
              {HOURS.map((h, i) => (
                <div key={h} style={{ position: 'absolute', top: i * CELL_H - 6, right: 8, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text-dim)' }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {/* Colonne du jour */}
            <div style={{ flex: 1, position: 'relative' }}>
              {HOURS.map((_, i) => (
                <div key={i} style={{ position: 'absolute', top: i * CELL_H, left: 0, right: 0, height: 1, background: 'var(--border)', opacity: 0.4 }} />
              ))}
              {/* Items positionnés */}
              {items.map(it => {
                const top = Math.max(0, (it.startHour - START_H + it.startMin / 60) * CELL_H)
                const h = Math.max((it.durationMin / 60) * CELL_H, 26)
                return (
                  <div key={it.id} onClick={it.onClick}
                    style={{
                      position: 'absolute', top, height: h, left: 6, right: 8, borderRadius: 8,
                      padding: '5px 8px', background: `color-mix(in srgb, ${it.color} 14%, transparent)`,
                      borderLeft: `3px solid ${it.color}`, cursor: it.onClick ? 'pointer' : 'default',
                      overflow: 'hidden', zIndex: 2,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: it.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{it.label}</span>
                      {it.done && <span style={{ fontSize: 10, background: it.color, color: '#fff', borderRadius: 3, padding: '0 3px', fontWeight: 800, flexShrink: 0 }}>✓</span>}
                    </div>
                    {it.sublabel && h >= 40 && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{it.sublabel}</div>}
                  </div>
                )
              })}
              {/* Trait d'heure courante */}
              {nowTop >= 0 && (
                <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, zIndex: 4, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: -46, background: RED, color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 6, padding: '1px 5px', fontFamily: 'DM Mono, monospace' }}>{nowLabel}</div>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED, marginLeft: -3.5 }} />
                  <div style={{ flex: 1, height: 1.5, background: RED }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Aujourd'hui */}
        <div style={{ position: 'absolute', left: 16, bottom: 'calc(env(safe-area-inset-bottom) + 16px)', zIndex: 6 }}>
          <button onClick={onToday} className="thw-glass thw-press" style={{
            padding: '11px 20px', borderRadius: 24, border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif',
          }}>
            Aujourd&apos;hui
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
