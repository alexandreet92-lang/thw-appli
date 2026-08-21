'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDeck — cartes de programmes JAMAIS mélangées entre sports.
//  • Desktop : une PILE par sport, toutes côte à côte sur la même ligne.
//  • Mobile  : UNE pile (le sport se choisit via le filtre Sport) ; changer de
//    sport fait glisser les cartes vers la gauche et arriver le nouveau sport
//    par la droite (framer-motion).
// Cartes hautes, surface « verre » (halo + reflets diagonaux + reflet animé).
// Volume horaire affiché EN HAUT à côté des séances.
// ══════════════════════════════════════════════════════════════════
import { useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconRun, IconBike, IconSwimming, IconBarbell, IconStretching2, IconKayak, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { CoachProgram } from '@/lib/coach/programs'
import { LEVEL_LABEL, programHours } from '@/lib/coach/programs'
import { useNarrow } from '@/lib/hooks/useNarrow'
import { haptic } from '@/lib/haptics'

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
  // Couleur PLEINE, plate et simple (moins « verre ») — légère profondeur bas.
  const c = sportVar(s)
  return `linear-gradient(165deg, ${c} 0%, color-mix(in srgb, ${c} 90%, black) 100%)`
}
function priceStr(p: CoachProgram): string { return p.price_cents > 0 ? `${(p.price_cents / 100).toFixed(p.price_cents % 100 === 0 ? 0 : 2)} €` : 'Gratuit' }
function SportGlyph({ sport, size = 42 }: { sport: string; size?: number }) {
  const Icon = SPORT_GLYPH[sport] ?? IconRun
  return <Icon size={size} color="white" stroke={2} style={{ opacity: 0.97, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.22))' }} />
}

type Placement = { transform: string; z: number; opacity: number; shadow: string }
// Deck EMPILÉ ET ÉVENTAILLÉ vers la droite (façon Strava) : la carte active est
// devant, les suivantes dépassent nettement derrière-droite (décalées + un peu
// plus petites), bien visibles. La précédente sort par la gauche.
function placeCard(pos: number, drag: number): Placement {
  const sh = '0 10px 30px rgba(0,0,0,0.20)'
  if (pos === 0) return { transform: `translateX(calc(-50% + ${drag}px)) rotate(${(drag * 0.01).toFixed(2)}deg)`, z: 40, opacity: 1, shadow: '0 14px 40px rgba(0,0,0,0.28)' }
  if (pos === 1) return { transform: `translateX(calc(-50% + 16px)) translateY(11px) scale(0.955)`, z: 30, opacity: 0.94, shadow: sh }
  if (pos === 2) return { transform: `translateX(calc(-50% + 30px)) translateY(21px) scale(0.914)`, z: 20, opacity: 0.74, shadow: sh }
  if (pos === 3) return { transform: `translateX(calc(-50% + 42px)) translateY(30px) scale(0.878)`, z: 10, opacity: 0.52, shadow: 'none' }
  // Précédente : sortie propre vers la gauche (invisible).
  return { transform: `translateX(calc(-155% + ${Math.max(0, drag)}px))`, z: 5, opacity: 0, shadow: 'none' }
}

