'use client'
// Training Bloc — vue détail (B1, createPortal). Pips semaine + stepper, focus multi-select
// (chips supprimables + « + type »), stepper nb séances → N lignes, type par séance (single).
// Persistance localStorage via saveBlock. Tokens uniquement.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TypePicker } from './TypePicker'
import { loadBlocks, saveBlock, emptyBlock, SPORT_LABEL, SPORT_COLOR, type BlockSport, type SportBlock } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.6)' // design-allow-color — voile modal

type Picker = { kind: 'focus' } | { kind: 'session'; index: number } | null

const stepBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }

export function TrainingBlockDetail({ sport, onClose, onSaved }: { sport: BlockSport; onClose: () => void; onSaved?: () => void }) {
  const [block, setBlock] = useState<SportBlock>(() => loadBlocks()[sport] ?? emptyBlock(sport))
  const [picker, setPicker] = useState<Picker>(null)

  function update(b: SportBlock) { setBlock(b); saveBlock(b); onSaved?.() }
  function setSessions(n: number) {
    const count = Math.max(0, Math.min(12, n))
    const s = block.sessions.slice(0, count)
    while (s.length < count) s.push(null)
    update({ ...block, sessions: s })
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3100, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SPORT_COLOR[sport] }} />
            <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Bloc {SPORT_LABEL[sport]}</h2>
          </span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 28px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Semaine du bloc */}
          <div>
            <p style={lbl}>Semaine du bloc</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {Array.from({ length: block.weekTotal }, (_, i) => (
                  <button key={i} onClick={() => update({ ...block, weekCurrent: i + 1 })} aria-label={`Semaine ${i + 1}`}
                    style={{ width: 18, height: 5, borderRadius: 5, border: 'none', cursor: 'pointer', background: i < block.weekCurrent ? 'var(--primary)' : 'var(--bg-card2)' }} />
                ))}
              </div>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>S{block.weekCurrent}/{block.weekTotal}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>Total</span>
                <button style={stepBtn} onClick={() => update({ ...block, weekTotal: Math.max(1, block.weekTotal - 1), weekCurrent: Math.min(block.weekCurrent, Math.max(1, block.weekTotal - 1)) })}>−</button>
                <button style={stepBtn} onClick={() => update({ ...block, weekTotal: Math.min(16, block.weekTotal + 1) })}>+</button>
              </span>
            </div>
          </div>

          {/* Focus */}
          <div>
            <p style={lbl}>Focus du bloc</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {block.focus.map(f => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--bg-card2)', fontFamily: FB, fontSize: 12, color: 'var(--text)' }}>
                  {f}
                  <button onClick={() => update({ ...block, focus: block.focus.filter(x => x !== f) })} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <button onClick={() => setPicker({ kind: 'focus' })} style={{ padding: '6px 12px', borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ type</button>
            </div>
          </div>

          {/* Séances */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ ...lbl, margin: 0 }}>Entraînements prévus</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button style={stepBtn} onClick={() => setSessions(block.sessions.length - 1)}>−</button>
                <span className="tnum" style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 16, textAlign: 'center' }}>{block.sessions.length}</span>
                <button style={stepBtn} onClick={() => setSessions(block.sessions.length + 1)}>+</button>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {block.sessions.map((t, i) => (
                <button key={i} onClick={() => setPicker({ kind: 'session', index: i })}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', textAlign: 'left' }}>
                  <span className="tnum" style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', width: 16 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: FB, fontSize: 13, fontWeight: t ? 600 : 500, color: t ? 'var(--text)' : 'var(--text-dim)' }}>{t ?? 'Choisir un type'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {picker?.kind === 'focus' && (
          <TypePicker sport={sport} mode="multi" selected={block.focus}
            onToggle={t => update({ ...block, focus: block.focus.includes(t) ? block.focus.filter(x => x !== t) : [...block.focus, t] })}
            onClose={() => setPicker(null)} />
        )}
        {picker?.kind === 'session' && (
          <TypePicker sport={sport} mode="single" selected={block.sessions[picker.index] ? [block.sessions[picker.index] as string] : []}
            onPick={t => update({ ...block, sessions: block.sessions.map((s, j) => j === picker.index ? t : s) })}
            onClose={() => setPicker(null)} />
        )}
      </div>
    </div>,
    document.body
  )
}
