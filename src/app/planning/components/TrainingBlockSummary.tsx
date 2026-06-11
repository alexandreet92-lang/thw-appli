'use client'
// Résumé « Training Bloc » (maquette) : carte bordée, une ligne par sport avec bloc actif
// (point sport, nom 90px, chips qualités, N séances, S{cur}/{tot}, chevron ›). État vide
// « Aucun bloc actif · + Créer un bloc » → choix du sport puis détail. Tokens uniquement.
import { useState } from 'react'
import { TrainingBlockDetail } from './TrainingBlockDetail'
import { loadBlocks, BLOCK_SPORTS, SPORT_LABEL, SPORT_COLOR, type BlockSport } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function TrainingBlockSummary() {
  const [blocks, setBlocks] = useState(() => loadBlocks())
  const [open, setOpen] = useState<BlockSport | null>(null)
  const [creating, setCreating] = useState(false)
  const reload = () => setBlocks(loadBlocks())
  const active = BLOCK_SPORTS.filter(s => blocks[s.id])

  return (
    <section>
      <h2 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>Training Bloc</h2>
      <div style={{ borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {active.map((s, i) => {
          const b = blocks[s.id]!
          return (
            <div key={s.id} onClick={() => setOpen(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < active.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLOR[s.id], flexShrink: 0 }} />
              <span style={{ width: 90, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', flexShrink: 0, fontFamily: FB }}>{SPORT_LABEL[s.id]}</span>
              <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                {b.focus.map(q => (
                  <span key={q} style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: '4px 10px', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: FB }}>{q}</span>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', fontFamily: FB }}><strong className="tnum" style={{ color: 'var(--text)' }}>{b.sessions.length}</strong> séances</span>
              <span className="tnum" style={{ fontSize: 11, color: 'var(--text-dim)', width: 40, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FB }}>S<strong style={{ color: 'var(--text-mid)' }}>{b.weekCurrent}</strong>/{b.weekTotal}</span>
              <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>›</span>
            </div>
          )
        })}

        {active.length === 0 && !creating && (
          <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13, fontFamily: FB }}>
            Aucun bloc actif · <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setCreating(true)}>+ Créer un bloc</span>
          </div>
        )}
        {active.length === 0 && creating && (
          <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BLOCK_SPORTS.map(s => (
              <button key={s.id} onClick={() => setOpen(s.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 500, color: 'var(--text-mid)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && <TrainingBlockDetail sport={open} onClose={() => { setOpen(null); setCreating(false); reload() }} onSaved={reload} />}
    </section>
  )
}
