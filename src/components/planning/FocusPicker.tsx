'use client'
// Picker de types — fenêtre CENTRÉE (scale .9→1). Deux modes :
//  • multi  : focus du bloc (cases à cocher, ajout custom, Valider).
//  • single : type d'une séance (sélection unique → ferme).
// createPortal sur document.body. Reste centré même sur mobile (s'ouvre par-dessus la surpage).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SPORT_LABELS } from '@/lib/constants/blocTypes'
import { typesFor, addCustomType } from '@/app/planning/trainingBlocks'
import { useI18n } from '@/lib/i18n'

const C_TEXT = 'var(--text)', C_CYAN = '#22d3ee', C_ON = '#04141a' // cyan/on-cyan = couleurs fonctionnelles assumées

export function FocusPicker({ open, sport, mode = 'multi', selected, onToggle, onPick, onClose }: {
  open: boolean; sport: string; mode?: 'multi' | 'single'; selected: string[]
  onToggle?: (t: string) => void; onPick?: (t: string) => void; onClose: () => void
}) {
  const { t: tr } = useI18n()
  const [shown, setShown] = useState(false)
  const [newType, setNewType] = useState('')
  const [types, setTypes] = useState<string[]>(() => typesFor(sport))
  useEffect(() => { setTypes(typesFor(sport)) }, [sport, open])
  useEffect(() => { const t = setTimeout(() => setShown(open), 10); return () => clearTimeout(t) }, [open])
  if (!open) return null

  function choose(t: string) { if (mode === 'single') { onPick?.(t); onClose() } else onToggle?.(t) }
  function add() {
    const t = newType.trim(); if (!t) return
    addCustomType(sport, t); setTypes(typesFor(sport)); setNewType(''); choose(t)
  }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, opacity: shown ? 1 : 0, transition: 'opacity .2s', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: 'min(380px,92vw)', maxHeight: '70vh', overflowY: 'auto', padding: 20, border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,.6)', transform: shown ? 'scale(1)' : 'scale(0.9)', transition: 'transform .25s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C_TEXT }}>{mode === 'single' ? tr('planning.sessionType') : tr('planning.focus')} — {SPORT_LABELS[sport]}</span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-mid)' }}>✕</button>
        </div>

        {types.map(type => {
          const on = selected.includes(type)
          return (
            <div key={type} onClick={() => choose(type)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 6px', borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(34,211,238,.06)' : 'transparent', transition: 'background .12s' }}>
              <span style={{ width: 18, height: 18, borderRadius: mode === 'single' ? '50%' : 5, flexShrink: 0, border: on ? 'none' : '1.5px solid var(--border-mid)', background: on ? C_CYAN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_ON, fontSize: 11 }}>{on ? '✓' : ''}</span>
              <span style={{ fontSize: 13, color: C_TEXT }}>{type}</span>
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
          <input value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={tr('planning.newTypePlaceholder')}
            style={{ flex: 1, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: C_TEXT, fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={add} style={{ background: 'rgba(34,211,238,.15)', color: C_CYAN, border: 'none', borderRadius: 8, padding: '0 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{tr('planning.add')}</button>
        </div>
        {mode === 'multi' && (
          <button onClick={onClose} style={{ marginTop: 12, width: '100%', background: C_CYAN, color: C_ON, border: 'none', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tr('planning.validate')}</button>
        )}
      </div>
    </div>,
    document.body
  )
}
