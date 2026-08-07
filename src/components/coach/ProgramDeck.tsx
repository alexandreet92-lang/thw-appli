'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDeck — catalogue façon Runna. Programmes REGROUPÉS PAR SPORT :
// chaque sport = une PILE de cartes clairement empilées (les cartes du dessous
// dépassent), parcourue au drag, aux points, ou aux flèches latérales (desktop).
// Piles en grille responsive (≈3/ligne desktop, 1/ligne mobile). Glyphes de
// sport nets (Tabler), surface « verre » animée.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState, type ComponentType } from 'react'
import { IconRun, IconBike, IconSwimming, IconBarbell, IconStretching2, IconKayak, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { CoachProgram } from '@/lib/coach/programs'
import { LEVEL_LABEL, programHours } from '@/lib/coach/programs'

type GlyphIcon = ComponentType<{ size?: number; color?: string; stroke?: number; style?: React.CSSProperties }>

const SPORT_VAR: Record<string, string> = {
  running: '--sport-run', cycling: '--sport-bike', swim: '--sport-swim',
  gym: '--sport-gym', hyrox: '--sport-hyrox', rowing: '--sport-rowing',
  trail: '--sport-run', triathlon: '--sport-swim',
}
const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }
const SPORT_GLYPH: Record<string, GlyphIcon> = {
  running: IconRun, trail: IconRun, cycling: IconBike, swim: IconSwimming,
  triathlon: IconSwimming, gym: IconBarbell, hyrox: IconStretching2, rowing: IconKayak,
}

function sportOf(p: CoachProgram): string { return p.sports[0] ?? 'running' }
function sportVar(s: string): string { return `var(${SPORT_VAR[s] ?? '--sport-run'})` }
function cardBg(s: string): string {
  const c = sportVar(s)
  return `linear-gradient(155deg, color-mix(in srgb, ${c} 88%, white) 0%, ${c} 42%, color-mix(in srgb, ${c} 62%, black) 100%)`
}
function priceStr(p: CoachProgram): string { return p.price_cents > 0 ? `${(p.price_cents / 100).toFixed(p.price_cents % 100 === 0 ? 0 : 2)} €` : 'Gratuit' }

function SportGlyph({ sport, size = 42 }: { sport: string; size?: number }) {
  const Icon = SPORT_GLYPH[sport] ?? IconRun
  return <Icon size={size} color="white" stroke={2} style={{ opacity: 0.97, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.20))' }} />
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
  const go = (d: number) => setIndex(i => clamp(i + d))

  const onDown = (e: React.PointerEvent) => { if (n < 2) return; dragging.current = true; startX.current = e.clientX; moved.current = false; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - startX.current; if (Math.abs(dx) > 5) moved.current = true; setDrag(dx) }
  const onUp = () => { if (!dragging.current) return; dragging.current = false; const dx = drag; setDrag(0); const th = 55; if (dx < -th) go(1); else if (dx > th) go(-1) }

  // On dessine du fond vers le dessus pour un empilement net (les cartes du
  // dessous dépassent en bas à droite). Le dessus (position courante) est en dernier.
  const depth = Math.min(3, n - index)
  const layers = Array.from({ length: depth }, (_, d) => ({ p: list[index + (depth - 1 - d)], back: depth - 1 - d })) // back: 0 = dessus

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ position: 'relative', height: 232, paddingRight: 14, paddingBottom: 16 }}>
        {layers.map(({ p, back }) => {
          const isTop = back === 0
          const sessions = p.structure.reduce((s, w) => s + w.sessions.length, 0)
          const hours = programHours(p.structure)
          const transform = isTop
            ? `translateX(${drag}px) rotate(${(drag * 0.02).toFixed(2)}deg)`
            : `translate(${back * 11}px, ${back * 13}px) rotate(${back * 2}deg) scale(${1 - back * 0.05})`
          return (
            <div key={p.id}
              onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined} onPointerCancel={isTop ? onUp : undefined}
              onClick={isTop ? () => { if (!moved.current) onOpen(p) } : undefined}
              className={isTop ? 'pd-card' : undefined}
              style={{
                position: 'absolute', top: 0, left: 0, right: 14, height: 210, zIndex: 10 - back, borderRadius: 20, background: cardBg(sport),
                boxShadow: isTop ? '0 14px 32px rgba(0,0,0,0.26)' : '0 8px 18px rgba(0,0,0,0.18)', color: 'white',
                cursor: isTop ? 'pointer' : 'default', padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transform, transformOrigin: 'top left', transition: dragging.current && isTop ? 'none' : 'transform 320ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms',
                opacity: isTop ? 1 : back === 1 ? 0.82 : 0.6, pointerEvents: isTop ? 'auto' : 'none',
              }}>
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 15% 0%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)', pointerEvents: 'none' }} />
              {isTop && <span aria-hidden className="pd-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '45%', background: 'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <SportGlyph sport={sport} />
                <span style={{ fontSize: 14, fontWeight: 800, background: 'rgba(255,255,255,0.20)', padding: '4px 10px', borderRadius: 999 }}>{priceStr(p)}</span>
              </div>
              <div style={{ flex: 1 }} />
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

        {/* Flèches latérales (desktop surtout) */}
        {n > 1 && (
          <>
            <button aria-label="Précédent" onClick={() => go(-1)} disabled={index === 0}
              style={{ ...arrow, left: -6, opacity: index === 0 ? 0.3 : 1 }}><IconChevronLeft size={18} /></button>
            <button aria-label="Suivant" onClick={() => go(1)} disabled={index >= n - 1}
              style={{ ...arrow, right: 8, opacity: index >= n - 1 ? 0.3 : 1 }}><IconChevronRight size={18} /></button>
          </>
        )}
      </div>

      {n > 1 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
          {list.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Programme ${i + 1}`}
              style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: i === index ? 'var(--text)' : 'var(--border-mid)', transition: 'width 200ms, background 200ms' }} />
          ))}
        </div>
      )}
    </div>
  )
}

const arrow: React.CSSProperties = {
  position: 'absolute', top: 96, width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', zIndex: 20,
  background: 'var(--bg-card)', color: 'var(--text)', boxShadow: '0 3px 10px rgba(0,0,0,0.22)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}

export default function ProgramDeck({ programs, onOpen }: { programs: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
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
        @media (hover:hover) { .pd-card:hover { box-shadow: 0 18px 42px rgba(0,0,0,0.32) !important; } }
        @media (prefers-reduced-motion: reduce) { .pd-sheen { animation: none; } }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 'clamp(18px, 3vw, 30px)', alignItems: 'start' }}>
        {groups.map(([sport, list]) => <SportStack key={sport} sport={sport} list={list} onOpen={onOpen} />)}
      </div>
    </>
  )
}
