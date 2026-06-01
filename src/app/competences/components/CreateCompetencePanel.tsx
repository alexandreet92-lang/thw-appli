'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, ArrowUp } from 'lucide-react'
import { useCreateCompetenceConversation } from '../hooks/useCreateCompetenceConversation'
import { sportIcon, SPORT_LABELS, type SportFilter } from '../constants'

interface Props {
  variant?: 'desktop' | 'mobile'
  limitReached: boolean
  onCreated: () => void
  onNotice: (msg: string) => void
}

export default function CreateCompetencePanel({ variant = 'desktop', limitReached, onCreated, onNotice }: Props) {
  const conv = useCreateCompetenceConversation()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conv.messages, conv.generatedMetadata])

  const doSend = () => {
    const t = text.trim()
    if (!t || conv.isStreaming) return
    setText('')
    void conv.sendMessage(t)
  }

  const doSave = async () => {
    setSaving(true)
    const activate = !limitReached
    const res = await conv.saveCompetence(activate)
    setSaving(false)
    if (res.ok) {
      onNotice(activate ? 'Compétence créée et activée' : 'Compétence créée mais non activée — limite atteinte')
      conv.resetConversation()
      onCreated()
    } else {
      onNotice(res.error ?? 'Erreur de création')
    }
  }

  const hasConversation = conv.messages.length > 0

  const chat = (
    <>
      {!hasConversation && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={avatarStyle}><Zap size={12} color="#06B6D4" /></div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
            Décris la compétence que tu veux créer — une méthode d&apos;entraînement, une approche nutritionnelle, un principe de récupération…
          </p>
        </div>
      )}

      {conv.messages.map((m, i) => {
        const isLast = i === conv.messages.length - 1
        if (m.role === 'user') {
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
              <div style={{ maxWidth: '85%', background: '#06B6D4', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5 }}>{m.content}</div>
            </div>
          )
        }
        // assistant : masquer le bloc <competence> brut
        const visible = m.content.replace(/<competence>[\s\S]*?<\/competence>/i, '').trim()
        return (
          <div key={i} style={{ display: 'flex', gap: 8, margin: '10px 0', alignItems: 'flex-start' }}>
            <div style={avatarStyle}><Zap size={12} color="#06B6D4" /></div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {visible || (isLast && conv.isStreaming ? '' : visible)}
              {isLast && conv.isStreaming && <span style={{ color: 'var(--text-dim)' }}>▋</span>}
            </div>
          </div>
        )
      })}

      {/* Preview compétence générée */}
      {conv.generatedMetadata && conv.generatedPrompt && (
        <div style={{ background: 'var(--bg-alt)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{conv.generatedMetadata.nom}</div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>{conv.generatedMetadata.description_courte}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
            {conv.generatedMetadata.bullets.map((b, i) => (
              <li key={i} style={{ position: 'relative', paddingLeft: 12, fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--text-dim)' }}>—</span>{b}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {conv.generatedMetadata.sports.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(6,182,212,0.85)', border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '2px 8px' }}>
                {sportIcon(s as SportFilter, 11)}{SPORT_LABELS[s as SportFilter] ?? s}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => inputRef.current?.focus()} style={{ fontSize: 12, background: 'transparent', color: 'var(--text-mid)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>Affiner</button>
            <button onClick={() => void doSave()} disabled={saving} style={{ flex: 1, fontSize: 12, fontWeight: 500, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer cette compétence'}
            </button>
          </div>
        </div>
      )}

      {conv.error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 8 }}>{conv.error}</p>}
      <div ref={endRef} />
    </>
  )

  const inputBar = (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <textarea
        ref={inputRef}
        id="create-competence-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }}
        placeholder="Décris ton idée..."
        rows={1}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', minHeight: 24, maxHeight: 120 }}
      />
      <button onClick={doSend} disabled={!text.trim() || conv.isStreaming} aria-label="Envoyer" style={sendBtn(!!text.trim() && !conv.isStreaming)}>
        <ArrowUp size={16} color="#fff" />
      </button>
    </div>
  )

  if (variant === 'mobile') {
    return (
      <div style={{
        position: 'fixed', bottom: 14, left: 14, right: 14, zIndex: 40,
        background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 14,
        display: 'flex', flexDirection: 'column', maxHeight: '60vh', overflow: 'hidden',
      }}>
        {(hasConversation || conv.generatedMetadata) && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>{chat}</div>
        )}
        <div style={{ padding: '10px 12px' }}>{inputBar}</div>
      </div>
    )
  }

  return (
    <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Créer une compétence</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Décris ton idée, l&apos;IA génère le prompt</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>{chat}</div>
      <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>{inputBar}</div>
    </div>
  )
}

const avatarStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(6,182,212,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
}
function sendBtn(active: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: '50%', border: 'none', flexShrink: 0,
    cursor: active ? 'pointer' : 'not-allowed',
    background: active ? '#06B6D4' : 'var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
