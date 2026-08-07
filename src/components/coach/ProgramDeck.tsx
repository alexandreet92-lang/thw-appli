'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDeck — carrousel « coverflow » façon Runna. UNE carte haute affichée
// à la fois (le sport se choisit via les filtres au-dessus). La carte
// précédente déborde à gauche, les suivantes s'empilent en éventail à droite ;
// au glissement, tout se déplace réellement (la carte part à gauche → suivante).
// Surface « verre » (dégradé + reflets diagonaux animés). Flèches sur desktop.
// ══════════════════════════════════════════════════════════════════
import { useRef, useState, type ComponentType } from 'react'
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
  return `linear-gradient(150deg, color-mix(in srgb, ${c} 90%, white) 0%, ${c} 46%, color-mix(in srgb, ${c} 64%, black) 100%)`
}
function priceStr(p: CoachProgram): string { return p.price_cents > 0 ? `${(p.price_cents / 100).toFixed(p.price_cents % 100 === 0 ? 0 : 2)} €` : 'Gratuit' }
function SportGlyph({ sport, size = 44 }: { sport: string; size?: number }) {
  const Icon = SPORT_GLYPH[sport] ?? IconRun
  return <Icon size={size} color="white" stroke={2} style={{ opacity: 0.97, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.22))' }} />
}

// Position d'une carte selon son décalage `pos` (i - index courant) + glissement.
function layout(pos: number, drag: number): { transform: string; z: number; opacity: number; shadow: string } {
  const dl = Math.min(0, drag), dr = Math.max(0, drag) // gauche / droite
  if (pos === 0) return { transform: `translateX(calc(-50% + ${drag}px)) rotate(${(drag * 0.015).toFixed(2)}deg)`, z: 40, opacity: 1, shadow: '0 20px 44px rgba(0,0,0,0.30)' }
  if (pos === 1) return { transform: `translateX(calc(-50% + 13% + ${dl * 0.45}px)) translateY(12px) rotate(4deg) scale(0.92)`, z: 30, opacity: 0.92, shadow: '0 12px 26px rgba(0,0,0,0.20)' }
  if (pos === 2) return { transform: `translateX(calc(-50% + 22% + ${dl * 0.28}px)) translateY(22px) rotate(8deg) scale(0.84)`, z: 20, opacity: 0.7, shadow: '0 10px 22px rgba(0,0,0,0.16)' }
  // pos === -1 : carte précédente, déborde à gauche
  return { transform: `translateX(calc(-50% - 13% + ${dr * 0.45}px)) translateY(12px) rotate(-4deg) scale(0.92)`, z: 28, opacity: 0.9, shadow: '0 12px 26px rgba(0,0,0,0.20)' }
}

function Card({ p, pos, drag, onOpen }: { p: CoachProgram; pos: number; drag: number; onOpen?: () => void }) {
  const sport = sportOf(p)
  const sessions = p.structure.reduce((s, w) => s + w.sessions.length, 0)
  const hours = programHours(p.structure)
  const { transform, z, opacity, shadow } = layout(pos, drag)
  const isTop = pos === 0
  return (
    <div onClick={isTop ? onOpen : undefined}
      style={{
        position: 'absolute', top: 0, left: '50%', width: '86%', height: '100%', zIndex: z, opacity,
        borderRadius: 24, background: cardBg(sport), color: 'white', boxShadow: shadow, overflow: 'hidden',
        padding: 'clamp(18px, 5vw, 24px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        transform, transformOrigin: 'center', transition: 'transform 340ms cubic-bezier(0.32,0.72,0,1), opacity 200ms, box-shadow 200ms',
        cursor: isTop ? 'pointer' : 'default', pointerEvents: isTop ? 'auto' : 'none',
      }}>
      {/* Surface verre : halo + 2 reflets diagonaux + sweep animé */}
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 90% at 12% -5%, rgba(255,255,255,0.30), rgba(255,255,255,0) 52%)', pointerEvents: 'none' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.16) 44%, rgba(255,255,255,0) 52%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.10) 78%, rgba(255,255,255,0) 84%)', pointerEvents: 'none' }} />
      {isTop && <span aria-hidden className="pd-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '42%', background: 'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />}

      {/* Haut : stats + glyphe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', gap: 12 }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <Stat label="Durée" value={`${p.duration_weeks} sem`} />
          <Stat label="Séances" value={String(sessions)} />
        </div>
        <SportGlyph sport={sport} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Bas : chips + titre + résumé + méta + prix */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.92 }}>{SPORT_LABEL[sport] ?? sport}</span>
          {p.specialty && <Pill>{p.specialty}</Pill>}
          {p.level && <Pill>{LEVEL_LABEL[p.level]}</Pill>}
          {p.ai_enabled && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.20)' }}>IA</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 600, lineHeight: 1.1, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.title}</div>
        {p.description && <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.description}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.95, fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks} sem · {sessions} séa · {hours} h</span>
          <span style={{ fontSize: 15, fontWeight: 800, background: 'rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{priceStr(p)}</span>
        </div>
      </div>
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontSize: 11, opacity: 0.82, fontWeight: 600 }}>{label}</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div></div>
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.20)' }}>{children}</span>
}

