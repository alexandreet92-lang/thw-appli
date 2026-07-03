'use client'
// Feuille « IA » d'ajout de repas : on décrit le repas avec les quantités, l'IA
// (/api/estimate-meal-macros) calcule kcal + macros, on voit le résultat puis on
// VALIDE ou on RECTIFIE les valeurs avant d'enregistrer.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditableFood } from './FoodEditSheet'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

interface Macros { kcal: number; prot: number; gluc: number; lip: number }

export function AiMealSheet({ slotLabel, onClose, onConfirm }: {
  slotLabel: string
  onClose: () => void
  onConfirm: (food: EditableFood) => void
}) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Macros | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  async function analyze() {
    if (!text.trim() || loading) return
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/estimate-meal-macros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      })
      const d = await r.json() as { kcal?: number; proteines?: number; glucides?: number; lipides?: number; error?: string }
      if (!r.ok || d.error) throw new Error(d.error ?? 'Erreur')
      setRes({ kcal: d.kcal ?? 0, prot: d.proteines ?? 0, gluc: d.glucides ?? 0, lip: d.lipides ?? 0 })
    } catch {
      setErr(t('nutrition.ai.analyzeError'))
    } finally { setLoading(false) }
  }

  function setField(k: keyof Macros, v: string) {
    const n = Math.max(0, Math.round(parseFloat(v) || 0))
    setRes(prev => prev ? { ...prev, [k]: n } : prev)
  }

  function validate() {
    if (!res) return
    onConfirm({ name: text.trim(), qty: '1', unit: '', kcal: res.kcal, prot: res.prot, gluc: res.gluc, lip: res.lip })
  }

  const INP: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)',
    fontFamily: FB, fontSize: 15, fontWeight: 600, outline: 'none', textAlign: 'center',
  }
  const ROWS: { k: keyof Macros; label: string; unit: string }[] = [
    { k: 'prot', label: t('nutrition.macro.proteins'), unit: 'g' },
    { k: 'gluc', label: t('nutrition.macro.carbs'), unit: 'g' },
    { k: 'lip', label: t('nutrition.macro.fats'), unit: 'g' },
    { k: 'kcal', label: t('nutrition.macro.calories'), unit: 'kcal' },
  ]

  const close = () => { setClosing(true); setTimeout(onClose, 240) }

  return createPortal(
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'} style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', border: '1px solid var(--border-mid)', borderBottom: 'none', padding: 'var(--space-5)', maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box', willChange: 'transform' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '0 auto var(--space-4)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{t('nutrition.ai.describeMeal')} — {slotLabel}</h3>
          <button onClick={close} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14 }}>✕</button>
        </div>

        <textarea
          value={text}
          onChange={e => { setText(e.target.value); if (res) setRes(null); if (err) setErr(null) }}
          rows={3}
          autoFocus
          placeholder={t('nutrition.ai.mealPlaceholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
        />

        {!res ? (
          <button onClick={() => void analyze()} disabled={loading || !text.trim()}
            style={{ marginTop: 'var(--space-3)', width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? 'var(--border)' : 'var(--ai-accent)', color: '#fff', fontFamily: FD, fontWeight: 700, fontSize: 14, cursor: loading || !text.trim() ? 'default' : 'pointer', opacity: !text.trim() ? 0.5 : 1 }}>
            {loading ? t('nutrition.ai.analyzing') : t('nutrition.ai.analyzeBtn')}
          </button>
        ) : (
          <>
            <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-4) 0 var(--space-2)' }}>
              {t('nutrition.ai.estimatedResult')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
              {ROWS.map(r => (
                <div key={r.k}>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 4 }}>{r.label}</label>
                  <input type="number" inputMode="numeric" min={0} value={res[r.k]} onChange={e => setField(r.k, e.target.value)} style={INP} />
                  <p style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', margin: '3px 0 0' }}>{r.unit}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button onClick={() => setRes(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('nutrition.ai.restart')}</button>
              <button onClick={validate} style={{ flex: 2, padding: 12, borderRadius: 10, background: 'var(--primary)', border: 'none', color: 'var(--on-primary, #06121A)', fontFamily: FD, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{t('nutrition.validate')}</button>
            </div>
          </>
        )}

        {err && <p style={{ fontFamily: FB, fontSize: 12, color: '#ef4444', margin: 'var(--space-2) 0 0' }}>{err}</p>}
      </div>
    </div>,
    document.body,
  )
}
