'use client'

// ══════════════════════════════════════════════════════════════
// CoachQuestionCard — questions de clarification (style Claude).
// Design épuré (rangées + fines séparations), pagination « 1 sur N »
// avec navigation au doigt (swipe horizontal) + animation de glissement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { useIsMobile } from './mobile/MobileKit'
import { AimCard, AimPill, AimPress, AimTag, AIM_EASE } from './mobile/cards/kit'

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

type CQProps = {
  data: ClarifyingQuestions
  onSubmit: (recap: string, answers?: Answer[]) => void
  /** Pré-remplissage (mémoire des dernières réponses / données connues). */
  initialAnswers?: Answer[]
  /** Affiche un bouton « Générer maintenant » (sauter les questions restantes). */
  onSkip?: boolean
  /** Active le micro (dictée) sur le champ libre. */
  enableVoice?: boolean
}

/** Questions de clarification : carte « mock8 » sur mobile, historique sur bureau. */
export function CoachQuestionCard(props: CQProps) {
  const mobile = useIsMobile()
  return mobile ? <CoachQuestionMobile {...props} /> : <CoachQuestionDesktop {...props} />
}

function CoachQuestionDesktop({
  data,
  onSubmit,
  initialAnswers,
  onSkip,
  enableVoice,
}: CQProps) {
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
            <span style={{ fontSize: 11, color: 'var(--ai-dim)', fontFamily: 'var(--font-body)' }}>{page + 1}/{qs.length}</span>
          </div>
        )}
      </div>

      {/* Contenu swipeable */}
      <div style={{ overflow: 'hidden' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div ref={wrapRef} key={page} style={{ animation: anim ? `cq_${anim} 0.24s ease` : undefined }}>
          <p style={{ margin: '0 0 6px', fontSize: 16.5, fontWeight: 600, color: 'var(--ai-text)', lineHeight: 1.35, fontFamily: 'var(--font-body)' }}>{q.question}</p>

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
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: sel ? '#3C90D5' : 'var(--ai-text)', fontFamily: 'var(--font-body)' }}>{opt.label}</span>
                      {opt.recommended && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#3C90D5', background: 'rgba(60,144,213,0.12)', border: '1px solid rgba(60,144,213,0.35)', borderRadius: 'var(--r-pill)', padding: '1px 7px' }}>Recommandé</span>
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
              style={{ flex: 1, minWidth: 0, padding: '10px 8px', border: 'none', background: 'transparent', color: 'var(--ai-text)', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
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
        <button onClick={() => { if (isLast) submit(); else goNext() }} disabled={!canProceed} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', background: canProceed ? '#3C90D5' : 'var(--ai-border)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: canProceed ? '0 3px 10px rgba(60,144,213,0.32)' : 'none', transition: 'background 0.15s' }}>
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
const cardStyle: React.CSSProperties = { border: '1px solid var(--ai-border)', borderRadius: 'var(--r-md)', padding: 14, background: 'var(--ai-bg)', marginTop: 4 }
const chip: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ai-mid)', background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', padding: '3px 8px', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-body)' }
const checkBadge: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', background: '#3C90D5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }

// ══════════════════════════════════════════════════════════════
// MOBILE (≤ 767 px) — maquette validée « a2-questions » :
// « Question x sur N » + barre de progression + Passer · grande question ·
// options en cartes sélectionnables (rond coché, tag « Conseillé ») ·
// « Autre réponse… » (champ doux + dictée) · Précédent / Suivant.
// Glisser horizontalement change de question (transition animée).
// ══════════════════════════════════════════════════════════════

interface SRAlt { transcript: string }
interface SRRes { readonly length: number; readonly isFinal: boolean; [i: number]: SRAlt }
interface SREvt { readonly results: { readonly length: number; [i: number]: SRRes } }
interface SRInst {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: SREvt) => void) | null; onend: (() => void) | null; onerror: (() => void) | null
  start: () => void; stop: () => void
}
type SRCtor = new () => SRInst
function getSR(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Glissement entre questions : la direction (custom) est relue à la sortie.
const Q_SLIDE: Variants = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
}
const Q_FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }

