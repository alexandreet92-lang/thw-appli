'use client'

// ══════════════════════════════════════════════════════════════
// CoachQuestionCard — questions de clarification (style Claude).
// Design épuré (rangées + fines séparations), pagination « 1 sur N »
// avec navigation au doigt (swipe horizontal) + animation de glissement.
// ══════════════════════════════════════════════════════════════

import { useRef, useState } from 'react'

export interface ClarifyingQuestion {
  header: string
  question: string
  multiSelect: boolean
  options: { label: string; description?: string }[]
}
export interface ClarifyingQuestions {
  questions: ClarifyingQuestion[]
  answered?: string
}

interface Answer { selected: string[]; other: string }

export function CoachQuestionCard({
  data,
  onSubmit,
}: {
  data: ClarifyingQuestions
  onSubmit: (recap: string) => void
}) {
  const qs = data.questions
  const [page, setPage] = useState(0)
  const [anim, setAnim] = useState<'next' | 'prev' | null>(null)
  const [answers, setAnswers] = useState<Answer[]>(() => qs.map(() => ({ selected: [], other: '' })))
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; dx: number } | null>(null)

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
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-mid)' }}>Réponses envoyées</span>
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

  const goNext = () => { if (!isLast && canProceed) { setAnim('next'); setPage(p => p + 1) } }
  const goPrev = () => { if (page > 0) { setAnim('prev'); setPage(p => p - 1) } }
  const submit = () => {
    const lines = qs.map((qq, i) => {
      const ans = answers[i]
      const parts = [...ans.selected]
      if (ans.other.trim()) parts.push(ans.other.trim())
      return `- ${qq.question} → ${parts.length ? parts.join(', ') : '(sans réponse)'}`
    })
    onSubmit(`Mes réponses :\n${lines.join('\n')}`)
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
    if ((dx > 0 && page === 0) || (dx < 0 && (isLast ? !canProceed : !canProceed))) dx *= 0.3
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
    if (dx < -55 && (isLast ? canProceed : canProceed)) { if (isLast) submit(); else goNext() }
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
          <p style={{ margin: '0 0 12px', fontSize: 15.5, fontWeight: 600, color: 'var(--ai-text)', lineHeight: 1.35, fontFamily: 'Syne,sans-serif' }}>{q.question}</p>

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
                    padding: '11px 8px', border: 'none', borderBottom: '1px solid var(--ai-border)',
                    background: sel ? 'rgba(60,144,213,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ai-text)' }}>{opt.label}</span>
                    {opt.description && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ai-dim)', marginTop: 2, lineHeight: 1.4 }}>{opt.description}</span>}
                  </span>
                  <span style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0, borderRadius: q.multiSelect ? 5 : '50%', border: `1.5px solid ${sel ? '#3C90D5' : 'var(--ai-border)'}`, background: sel ? '#3C90D5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Autre */}
          <input
            value={a.other}
            onChange={e => setOther(e.target.value)}
            placeholder="Autre…"
            style={{ width: '100%', padding: '10px 8px', border: 'none', borderBottom: `1px solid ${a.other.trim() ? '#3C90D5' : 'var(--ai-border)'}`, background: 'transparent', color: 'var(--ai-text)', fontSize: 13.5, fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Pied */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <button onClick={goPrev} disabled={page === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', border: 'none', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'var(--ai-border)' : 'var(--ai-mid)', fontSize: 12.5, fontWeight: 600 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Précédent
        </button>
        <button onClick={() => { if (isLast) submit(); else goNext() }} disabled={!canProceed} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', background: canProceed ? '#3C90D5' : 'var(--ai-border)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Syne,sans-serif', boxShadow: canProceed ? '0 3px 10px rgba(60,144,213,0.32)' : 'none', transition: 'background 0.15s' }}>
          {isLast ? 'Envoyer' : 'Suivant'}
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
