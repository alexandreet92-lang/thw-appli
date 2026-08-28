'use client'
// Bottom-sheet « progression » : la séance complète regroupée par CIRCUIT / bloc,
// chaque tour clairement séparé, avec l'état de chaque pas (fait / en cours / à venir).
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import type { WorkoutExercise } from '@/types/workout'
import type { TimelineStep } from './types'

interface Props { blocks: WorkoutExercise[]; timeline: TimelineStep[]; stepIdx: number; onClose: () => void }
type TFn = (key: string, vars?: Record<string, string | number>) => string
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

type Tone = 'done' | 'now' | 'next'
interface Row { gi: number; tour: number; name: string; meta: string; tone: Tone }
interface TourGroup { tour: number; rows: Row[] }
interface BlockGroup { blockIdx: number; title: string; toursTotal: number; isCircuit: boolean; tours: TourGroup[] }

// Titres de blocs (Circuit N / nom de l'exo) alignés sur la structure réelle.
function blockTitles(blocks: WorkoutExercise[], t: TFn): { title: string; isCircuit: boolean }[] {
  let circuitN = 0
  return blocks.map(b => {
    const isCircuit = b.mode === 'circuit'
    if (isCircuit) circuitN++
    return { isCircuit, title: isCircuit ? `${t('w3a.circuit')} ${circuitN}` : cap(b.name) }
  })
}

function build(blocks: WorkoutExercise[], timeline: TimelineStep[], stepIdx: number, t: TFn): BlockGroup[] {
  const titles = blockTitles(blocks, t)
  const out: BlockGroup[] = []
  timeline.forEach((s, gi) => {
    if (s.kind !== 'effort') return
    const meta = s.ex.nature === 'temps' ? `${s.ex.durationSec}s` : `${s.ex.targetReps} ${t('w3a.reps')}`
    const tone: Tone = gi < stepIdx ? 'done' : gi === stepIdx ? 'now' : 'next'
    let bg = out.find(b => b.blockIdx === s.blockIdx)
    if (!bg) {
      const info = titles[s.blockIdx] ?? { title: cap(s.ex.name), isCircuit: s.exosInTour > 1 }
      bg = { blockIdx: s.blockIdx, title: info.title, toursTotal: s.toursInBlock, isCircuit: info.isCircuit || s.exosInTour > 1, tours: [] }
      out.push(bg)
    }
    let tg = bg.tours.find(x => x.tour === s.tourInBlock)
    if (!tg) { tg = { tour: s.tourInBlock, rows: [] }; bg.tours.push(tg) }
    tg.rows.push({ gi, tour: s.tourInBlock, name: cap(s.ex.name), meta, tone })
  })
  return out
}

function ToneDot({ tone }: { tone: Tone }) {
  const bg = tone === 'done' ? 'var(--charge-low)' : tone === 'now' ? 'var(--primary)' : 'var(--text-dim)'
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: bg, flexShrink: 0, boxShadow: tone === 'now' ? '0 0 8px var(--primary)' : 'none' }} />
}

export default function ProgressSheet({ blocks, timeline, stepIdx, onClose }: Props) {
  const { t } = useI18n()
  const groups = useMemo(() => build(blocks, timeline, stepIdx, t), [blocks, timeline, stepIdx, t])
  const nowRef = useRef<HTMLDivElement | null>(null)

  // Amener le pas en cours dans le champ de vision à l'ouverture.
  useEffect(() => { nowRef.current?.scrollIntoView({ block: 'center' }) }, [])

  const legendDot = (tone: Tone, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <ToneDot tone={tone} /><span style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700 }}>{label}</span>
    </span>
  )

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxHeight: '82%', background: 'var(--bg-card)', borderRadius: '28px 28px 0 0', borderTop: '1px solid var(--border-mid)', fontFamily: 'DM Sans, sans-serif' }}>
        {/* En-tête figé : titre + légende */}
        <div style={{ flexShrink: 0, padding: '14px 18px 10px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text)', fontWeight: 800 }}>{t('w4a.progress_full_session')}</span>
            <span style={{ display: 'inline-flex', gap: 12 }}>
              {legendDot('done', t('w4a.progress_done'))}{legendDot('now', t('w4a.progress_current'))}{legendDot('next', t('w4a.progress_upcoming'))}
            </span>
          </div>
        </div>

        {/* Corps scrollable : un bloc = une carte, tours séparés */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px 16px 8px' }}>
          {groups.map(bg => {
            const multiTour = bg.tours.length > 1
            return (
              <div key={bg.blockIdx} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: multiTour ? 6 : 8 }}>
                  <span style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>{bg.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700 }}>{bg.toursTotal} {bg.toursTotal > 1 ? t('w3a.tours_plural') : t('w3a.tour_singular')}</span>
                </div>
                {bg.tours.map(tg => (
                  <div key={tg.tour}>
                    {(multiTour || bg.isCircuit) && (
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, margin: '8px 0 2px' }}>
                        {cap(t('w3a.tour_singular'))} {tg.tour}
                      </div>
                    )}
                    {tg.rows.map(r => (
                      <div key={r.gi} ref={r.tone === 'now' ? nowRef : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 6px', borderRadius: 10, background: r.tone === 'now' ? 'var(--primary-dim)' : 'transparent' }}>
                        <ToneDot tone={r.tone} />
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: r.tone === 'done' ? 'var(--text-dim)' : r.tone === 'next' ? 'var(--text-mid)' : 'var(--text)', textDecoration: r.tone === 'done' ? 'line-through' : 'none' }}>{r.name}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>{r.meta}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
          {!groups.length && <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '24px 0' }}>—</p>}
        </div>

        {/* Pied figé */}
        <div style={{ flexShrink: 0, padding: '10px 18px calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer' }}>{t('w4a.close')}</button>
        </div>
      </div>
    </div>
  )
}
