'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Zap, ArrowUp, AlertTriangle, Target, ClipboardList, Sliders, MessageSquare } from 'lucide-react'
import type { CompetenceWithUserState } from '@/types/competences'
import { SPORT_LABELS, CATEGORY_LABELS, type SportFilter } from '../constants'
import { streamCompetenceAI, type AIChatMsg } from '../lib/streamCompetenceAI'
import { useI18n } from '@/lib/i18n'
import MicButton from '@/components/ai-coach/MicButton'

interface Props {
  competence: CompetenceWithUserState
  conflicts: CompetenceWithUserState[]
  isOpen: boolean
  onClose: () => void
  onSave: (newPromptCustom: string) => void
  onDelete: () => void
}

interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ── Parsing du prompt_base structuré en 4 blocs ──
type PromptBlocks = { philosophie: string; regles: string; exclusions: string; adaptations: string }

function parsePrompt(promptBase: string): PromptBlocks {
  const extract = (label: string, nextLabel?: string) => {
    const startTag = `[${label}]`
    const startIdx = promptBase.indexOf(startTag)
    if (startIdx === -1) return ''
    const contentStart = startIdx + startTag.length
    const endIdx = nextLabel ? promptBase.indexOf(`[${nextLabel}]`, contentStart) : promptBase.length
    return promptBase.substring(contentStart, endIdx === -1 ? promptBase.length : endIdx).trim()
  }
  return {
    philosophie: extract('Philosophie', 'Règles'),
    regles:      extract('Règles', 'Exclusions'),
    exclusions:  extract('Exclusions', 'Adaptations'),
    adaptations: extract('Adaptations'),
  }
}

function extractProposed(text: string): string | null {
  const m = text.match(/<prompt>([\s\S]*?)<\/prompt>/i)
  return m ? m[1].trim() : null
}
function stripPromptTag(text: string): string {
  return text.replace(/<prompt>[\s\S]*?<\/prompt>/i, '').trim()
}