function Card({ p, pos, drag, onOpen }: { p: CoachProgram; pos: number; drag: number; onOpen?: () => void }) {
  const sport = sportOf(p)
  const sessions = p.structure.reduce((s, w) => s + w.sessions.length, 0)
  const hours = programHours(p.structure)
  const { transform, z, opacity, shadow } = placeCard(pos, drag)
  const isTop = pos === 0
  return (
    <div onClick={isTop ? onOpen : undefined}
      style={{
        position: 'absolute', top: 0, left: '50%', width: '84%', height: '100%', zIndex: z, opacity,
        borderRadius: 24, background: cardBg(sport), color: 'white', boxShadow: shadow, overflow: 'hidden',
        padding: 'clamp(16px, 4.5vw, 22px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        transform, transformOrigin: 'center', transition: 'transform 440ms cubic-bezier(0.34,1.3,0.5,1), opacity 260ms, box-shadow 260ms',
        cursor: isTop ? 'pointer' : 'default', pointerEvents: isTop ? 'auto' : 'none',
      }}>
      {/* Reflet unique, DISCRET (plus « verre » chargé) : léger éclairage en haut. */}
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%)', pointerEvents: 'none' }} />

      {/* Haut : durée · séances · volume (heures) + glyphe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', gap: 10 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Stat label="Durée" value={`${p.duration_weeks} sem`} />
          <Stat label="Séances" value={String(sessions)} />
          <Stat label="Volume" value={`${hours} h`} />
        </div>
        <SportGlyph sport={sport} />
      </div>

      {/* Contenu : chips + titre + résumé — collé sous les stats (pas de grand vide). */}
      <div style={{ position: 'relative', marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.92 }}>{SPORT_LABEL[sport] ?? sport}</span>
          {p.specialty && <Pill>{p.specialty}</Pill>}
          {p.level && <Pill>{LEVEL_LABEL[p.level]}</Pill>}
          {p.ai_enabled && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.20)' }}>IA</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5.2vw, 26px)', fontWeight: 600, lineHeight: 1.12, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.title}</div>
        {p.description && <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.description}</div>}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bas : prix */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 15, fontWeight: 800, background: 'rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{priceStr(p)}</span>
      </div>
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontSize: 10.5, opacity: 0.82, fontWeight: 600 }}>{label}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div></div>
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.20)' }}>{children}</span>
}

