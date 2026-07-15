'use client'
// Pavé numérique (bottom-sheet) pour saisir reps / charge d'un coup.
import { useState } from 'react'

interface Props { title: string; initial: number; onClose: () => void; onSubmit: (v: number) => void }

const key: React.CSSProperties = {
  height: 54, borderRadius: 15, background: 'var(--bg-card2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 22, fontWeight: 700, cursor: 'pointer',
}

export default function NumPadSheet({ title, initial, onClose, onSubmit }: Props) {
  const [buf, setBuf] = useState('')
  const shown = buf || String(initial)
  const press = (k: string) => {
    if (k === 'back') setBuf(b => b.slice(0, -1))
    else if (k === 'clear') setBuf('')
    else setBuf(b => (b + k).slice(0, 4))
  }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '28px 28px 0 0', padding: '18px 16px calc(env(safe-area-inset-bottom) + 20px)', borderTop: '1px solid var(--border-mid)' }}>
        <p style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 800, margin: 0 }}>{title}</p>
        <p style={{ textAlign: 'center', fontSize: 48, fontWeight: 800, color: 'var(--primary)', margin: '6px 0 14px', fontVariantNumeric: 'tabular-nums' }}>{shown}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => <button key={k} style={key} onClick={() => press(k)}>{k}</button>)}
          <button style={key} onClick={() => press('back')}>⌫</button>
          <button style={key} onClick={() => press('0')}>0</button>
          <button style={key} onClick={() => press('clear')}>C</button>
          <button onClick={() => onSubmit(parseInt(buf || String(initial), 10) || 0)}
            style={{ ...key, gridColumn: 'span 3', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 17, fontWeight: 800 }}>OK</button>
        </div>
      </div>
    </div>
  )
}
