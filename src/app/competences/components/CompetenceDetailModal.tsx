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

  // Fermeture animée (mobile slide-down + desktop scale-out)
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setShown(false)
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

  const subtitle = `${competence.sports.map(s => t(SPORT_LABELS[s as SportFilter] ?? s)).join(' / ')} · ${t(CATEGORY_LABELS[competence.categorie])}`

  // ── Header (badge + titre + sous-titre + badges + X) ──
  const headerNode = (closeFn: () => void) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Zap size={14} color="#06B6D4" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{competence.nom}</div>
          <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>{subtitle}</div>
          {(isActive || conflicts.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {isActive && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--primary)', background: 'rgba(6,182,212,0.12)', border: '0.5px solid rgba(6,182,212,0.3)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>{t('competences.active')}</span>
              )}
              {conflicts.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(239,68,68,0.9)', border: '0.5px solid rgba(239,68,68,0.35)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>
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
                <div style={{ maxWidth: '80%', background: 'var(--primary)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5 }}>
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
                  <div style={{ marginTop: 8, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 12 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                      {proposed}
                    </div>
                    <button
                      onClick={() => setCurrentPrompt(proposed)}
                      style={{ fontSize: 11, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
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
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', minHeight: 22, maxHeight: 100 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <MicButton onTranscript={setInput} iconSize={15} boxSize={22} />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming}
              aria-label={t('competences.send')}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed', background: input.trim() && !isStreaming ? 'var(--primary)' : 'var(--border)', opacity: input.trim() && !isStreaming ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          style={{ background: 'transparent', color: 'var(--danger)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >{t('competences.delete')}</button>
      ) : <span />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={closeFn} style={{ background: 'transparent', color: 'var(--text-mid)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>{t('competences.close')}</button>
        <button
          onClick={() => onSave(currentPrompt)}
          disabled={!dirty}
          style={{ background: dirty ? 'var(--primary)' : 'var(--border)', color: dirty ? '#fff' : 'var(--text-dim)', border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.6 }}
        >{t('competences.save')}</button>
      </div>
    </div>
  )

  // ── MOBILE : feuille du bas « Strava / Claude » ──
  // Panneau gris chaud radius 24, poignée, titre gras + bouton rond ×, blocs
  // en cartes blanches (la couleur ne porte que sur l'icône), champ capsule,
  // pilule cyan « Enregistrer », « Supprimer » en texte rouge.
  if (!isDesktop) {
    const canSend = !!input.trim() && !isStreaming
    const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 12, boxShadow: M_CARD_SHADOW }
    return (
      <>
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999, background: 'var(--scrim)',
            animation: `${isClosing ? 'fadeOutOverlay' : 'fadeInOverlay'} 320ms ease-out`,
          }}
        />
        <div
          role="dialog" aria-modal="true" aria-label={competence.nom}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)', zIndex: 1000,
            background: 'var(--surface-page)', borderRadius: 'calc(var(--r-lg) + 4px) calc(var(--r-lg) + 4px) 0 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-float)', fontFamily: 'var(--font-body)',
            animation: `${isClosing ? 'slideDownMobile' : 'slideUpMobile'} 320ms cubic-bezier(0.32,0.72,0,1)`,
          }}
        >
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}>
            <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
          </div>
          {/* En-tête : titre gras · sous-titre gris · pastilles · rond × */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 16px 12px', flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1.2 }}>{competence.nom}</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 3 }}>{subtitle}</div>
              {(isActive || conflicts.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {isActive && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--surface-chip)', borderRadius: 'var(--r-pill)', padding: '4px 10px' }}>
                      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />{t('competences.active')}
                    </span>
                  )}
                  {conflicts.map(c => (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--danger)', padding: '4px 2px' }}>
                      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }} />{c.nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleClose} aria-label={t('competences.close')}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 16px 16px' }}>
            {hasStructured ? (
              sections.filter(sec => sec.text).map(sec => (
                <div key={sec.key} className={sec.cls} style={{ ...card, background: 'var(--surface-card)', border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="cmp-section-icon"><sec.Icon size={16} /></span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{sec.label}</span>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{sec.text}</div>
                </div>
              ))
            ) : (
              <div style={card}>
                <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{currentPrompt}</div>
              </div>
            )}

            {/* Remodeler */}
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', color: 'var(--text-mid)' }}><MessageSquare size={16} /></span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('competences.editThisSkill')}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', margin: '4px 0 12px', lineHeight: 1.45 }}>{t('competences.editHint')}</div>

              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1
                if (msg.role === 'user') {
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <div style={{ maxWidth: '82%', background: 'var(--surface-chip)', color: 'var(--text)', borderRadius: 'calc(var(--r-lg) - 2px)', padding: '10px 14px', fontSize: 15, lineHeight: 1.45 }}>{msg.content}</div>
                    </div>
                  )
                }
                const proposed = extractProposed(msg.content)
                const visible = stripPromptTag(msg.content)
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                      {visible}
                      {isLast && isStreaming && <span style={{ color: 'var(--text-dim)' }}>▋</span>}
                    </div>
                    {proposed && (
                      <div style={{ marginTop: 8, background: 'var(--surface-page)', borderRadius: 'var(--r-md)', padding: 14 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{proposed}</div>
                        <button type="button" onClick={() => setCurrentPrompt(proposed)}
                          style={{ minHeight: 44, padding: '0 18px', fontSize: 15, fontWeight: 700, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          {t('competences.applyThisVersion')}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Champ capsule (plein, sans bordure) */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 4, background: 'var(--surface-page)', borderRadius: 'calc(var(--r-lg) + 2px)', padding: '6px 6px 6px 14px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                  placeholder={t('competences.reshapePlaceholder')}
                  rows={1}
                  style={{ flex: 1, alignSelf: 'center', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 16, lineHeight: 1.4, color: 'var(--text)', fontFamily: 'var(--font-body)', minHeight: 24, maxHeight: 100, padding: '8px 0' }}
                />
                <MicButton onTranscript={setInput} iconSize={20} boxSize={40} />
                <button type="button" onClick={() => void send()} disabled={!canSend} aria-label={t('competences.send')}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: canSend ? 'pointer' : 'default',
                    background: canSend ? 'var(--primary)' : 'var(--surface-chip)', color: canSend ? 'var(--on-primary)' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUp size={20} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>

          {/* Pied : Supprimer (texte rouge) · Enregistrer (pilule cyan) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            {isCustom && (
              <button type="button" onClick={() => { if (confirm(t('competences.deleteConfirm'))) onDelete() }}
                style={{ minHeight: 52, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t('competences.delete')}
              </button>
            )}
            <button type="button" onClick={() => onSave(currentPrompt)} disabled={!dirty}
              style={{ flex: 1, minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
                background: 'var(--primary)', color: 'var(--on-primary)', opacity: dirty ? 1 : 0.45, cursor: dirty ? 'pointer' : 'default' }}>
              {t('competences.save')}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── DESKTOP : overlay + modal ──
  return (
    <div
      onClick={handleClose}
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
          border: '0.5px solid var(--border-mid)', borderRadius: 'var(--r-md)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: shown ? 'scale(1)' : 'scale(0.95)', transition: 'transform 250ms cubic-bezier(0.2,0.9,0.3,1)',
        }}
      >
        {headerNode(handleClose)}
        {body}
        {footer(handleClose)}
      </div>
    </div>
  )
}

const M_CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.05)' // design-allow-color — ombre douce de carte (mobile)

const avatarStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(6,182,212,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
}
