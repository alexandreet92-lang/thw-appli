'use client'

// ══════════════════════════════════════════════════════════════
// CoachQuestionCard — questions de clarification (style Claude).
// Design épuré (rangées + fines séparations), pagination « 1 sur N »
// avec navigation au doigt (swipe horizontal) + animation de glissement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

// Locale de reconnaissance vocale selon la langue de l'app.
const VOICE_LANG: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }

export interface ClarifyingQuestion {
  header: string
  question: string
  multiSelect: boolean
  options: { label: string; description?: string; recommended?: boolean }[]
}
export interface ClarifyingQuestions {
  questions: ClarifyingQuestion[]
  answered?: string
}

export interface Answer { selected: string[]; other: string }

export function CoachQuestionCard({
  data,
  onSubmit,
  initialAnswers,
  onSkip,
  enableVoice,
}: {
  data: ClarifyingQuestions
  onSubmit: (recap: string, answers?: Answer[]) => void
  /** Pré-remplissage (mémoire des dernières réponses / données connues). */
  initialAnswers?: Answer[]
  /** Affiche un bouton « Générer maintenant » (sauter les questions restantes). */
  onSkip?: boolean
  /** Active le micro (dictée) sur le champ libre. */
  enableVoice?: boolean
}) {
  const { t, lang } = useI18n()
  const qs = data.questions
  const [page, setPage] = useState(0)
  const [anim, setAnim] = useState<'next' | 'prev' | null>(null)
  const [answers, setAnswers] = useState<Answer[]>(() => qs.map((_, i) => initialAnswers?.[i] ?? ({ selected: [], other: '' })))
  const [listening, setListening] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; dx: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)

  // Coupe la reconnaissance vocale si la carte est démontée en pleine dictée
  // (flow fermé / question soumise) → pas de setState sur un arbre démonté.
  useEffect(() => () => { try { recogRef.current?.stop() } catch { /* ignore */ } }, [])

  const answered = data.answered !== undefined

  // ── Vue lecture seule (déjà répondu) ────────────────────────
  if (answered) {
    const lines = (data.answered ?? '').split('\n').filter(l => l.trim().startsWith('-')).map(l => {
      const [q, ...rest] = l.replace(/^[-\s]+/, '').split(' → ')
      return { q, ans: rest.join(' → ') }
    })
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={checkBadge}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-mid)' }}>{t('ai.answersSent')}</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ai-text)' }}>{l.q}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ai-mid)' }}>{l.ans || '—'}</p>
          </div>
        ))}
      </div>
    )
  }

  const q = qs[page]
  const a = answers[page]
  const canProceed = a.selected.length > 0 || a.other.trim().length > 0
  const isLast = page === qs.length - 1

  const toggle = (label: string) => setAnswers(prev => prev.map((ans, i) => {
    if (i !== page) return ans
    if (q.multiSelect) {
      const has = ans.selected.includes(label)
      return { ...ans, selected: has ? ans.selected.filter(l => l !== label) : [...ans.selected, label] }
    }
    return { ...ans, selected: ans.selected[0] === label ? [] : [label] }
  }))
  const setOther = (val: string) => setAnswers(prev => prev.map((ans, i) => i === page ? { ...ans, other: val } : ans))

  // ── Dictée vocale sur le champ libre (Web Speech API) ───────
  const pageRef = useRef(page); pageRef.current = page
  const toggleDictation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert(t('ai.voiceUnsupported')); return }
    if (listening) { try { recogRef.current?.stop() } catch { /* ignore */ } setListening(false); return }
    try {
      const r = new SR()
      r.lang = VOICE_LANG[lang] ?? 'fr-FR'; r.interimResults = true; r.continuous = false
      r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => {
        // On ne prend que les résultats FINAUX et on les ajoute au champ de la
        // question courante — via un setter fonctionnel (pas de valeur périmée).
        let txt = ''
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean }
          if (res.isFinal) txt += res[0].transcript
        }
        txt = txt.trim()
        if (!txt) return
        const p = pageRef.current
        setAnswers(prev => prev.map((ans, i) => i === p ? { ...ans, other: (ans.other ? ans.other + ' ' : '') + txt } : ans))
      }
      r.onend = () => setListening(false)
      r.onerror = () => setListening(false)
      recogRef.current = r; r.start(); setListening(true)
    } catch { setListening(false); alert(t('ai.voiceUnsupported')) }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voiceSupported = enableVoice && typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const goNext = () => { if (!isLast && canProceed) { setAnim('next'); setPage(p => p + 1) } }
  const goPrev = () => { if (page > 0) { setAnim('prev'); setPage(p => p - 1) } }
  const submit = () => {
    const lines = qs.map((qq, i) => {
      const ans = answers[i]
      const parts = [...ans.selected]
      if (ans.other.trim()) parts.push(ans.other.trim())
      return `- ${qq.question} → ${parts.length ? parts.join(', ') : t('ai.noAnswer')}`
    })
    onSubmit(`${t('ai.myAnswers')}\n${lines.join('\n')}`, answers)
  }

  // ── Swipe horizontal entre questions ────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { x: e.touches[0].clientX, dx: 0 }
    if (wrapRef.current) wrapRef.current.style.transition = 'none'
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !wrapRef.current) return
    let dx = e.touches[0].clientX - drag.current.x
    // résistance aux bords
    if ((dx > 0 && page === 0) || (dx < 0 && !canProceed)) dx *= 0.3
    drag.current.dx = dx
    wrapRef.current.style.transform = `translateX(${dx}px)`
  }
  const onTouchEnd = () => {
    const d = drag.current
    const el = wrapRef.current
    drag.current = null
    if (!el) return
    el.style.transition = 'transform 0.22s ease'
    el.style.transform = 'translateX(0px)'
    const dx = d?.dx ?? 0
    if (dx < -55 && canProceed) { if (isLast) submit(); else goNext() }
    else if (dx > 55 && page > 0) goPrev()
  }

  return (
    <div style={cardStyle}>
      {/* En-tête : chip + pagination + points */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={chip}>{q.header}</span>
        {qs.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {qs.map((_, i) => (
                <span key={i} style={{ width: i === page ? 14 : 5, height: 5, borderRadius: 3, background: i === page ? '#3C90D5' : 'var(--ai-border)', transition: 'width 0.2s, background 0.2s' }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>{page + 1}/{qs.length}</span>
          </div>
        )}
      </div>

      {/* Contenu swipeable */}
      <div style={{ overflow: 'hidden' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div ref={wrapRef} key={page} style={{ animation: anim ? `cq_${anim} 0.24s ease` : undefined }}>
          <p style={{ margin: '0 0 6px', fontSize: 16.5, fontWeight: 600, color: 'var(--ai-text)', lineHeight: 1.35, fontFamily: 'Syne,sans-serif' }}>{q.question}</p>

          {/* Options — rangées épurées séparées par un filet */}
          <div style={{ borderTop: '1px solid var(--ai-border)' }}>
            {q.options.map((opt, i) => {
              const sel = a.selected.includes(opt.label)
              return (
                <button
                  key={i}
                  onClick={() => toggle(opt.label)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                    padding: '12px 10px', border: 'none', borderBottom: '1px solid var(--ai-border)',
                    background: sel ? 'rgba(60,144,213,0.07)' : 'transparent', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: sel ? '#3C90D5' : 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>{opt.label}</span>
                      {opt.recommended && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#3C90D5', background: 'rgba(60,144,213,0.12)', border: '1px solid rgba(60,144,213,0.35)', borderRadius: 999, padding: '1px 7px' }}>Recommandé</span>
                      )}
                    </span>
                    {opt.description && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ai-dim)', marginTop: 2, lineHeight: 1.45 }}>{opt.description}</span>}
                  </span>
                  {sel && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3C90D5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </button>
              )
            })}
          </div>

          {/* Champ libre (réponse libre si pas d'options, sinon « Autre ») + dictée */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${a.other.trim() ? '#3C90D5' : 'var(--ai-border)'}` }}>
            <input
              value={a.other}
              onChange={e => setOther(e.target.value)}
              placeholder={q.options.length === 0 ? t('ai.yourAnswer') : t('ai.other')}
              style={{ flex: 1, minWidth: 0, padding: '10px 8px', border: 'none', background: 'transparent', color: 'var(--ai-text)', fontSize: 13.5, fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
            {voiceSupported && (
              <button onClick={toggleDictation} aria-label={t('ai.dictate')} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: 'none', background: listening ? 'rgba(60,144,213,0.15)' : 'transparent', color: listening ? '#3C90D5' : 'var(--ai-mid)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* « Générer maintenant » — saute les questions restantes (actions rapides) */}
      {onSkip && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <button onClick={submit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: 'none', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-3 7h6l-3 7"/></svg>
            {t('ai.generateNow')}
          </button>
        </div>
      )}

      {/* Pied */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <button onClick={goPrev} disabled={page === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', border: 'none', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'var(--ai-border)' : 'var(--ai-mid)', fontSize: 12.5, fontWeight: 600 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {t('ai.previous')}
        </button>
        <button onClick={() => { if (isLast) submit(); else goNext() }} disabled={!canProceed} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', background: canProceed ? '#3C90D5' : 'var(--ai-border)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Syne,sans-serif', boxShadow: canProceed ? '0 3px 10px rgba(60,144,213,0.32)' : 'none', transition: 'background 0.15s' }}>
          {isLast ? t('ai.send') : t('ai.next')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{isLast ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M9 18l6-6-6-6" />}</svg>
        </button>
      </div>

      <style>{`
        @keyframes cq_next { from { transform: translateX(36px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes cq_prev { from { transform: translateX(-36px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = { border: '1px solid var(--ai-border)', borderRadius: 16, padding: 14, background: 'var(--ai-bg)', marginTop: 4 }
const chip: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ai-mid)', background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', padding: '3px 8px', borderRadius: 6, fontFamily: 'DM Sans,sans-serif' }
const checkBadge: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', background: '#3C90D5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