function CheckDot({ on }: { on: boolean }) {
  const reduce = useReducedMotion()
  return (
    <span aria-hidden style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
      background: on ? 'var(--primary)' : 'transparent', color: 'var(--on-primary)',
      boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)', transition: 'background 0.2s ease, box-shadow 0.2s ease',
    }}>
      <AnimatePresence initial={false}>
        {on && (
          <motion.svg key="c" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.22, ease: AIM_EASE }}>
            <path d="M20 6 9 17l-5-5" />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  )
}

function CoachQuestionMobile({ data, onSubmit, initialAnswers, onSkip, enableVoice }: CQProps) {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()
  const qs = data.questions
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [answers, setAnswers] = useState<Answer[]>(() => qs.map((_, i) => initialAnswers?.[i] ?? ({ selected: [], other: '' })))
  const [listening, setListening] = useState(false)
  const recRef = useRef<SRInst | null>(null)
  const pageRef = useRef(page); pageRef.current = page
  const baseRef = useRef('')
  useEffect(() => () => { try { recRef.current?.stop() } catch { /* ignore */ } }, [])

  // ── Vue lecture seule (déjà répondu) ──
  if (data.answered !== undefined) {
    const lines = (data.answered ?? '').split('\n').filter(l => l.trim().startsWith('-')).map(l => {
      const [q, ...rest] = l.replace(/^[-\s]+/, '').split(' → ')
      return { q, ans: rest.join(' → ') }
    })
    return (
      <AimCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <CheckDot on />
          <span style={{ fontSize: 15, fontWeight: 800 }}>{t('ai.answersSent')}</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ padding: '9px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{l.q}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{l.ans || '—'}</div>
          </div>
        ))}
      </AimCard>
    )
  }

  const n = qs.length
  const q = qs[page]
  const a = answers[page]
  const canProceed = a.selected.length > 0 || a.other.trim().length > 0
  const isLast = page === n - 1
  const voiceOk = !!enableVoice && !!getSR()

  const stopVoice = () => { try { recRef.current?.stop() } catch { /* ignore */ } recRef.current = null; setListening(false) }

  const toggle = (label: string) => {
    haptic('light')
    setAnswers(prev => prev.map((ans, i) => {
      if (i !== page) return ans
      if (q.multiSelect) {
        const has = ans.selected.includes(label)
        return { ...ans, selected: has ? ans.selected.filter(l => l !== label) : [...ans.selected, label] }
      }
      return { ...ans, selected: ans.selected[0] === label ? [] : [label] }
    }))
  }
  const setOther = (val: string) => setAnswers(prev => prev.map((ans, i) => i === page ? { ...ans, other: val } : ans))

  const submit = (list: Answer[] = answers) => {
    stopVoice()
    haptic('success')
    const lines = qs.map((qq, i) => {
      const ans = list[i]
      const parts = [...ans.selected]
      if (ans.other.trim()) parts.push(ans.other.trim())
      return `- ${qq.question} → ${parts.length ? parts.join(', ') : t('ai.noAnswer')}`
    })
    onSubmit(`${t('ai.myAnswers')}\n${lines.join('\n')}`, list)
  }
  const go = (to: number) => {
    if (to < 0 || to >= n || to === page) return
    stopVoice()
    haptic('light')
    setDir(to > page ? 1 : -1)
    setPage(to)
  }
  const next = () => { if (!canProceed) return; if (isLast) submit(); else go(page + 1) }
  const skip = () => { if (isLast) submit(); else go(page + 1) }

  // Dictée du champ libre : texte reconstruit à chaque événement (finaux +
  // intermédiaires) et ajouté à ce qui était déjà écrit.
  const toggleVoice = () => {
    if (listening) { stopVoice(); return }
    const SR = getSR()
    if (!SR) return
    try {
      const r = new SR()
      r.lang = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR'
      r.continuous = true; r.interimResults = true
      baseRef.current = a.other
      const p = page
      r.onresult = (e: SREvt) => {
        let txt = ''
        for (let i = 0; i < e.results.length; i++) txt += (e.results[i]?.[0]?.transcript ?? '')
        const base = baseRef.current.trim()
        const v = [base, txt.replace(/\s+/g, ' ').trim()].filter(Boolean).join(' ')
        setAnswers(prev => prev.map((ans, i) => i === p ? { ...ans, other: v } : ans))
      }
      r.onend = () => { if (recRef.current === r) { recRef.current = null; setListening(false) } }
      r.onerror = () => { if (recRef.current === r) { recRef.current = null; setListening(false) } }
      recRef.current = r
      r.start()
      haptic('light')
      setListening(true)
    } catch { setListening(false) }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -500) { if (canProceed) next() }
    else if (info.offset.x > 60 || info.velocity.x > 500) go(page - 1)
  }

  return (
    <AimCard>
      {/* Progression */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>
        <span className="aimc-num">{n > 1 ? t('ai2.q.progress', { i: page + 1, n }) : (q.header || '')}</span>
        <AimPress onClick={skip} style={{ minHeight: 36, padding: '0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{t('ai2.q.skip')}</AimPress>
      </div>
      <div style={{ height: 4, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)', margin: '6px 0 14px', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', width: '100%', background: 'var(--primary)', borderRadius: 'var(--r-pill)', transformOrigin: 'left center' }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: (page + 1) / n }}
          transition={{ duration: 0.5, ease: AIM_EASE }}
        />
      </div>

      {/* Question courante — glissable */}
      <div style={{ overflow: 'hidden', margin: '0 -16px', padding: '0 16px' }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={page}
            custom={dir}
            variants={reduce ? Q_FADE : Q_SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.34, ease: AIM_EASE }}
            drag={n > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragDirectionLock
            onDragEnd={onDragEnd}
            style={{ touchAction: 'pan-y' }}
          >
            <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{q.question}</div>
            <div role={q.multiSelect ? 'group' : 'radiogroup'} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {q.options.map((opt, i) => {
                const sel = a.selected.includes(opt.label)
                return (
                  <AimPress
                    key={i}
                    onClick={() => toggle(opt.label)}
                    ariaLabel={opt.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '12px 14px', borderRadius: 'var(--r-md)',
                      background: sel ? 'color-mix(in srgb, var(--primary) 12%, var(--surface-card))' : 'var(--aimc-grp)',
                      boxShadow: sel ? 'inset 0 0 0 2px var(--primary)' : 'none',
                      transition: 'background 0.22s ease, box-shadow 0.22s ease',
                    }}
                  >
                    <CheckDot on={sel} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{opt.label}</span>
                        {opt.recommended && <AimTag tint="var(--success)">{t('ai2.q.recommended')}</AimTag>}
                      </span>
                      {opt.description && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35 }}>{opt.description}</span>}
                    </span>
                  </AimPress>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 'var(--r-md)', background: 'var(--aimc-grp)', padding: '0 6px 0 14px', minHeight: 52 }}>
                <input
                  value={a.other}
                  onChange={e => setOther(e.target.value)}
                  placeholder={q.options.length === 0 ? t('ai.yourAnswer') : t('ai2.q.other')}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-body)', padding: '12px 0' }}
                />
                {voiceOk && (
                  <AimPress onClick={toggleVoice} ariaLabel={t('ai.dictate')} style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, color: listening ? 'var(--on-primary)' : 'var(--text-mid)', background: listening ? 'var(--primary)' : 'transparent', transition: 'background 0.2s ease, color 0.2s ease' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                  </AimPress>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <AimPill onClick={() => go(page - 1)} disabled={page === 0} flex={1} style={page === 0 ? { opacity: 0.45 } : undefined}>{t('ai.previous')}</AimPill>
        <AimPill variant="primary" onClick={next} disabled={!canProceed} flex={2}>{isLast ? t('ai.send') : t('ai.next')}</AimPill>
      </div>
      {onSkip && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <AimPill variant="ghost" onClick={() => submit()} style={{ minHeight: 44, fontSize: 14 }}>{t('ai.generateNow')}</AimPill>
        </div>
      )}
    </AimCard>
  )
}