export default function CompetenceDetailModal({ competence, conflicts, isOpen, onClose, onSave, onDelete }: Props) {
  const { t } = useI18n()
  const basePrompt = competence.user_state?.prompt_custom ?? competence.prompt_base
  const [currentPrompt, setCurrentPrompt] = useState(basePrompt)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [shown, setShown] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
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
      setIsClosing(false)
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
  }, [isOpen, competence])

  const dirty = currentPrompt !== basePrompt

  // Fermeture animée (mobile slide-down)
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => { setIsClosing(false); onClose() }, 300)
  }, [onClose])

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
        next[next.length - 1] = { role: 'assistant', content: e instanceof Error ? e.message : t('competences.aiError') }
        return next
      })
    } finally {
      setIsStreaming(false)
      busyRef.current = false
    }
  }, [input, messages, currentPrompt, competence.nom, t])

  if (!isOpen) return null

  const isCustom = !competence.is_predefined
  const isActive = !!competence.user_state?.active
  const blocks = parsePrompt(currentPrompt)
  const sections = [
    { key: 'philosophie', cls: 'section-philosophie', label: t('competences.sectionPhilosophie'), Icon: Target,        text: blocks.philosophie },
    { key: 'regles',      cls: 'section-regles',      label: t('competences.sectionRegles'),      Icon: ClipboardList,  text: blocks.regles },
    { key: 'exclusions',  cls: 'section-exclusions',  label: t('competences.sectionExclusions'),  Icon: AlertTriangle,  text: blocks.exclusions },
    { key: 'adaptations', cls: 'section-adaptations', label: t('competences.sectionAdaptations'), Icon: Sliders,        text: blocks.adaptations },
  ]
  const hasStructured = sections.some(s => s.text)

  const subtitle = `${competence.sports.map(s => SPORT_LABELS[s as SportFilter] ?? s).join(' / ')} · ${CATEGORY_LABELS[competence.categorie]}`

  // ── Header (badge + titre + sous-titre + badges + X) ──
  const headerNode = (closeFn: () => void) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Zap size={14} color="#06B6D4" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{competence.nom}</div>
          <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>{subtitle}</div>
          {(isActive || conflicts.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {isActive && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#06B6D4', background: 'rgba(6,182,212,0.12)', border: '0.5px solid rgba(6,182,212,0.3)', borderRadius: 5, padding: '2px 8px' }}>{t('competences.active')}</span>
              )}
              {conflicts.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(239,68,68,0.9)', border: '0.5px solid rgba(239,68,68,0.35)', borderRadius: 5, padding: '2px 8px' }}>
                  <AlertTriangle size={10} strokeWidth={1.8} /> {c.nom}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={closeFn}
        aria-label={t('competences.close')}
        style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-hover)', border: '0.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 150ms' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-alt)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
      >
        <X size={16} color="var(--text)" />
      </button>
    </div>
  )

  // ── Body : 4 sections colorées + Remodeler ──
  const body = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {hasStructured ? (
        sections.filter(s => s.text).map(s => (
          <div key={s.key} className={`cmp-section ${s.cls}`}>
            <div className="cmp-section-head">
              <span className="cmp-section-icon"><s.Icon size={14} /></span>
              <span className="cmp-section-label">{s.label}</span>
            </div>
            <div className="cmp-section-content">{s.text}</div>
          </div>
        ))
      ) : (
        <div className="cmp-section cmp-section-remodeler" style={{ marginBottom: 14 }}>
          <div className="cmp-section-content" style={{ color: 'var(--text)' }}>{currentPrompt}</div>
        </div>
      )}

      {/* Remodeler */}
      <div className="cmp-section cmp-section-remodeler" style={{ marginBottom: 0 }}>
        <div className="cmp-section-head">
          <span className="cmp-section-icon" style={{ color: 'var(--text-mid)' }}><MessageSquare size={14} /></span>
          <span className="cmp-section-label" style={{ color: 'var(--text-mid)' }}>{t('competences.sectionRemodeler')}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t('competences.editThisSkill')}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, marginBottom: 12 }}>
          {t('competences.editHint')}
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
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', marginBottom: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {proposed}
                    </div>
                    <button
                      onClick={() => setCurrentPrompt(proposed)}
                      style={{ fontSize: 11, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      {t('competences.applyThisVersion')}
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
            placeholder={t('competences.reshapePlaceholder')}
            rows={1}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', minHeight: 22, maxHeight: 100 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <MicButton onTranscript={setInput} iconSize={15} boxSize={22} />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming}
              aria-label={t('competences.send')}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed', background: input.trim() && !isStreaming ? '#06B6D4' : 'var(--border)', opacity: input.trim() && !isStreaming ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowUp size={15} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const footer = (closeFn: () => void) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
      {isCustom ? (
        <button
          onClick={() => { if (confirm(t('competences.deleteConfirm'))) onDelete() }}
          style={{ background: 'transparent', color: '#EF4444', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >{t('competences.delete')}</button>
      ) : <span />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={closeFn} style={{ background: 'transparent', color: 'var(--text-mid)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>{t('competences.close')}</button>
        <button
          onClick={() => onSave(currentPrompt)}
          disabled={!dirty}
          style={{ background: dirty ? '#06B6D4' : 'var(--border)', color: dirty ? '#fff' : 'var(--text-dim)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.6 }}
        >{t('competences.save')}</button>
      </div>
    </div>
  )

  // ── MOBILE : bottom sheet animé (iOS style) ──
  if (!isDesktop) {
    return (
      <>
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)',
            animation: `${isClosing ? 'fadeOutOverlay' : 'fadeInOverlay'} 320ms ease-out`,
          }}
        />
        <div
          className="comp-modal-fullscreen"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: '92vh', zIndex: 1000,
            borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: `${isClosing ? 'slideDownMobile' : 'slideUpMobile'} 320ms cubic-bezier(0.32,0.72,0,1)`,
          }}
        >
          {/* Handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.20)', margin: '8px auto 0', flexShrink: 0 }} />
          {headerNode(handleClose)}
          {body}
          {footer(handleClose)}
        </div>
      </>
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
          width: 620, maxHeight: 620, background: 'var(--bg-card)',
          border: '0.5px solid var(--border-mid)', borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: shown ? 'scale(1)' : 'scale(0.95)', transition: 'transform 250ms cubic-bezier(0.2,0.9,0.3,1)',
        }}
      >
        {headerNode(onClose)}
        {body}
        {footer(onClose)}
      </div>
    </div>
  )
}

const avatarStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(6,182,212,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
}
