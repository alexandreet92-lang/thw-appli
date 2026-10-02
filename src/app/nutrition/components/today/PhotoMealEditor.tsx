'use client'
// Flux « Photo IA » (createPortal). L'analyse DÉCOMPOSE le plat en ingrédients (comptes pour
// les aliments comptables) ; chaque quantité est un PREMIER JET estimé, confirmable. Les
// macros par ingrédient sont ancrées côté API (common-foods). Édition de la quantité/compte
// → recalcul live (proportionnel). À la confirmation, chaque ingrédient devient un aliment.
// Analyse RÉELLE via /api/analyze-meal-photo ; aucun résultat inventé (état d'erreur clair).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MacroDonut } from './MacroDonut'
import { useI18n } from '@/lib/i18n'
import { MSheet, SheetHeader, useIsMobile } from '@/components/ai/mobile/MobileKit'
import { useSheetClose, M_INPUT, M_SHEET_CSS, SheetBody, SheetFooter, MButton, SoftGroup, SoftRow } from '../mobile/ui'

interface ApiItem { name: string; qty: number; unit: string; estimated: boolean; kcal: number; prot: number; gluc: number; lip: number }
interface ApiResult { meal_name: string; items: ApiItem[]; totals: { kcal: number; prot: number; gluc: number; lip: number }; score?: number | null; advice?: string | null }
export interface ConfirmFood { name: string; qty: string; unit: string; kcal: number; prot: number; gluc: number; lip: number }
export interface PhotoConfirm { items: ConfirmFood[]; photoUrl: string; score: number | null; advice: string | null }

interface Row extends ApiItem { baseQty: number; baseKcal: number; baseProt: number; baseGluc: number; baseLip: number }

