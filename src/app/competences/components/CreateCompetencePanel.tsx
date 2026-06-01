'use client'

import { useState } from 'react'
import { Zap, Mic, ArrowUp } from 'lucide-react'

interface Props {
  variant?: 'desktop' | 'mobile'
}

// Placeholder visuel — la logique IA de création arrive au prompt 4.
export default function CreateCompetencePanel({ variant = 'desktop' }: Props) {
  const [text, setText] = useState('')

  if (variant === 'mobile') {
    return (
      <div style={{
        position: 'fixed', bottom: 14, left: 14, right: 14, zIndex: 40,
        background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
        borderRadius: 14, padding: '10px 12px',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        <textarea
          id="create-competence-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Décris ton idée..."
          rows={1}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
            minHeight: 24, maxHeight: 120,
          }}
        />
        <button aria-label="Dictée" style={iconBtn}><Mic size={18} color="var(--text-dim)" /></button>
        <button
          aria-label="Envoyer"
          onClick={() => { console.log('Logique IA à venir prompt 4'); setText('') }}
          style={sendBtn}
        ><ArrowUp size={16} color="#fff" /></button>
      </div>
    )
  }

  return (
    <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Créer une compétence</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Décris ton idée, l&apos;IA génère le prompt</div>
      </div>

      {/* Chat zone */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
          }}>
            <Zap size={12} color="#06B6D4" />
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
            Décris la compétence que tu veux créer — une méthode d&apos;entraînement, une approche nutritionnelle, un principe de récupération…
          </p>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          id="create-competence-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Décris ton idée..."
          rows={1}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
            minHeight: 24, maxHeight: 120,
          }}
        />
        <button aria-label="Dictée" style={iconBtn}><Mic size={18} color="var(--text-dim)" /></button>
        <button
          aria-label="Envoyer"
          onClick={() => { console.log('Logique IA à venir prompt 4'); setText('') }}
          style={sendBtn}
        ><ArrowUp size={16} color="#fff" /></button>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const sendBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#06B6D4',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