export default function ProgramDeck({ programs, onOpen }: { programs: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const moved = useRef(false)
  const n = programs.length
  if (!n) return null
  const cur = Math.min(index, n - 1)
  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i))
  const go = (d: number) => { setIndex(clamp(cur + d)); setDrag(0) }

  const onDown = (e: React.PointerEvent) => { if (n < 2) return; dragging.current = true; startX.current = e.clientX; moved.current = false; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - startX.current; if (Math.abs(dx) > 5) moved.current = true; setDrag(dx) }
  const onUp = () => { if (!dragging.current) return; dragging.current = false; const dx = drag; setDrag(0); const th = 55; if (dx < -th) go(1); else if (dx > th) go(-1) }

  // Cartes visibles : précédente (-1) → +2 suivantes. On dessine du fond vers le dessus.
  const order = [2, 1, -1, 0].filter(pos => cur + pos >= 0 && cur + pos < n)

  return (
    <div style={{ width: '100%', maxWidth: 460, margin: '0 auto', position: 'relative' }}>
      <style>{`
        @keyframes pdSheen { 0% { transform: translateX(-170%) skewX(-12deg); } 60%,100% { transform: translateX(330%) skewX(-12deg); } }
        .pd-sheen { animation: pdSheen 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pd-sheen { animation: none; } }
        .pd-arrow { display: none; }
        @media (hover: hover) and (min-width: 640px) { .pd-arrow { display: flex; } }
      `}</style>

      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ position: 'relative', height: 'clamp(360px, 92vw, 430px)', touchAction: 'pan-y', userSelect: 'none' }}>
        {order.map(pos => {
          const p = programs[cur + pos]
          return <Card key={p.id} p={p} pos={pos} drag={drag} onOpen={pos === 0 ? () => { if (!moved.current) onOpen(p) } : undefined} />
        })}

        {n > 1 && (
          <>
            <button className="pd-arrow" aria-label="Précédent" onClick={() => go(-1)} disabled={cur === 0}
              style={{ ...arrow, left: -14, opacity: cur === 0 ? 0.35 : 1 }}><IconChevronLeft size={20} /></button>
            <button className="pd-arrow" aria-label="Suivant" onClick={() => go(1)} disabled={cur >= n - 1}
              style={{ ...arrow, right: -14, opacity: cur >= n - 1 ? 0.35 : 1 }}><IconChevronRight size={20} /></button>
          </>
        )}
      </div>

      {n > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {programs.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Programme ${i + 1}`}
              style={{ width: i === cur ? 18 : 7, height: 7, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: i === cur ? 'var(--text)' : 'var(--border-mid)', transition: 'width 200ms, background 200ms' }} />
          ))}
        </div>
      )}
    </div>
  )
}

const arrow: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer', zIndex: 50,
  background: 'var(--bg-card)', color: 'var(--text)', boxShadow: '0 4px 14px rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center', padding: 0,
}
