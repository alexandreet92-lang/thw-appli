'use client'
// Vue « Training Bloc » : une colonne par sport, carousel horizontal (flèches ← → si les
// colonnes dépassent la largeur, masquées sinon). Tokens de thème.
import { useEffect, useRef, useState } from 'react'
import { BLOC_SPORT_KEYS } from '@/lib/constants/blocTypes'
import type { TrainingBlocData } from '@/types/trainingBloc'
import { SportColumn } from './SportColumn'

const COL_W = 290 // 280px colonne + 10px gap

const arrow = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute', [side]: -17, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
  width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)',
  cursor: 'pointer', fontSize: 13, color: 'var(--text-mid)', boxShadow: 'var(--shadow-card)',
})

export function BlocSummaryView({ blocs, onOpen, onCreate }: {
  blocs: TrainingBlocData[]; onOpen: (id: string) => void; onCreate: (sport: string) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [vw, setVw] = useState(0)
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const f = () => setVw(viewportRef.current?.clientWidth ?? 0); f()
    window.addEventListener('resize', f); return () => window.removeEventListener('resize', f)
  }, [])

  const maxOffset = Math.max(0, BLOC_SPORT_KEYS.length * COL_W - vw)
  const clamped = Math.min(offset, maxOffset)
  const slide = (dir: 1 | -1) => setOffset(p => Math.max(0, Math.min(maxOffset, p + dir * COL_W)))

  return (
    <div style={{ position: 'relative', marginBottom: 22 }}>
      {clamped > 0 && <button onClick={() => slide(-1)} style={arrow('left')}>←</button>}
      <div ref={viewportRef} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 10, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)', transform: `translateX(-${clamped}px)` }}>
          {BLOC_SPORT_KEYS.map(s => (
            <SportColumn key={s} sport={s} blocs={blocs.filter(b => b.sport === s)} onOpen={onOpen} onCreate={onCreate} />
          ))}
        </div>
      </div>
      {clamped < maxOffset && <button onClick={() => slide(1)} style={arrow('right')}>→</button>}
    </div>
  )
}
