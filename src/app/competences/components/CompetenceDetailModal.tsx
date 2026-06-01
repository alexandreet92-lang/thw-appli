'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowLeft, Zap, ArrowUp, AlertTriangle, Mic } from 'lucide-react'
import type { CompetenceWithUserState } from '@/types/competences'
import { sportIcon, SPORT_LABELS, CATEGORY_LABELS, type SportFilter } from '../constants'
import { streamCompetenceAI, type AIChatMsg } from '../lib/streamCompetenceAI'

interface Props {
  competence: CompetenceWithUserState
  conflicts: CompetenceWithUserState[]
  isOpen: boolean
  onClose: () => void
  onSave: (newPromptCustom: string) => void
  onDelete: () => void
}

interface ChatMessage { role: 'user' | 'assistant'; content: string }

function extractProposed(text: string): string | null {
  const m = text.match(/<prompt>([\s\S]*?)<\/prompt>/i)
  return m ? m[1].trim() : null
}
function stripPromptTag(text: string): string {
  return text.replace(/<prompt>[\s\S]*?<\/prompt>/i, '').trim()
}

export default function CompetenceDetailModal({ competence, conflicts, isOpen, onClose, onSave, onDelete }: Props) {
  const basePrompt = competence.user_state?.prompt_custom ?? competence.prompt_base
  const [currentPrompt, setCurrentPrompt] = useState(basePrompt)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [shown, setShown] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const busyRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setCurrentPrompt(competence.user_state?.prompt_custom ?? competence.prompt_base)
      setMessages([])
      setInput('')
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
  }, [isOpen, competence])

  const dirty = currentPrompt !== basePrompt

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busyRef.current) return
    busyRef.current = true
    setInput('')

    const system = `Tu es un assistant qui aide à modifier le prompt d'une compétence d'entraînement.
Voici le prompt actuel de la compétence « ${competence.nom} » :

${currentPrompt}

L'utilisateur veut le modifier. Quand tu génères une nouvelle version, respecte STRICTEMENT cette structure en 4 blocs :
[Philosophie] ...
[Règles] ...
[Exclusions] ...
[Adaptations] ...

Garde le prompt entre 80 et 150 mots. Réponds d'abord en expliquant brièvement ce que tu vas changer, puis fournis la nouvelle version encadrée entre les balises <prompt>...</prompt>.`

    const history: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setIsStreaming(true)
    try {
      const apiMessages: AIChatMsg[] = history.map(m => ({ role: m.role, content: m.content }))
      await streamCompetenceAI(system, apiMessages, (partial) => {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: partial }
          return next
        })
      })
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: e instanceof Error ? e.message : 'Erreur IA' }
        return next
      })
    } finally {
      setIsStreaming(false)
      busyRef.current = false
    }
  }, [input, messages, currentPrompt, competence.nom])

  if (!isOpen) return null

  const isCustom = !competence.is_predefined

  // ── Body partagé ──
  const body = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
      {/* Prompt actuel */}
      <div style={labelStyle}>Prompt actuel</div>
      <div style={{
        background: 'var(--bg-alt)', border: '0.5px solid var(--border)', borderRadius: 10,
        padding: '14px 16px', fontSize: 11.5, fontFamily: 'DM Mono, monospace',
        lineHeight: 1.7, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', marginBottom: 18,
      }}>
        {currentPrompt}
      </div>

      {/* Remodeler */}
      <div style={labelStyle}>Remodeler</div>
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Modifier cette compétence</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, marginBottom: 12 }}>
          Décris ce que tu veux changer, l&apos;IA mettra à jour le prompt
        </div>

        {/* Messages */}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          if (m.role === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <div style={{ maxWidth: '80%', background: '#06B6D4', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5 }}>
                  {m.content}
                </div>
              </div>
            )
          }
          const proposed = extractProposed(m.content)
          const visible = stripPromptTag(m.content)
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={avatarStyle}><Zap size={12} color="#06B6D4" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {visible}
                  {isLast && isStreaming && <span style={{ color: 'var(--text-dim)' }}>▋</span>}
                </div>
                {proposed && (
                  <div style={{ marginTop: 8, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11.5, fontFamily: 'DM Mono, monospace', lineHeight: 1.7, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                      {proposed}
                    </div>
                    <button
                      onClick={() => setCurrentPrompt(proposed)}
                      style={{ fontSize: 11, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Appliquer cette version
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Input — style identique à l'AI Coach */}
        <div className="comp-input-wrap" style={{ marginTop: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder="Ex : rends-la plus tournée vers le volume…"
            rows={1}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', minHeight: 22, maxHeight: 100 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <button
              onClick={() => inputRef.current?.focus()}
              aria-label="Dictée vocale"
              title="Dictée vocale"
              style={{ width: 22, height: 22, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Mic size={15} />
            </button>
            <button
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming}
              aria-label="Envoyer"
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed', background: input.trim() && !isStreaming ? '#06B6D4' : 'var(--border)', opacity: input.trim() && !isStreaming ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowUp size={15} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Tags header ──
  const tags = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
      {competence.sports.map(s => (
        <span key={s} style={tagStyle}>{sportIcon(s as SportFilter, 11)}{SPORT_LABELS[s as SportFilter] ?? s}</span>
      ))}
      <span style={{ ...tagStyle, color: 'var(--text-mid)', borderColor: 'var(--border)' }}>{CATEGORY_LABELS[competence.categorie]}</span>
      {conflicts.map(c => (
        <span key={c.id} style={{ ...tagStyle, color: 'rgba(239,68,68,0.85)', borderColor: 'rgba(239,68,68,0.35)' }}>
          <AlertTriangle size={11} strokeWidth={1.8} /> {c.nom}
        </span>
      ))}
    </div>
  )

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 22px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
      {/* Gauche : Supprimer (custom uniquement) sinon spacer */}
      {isCustom ? (
        <button
          onClick={() => { if (confirm('Supprimer définitivement cette compétence ?')) onDelete() }}
          style={{ background: 'transparent', color: '#EF4444', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >Supprimer</button>
      ) : <span />}

      {/* Droite : Fermer + Enregistrer */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-mid)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>Fermer</button>
        <button
          onClick={() => onSave(currentPrompt)}
          disabled={!dirty}
          style={{ background: dirty ? '#06B6D4' : 'var(--border)', color: dirty ? '#fff' : 'var(--text-dim)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.6 }}
        >Enregistrer</button>
      </div>
    </div>
  )

  // ── MOBILE : plein écran ──
  if (!isDesktop) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Retour" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', marginTop: 2 }}>
            <ArrowLeft size={18} color="var(--text-mid)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{competence.nom}</div>
            {tags}
          </div>
        </div>
        {body}
        {footer}
      </div>
    )
  }

  // ── DESKTOP : overlay + modal ──
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, padding: 30,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: shown ? 1 : 0, transition: 'opacity 200ms',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 620, maxHeight: 580, background: 'var(--bg-card)',
          border: '0.5px solid var(--border-mid)', borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: shown ? 'scale(1)' : 'scale(0.95)', transition: 'transform 250ms cubic-bezier(0.2,0.9,0.3,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{competence.nom}</div>
            {tags}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-hover)', border: '0.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-alt)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
          >
            <X size={16} color="var(--text)" />
          </button>
        </div>
        {body}
        {footer}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-dim)', marginBottom: 8,
}
const avatarStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(6,182,212,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
}
const tagStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
  color: 'rgba(6,182,212,0.85)', border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '2px 8px',
}
