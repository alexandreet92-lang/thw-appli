'use client'
// Flux « Photo IA » (createPortal). Image affichée à côté + donut qui se remplit pendant
// l'analyse (CSS, 60fps). Résultat rectifiable : description éditable + quantités éditables
// (recalcul kcal/macros proportionnel) → Annuler / Confirmer (var(--primary)).
// Analyse RÉELLE via /api/analyze-meal-photo ; aucun résultat inventé (état d'erreur clair).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MacroDonut } from './MacroDonut'

interface Item { name: string; qty: number; unit: string; kcal: number }
interface ApiResult { meal_name: string; items: Item[]; totals: { kcal: number; prot: number; gluc: number; lip: number }; confidence: string; notes?: string | null }
export interface PhotoConfirm { meal_name: string; kcal: number; prot: number; gluc: number; lip: number; items: Item[]; photoUrl: string }

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
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13, outline: 'none', boxSizing: 'border-box' }

export function PhotoMealEditor({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (r: PhotoConfirm) => void }) {
  const [preview, setPreview] = useState('')
  const [analyzing, setAnalyzing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const base = useRef<{ qty: number[]; kcal: number[]; totals: { kcal: number; prot: number; gluc: number; lip: number } } | null>(null)

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
        const its = data.items ?? []
        base.current = { qty: its.map(i => i.qty || 0), kcal: its.map(i => i.kcal || 0), totals: data.totals }
        setName(data.meal_name || 'Repas'); setItems(its)
      } catch { if (!cancel) setError('Analyse indisponible. Réessaie avec une photo plus nette.') }
      finally { if (!cancel) setAnalyzing(false) }
    })()
    return () => { cancel = true; URL.revokeObjectURL(url) }
  }, [file])

  // Recalcul proportionnel à l'édition d'une quantité.
  function setQty(i: number, q: number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, qty: q, kcal: base.current && base.current.qty[idx] > 0 ? Math.round(base.current.kcal[idx] * q / base.current.qty[idx]) : it.kcal } : it))
  }
  const totalKcal = items.reduce((s, it) => s + (it.kcal || 0), 0)
  const ratio = base.current && base.current.totals.kcal > 0 ? totalKcal / base.current.totals.kcal : 1
  const macros = base.current
    ? { prot: Math.round(base.current.totals.prot * ratio), gluc: Math.round(base.current.totals.gluc * ratio), lip: Math.round(base.current.totals.lip * ratio) }
    : { prot: 0, gluc: 0, lip: 0 }

  return createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="rec-drawer" style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Photo IA</h2>
          <button onClick={onCancel} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          <style>{`@keyframes pmaSpin{to{transform:rotate(360deg)}}`}</style>
          {/* Image + donut (analyse animée ou résultat) */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="repas" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
            )}
            {analyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <svg width={72} height={72} style={{ animation: 'pmaSpin 0.9s linear infinite' }}>
                  <circle cx={36} cy={36} r={30} fill="none" stroke="var(--bg-card2)" strokeWidth={8} />
                  <circle cx={36} cy={36} r={30} fill="none" stroke="var(--primary)" strokeWidth={8} strokeDasharray={`${0.28 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`} strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>Analyse en cours…</span>
              </div>
            ) : !error && (
              <MacroDonut kcal={totalKcal} prot={macros.prot} gluc={macros.gluc} lip={macros.lip} size={84} />
            )}
          </div>

          {error ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{error}</p>
          ) : !analyzing && (
            <>
              <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }}>Description</p>
              <input className="rec-drawer" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, marginBottom: 'var(--space-4)' }} />
              <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }}>Aliments détectés (quantité en g)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontFamily: FB, fontSize: 13, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                    <input className="rec-drawer tnum" type="number" value={it.qty} onChange={e => setQty(i, Math.max(0, parseInt(e.target.value) || 0))} style={{ ...inp, width: 78, textAlign: 'right' }} />
                    <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', width: 12 }}>{it.unit || 'g'}</span>
                    <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', width: 54, textAlign: 'right' }}>{it.kcal} kcal</span>
                  </div>
                ))}
              </div>
              <p className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-4) 0 0' }}>{totalKcal} kcal · P {macros.prot} · G {macros.gluc} · L {macros.lip} g</p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '13px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          <button disabled={analyzing || !!error || totalKcal <= 0}
            onClick={() => onConfirm({ meal_name: name.trim() || 'Repas', kcal: totalKcal, prot: macros.prot, gluc: macros.gluc, lip: macros.lip, items, photoUrl: preview })}
            style={{ flex: 2, padding: '13px', borderRadius: 'var(--r-sm)', border: 'none', cursor: analyzing || error || totalKcal <= 0 ? 'not-allowed' : 'pointer', background: analyzing || error || totalKcal <= 0 ? 'var(--bg-card2)' : 'var(--primary)', color: analyzing || error || totalKcal <= 0 ? 'var(--text-dim)' : 'var(--on-primary)', fontFamily: FB, fontSize: 14, fontWeight: 600 }}>Confirmer</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
