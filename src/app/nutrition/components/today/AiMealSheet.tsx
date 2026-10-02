'use client'
// Feuille « IA » d'ajout de repas : on décrit le repas avec les quantités, l'IA
// (/api/estimate-meal-macros) calcule kcal + macros, on voit le résultat puis on
// VALIDE ou on RECTIFIE les valeurs avant d'enregistrer.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditableFood } from './FoodEditSheet'
import { useI18n } from '@/lib/i18n'
import { MSheet, SheetHeader, useIsMobile } from '@/components/ai/mobile/MobileKit'
import { useSheetClose, M_INPUT, M_SHEET_CSS, MField, SheetBody, SheetFooter, MButton } from '../mobile/ui'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

interface Macros { kcal: number; prot: number; gluc: number; lip: number }

interface Props {
  slotLabel: string
  onClose: () => void
  onConfirm: (food: EditableFood) => void
}

export function AiMealSheet(props: Props) {
  const mobile = useIsMobile()
  return mobile ? <AiMealSheetMobile {...props} /> : <AiMealSheetDesktop {...props} />
}

// Analyse IA + rectification (partagées bureau / mobile).
function useAiMeal(onConfirm: Props['onConfirm']) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Macros | null>(null)
  const [err, setErr] = useState<string | null>(null)

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
  return { text, setText, loading, res, setRes, err, setErr, analyze, setField, validate }
}

// Mobile : feuille MSheet (Annuler / titre / Valider), champ doux, macros en grille.
function AiMealSheetMobile({ slotLabel, onClose, onConfirm }: Props) {
  const { t } = useI18n()
  const [open, requestClose] = useSheetClose(onClose)
  const { text, setText, loading, res, setRes, err, setErr, analyze, setField, validate } = useAiMeal(onConfirm)
  const ROWS: { k: keyof Macros; label: string; unit: string }[] = [
    { k: 'prot', label: t('nutrition.macro.proteins'), unit: 'g' },
    { k: 'gluc', label: t('nutrition.macro.carbs'), unit: 'g' },
    { k: 'lip', label: t('nutrition.macro.fats'), unit: 'g' },
    { k: 'kcal', label: t('nutrition.macro.calories'), unit: 'kcal' },
  ]
  return (
    <MSheet open={open} onClose={requestClose} full={false} zIndex={18700} label={t('nutrition.ai.describeMeal')}>
      <style>{M_SHEET_CSS}</style>
      <SheetHeader leftLabel={t('nutrition.common.cancel')} onLeft={requestClose} title={slotLabel}
        rightLabel={res ? t('nutrition.validate') : undefined} onRight={res ? validate : undefined} />
      <SheetBody>
        <MField label={t('nutrition.ai.describeMeal')}>
          <textarea className="ntm-in" value={text} rows={4} autoFocus placeholder={t('nutrition.ai.mealPlaceholder')}
            onChange={e => { setText(e.target.value); if (res) setRes(null); if (err) setErr(null) }}
            style={{ ...M_INPUT, padding: '12px 14px', minHeight: 112, resize: 'none', lineHeight: 1.45 }} />
        </MField>
        {res && <>
          <p style={{ margin: '0 4px', fontSize: 15, color: 'var(--text-mid)' }}>{t('nutrition.ai.estimatedResult')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {ROWS.map(r => (
              <MField key={r.k} label={r.label} unit={r.unit}>
                <input className="ntm-in" type="number" inputMode="numeric" min={0} value={res[r.k]} onChange={e => setField(r.k, e.target.value)}
                  style={{ ...M_INPUT, paddingRight: r.unit === 'kcal' ? 52 : 32, textAlign: 'right', fontWeight: 700 }} />
              </MField>
            ))}
          </div>
        </>}
        {err && <p style={{ margin: '0 4px', fontSize: 14, color: 'var(--danger)' }}>{err}</p>}
      </SheetBody>
      <SheetFooter>
        {!res ? (
          <MButton onClick={() => void analyze()} disabled={loading || !text.trim()}>
            {loading ? t('nutrition.ai.analyzing') : t('nutrition.ai.analyzeBtn')}
          </MButton>
        ) : <>
          <MButton onClick={validate}>{t('nutrition.validate')}</MButton>
          <MButton variant="soft" onClick={() => setRes(null)}>{t('nutrition.ai.restart')}</MButton>
        </>}
      </SheetFooter>
    </MSheet>
  )
}

function AiMealSheetDesktop({ slotLabel, onClose, onConfirm }: Props) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)
  const { text, setText, loading, res, setRes, err, setErr, analyze, setField, validate } = useAiMeal(onConfirm)

  const INP: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 'var(--r-sm)',
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
          <button onClick={close} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '4px 10px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14 }}>✕</button>
        </div>

        <textarea
          value={text}
          onChange={e => { setText(e.target.value); if (res) setRes(null); if (err) setErr(null) }}
          rows={3}
          autoFocus
          placeholder={t('nutrition.ai.mealPlaceholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
        />

        {!res ? (
          <button onClick={() => void analyze()} disabled={loading || !text.trim()}
            style={{ marginTop: 'var(--space-3)', width: '100%', padding: 13, borderRadius: 'var(--r-sm)', border: 'none', background: loading ? 'var(--border)' : 'var(--ai-accent)', color: '#fff', fontFamily: FD, fontWeight: 700, fontSize: 14, cursor: loading || !text.trim() ? 'default' : 'pointer', opacity: !text.trim() ? 0.5 : 1 }}>
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
              <button onClick={() => setRes(null)} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('nutrition.ai.restart')}</button>
              <button onClick={validate} style={{ flex: 2, padding: 12, borderRadius: 'var(--r-sm)', background: 'var(--primary)', border: 'none', color: 'var(--on-primary, #06121A)', fontFamily: FD, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{t('nutrition.validate')}</button>
            </div>
          </>
        )}

        {err && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--danger)', margin: 'var(--space-2) 0 0' }}>{err}</p>}
      </div>
    </div>,
    document.body,
  )
}