async function resize(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = rej
    fr.onload = ev => {
      const img = new Image(); img.onerror = rej
      img.onload = () => {
        const MAX = 1024; let w = img.width, h = img.height
        if (w > MAX || h > MAX) { if (w >= h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h
        const ctx = cv.getContext('2d'); if (!ctx) { rej(new Error('ctx')); return }
        ctx.drawImage(img, 0, 0, w, h)
        res({ base64: cv.toDataURL('image/jpeg', 0.82).split(',')[1], mimeType: 'image/jpeg' })
      }
      img.src = ev.target?.result as string
    }
    fr.readAsDataURL(file)
  })
}

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const inp: React.CSSProperties = { padding: '7px 9px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13, outline: 'none', boxSizing: 'border-box' }

interface Props { file: File; onCancel: () => void; onConfirm: (r: PhotoConfirm) => void }

export function PhotoMealEditor(props: Props) {
  const mobile = useIsMobile()
  return mobile ? <PhotoMealEditorMobile {...props} /> : <PhotoMealEditorDesktop {...props} />
}

// Analyse réelle de la photo + lignes éditables (partagées bureau / mobile).
function usePhotoAnalysis(file: File) {
  const { t: tr } = useI18n()
  const [preview, setPreview] = useState('')
  const [analyzing, setAnalyzing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [advice, setAdvice] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file); setPreview(url)
    let cancel = false
    void (async () => {
      try {
        const { base64, mimeType } = await resize(file)
        const r = await fetch('/api/analyze-meal-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, mimeType }) })
        if (!r.ok) throw new Error(String(r.status))
        const data = await r.json() as ApiResult
        if (cancel) return
        setRows((data.items ?? []).map(it => ({ ...it, baseQty: it.qty || 1, baseKcal: it.kcal, baseProt: it.prot, baseGluc: it.gluc, baseLip: it.lip })))
        setScore(typeof data.score === 'number' ? data.score : null)
        setAdvice(data.advice ?? null)
      } catch { if (!cancel) setError(tr('nutrition.photo.analyzeError')) }
      finally { if (!cancel) setAnalyzing(false) }
    })()
    return () => { cancel = true; URL.revokeObjectURL(url) }
  }, [file])

  function setQty(i: number, q: number) {
    setRows(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const ratio = it.baseQty > 0 ? q / it.baseQty : 1
      return { ...it, qty: q, estimated: false, kcal: Math.round(it.baseKcal * ratio), prot: Math.round(it.baseProt * ratio), gluc: Math.round(it.baseGluc * ratio), lip: Math.round(it.baseLip * ratio) }
    }))
  }
  function setName(i: number, name: string) { setRows(prev => prev.map((it, idx) => idx === i ? { ...it, name } : it)) }

  const t = rows.reduce((a, it) => ({ kcal: a.kcal + it.kcal, prot: a.prot + it.prot, gluc: a.gluc + it.gluc, lip: a.lip + it.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
  const confirmResult = (): PhotoConfirm => ({ items: rows.map(it => ({ name: it.name.trim() || tr('nutrition.photo.defaultFood'), qty: String(it.qty), unit: it.unit, kcal: it.kcal, prot: it.prot, gluc: it.gluc, lip: it.lip })), photoUrl: preview, score, advice })
  return { preview, analyzing, error, rows, score, advice, setQty, setName, t, confirmResult }
}

// Mobile : feuille MSheet plein écran — photo + donut, aliments détectés en
// liste groupée (nom · quantité · kcal), total, avis IA, « Confirmer » cyan.
function PhotoMealEditorMobile({ file, onCancel, onConfirm }: Props) {
  const { t: tr } = useI18n()
  const [open, requestClose] = useSheetClose(onCancel)
  const { preview, analyzing, error, rows, score, advice, setQty, setName, t, confirmResult } = usePhotoAnalysis(file)
  const canConfirm = !analyzing && !error && t.kcal > 0
  return (
    <MSheet open={open} onClose={requestClose} zIndex={18700} label={tr('nutrition.today.photoAI')}>
      <style>{M_SHEET_CSS + '@keyframes pmaPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){.pma-skel{animation:none!important}}'}</style>
      <SheetHeader leftLabel={tr('nutrition.common.cancel')} onLeft={requestClose} title={tr('nutrition.today.photoAI')}
        rightLabel={tr('nutrition.common.confirm')} onRight={() => onConfirm(confirmResult())} rightDisabled={!canConfirm} />
      <SheetBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={tr('nutrition.photo.mealAlt')} style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: 'var(--r-lg)', flexShrink: 0 }} />
          )}
          {analyzing ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="pma-skel" style={{ height: 84, width: 84, borderRadius: '50%', background: 'var(--surface-chip)', animation: 'pmaPulse 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{tr('nutrition.ai.analyzing')}</span>
            </div>
          ) : !error && <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={96} />}
        </div>

        {error ? (
          <p style={{ margin: '0 4px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{error}</p>
        ) : analyzing ? (
          <SoftGroup>
            {[0, 1, 2].map(i => (
              <SoftRow key={i} first={i === 0}><span className="pma-skel" style={{ height: 16, width: `${70 - i * 12}%`, borderRadius: 'var(--r-sm)', background: 'var(--surface-bar)', animation: 'pmaPulse 1.4s ease-in-out infinite' }} /></SoftRow>
            ))}
          </SoftGroup>
        ) : <>
          <p style={{ margin: '4px 4px -6px', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{tr('nutrition.photo.detected')}</p>
          <SoftGroup>
            {rows.map((it, i) => (
              <SoftRow key={i} first={i === 0} style={{ gap: 8 }}>
                <input className="ntm-in" value={it.name} onChange={ev => setName(i, ev.target.value)} aria-label={tr('nutrition.food.name')}
                  style={{ ...M_INPUT, flex: 1, minHeight: 44, background: 'transparent', padding: '0 4px', fontWeight: 600 }} />
                <input className="ntm-in" type="number" inputMode="decimal" value={it.qty} aria-label={tr('nutrition.food.quantity')}
                  onChange={ev => setQty(i, Math.max(0, parseFloat(ev.target.value) || 0))}
                  style={{ ...M_INPUT, width: 72, minHeight: 44, flex: '0 0 auto', textAlign: 'right', padding: '0 10px', background: 'var(--surface-card)' }} />
                <span style={{ width: 34, flexShrink: 0, fontSize: 13, color: 'var(--text-dim)' }}>{it.unit}</span>
                <span style={{ width: 64, flexShrink: 0, textAlign: 'right', fontSize: 14, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{it.kcal} kcal</span>
              </SoftRow>
            ))}
          </SoftGroup>
          <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.45 }}>{tr('nutrition.photo.estimatedNote')}</p>
          <p style={{ margin: '0 4px', fontSize: 15, color: 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{tr('nutrition.common.total')} {t.kcal} kcal · P {t.prot} · G {t.gluc} · L {t.lip} g</p>
          {advice && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/logo_4bras.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
              <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                {score != null && <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{score}/10 — </span>}{advice}
              </span>
            </div>
          )}
        </>}
      </SheetBody>
      <SheetFooter>
        <MButton onClick={() => onConfirm(confirmResult())} disabled={!canConfirm}>{tr('nutrition.common.confirm')}</MButton>
      </SheetFooter>
    </MSheet>
  )
}

function PhotoMealEditorDesktop({ file, onCancel, onConfirm }: Props) {
  const { t: tr } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onCancel, 280) }
  const { preview, analyzing, error, rows, score, advice, setQty, setName, t } = usePhotoAnalysis(file)

  return createPortal(
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <style>{`@keyframes pmaSpin{to{transform:rotate(360deg)}}`}</style>
      <div onClick={ev => ev.stopPropagation()} style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{tr('nutrition.today.photoAI')}</h2>
          <button onClick={requestClose} aria-label={tr('nutrition.common.close')} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={tr('nutrition.photo.mealAlt')} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
            )}
            {analyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <svg width={64} height={64} style={{ animation: 'pmaSpin 0.9s linear infinite' }}>
                  <circle cx={32} cy={32} r={26} fill="none" stroke="var(--bg-card2)" strokeWidth={7} />
                  <circle cx={32} cy={32} r={26} fill="none" stroke="var(--primary)" strokeWidth={7} strokeDasharray={`${0.28 * 2 * Math.PI * 26} ${2 * Math.PI * 26}`} strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>{tr('nutrition.ai.analyzing')}</span>
              </div>
            ) : !error && <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={84} />}
          </div>

          {error ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{error}</p>
          ) : !analyzing && (
            <>
              <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>{tr('nutrition.photo.detected')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input value={it.name} onChange={ev => setName(i, ev.target.value)} style={{ ...inp, flex: 1, minWidth: 0 }} />
                    <input className="tnum" type="number" inputMode="decimal" value={it.qty} onChange={ev => setQty(i, Math.max(0, parseFloat(ev.target.value) || 0))} style={{ ...inp, width: 60, textAlign: 'right' }} />
                    <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', width: 34, flexShrink: 0 }}>{it.unit}</span>
                    <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', width: 52, textAlign: 'right', flexShrink: 0 }}>{it.kcal} kcal</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', margin: 'var(--space-2) 0 0' }}>{tr('nutrition.photo.estimatedNote')}</p>
              <p className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-3) 0 0' }}>{tr('nutrition.common.total')} {t.kcal} kcal · P {t.prot} · G {t.gluc} · L {t.lip} g</p>
              {advice && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logos/logo_4bras.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
                  <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                    {score != null && <span className="tnum" style={{ fontWeight: 600, color: 'var(--text)' }}>{score}/10 — </span>}{advice}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={requestClose} style={{ flex: 1, padding: '13px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{tr('nutrition.common.cancel')}</button>
          <button disabled={analyzing || !!error || t.kcal <= 0}
            onClick={() => onConfirm({ items: rows.map(it => ({ name: it.name.trim() || tr('nutrition.photo.defaultFood'), qty: String(it.qty), unit: it.unit, kcal: it.kcal, prot: it.prot, gluc: it.gluc, lip: it.lip })), photoUrl: preview, score, advice })}
            style={{ flex: 2, padding: '13px', borderRadius: 'var(--r-sm)', border: 'none', cursor: analyzing || error || t.kcal <= 0 ? 'not-allowed' : 'pointer', background: analyzing || error || t.kcal <= 0 ? 'var(--bg-card2)' : 'var(--primary)', color: analyzing || error || t.kcal <= 0 ? 'var(--text-dim)' : 'var(--on-primary)', fontFamily: FB, fontSize: 14, fontWeight: 600 }}>{tr('nutrition.common.confirm')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