// ── Une pile (carrousel) pour UN sport ──
function Stack({ list, onOpen, height }: { list: CoachProgram[]; onOpen: (p: CoachProgram) => void; height: string }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const moved = useRef(false)
  const n = list.length
  const cur = Math.min(index, Math.max(0, n - 1))
  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i))
  const go = (d: number) => { const ni = clamp(cur + d); if (ni !== cur) haptic('light'); setIndex(ni); setDrag(0) }

  const onDown = (e: React.PointerEvent) => { if (n < 2) return; dragging.current = true; startX.current = e.clientX; moved.current = false; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - startX.current; if (Math.abs(dx) > 5) moved.current = true; setDrag(dx) }
  const onUp = () => { if (!dragging.current) return; dragging.current = false; const dx = drag; setDrag(0); const th = 55; if (dx < -th) go(1); else if (dx > th) go(-1) }

  if (!n) return null
  // Ordre de rendu : précédente (-1) et suivantes (1,2,3) derrière, active (0) devant.
  const order = [3, 2, 1, -1, 0].filter(pos => cur + pos >= 0 && cur + pos < n)

  return (
    <div>
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ position: 'relative', height, touchAction: 'pan-y', userSelect: 'none' }}>
        {order.map(pos => {
          const p = list[cur + pos]
          return <Card key={p.id} p={p} pos={pos} drag={drag} onOpen={pos === 0 ? () => { if (!moved.current) onOpen(p) } : undefined} />
        })}
        {n > 1 && (
          <>
            <button className="pd-arrow" aria-label="Précédent" onClick={() => go(-1)} disabled={cur === 0} style={{ ...arrow, left: -12, opacity: cur === 0 ? 0.35 : 1 }}><IconChevronLeft size={18} /></button>
            <button className="pd-arrow" aria-label="Suivant" onClick={() => go(1)} disabled={cur >= n - 1} style={{ ...arrow, right: -12, opacity: cur >= n - 1 ? 0.35 : 1 }}><IconChevronRight size={18} /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 12 }}>
          {list.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Programme ${i + 1}`}
              style={{ width: i === cur ? 16 : 6, height: 6, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: i === cur ? 'var(--text)' : 'var(--border-mid)', transition: 'width 200ms, background 200ms' }} />
          ))}
        </div>
      )}
    </div>
  )
}

const STYLE = `
  @keyframes pdSheen { 0% { transform: translateX(-170%) skewX(-12deg); } 60%,100% { transform: translateX(330%) skewX(-12deg); } }
  .pd-sheen { animation: pdSheen 5.5s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .pd-sheen { animation: none; } }
  .pd-arrow { display: none; }
  @media (hover: hover) and (min-width: 720px) { .pd-arrow { display: flex; } }
`

function SportCircle({ sport, on, onClick }: { sport: string; on: boolean; onClick: () => void }) {
  const Icon = SPORT_GLYPH[sport] ?? IconRun
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0, fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 58, height: 58, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? sportVar(sport) : 'var(--bg-card2)', boxShadow: on ? '0 8px 20px rgba(0,0,0,0.20)' : 'none', transition: 'background 180ms, box-shadow 180ms' }}>
        <Icon size={26} color={on ? 'white' : 'var(--text-mid)'} stroke={2} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: on ? 700 : 600, color: on ? 'var(--text)' : 'var(--text-dim)' }}>{SPORT_LABEL[sport] ?? sport}</span>
    </button>
  )
}
function SpecPill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 999, border: on ? '2px solid var(--primary)' : '2px solid var(--border)', background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-mid)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-body)' }}>{label}</button>
}

export default function ProgramDeck({ programs, onOpen }: { programs: CoachProgram[]; onOpen: (p: CoachProgram) => void }) {
  const narrow = useNarrow()
  const [selSport, setSelSport] = useState<string | null>(null)
  const [selSpec, setSelSpec] = useState<string>('')

  const map = new Map<string, CoachProgram[]>()
  for (const p of programs) { const s = sportOf(p); const arr = map.get(s) ?? []; arr.push(p); map.set(s, arr) }
  const groups = Array.from(map.entries()).sort((a, b) => (SPORT_LABEL[a[0]] ?? a[0]).localeCompare(SPORT_LABEL[b[0]] ?? b[0]))
  const sportKeys = groups.map(g => g[0])
  const activeSport = selSport && sportKeys.includes(selSport) ? selSport : (sportKeys[0] ?? null)

  if (!programs.length || !activeSport) return null

  // ── Mobile : cercles de sport → cercles de spécialité → une pile ──
  if (narrow) {
    const list0 = groups.find(g => g[0] === activeSport)?.[1] ?? []
    const specialties = Array.from(new Set(list0.filter(p => p.specialty).map(p => p.specialty as string)))
    const list = selSpec ? list0.filter(p => p.specialty === selSpec) : list0
    return (
      <div>
        <style>{STYLE}</style>
        {/* Cercles de sport */}
        {sportKeys.length > 1 && (
          <div style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
            {sportKeys.map(s => <SportCircle key={s} sport={s} on={s === activeSport} onClick={() => { setSelSport(s); setSelSpec('') }} />)}
          </div>
        )}
        {/* Cercles de spécialité du sport choisi */}
        {specialties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
            <SpecPill label="Tous" on={selSpec === ''} onClick={() => setSelSpec('')} />
            {specialties.map(s => <SpecPill key={s} label={s} on={selSpec === s} onClick={() => setSelSpec(s)} />)}
          </div>
        )}
        {/* Pile — glisse vers la gauche à chaque changement de sport/spécialité */}
        <div style={{ overflowX: 'clip' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${activeSport}|${selSpec}`}
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}>
              <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
                {list.length > 0
                  ? <Stack list={list} onOpen={onOpen} height="clamp(330px, 78vw, 400px)" />
                  : <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 30 }}>Aucun programme.</p>}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ── Desktop : toutes les piles côte à côte, une par sport ──
  return (
    <div>
      <style>{STYLE}</style>
      {/* Rangée des piles (une par sport). overflow VISIBLE + padding vertical :
          les cartes qui dépassent (côtés, rotation) ne sont JAMAIS coupées.
          On enveloppe (wrap) au lieu de scroller pour ne pas rogner en hauteur. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(48px, 6vw, 96px)', rowGap: 40, overflow: 'visible', padding: '14px 0 28px', alignItems: 'flex-start' }}>
        {groups.map(([sport, list]) => (
          <div key={sport} style={{ flex: '0 0 clamp(230px, 26%, 290px)', minWidth: 230, overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, margin: '0 4px 14px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{SPORT_LABEL[sport] ?? sport}</span>
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>{list.length}</span>
            </div>
            <Stack list={list} onOpen={onOpen} height="320px" />
          </div>
        ))}
      </div>
    </div>
  )
}

const arrow: React.CSSProperties = {
  position: 'absolute', top: '46%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer', zIndex: 50,
  background: 'var(--bg-card)', color: 'var(--text)', boxShadow: '0 4px 14px rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center', padding: 0,
}
