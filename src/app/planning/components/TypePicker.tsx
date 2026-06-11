'use client'
// Picker de types (maquette). mode 'multi' (focus) / 'single' (séance). Lignes case à
// cocher (carré 18 + ✓), ajout custom, « Valider la sélection » plein --primary.
// Mobile = bottom sheet createPortal ; desktop = panel. Tokens uniquement.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { typesFor, addCustomType, type BlockSport } from '../trainingBlocks'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.6)' // design-allow-color — voile bottom sheet

export function TypePicker({ sport, mode, selected, onToggle, onPick, onClose }: {
  sport: BlockSport
  mode: 'multi' | 'single'
  selected: string[]
  onToggle?: (t: string) => void
  onPick?: (t: string) => void
  onClose: () => void
}) {
  const [, force] = useState(0)
  const [newType, setNewType] = useState('')
  const types = typesFor(sport)

  function add() {
    const t = newType.trim(); if (!t) return
    addCustomType(sport, t); setNewType(''); force(n => n + 1)
  }
  function choose(t: string) {
    if (mode === 'single') { onPick?.(t); onClose() } else onToggle?.(t)
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="rec-drawer" style={{ width: '100%', maxWidth: 520, maxHeight: '82vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{mode === 'multi' ? 'Focus du bloc' : 'Type de séance'}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {types.map(t => {
            const on = selected.includes(t)
            return (
              <div key={t} onClick={() => choose(t)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px', borderRadius: 9, cursor: 'pointer', background: on ? 'var(--primary-dim)' : 'transparent' }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? 'none' : '1.5px solid var(--border-mid)', background: on ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)', fontSize: 11 }}>{on ? '✓' : ''}</span>
                <span style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text)' }}>{t}</span>
              </div>
            )
          })}
          {/* Ajouter un type custom */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, padding: '0 8px' }}>
            <input className="rec-drawer" value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="Nouveau type…"
              style={{ flex: 1, border: '1px solid var(--border-mid)', borderRadius: 9, padding: '9px 11px', fontSize: 13, fontFamily: FB, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={add} style={{ background: 'var(--primary-dim)', color: 'var(--primary)', border: 'none', borderRadius: 9, padding: '0 14px', fontWeight: 600, fontSize: 13, fontFamily: FB, cursor: 'pointer' }}>Ajouter</button>
          </div>
        </div>

        {mode === 'multi' && (
          <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} style={{ width: '100%', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: FB, cursor: 'pointer' }}>Valider la sélection</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
