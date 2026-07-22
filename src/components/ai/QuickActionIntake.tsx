'use client'
// ══════════════════════════════════════════════════════════════════
// QuickActionIntake — moteur unique des actions rapides (mélange auto).
//   Lit une QuickActionSpec (questions déclaratives) et choisit le rendu :
//     • 0 question   → envoi direct (aucune UI)
//     • 1-4 questions → guidé, une question à la fois (façon « l'IA me demande »)
//     • 5+ questions  → mini-formulaire compact (tout d'un coup)
//   À la fin : assemble le prompt et le renvoie via onSubmit (→ send()).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { QAQuestion, QuickActionSpec } from '@/lib/quick-actions/specs'

const ACCENT = '#8b5cf6'

function initialAnswers(qs: QAQuestion[]): Record<string, string> {
  const a: Record<string, string> = {}
  for (const q of qs) a[q.id] = q.default ?? ''
  return a
}

export function QuickActionIntake({ spec, label, isMobile, onSubmit, onClose }: {
  spec: QuickActionSpec; label: string; isMobile: boolean
  onSubmit: (prompt: string) => void; onClose: () => void
}) {
  const questions = spec.questions
  const mode: 'form' | 'stepped' = questions.length > 4 ? 'form' : 'stepped'
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAnswers(questions))
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // 0 question → on envoie directement, sans afficher d'UI.
  useEffect(() => {
    if (questions.length === 0) { onSubmit(spec.assemble({})); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (id: string, v: string) => setAnswers(a => ({ ...a, [id]: v }))
  const toggleMulti = (id: string, opt: string) => setAnswers(a => {
    const cur = a[id] ? a[id].split(', ').filter(Boolean) : []
    const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]
    return { ...a, [id]: next.join(', ') }
  })

  const answered = (q: QAQuestion) => q.optional || (answers[q.id] ?? '').trim().length > 0
  const canFinish = useMemo(() => questions.every(answered), [answers]) // eslint-disable-line react-hooks/exhaustive-deps

  if (questions.length === 0 || !mounted) return null

  const finish = () => onSubmit(spec.assemble(answers))

  // ── Rendu d'une question ──────────────────────────────────────────
  const renderQuestion = (q: QAQuestion) => {
    const val = answers[q.id] ?? ''
    return (
      <div key={q.id} style={{ marginBottom: mode === 'form' ? 18 : 0 }}>
        <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: mode === 'stepped' ? 17 : 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{q.q}</p>
        {q.hint && <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>{q.hint}</p>}
        {!q.hint && <div style={{ height: 8 }} />}

        {q.type === 'choice' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(q.options ?? []).map(o => {
              const on = val === o
              return <button key={o} type="button" onClick={() => set(q.id, o)}
                style={pill(on)}>{o}</button>
            })}
          </div>
        )}

        {q.type === 'multi' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(q.options ?? []).map(o => {
              const on = (val ? val.split(', ') : []).includes(o)
              return <button key={o} type="button" onClick={() => toggleMulti(q.id, o)}
                style={pill(on)}>{o}</button>
            })}
          </div>
        )}

        {q.type === 'number' && (() => {
          const n = parseInt(val) || q.min || 0
          const dec = () => set(q.id, String(Math.max(q.min ?? 0, n - (q.step ?? 1))))
          const inc = () => set(q.id, String(Math.min(q.max ?? 9999, n + (q.step ?? 1))))
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" onClick={dec} style={stepBtn}>−</button>
              <span style={{ minWidth: 40, textAlign: 'center', fontFamily: 'DM Sans,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{n}</span>
              <button type="button" onClick={inc} style={stepBtn}>+</button>
              {q.unit && <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{q.unit}</span>}
            </div>
          )
        })()}

        {q.type === 'text' && (
          <input value={val} onChange={e => set(q.id, e.target.value)} placeholder={q.placeholder}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, outline: 'none' }} />
        )}
      </div>
    )
  }

  const cur = questions[step]

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 12500, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : 'min(520px, 94vw)', maxHeight: isMobile ? '88vh' : '86vh',
          background: 'var(--bg-card)', color: 'var(--text)',
          borderRadius: isMobile ? '22px 22px 0 0' : 18, border: '1px solid var(--border-mid)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* En-tête */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{label}</p>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {spec.intro && <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12.5, color: 'var(--text-mid)', margin: '6px 0 0', lineHeight: 1.5 }}>{spec.intro}</p>}
          {mode === 'stepped' && (
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? ACCENT : 'var(--border)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
          {mode === 'form' ? questions.map(renderQuestion) : renderQuestion(cur)}
        </div>

        {/* Pied */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {mode === 'stepped' ? (
            <>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={btnGhost}>Précédent</button>
              )}
              <div style={{ flex: 1 }} />
              {step < questions.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!answered(cur)} style={btnPrimary(answered(cur))}>Suivant</button>
              ) : (
                <button onClick={finish} disabled={!answered(cur)} style={btnPrimary(answered(cur))}>Générer</button>
              )}
            </>
          ) : (
            <>
              <div style={{ flex: 1 }} />
              <button onClick={finish} disabled={!canFinish} style={btnPrimary(canFinish)}>Générer</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Styles ──────────────────────────────────────────────────────────
function pill(on: boolean): React.CSSProperties {
  return {
    border: `1.5px solid ${on ? ACCENT : 'var(--border)'}`, background: on ? `${ACCENT}14` : 'var(--bg-card2)',
    color: on ? ACCENT : 'var(--text-mid)', borderRadius: 999, padding: '8px 14px',
    fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }
}
const stepBtn: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)',
  color: 'var(--text)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const btnGhost: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'transparent',
  color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
}
function btnPrimary(enabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: enabled ? ACCENT : 'var(--border)', color: enabled ? '#fff' : 'var(--text-dim)',
    fontFamily: 'DM Sans,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: enabled ? 'pointer' : 'default',
  }
}
