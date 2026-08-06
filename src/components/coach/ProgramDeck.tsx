'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDeck — catalogue de programmes façon Runna. Les programmes sont
// REGROUPÉS PAR SPORT : chaque sport forme une PILE de cartes que l'on fait
// défiler (drag / points). Les piles sont disposées en grille responsive
// (3 par ligne sur ordinateur, 1 par ligne sur mobile). Cartes colorées par
// sport (palette --sport-*), surface « verre » animée, glyphe de sport.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from 'react'
import type { CoachProgram } from '@/lib/coach/programs'
import { LEVEL_LABEL, programHours } from '@/lib/coach/programs'

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
  return `linear-gradient(155deg, color-mix(in srgb, ${c} 88%, white) 0%, ${c} 42%, color-mix(in srgb, ${c} 62%, black) 100%)`
}
function priceStr(p: CoachProgram): string { return p.price_cents > 0 ? `${(p.price_cents / 100).toFixed(p.price_cents % 100 === 0 ? 0 : 2)} €` : 'Gratuit' }

// ── Glyphes de sport (formes bold, lisibles sur la carte) ──
function SportGlyph({ sport, size = 46 }: { sport: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', style: { opacity: 0.96, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' } }
  const stroke = { fill: 'none' as const, stroke: 'white', strokeWidth: 2.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (sport) {
    case 'cycling':
      return (
        <svg {...common} {...stroke}>
          <circle cx="8" cy="22" r="5" /><circle cx="24" cy="22" r="5" />
          <path d="M8 22l6-9h6l-4 9M12 13l-2-4h4M20 13l3 9" /><circle cx="14" cy="9" r="0.6" fill="white" />
        </svg>
      )
    case 'swim': case 'triathlon':
      return (
        <svg {...common} {...stroke}>
          <circle cx="22" cy="9" r="2.3" fill="white" stroke="none" />
          <path d="M4 15l6-2 4 3 5-2 4 3" /><path d="M3 21c2 1.4 3.3 1.4 5.3 0s3.3-1.4 5.3 0 3.3 1.4 5.3 0 3.3-1.4 5.3 0" /><path d="M3 26c2 1.4 3.3 1.4 5.3 0s3.3-1.4 5.3 0 3.3 1.4 5.3 0 3.3-1.4 5.3 0" />
        </svg>
      )
    case 'gym':
      return (
        <svg {...common} {...stroke} strokeWidth={2.3}>
          <path d="M7 11v10M4 13v6M25 11v10M28 13v6M7 16h18" />
        </svg>
      )
    case 'hyrox':
      return (
        <svg {...common}>
          <circle cx="16" cy="8" r="3" fill="white" />
          <path d="M14 12h4l1.6 6h-7.2z" fill="white" /><path d="M13.5 18l-1.5 7h2.4l1.6-5.5 1.6 5.5H20l-1.5-7" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'rowing':
      return (
        <svg {...common} {...stroke}>
          <path d="M4 27L27 6" /><path d="M20 6h7v7" /><path d="M9 15l7 7" /><circle cx="14" cy="12" r="0.6" fill="white" />
        </svg>
      )
    default: // course / trail — chaussure pleine
      return (
        <svg {...common}>
          <path d="M3 21.5c-.8 0-1.4-.7-1.3-1.5l.3-2.1c.1-.8.8-1.4 1.6-1.4h2.6l2.5-3.7c.5-.7 1.4-1 2.2-.7l.8.3-.7 1.5 2.3 1.1.8-1.4 3.3 1.2c2.6.9 4.7 2.8 5.9 5.3.3.7-.2 1.5-1 1.5H3z" fill="white" />
          <path d="M7 17.5l1.8 1M11 15.4l1.8 1" stroke="rgba(0,0,0,0.28)" strokeWidth={1.4} strokeLinecap="round" fill="none" />
        </svg>
      )
  }
}

// ── Une pile pour UN sport ──
function SportStack({ sport, list, onOpen }: { sport: string; list: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const moved = useRef(false)
  const n = list.length
  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i))

  const onDown = (e: React.PointerEvent) => { if (n < 2) return; dragging.current = true; startX.current = e.clientX; moved.current = false; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - startX.current; if (Math.abs(dx) > 5) moved.current = true; setDrag(dx) }
  const onUp = () => { if (!dragging.current) return; dragging.current = false; const dx = drag; setDrag(0); const th = 60; if (dx < -th) setIndex(i => clamp(i + 1)); else if (dx > th) setIndex(i => clamp(i - 1)) }

  const stack = list.slice(index, index + 3)
  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ position: 'relative', height: 210 }}>
        {stack.map((p, k) => {
          const isTop = k === 0
          const sessions = p.structure.reduce((s, w) => s + w.sessions.length, 0)
          const hours = programHours(p.structure)
          const transform = isTop
            ? `translateX(${drag}px) rotate(${drag * 0.02}deg)`
            : `translateX(${k * 5}px) translateY(${k * 7}px) scale(${1 - k * 0.04})`
          return (
            <div key={p.id}
              onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined} onPointerCancel={isTop ? onUp : undefined}
              onClick={isTop ? () => { if (!moved.current) onOpen(p) } : undefined}
              className={isTop ? 'pd-card' : undefined}
              style={{
                position: 'absolute', inset: 0, zIndex: 10 - k, borderRadius: 20, background: cardBg(sport),
                boxShadow: '0 12px 30px rgba(0,0,0,0.22)', color: 'white', cursor: isTop && n > 1 ? 'grab' : 'pointer',
                padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transform, transition: dragging.current && isTop ? 'none' : 'transform 300ms cubic-bezier(0.32,0.72,0,1)',
                opacity: k > 1 ? 0.85 : 1, pointerEvents: isTop ? 'auto' : 'none',
              }}>
              {/* Surface « verre » : reflet fixe + sweep animé */}
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 15% 0%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)', pointerEvents: 'none' }} />
              {isTop && <span aria-hidden className="pd-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '45%', background: 'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />}

              {/* Haut : glyphe + prix */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <SportGlyph sport={sport} />
                <span style={{ fontSize: 14, fontWeight: 800, background: 'rgba(255,255,255,0.20)', padding: '4px 10px', borderRadius: 999 }}>{priceStr(p)}</span>
              </div>

              <div style={{ flex: 1 }} />

              {/* Bas : niveau/IA + titre + résumé + méta */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>{SPORT_LABEL[sport] ?? sport}</span>
                  {p.specialty && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}>{p.specialty}</span>}
                  {p.level && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}>{LEVEL_LABEL[p.level]}</span>}
                  {p.ai_enabled && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.18)' }}>IA</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, lineHeight: 1.12, marginBottom: p.description ? 4 : 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.title}</div>
                {p.description && <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.description}</div>}
                <div className="tnum" style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.95, fontVariantNumeric: 'tabular-nums' }}>
                  {p.duration_weeks} sem · {sessions} séa · {hours} h
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Points de la pile */}
      {n > 1 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
          {list.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Programme ${i + 1}`}
              style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: i === index ? 'var(--text)' : 'var(--border-mid)', transition: 'width 200ms, background 200ms' }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProgramDeck({ programs, onOpen }: { programs: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
  // Regroupe par sport (ordre stable) → une pile par sport.
  const groups = useMemo(() => {
    const m = new Map<string, CoachProgram[]>()
    for (const p of programs) { const s = sportOf(p); const arr = m.get(s) ?? []; arr.push(p); m.set(s, arr) }
    return Array.from(m.entries()).sort((a, b) => (SPORT_LABEL[a[0]] ?? a[0]).localeCompare(SPORT_LABEL[b[0]] ?? b[0]))
  }, [programs])

  if (!programs.length) return null
  return (
    <>
      <style>{`
        @keyframes pdSheen { 0% { transform: translateX(-160%) skewX(-12deg); } 60%,100% { transform: translateX(320%) skewX(-12deg); } }
        .pd-sheen { animation: pdSheen 5.5s ease-in-out infinite; }
        .pd-card { transition: box-shadow .2s ease, transform .3s cubic-bezier(0.32,0.72,0,1); }
        @media (hover:hover) { .pd-card:hover { box-shadow: 0 18px 40px rgba(0,0,0,0.30); } }
        @media (prefers-reduced-motion: reduce) { .pd-sheen { animation: none; } }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 'clamp(16px, 3vw, 26px)', alignItems: 'start' }}>
        {groups.map(([sport, list]) => <SportStack key={sport} sport={sport} list={list} onOpen={onOpen} />)}
      </div>
    </>
  )
}
