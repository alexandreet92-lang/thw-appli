'use client'
// Training Bloc — détail (maquette, createPortal). Header (nom + pips 18×5 « Semaine cur/tot »),
// focus multi-select (chips --primary-dim + ✕), entraînements (stepper pilule, lignes
// numérotées + dropdown ▾ → picker single). Persistance localStorage. Tokens uniquement.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TypePicker } from './TypePicker'
import { loadBlocks, saveBlock, emptyBlock, SPORT_LABEL, SPORT_COLOR, type BlockSport, type SportBlock } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.6)' // design-allow-color — voile modal
type Picker = { kind: 'focus' } | { kind: 'session'; index: number } | null
const secLbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: 8, fontFamily: FB }

export function TrainingBlockDetail({ sport, onClose, onSaved }: { sport: BlockSport; onClose: () => void; onSaved?: () => void }) {
  const [block, setBlock] = useState<SportBlock>(() => loadBlocks()[sport] ?? emptyBlock(sport))
  const [picker, setPicker] = useState<Picker>(null)
  function update(b: SportBlock) { setBlock(b); saveBlock(b); onSaved?.() }
  function setCount(n: number) {
    const c = Math.max(0, Math.min(12, n)); const s = block.sessions.slice(0, c)
    while (s.length < c) s.push(null); update({ ...block, sessions: s })
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3100, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 28px' }}>
          {/* Header : nom + pips semaine */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLOR[sport] }} />
              <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 17, color: 'var(--text)' }}>{SPORT_LABEL[sport]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: FB }}>Semaine</span>
              <button onClick={() => update({ ...block, weekTotal: Math.max(1, block.weekTotal - 1), weekCurrent: Math.min(block.weekCurrent, Math.max(1, block.weekTotal - 1)) })} style={pillBtn}>−</button>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: block.weekTotal }, (_, i) => (
                  <button key={i} onClick={() => update({ ...block, weekCurrent: i + 1 })} aria-label={`S${i + 1}`}
                    style={{ width: 18, height: 5, borderRadius: 5, border: 'none', cursor: 'pointer', background: i < block.weekCurrent ? 'var(--primary)' : 'var(--bg-card2)' }} />
                ))}
              </div>
              <button onClick={() => update({ ...block, weekTotal: Math.min(16, block.weekTotal + 1) })} style={pillBtn}>+</button>
              <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: FB }}>{block.weekCurrent}/{block.weekTotal}</span>
            </div>
          </div>

          {/* Focus du bloc */}
          <div style={{ marginBottom: 18 }}>
            <div style={secLbl}>Focus du bloc</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {block.focus.map(q => (
                <span key={q} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 12px', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB }}>
                  {q}<span onClick={() => update({ ...block, focus: block.focus.filter(x => x !== q) })} style={{ opacity: 0.7, cursor: 'pointer' }}>✕</span>
                </span>
              ))}
              <span onClick={() => setPicker({ kind: 'focus' })} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 12px', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: FB }}>+ type</span>
            </div>
          </div>

          {/* Entraînements prévus */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...secLbl, marginBottom: 0 }}>Entraînements prévus</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card2)', borderRadius: 999, overflow: 'hidden' }}>
                <button onClick={() => setCount(block.sessions.length - 1)} style={{ width: 28, height: 26, border: 'none', background: 'transparent', fontSize: 15, color: 'var(--text)', cursor: 'pointer' }}>−</button>
                <span className="tnum" style={{ minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{block.sessions.length}</span>
                <button onClick={() => setCount(block.sessions.length + 1)} style={{ width: 28, height: 26, border: 'none', background: 'transparent', fontSize: 15, color: 'var(--text)', cursor: 'pointer' }}>+</button>
              </div>
            </div>
            {block.sessions.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="tnum" style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>{i + 1}</span>
                <div onClick={() => setPicker({ kind: 'session', index: i })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card2)', borderRadius: 9, padding: '9px 12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s ? 'var(--text)' : 'var(--text-dim)', fontFamily: FB }}>{s ?? 'Choisir un type'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>▾</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {picker?.kind === 'focus' && (
          <TypePicker sport={sport} mode="multi" selected={block.focus}
            onToggle={t => update({ ...block, focus: block.focus.includes(t) ? block.focus.filter(x => x !== t) : [...block.focus, t] })}
            onClose={() => setPicker(null)} />
        )}
        {picker?.kind === 'session' && (
          <TypePicker sport={sport} mode="single" selected={block.sessions[picker.index] ? [block.sessions[picker.index] as string] : []}
            onPick={t => update({ ...block, sessions: block.sessions.map((x, j) => j === picker.index ? t : x) })}
            onClose={() => setPicker(null)} />
        )}
      </div>
    </div>,
    document.body
  )
}

const pillBtn: React.CSSProperties = { width: 26, height: 24, borderRadius: 7, border: 'none', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }
