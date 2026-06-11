'use client'
// A3 — résumé « Training Bloc » (carte par sport configuré). Qualités (chips), nb séances,
// S{n}/{total}, chevron → détail (B). État vide si aucun bloc. Tokens uniquement.
import { useState } from 'react'
import { TrainingBlockDetail } from './TrainingBlockDetail'
import { loadBlocks, BLOCK_SPORTS, SPORT_LABEL, SPORT_COLOR, type BlockSport } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function TrainingBlockSummary() {
  const [blocks, setBlocks] = useState(() => loadBlocks())
  const [open, setOpen] = useState<BlockSport | null>(null)
  const reload = () => setBlocks(loadBlocks())
  const active = BLOCK_SPORTS.filter(s => blocks[s.id])

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }

  return (
    <div style={card}>
      <h2 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 14px' }}>Training Bloc</h2>

      {active.length === 0 ? (
        <>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 12px' }}>Aucun bloc actif · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>+ Créer un bloc</span></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BLOCK_SPORTS.map(s => (
              <button key={s.id} onClick={() => setOpen(s.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 500, color: 'var(--text-mid)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {active.map(s => {
            const b = blocks[s.id]!
            const sessionsCount = b.sessions.length
            return (
              <button key={s.id} onClick={() => setOpen(s.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 8px', borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SPORT_COLOR[s.id], flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{SPORT_LABEL[s.id]}</span>
                    <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{sessionsCount} séance{sessionsCount > 1 ? 's' : ''}</span>
                    <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>S{b.weekCurrent}/{b.weekTotal}</span>
                  </div>
                  {b.focus.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {b.focus.map(f => (
                        <span key={f} style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--bg-card2)', fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6" /></svg>
              </button>
            )
          })}
        </div>
      )}

      {open && <TrainingBlockDetail sport={open} onClose={() => { setOpen(null); reload() }} onSaved={reload} />}
    </div>
  )
}
