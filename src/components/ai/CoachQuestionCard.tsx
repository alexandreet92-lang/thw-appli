'use client'

// ══════════════════════════════════════════════════════════════
// CoachQuestionCard — carte de questions de clarification (façon
// Claude AskUserQuestion). L'IA émet le tool ask_clarifying_questions ;
// l'athlète répond ici, puis le récap est renvoyé au coach.
//
// · Pagination « 1 sur N » · choix simple ou multiple · champ « Autre »
// · Une fois soumis → vue lecture seule (réponses figées).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'

export interface ClarifyingQuestion {
  header: string
  question: string
  multiSelect: boolean
  options: { label: string; description?: string }[]
}

export interface ClarifyingQuestions {
  questions: ClarifyingQuestion[]
  answered?: string   // récap des réponses une fois soumis (= lecture seule)
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
  const [answers, setAnswers] = useState<Answer[]>(() => qs.map(() => ({ selected: [], other: '' })))

  const answered = data.answered !== undefined

  // ── Vue lecture seule (déjà répondu) — rendue depuis le récap persisté ──
  if (answered) {
    const lines = (data.answered ?? '')
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => {
        const [q, ...rest] = l.replace(/^[-\s]+/, '').split(' → ')
        return { q, ans: rest.join(' → ') }
      })
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={checkBadge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
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

  const toggle = (label: string) => {
    setAnswers(prev => prev.map((ans, i) => {
      if (i !== page) return ans
      if (q.multiSelect) {
        const has = ans.selected.includes(label)
        return { ...ans, selected: has ? ans.selected.filter(l => l !== label) : [...ans.selected, label] }
      }
      return { ...ans, selected: ans.selected[0] === label ? [] : [label] }
    }))
  }

  const setOther = (val: string) => {
    setAnswers(prev => prev.map((ans, i) => i === page ? { ...ans, other: val } : ans))
  }

  const submit = () => {
    const lines = qs.map((qq, i) => {
      const ans = answers[i]
      const parts = [...ans.selected]
      if (ans.other.trim()) parts.push(ans.other.trim())
      return `- ${qq.question} → ${parts.length ? parts.join(', ') : '(sans réponse)'}`
    })
    onSubmit(`Mes réponses :\n${lines.join('\n')}`)
  }

  return (
    <div style={cardStyle}>
      {/* En-tête : chip + pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={chip}>{q.header}</span>
        {qs.length > 1 && (
          <span style={{ fontSize: 11, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>
            {page + 1} sur {qs.length}
          </span>
        )}
      </div>

      {/* Question */}
      <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--ai-text)', lineHeight: 1.35, fontFamily: 'Syne,sans-serif' }}>
        {q.question}
      </p>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {q.options.map((opt, i) => {
          const sel = a.selected.includes(opt.label)
          return (
            <button
              key={i}
              onClick={() => toggle(opt.label)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 9, textAlign: 'left',
                width: '100%', padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
                border: `1px solid ${sel ? 'var(--ai-accent, #3C90D5)' : 'var(--ai-border)'}`,
                background: sel ? 'rgba(60,144,213,0.10)' : 'var(--ai-bg2)',
                transition: 'border-color 0.12s, background 0.12s',
              }}
            >
              <span style={{
                marginTop: 1, width: 17, height: 17, flexShrink: 0,
                borderRadius: q.multiSelect ? 5 : '50%',
                border: `1.5px solid ${sel ? '#3C90D5' : 'var(--ai-dim)'}`,
                background: sel ? '#3C90D5' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ai-text)' }}>{opt.label}</span>
                {opt.description && (
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ai-dim)', marginTop: 1, lineHeight: 1.35 }}>{opt.description}</span>
                )}
              </span>
            </button>
          )
        })}

        {/* Autre — réponse libre */}
        <input
          value={a.other}
          onChange={e => setOther(e.target.value)}
          placeholder="Autre…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 11, boxSizing: 'border-box',
            border: `1px solid ${a.other.trim() ? 'var(--ai-accent, #3C90D5)' : 'var(--ai-border)'}`,
            background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13,
            fontFamily: 'DM Sans,sans-serif', outline: 'none',
          }}
        />
      </div>

      {/* Pied : Précédent / Suivant ou Envoyer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
            border: 'none', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer',
            color: page === 0 ? 'var(--ai-border)' : 'var(--ai-mid)', fontSize: 12, fontWeight: 600,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Précédent
        </button>

        <button
          onClick={() => { if (isLast) submit(); else setPage(p => p + 1) }}
          disabled={!canProceed}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed',
            background: canProceed ? '#3C90D5' : 'var(--ai-border)', color: '#fff',
            fontSize: 12.5, fontWeight: 700, fontFamily: 'Syne,sans-serif',
            boxShadow: canProceed ? '0 3px 10px rgba(60,144,213,0.34)' : 'none',
          }}
        >
          {isLast ? 'Envoyer' : 'Suivant'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {isLast ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M9 18l6-6-6-6" />}
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  border: '1px solid var(--ai-border)', borderRadius: 16, padding: 14,
  background: 'var(--ai-bg)', marginTop: 4,
}
const chip: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--ai-mid)', background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
  padding: '3px 8px', borderRadius: 6, fontFamily: 'DM Sans,sans-serif',
}
const checkBadge: React.CSSProperties = {
  width: 18, height: 18, borderRadius: '50%', background: '#3C90D5', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
