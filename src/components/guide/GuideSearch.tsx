'use client'
// Palette de recherche du guide (type ⌘K). Suggestions + champ libre :
// matching flou LOCAL instantané, repli IA si aucune correspondance nette.
// Choisir un résultat lance le guide pas-à-pas.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GUIDE_ACTIONS, searchActions, EXPRESS_TOUR, FULL_TOUR, type GuideStep } from './guideRegistry'

export function GuideSearch({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (steps: GuideStep[]) => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 60) } }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => (q.trim() ? searchActions(q) : GUIDE_ACTIONS), [q])
  const noMatch = q.trim().length > 0 && results.length === 0

  function askAi() {
    onClose()
    window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt: `Je veux : « ${q} ». Où dois-je appuyer dans l'app pour ça ? Guide-moi étape par étape.` } }))
  }

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99000, background: 'rgba(8,10,14,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px 16px', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* Champ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Que veux-tu faire ? (ex. « créer une séance de fractionné »)"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>Échap</kbd>
        </div>

        {/* Résultats */}
        <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
          {results.map(a => (
            <button key={a.id} onClick={() => onPick(a.steps)} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)' }}>{a.category}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          ))}

          {noMatch && (
            <button onClick={askAi} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Demander à l'assistant : « {q} »</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)' }}>L'IA t'explique où appuyer</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          )}
        </div>

        {/* Pied : relancer une visite guidée */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)', alignSelf: 'center', flex: 1 }}>Visite guidée</span>
          <button onClick={() => onPick(EXPRESS_TOUR)} style={tourBtn}>Express</button>
          <button onClick={() => onPick(FULL_TOUR)} style={tourBtn}>Complète</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }
const tourBtn: React.CSSProperties = { padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
