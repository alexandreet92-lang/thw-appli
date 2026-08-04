'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDeck — deck de cartes de programmes façon Runna : grandes cartes
// colorées PAR SPORT (palette --sport-* sanctionnée), empilées, que l'on fait
// défiler au drag avec animation. Tap sur la carte → onOpen(programme).
// Les programmes sont regroupés par sport (mêmes sports adjacents).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from 'react'
import type { CoachProgram } from '@/lib/coach/programs'
import { LEVEL_LABEL } from '@/lib/coach/programs'

const SPORT_VAR: Record<string, string> = {
  running: '--sport-run', cycling: '--sport-bike', swim: '--sport-swim',
  gym: '--sport-gym', hyrox: '--sport-hyrox', rowing: '--sport-rowing',
  trail: '--sport-run', triathlon: '--sport-swim',
}
const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

function sportOf(p: CoachProgram): string { return p.sports[0] ?? 'running' }
function sportVar(s: string): string { return `var(${SPORT_VAR[s] ?? '--sport-run'})` }
function cardBg(s: string): string {
  const c = sportVar(s)
  return `linear-gradient(158deg, ${c} 0%, color-mix(in srgb, ${c} 58%, black) 100%)`
}

function SportGlyph({ sport }: { sport: string }) {
  const p = 'none', s = 'white'
  const common = { width: 40, height: 40, viewBox: '0 0 24 24', fill: p, stroke: s, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { opacity: 0.95 } }
  switch (sport) {
    case 'cycling': return <svg {...common}><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 17.5l-3-6 4-1M9 6h3l3 6"/></svg>
    case 'swim': case 'triathlon': return <svg {...common}><path d="M2 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M2 20c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M6 12l4-3 3 3 3-6"/><circle cx="17" cy="6" r="1.4" fill={s} stroke="none"/></svg>
    case 'gym': return <svg {...common}><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/></svg>
    case 'rowing': return <svg {...common}><path d="M3 21l7-7M14 3l7 7M9 9l6 6M12 6l6 6"/></svg>
    default: return <svg {...common}><path d="M4 17l4-1 6-9 3 1-2 4 4 2M6 20l3-2"/></svg>   // shoe (course/trail/hyrox)
  }
}

export default function ProgramDeck({ programs, onOpen }: { programs: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
  const ordered = useMemo(() => [...programs].sort((a, b) => sportOf(a).localeCompare(sportOf(b))), [programs])
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const moved = useRef(false)

  const n = ordered.length
  if (!n) return null
  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i))

  const onDown = (e: React.PointerEvent) => { dragging.current = true; startX.current = e.clientX; moved.current = false; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - startX.current; if (Math.abs(dx) > 5) moved.current = true; setDrag(dx) }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    const dx = drag; setDrag(0)
    const th = 80
    if (dx < -th) setIndex(i => clamp(i + 1))
    else if (dx > th) setIndex(i => clamp(i - 1))
  }

  const stack = ordered.slice(index, index + 4)

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ position: 'relative', height: 'clamp(320px, 60vw, 380px)', maxWidth: 460, margin: '0 auto' }}>
        {stack.map((p, k) => {
          const isTop = k === 0
          const sport = sportOf(p)
          const sessions = p.structure.reduce((s, w) => s + w.sessions.length, 0)
          const transform = isTop
            ? `translateX(${drag}px) rotate(${drag * 0.025}deg)`
            : `translateX(${k * 7}px) translateY(${k * 10}px) scale(${1 - k * 0.045})`
          return (
            <div key={p.id}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
              onClick={isTop ? () => { if (!moved.current) onOpen(p) } : undefined}
              style={{
                position: 'absolute', inset: 0, zIndex: 10 - k,
                borderRadius: 'clamp(20px, 4vw, 28px)', background: cardBg(sport),
                boxShadow: '0 18px 44px rgba(0,0,0,0.24)', color: 'white', cursor: isTop ? 'grab' : 'default',
                padding: 'clamp(18px, 4vw, 26px)', display: 'flex', flexDirection: 'column',
                transform, transition: dragging.current && isTop ? 'none' : 'transform 300ms cubic-bezier(0.32,0.72,0,1)',
                opacity: k > 2 ? 0 : 1, pointerEvents: isTop ? 'auto' : 'none', overflow: 'hidden',
              }}>
              {/* reflet */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0))', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 22 }}>
                  <div><div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>Durée</div><div className="tnum" style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks} sem.</div></div>
                  <div><div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>Séances</div><div className="tnum" style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sessions}</div></div>
                </div>
                <SportGlyph sport={sport} />
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{SPORT_LABEL[sport] ?? sport}{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 30px)', fontWeight: 600, lineHeight: 1.1, margin: '6px 0 8px' }}>{p.title}</div>
                {p.description && <div style={{ fontSize: 13.5, opacity: 0.92, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.description}</div>}
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 12, opacity: 0.95 }}>Voir le programme →</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Points */}
      {n > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18 }}>
          {ordered.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Programme ${i + 1}`}
              style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: i === index ? 'var(--text)' : 'var(--border-mid)', transition: 'width 200ms, background 200ms' }} />
          ))}
        </div>
      )}
    </div>
  )
}
