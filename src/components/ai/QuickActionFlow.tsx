'use client'
// ══════════════════════════════════════════════════════════════════
// QuickActionFlow — LE mécanisme unique des actions rapides.
// Chaque action rapide (déclarée dans QUICK_ACTION_SPECS) est jouée par CE
// composant : un mini-assistant à cartes natives (comme « Créer une séance »).
// Il pose une à une les questions décisives de la spec (boutons + « Autre »
// en champ libre), puis compose UN prompt clair (objectif + réponses + livrable)
// et lance la génération. Zéro texte balancé au chat, zéro dépendance à ce que
// l'IA veuille bien demander : la logique est la même pour TOUTES les actions.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import type { QuickActionSpec } from '@/lib/quick-actions/specs'

const GRAD = 'linear-gradient(135deg,#06B6D4,#3B82F6)'

// Une question peut être : à choix unique, à choix multiple (note « plusieurs
// choix possibles »), ou libre (pas d'options). Toutes acceptent un « Autre ».
function isMulti(note?: string) { return !!note && /plusieurs|multiple/i.test(note) }

export function QuickActionFlow({ spec, label, onCancel, onGenerate }: {
  spec: QuickActionSpec
  label: string
  onCancel: () => void
  onGenerate: (displayLabel: string, prompt: string) => void
}) {
  const questions = spec.questions
  const [step, setStep] = useState(0)
  // Réponses : par index de question → { choices:string[], other:string }.
  const [answers, setAnswers] = useState<Record<number, { choices: string[]; other: string }>>({})
  const total = questions.length

  const cur = questions[step]
  const curAns = answers[step] ?? { choices: [], other: '' }
  const multi = cur ? isMulti(cur.note) : false
  const hasOptions = !!cur?.options?.length

  const setChoices = (choices: string[]) => setAnswers(a => ({ ...a, [step]: { ...curAns, choices } }))
  const setOther = (other: string) => setAnswers(a => ({ ...a, [step]: { ...curAns, other } }))

  const toggle = (opt: string) => {
    if (multi) setChoices(curAns.choices.includes(opt) ? curAns.choices.filter(o => o !== opt) : [...curAns.choices, opt])
    else setChoices(curAns.choices[0] === opt ? [] : [opt])
  }

  // Une étape est « répondue » si un choix OU un texte libre est présent. Les
  // questions optionnelles (note « optionnel ») peuvent être sautées.
  const optional = !!cur?.note && /optionnel/i.test(cur.note)
  const answered = curAns.choices.length > 0 || curAns.other.trim().length > 0
  const canNext = optional || answered || !hasOptions // question libre : « Suivant » toujours possible (peut rester vide)
  const isLast = step >= total - 1

  const finalPrompt = useMemo(() => {
    const lines = questions.map((q, i) => {
      const a = answers[i] ?? { choices: [], other: '' }
      const parts = [...a.choices, ...(a.other.trim() ? [a.other.trim()] : [])]
      return parts.length ? `- ${q.q} → ${parts.join(', ')}` : null
    }).filter(Boolean)
    return [
      `[ACTION RAPIDE] Objectif : ${spec.objective}`,
      lines.length ? `\nMes réponses :\n${lines.join('\n')}` : '',
      "\nAdapte-toi à MON niveau, MES données (profil, zones, historique, calendrier) et NE me redemande pas ce que je viens de répondre. Si un point vraiment décisif manque encore, pose-le brièvement, sinon génère directement.",
      `\nRésultat attendu : ${spec.produce}`,
    ].filter(Boolean).join('\n')
  }, [questions, answers, spec])

  const generate = () => onGenerate(label, finalPrompt)

  // Aucune question → génération directe (une seule carte de confirmation).
  const single = (
    <div style={{ background: 'var(--ai-surface, var(--bg-card))', border: '1px solid var(--ai-border, var(--border))', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: GRAD, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Sparkles size={17} color="#fff" /></span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ai-text, var(--text))', fontFamily: 'Syne, sans-serif' }}>{label}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ai-dim, var(--text-dim))', lineHeight: 1.4 }}>{spec.objective}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={btnGhost}>Annuler</button>
        <button onClick={generate} style={btnPrimary}><Sparkles size={14} /> Générer</button>
      </div>
    </div>
  )

  if (total === 0) return single

  return (
    <div style={{ background: 'var(--ai-surface, var(--bg-card))', border: '1px solid var(--ai-border, var(--border))', borderRadius: 16, padding: 18, animation: 'ai_slidein 0.2s ease' }}>
      {/* En-tête : action + progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: GRAD, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Sparkles size={16} color="#fff" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--ai-text, var(--text))', fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
          <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'var(--ai-border, var(--border))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((step + 1) / total) * 100}%`, background: GRAD, borderRadius: 999, transition: 'width .3s' }} />
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim, var(--text-dim))', flexShrink: 0 }}>{step + 1}/{total}</span>
      </div>

      {/* Question courante */}
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ai-text, var(--text))' }}>{cur.q}</p>
      {cur.note && <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ai-dim, var(--text-dim))' }}>{cur.note}</p>}
      {!cur.note && <div style={{ height: 10 }} />}

      {/* Options en cartes-boutons */}
      {hasOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
          {cur.options!.map(opt => {
            const on = curAns.choices.includes(opt)
            return (
              <button key={opt} onClick={() => toggle(opt)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-border, var(--border))'}`, background: on ? 'color-mix(in srgb, #3B82F6 12%, transparent)' : 'var(--ai-surface2, var(--bg-card2))', color: 'var(--ai-text, var(--text))', fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'border-color .12s, background .12s' }}>
                <span style={{ width: 18, height: 18, borderRadius: multi ? 5 : '50%', border: `2px solid ${on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-border, var(--border))'}`, background: on ? 'var(--ai-accent, #3B82F6)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {on && <Check size={12} color="#fff" strokeWidth={3} />}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Champ libre (« Autre » quand il y a des options, sinon réponse libre) */}
      <input
        value={curAns.other}
        onChange={e => setOther(e.target.value)}
        placeholder={hasOptions ? 'Autre — précise…' : 'Ta réponse…'}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--ai-border, var(--border))', background: 'var(--ai-surface2, var(--bg-card2))', color: 'var(--ai-text, var(--text))', fontSize: 14, outline: 'none', marginBottom: 14 }}
      />

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} style={btnGhost}>
          {step === 0 ? 'Annuler' : <><ArrowLeft size={14} /> Précédent</>}
        </button>
        {optional && !answered && (
          <button onClick={() => isLast ? generate() : setStep(s => s + 1)} style={btnGhostDim}>Passer</button>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => isLast ? generate() : setStep(s => s + 1)} disabled={!canNext && !optional}
          style={{ ...btnPrimary, opacity: (!canNext && !optional) ? 0.5 : 1 }}>
          {isLast ? <><Sparkles size={14} /> Générer</> : <>Suivant <ArrowRight size={14} /></>}
        </button>
      </div>
    </div>
  )
}

const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const btnGhost: React.CSSProperties = { ...btnBase, border: '1px solid var(--ai-border, var(--border))', background: 'transparent', color: 'var(--ai-dim, var(--text-mid))' }
const btnGhostDim: React.CSSProperties = { ...btnBase, border: 'none', background: 'transparent', color: 'var(--ai-dim, var(--text-dim))' }
const btnPrimary: React.CSSProperties = { ...btnBase, border: 'none', background: GRAD, color: '#fff', boxShadow: '0 4px 14px rgba(6,182,212,0.35)' }
