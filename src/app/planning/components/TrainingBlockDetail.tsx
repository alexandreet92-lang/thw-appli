'use client'
// Surpage Training Bloc (maquette) : overlay centré zoom (scale .92→1), onglets sport,
// pips 20×6, focus multi-select (chips + ✕), stepper, dropdown type par séance, Enregistrer.
// Persistance localStorage. createPortal. Tokens + var(--primary) pour le cyan.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TypePicker } from './TypePicker'
import { loadBlocks, saveBlock, emptyBlock, SPORT_LABEL, SPORT_COLOR, type BlockSport, type SportBlock } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.30)' // design-allow-color — voile overlay
type Picker = { kind: 'focus' } | { kind: 'session'; index: number } | null
const secLbl: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-dim)', fontFamily: FB }
const step: React.CSSProperties = { width: 30, height: 28, border: 'none', background: 'transparent', fontSize: 16, color: 'var(--text)', cursor: 'pointer' }

export function TrainingBlockDetail({ sport, activeSports, onClose, onSaved }: { sport: BlockSport; activeSports: BlockSport[]; onClose: () => void; onSaved?: () => void }) {
  const tabs = activeSports.includes(sport) ? activeSports : [sport, ...activeSports]
  const [cur, setCur] = useState<BlockSport>(sport)
  const [block, setBlock] = useState<SportBlock>(() => loadBlocks()[sport] ?? emptyBlock(sport))
  const [picker, setPicker] = useState<Picker>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), 10); return () => clearTimeout(t) }, [])

  function pickSport(s: BlockSport) { setCur(s); setBlock(loadBlocks()[s] ?? emptyBlock(s)); setPicker(null) }
  function update(b: SportBlock) { setBlock(b); saveBlock(b); onSaved?.() }
  function setCount(n: number) { const c = Math.max(0, Math.min(12, n)); const s = block.sessions.slice(0, c); while (s.length < c) s.push(null); update({ ...block, sessions: s }) }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: SCRIM, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3100, opacity: shown ? 1 : 0, transition: 'opacity .25s', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 22, width: 'min(620px, 94vw)', maxHeight: '88vh', overflowY: 'auto', padding: '24px 26px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)', transform: shown ? 'scale(1)' : 'scale(0.92)', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 20, color: 'var(--text)' }}>Training Bloc</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-mid)' }}>×</button>
        </div>

        {/* Onglets sport */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card2)', borderRadius: 12, padding: 4, marginBottom: 22 }}>
          {tabs.map(s => (
            <button key={s} onClick={() => pickSport(s)}
              style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: FB, transition: 'all .15s',
                background: cur === s ? 'var(--bg-card)' : 'transparent', color: cur === s ? 'var(--text)' : 'var(--text-dim)', boxShadow: cur === s ? 'var(--shadow-card)' : 'none' }}>{SPORT_LABEL[s]}</button>
          ))}
        </div>

        {/* En-tête sport + pips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: SPORT_COLOR[cur] }} />
            <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 17, color: 'var(--text)' }}>{SPORT_LABEL[cur]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => update({ ...block, weekTotal: Math.max(1, block.weekTotal - 1), weekCurrent: Math.min(block.weekCurrent, Math.max(1, block.weekTotal - 1)) })} style={{ ...step, width: 24, height: 22, fontSize: 14, borderRadius: 6, background: 'var(--bg-card2)' }}>−</button>
            {Array.from({ length: block.weekTotal }, (_, i) => (
              <button key={i} onClick={() => update({ ...block, weekCurrent: i + 1 })} aria-label={`S${i + 1}`} style={{ width: 20, height: 6, borderRadius: 6, border: 'none', cursor: 'pointer', background: i < block.weekCurrent ? 'var(--primary)' : 'var(--bg-card2)' }} />
            ))}
            <button onClick={() => update({ ...block, weekTotal: Math.min(16, block.weekTotal + 1) })} style={{ ...step, width: 24, height: 22, fontSize: 14, borderRadius: 6, background: 'var(--bg-card2)' }}>+</button>
            <span className="tnum" style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4, fontFamily: FB }}>S<strong style={{ color: 'var(--text)' }}>{block.weekCurrent}</strong>/{block.weekTotal}</span>
          </div>
        </div>

        {/* Durée du bloc */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={secLbl}>Durée du bloc</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card2)', borderRadius: 999 }}>
            <button onClick={() => update({ ...block, weekTotal: Math.max(1, block.weekTotal - 1), weekCurrent: Math.min(block.weekCurrent, Math.max(1, block.weekTotal - 1)) })} style={step}>−</button>
            <span className="tnum" style={{ minWidth: 56, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: FB }}>{block.weekTotal} sem.</span>
            <button onClick={() => update({ ...block, weekTotal: Math.min(16, block.weekTotal + 1) })} style={step}>+</button>
          </div>
        </div>

        {/* Focus */}
        <div style={{ ...secLbl, marginBottom: 9 }}>Focus du bloc</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>
          {block.focus.map(q => (
            <span key={q} style={{ fontSize: 13, fontWeight: 600, borderRadius: 999, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB }}>
              {q}<span onClick={() => update({ ...block, focus: block.focus.filter(x => x !== q) })} style={{ opacity: .6, cursor: 'pointer', fontSize: 11 }}>✕</span>
            </span>
          ))}
          <span onClick={() => setPicker({ kind: 'focus' })} style={{ fontSize: 13, fontWeight: 600, borderRadius: 999, padding: '7px 14px', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: FB }}>+ type</span>
        </div>

        {/* Entraînements */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={secLbl}>Entraînements prévus</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card2)', borderRadius: 999 }}>
            <button onClick={() => setCount(block.sessions.length - 1)} style={step}>−</button>
            <span className="tnum" style={{ minWidth: 26, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{block.sessions.length}</span>
            <button onClick={() => setCount(block.sessions.length + 1)} style={step}>+</button>
          </div>
        </div>
        {block.sessions.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="tnum" style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>{i + 1}</span>
            <div onClick={() => setPicker({ kind: 'session', index: i })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card2)', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: s ? 'var(--text)' : 'var(--text-dim)', fontFamily: FB }}>{s ?? 'Choisir un type'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>▾</span>
            </div>
          </div>
        ))}

        <button onClick={onClose} style={{ marginTop: 20, width: '100%', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>Enregistrer</button>

        {picker?.kind === 'focus' && (
          <TypePicker sport={cur} mode="multi" selected={block.focus}
            onToggle={t => update({ ...block, focus: block.focus.includes(t) ? block.focus.filter(x => x !== t) : [...block.focus, t] })}
            onClose={() => setPicker(null)} />
        )}
        {picker?.kind === 'session' && (
          <TypePicker sport={cur} mode="single" selected={block.sessions[picker.index] ? [block.sessions[picker.index] as string] : []}
            onPick={t => update({ ...block, sessions: block.sessions.map((x, j) => j === picker.index ? t : x) })}
            onClose={() => setPicker(null)} />
        )}
      </div>
    </div>,
    document.body
  )
}
