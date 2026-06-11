'use client'
// Picker de types (B2). mode 'multi' (focus) ou 'single' (séance). Mobile = bottom sheet
// (createPortal), desktop = panel ancré. Ajout de type custom persisté. Tokens uniquement.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { typesFor, addCustomType, type BlockSport } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.6)' // design-allow-color — voile bottom sheet

export function TypePicker({ sport, mode, selected, onToggle, onPick, onClose, onAddType }: {
  sport: BlockSport
  mode: 'multi' | 'single'
  selected: string[]
  onToggle?: (t: string) => void
  onPick?: (t: string) => void
  onClose: () => void
  onAddType?: () => void
}) {
  const [, force] = useState(0)
  const [draft, setDraft] = useState('')
  const types = typesFor(sport)

  function add() {
    const t = draft.trim(); if (!t) return
    addCustomType(sport, t); setDraft(''); force(n => n + 1); onAddType?.()
  }
  function choose(t: string) {
    if (mode === 'single') { onPick?.(t); onClose() } else onToggle?.(t)
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="rec-drawer" style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{mode === 'multi' ? 'Focus du bloc' : 'Type de séance'}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {types.map(t => {
            const on = selected.includes(t)
            return (
              <button key={t} onClick={() => choose(t)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: on ? 600 : 500, background: on ? 'var(--primary-dim)' : 'var(--bg-card2)', color: on ? 'var(--primary)' : 'var(--text-mid)' }}>
                {mode === 'multi' && <span style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, background: on ? 'var(--primary)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-mid)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)', fontSize: 10 }}>{on ? '✓' : ''}</span>}
                {t}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <input className="rec-drawer" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="Nouveau type…"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13, outline: 'none' }} />
          <button onClick={add} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--bg-elev)', color: 'var(--text)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
          {mode === 'multi' && <button onClick={onClose} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Valider</button>}
        </div>
      </div>
    </div>,
    document.body
  )
}
