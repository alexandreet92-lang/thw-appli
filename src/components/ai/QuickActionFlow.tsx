'use client'
// ══════════════════════════════════════════════════════════════════
// QuickActionFlow — LE moteur unique des actions rapides.
// Chaque action rapide (déclarée dans QUICK_ACTION_SPECS) est jouée par CE
// composant : un assistant à cartes natives (comme « Créer une séance »).
// Il pose une à une les questions COMPLÈTES de la spec — cartes à boutons
// (choix unique/multiple), texte libre, curseur, durée — puis compose UN prompt
// clair (objectif + réponses + livrable) et lance la génération (le résultat
// s'affiche dans le chat : markdown + graphiques). Zéro texte balancé, zéro
// dépendance à ce que l'IA veuille demander : la logique est la même pour TOUTES.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import type { QuickActionSpec, QAItem, QAKind } from '@/lib/quick-actions/specs'

const GRAD = 'linear-gradient(135deg,#06B6D4,#3B82F6)'

function isMulti(note?: string) { return !!note && /plusieurs|multiple/i.test(note) }
function isOptional(note?: string) { return !!note && /optionnel/i.test(note) }
// Type effectif d'une question : explicite, sinon déduit.
function fieldKind(it: QAItem): QAKind {
  if (it.kind) return it.kind
  if (it.durations?.length) return 'duration'
  if (it.options?.length) return isMulti(it.note) ? 'multi' : 'single'
  return 'text'
}
const mmss = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`)

interface Ans { choices: string[]; other: string; text: string; num: number | null }
const emptyAns = (): Ans => ({ choices: [], other: '', text: '', num: null })

export function QuickActionFlow({ spec, label, onCancel, onGenerate }: {
  spec: QuickActionSpec
  label: string
  onCancel: () => void
  onGenerate: (displayLabel: string, prompt: string) => void
}) {
  const questions = spec.questions
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Ans>>({})
  const total = questions.length

  const cur = questions[step]
  const kind = cur ? fieldKind(cur) : 'text'
  const a = answers[step] ?? emptyAns()
  const patch = (p: Partial<Ans>) => setAnswers(s => ({ ...s, [step]: { ...a, ...p } }))

  const toggle = (opt: string) => {
    if (kind === 'multi') patch({ choices: a.choices.includes(opt) ? a.choices.filter(o => o !== opt) : [...a.choices, opt] })
    else patch({ choices: a.choices[0] === opt ? [] : [opt] })
  }

  const optional = isOptional(cur?.note)
  const answered =
    kind === 'text' ? a.text.trim().length > 0
    : kind === 'slider' ? a.num != null
    : kind === 'duration' ? a.num != null || a.other.trim().length > 0
    : a.choices.length > 0 || a.other.trim().length > 0
  const canNext = optional || answered || kind === 'text' // texte : « Suivant » toujours possible (peut rester vide)
  const isLast = step >= total - 1

  const answerText = (it: QAItem, ans: Ans): string => {
    const k = fieldKind(it)
    if (k === 'text') return ans.text.trim()
    if (k === 'slider') return ans.num != null ? String(ans.num) + (it.max ? `/${it.max}` : '') : ''
    if (k === 'duration') return ans.num != null ? mmss(ans.num) : ans.other.trim()
    return [...ans.choices, ...(ans.other.trim() ? [ans.other.trim()] : [])].join(', ')
  }

  const finalPrompt = useMemo(() => {
    const lines = questions.map((q, i) => {
      const t = answerText(q, answers[i] ?? emptyAns())
      return t ? `- ${q.q} → ${t}` : null
    }).filter(Boolean)
    return [
      `[ACTION RAPIDE] Objectif : ${spec.objective}`,
      lines.length ? `\nMes réponses :\n${lines.join('\n')}` : '',
      "\nAdapte-toi à MON niveau, MES données (profil, zones, historique, calendrier) et NE me redemande pas ce que je viens de répondre. Si un point vraiment décisif manque encore, pose-le brièvement, sinon génère directement.",
      `\nRésultat attendu : ${spec.produce}`,
    ].filter(Boolean).join('\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, answers, spec])

  const generate = () => onGenerate(label, finalPrompt)

  // Aucune question → carte de confirmation + génération directe.
  if (total === 0) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={badge}><Sparkles size={17} color="#fff" /></span>
          <div style={{ minWidth: 0 }}>
            <p style={titleTxt}>{label}</p>
            <p style={subTxt}>{spec.objective}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={btnGhost}>Annuler</button>
          <button onClick={generate} style={btnPrimary}><Sparkles size={14} /> Générer</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...card, animation: 'ai_slidein 0.2s ease' }}>
      {/* En-tête : action + progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={badge}><Sparkles size={16} color="#fff" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...titleTxt, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
          <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'var(--ai-border, var(--border))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((step + 1) / total) * 100}%`, background: GRAD, borderRadius: 999, transition: 'width .3s' }} />
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim, var(--text-dim))', flexShrink: 0 }}>{step + 1}/{total}</span>
      </div>

      {/* Question */}
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ai-text, var(--text))' }}>{cur.q}</p>
      {cur.note && <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ai-dim, var(--text-dim))' }}>{cur.note}</p>}
      {!cur.note && <div style={{ height: 10 }} />}

      {/* ── Champs par type ── */}
      {(kind === 'single' || kind === 'multi') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
          {cur.options!.map(opt => {
            const on = a.choices.includes(opt)
            return (
              <button key={opt} onClick={() => toggle(opt)} style={optBtn(on)}>
                <span style={optMark(on, kind === 'multi')}>{on && <Check size={12} color="#fff" strokeWidth={3} />}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {kind === 'duration' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {(cur.durations ?? [30, 45, 60, 90]).map(m => {
            const on = a.num === m
            return (
              <button key={m} onClick={() => patch({ num: on ? null : m, other: '' })} style={pill(on)}>{mmss(m)}</button>
            )
          })}
        </div>
      )}

      {kind === 'slider' && (
        <div style={{ marginBottom: 14 }}>
          <input type="range" min={cur.min ?? 1} max={cur.max ?? 5} step={1} value={a.num ?? Math.round(((cur.min ?? 1) + (cur.max ?? 5)) / 2)}
            onChange={e => patch({ num: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#3B82F6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ai-dim, var(--text-dim))', marginTop: 4 }}>
            <span>{cur.minLabel ?? (cur.min ?? 1)}</span>
            <span style={{ fontWeight: 800, color: 'var(--ai-accent, #3B82F6)', fontSize: 14 }}>{a.num ?? '—'}</span>
            <span>{cur.maxLabel ?? (cur.max ?? 5)}</span>
          </div>
        </div>
      )}

      {/* Texte : champ « Autre » (si options) OU réponse libre (sinon) */}
      {(kind === 'single' || kind === 'multi' || kind === 'text' || kind === 'duration') && (
        kind === 'text' && cur.multiline
          ? <textarea value={a.text} onChange={e => patch({ text: e.target.value })} placeholder="Ta réponse…" rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 14 }} />
          : <input
              value={kind === 'text' ? a.text : a.other}
              onChange={e => patch(kind === 'text' ? { text: e.target.value } : { other: e.target.value })}
              placeholder={kind === 'text' ? 'Ta réponse…' : (kind === 'duration' ? 'Autre durée…' : 'Autre — précise…')}
              style={{ ...inp, marginBottom: 14 }} />
      )}

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

// ── Styles ──
const card: React.CSSProperties = { background: 'var(--ai-surface, var(--bg-card))', border: '1px solid var(--ai-border, var(--border))', borderRadius: 16, padding: 18 }
const badge: React.CSSProperties = { width: 32, height: 32, borderRadius: 10, background: GRAD, display: 'grid', placeItems: 'center', flexShrink: 0 }
const titleTxt: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ai-text, var(--text))', fontFamily: 'Syne, sans-serif' }
const subTxt: React.CSSProperties = { margin: '2px 0 0', fontSize: 12.5, color: 'var(--ai-dim, var(--text-dim))', lineHeight: 1.4 }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--ai-border, var(--border))', background: 'var(--ai-surface2, var(--bg-card2))', color: 'var(--ai-text, var(--text))', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
function optBtn(on: boolean): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-border, var(--border))'}`, background: on ? 'color-mix(in srgb, #3B82F6 12%, transparent)' : 'var(--ai-surface2, var(--bg-card2))', color: 'var(--ai-text, var(--text))', fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'border-color .12s, background .12s' }
}
function optMark(on: boolean, multi: boolean): React.CSSProperties {
  return { width: 18, height: 18, borderRadius: multi ? 5 : '50%', border: `2px solid ${on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-border, var(--border))'}`, background: on ? 'var(--ai-accent, #3B82F6)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }
}
function pill(on: boolean): React.CSSProperties {
  return { padding: '9px 15px', borderRadius: 999, border: `1.5px solid ${on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-border, var(--border))'}`, background: on ? 'color-mix(in srgb, #3B82F6 14%, transparent)' : 'var(--ai-surface2, var(--bg-card2))', color: on ? 'var(--ai-accent, #3B82F6)' : 'var(--ai-text, var(--text))', fontSize: 13.5, fontWeight: on ? 700 : 500, cursor: 'pointer' }
}
const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const btnGhost: React.CSSProperties = { ...btnBase, border: '1px solid var(--ai-border, var(--border))', background: 'transparent', color: 'var(--ai-dim, var(--text-mid))' }
const btnGhostDim: React.CSSProperties = { ...btnBase, border: 'none', background: 'transparent', color: 'var(--ai-dim, var(--text-dim))' }
const btnPrimary: React.CSSProperties = { ...btnBase, border: 'none', background: GRAD, color: '#fff', boxShadow: '0 4px 14px rgba(6,182,212,0.35)' }
