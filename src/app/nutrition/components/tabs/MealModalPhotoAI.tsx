'use client'
import { useState, useRef, useEffect } from 'react'
import type { ManualSaveData } from './MealModalManual'

// ── Types ─────────────────────────────────────────────────────────
interface ApiItem { name: string; qty: number; unit: string; kcal: number }
interface ApiResult {
  meal_name:  string
  items:      ApiItem[]
  totals:     { kcal: number; prot: number; gluc: number; lip: number }
  confidence: 'low' | 'medium' | 'high'
  notes?:     string
}
interface EditItem {
  name:     string
  qty:      number
  unit:     string
  kcal:     number
  baseQty:  number
  baseKcal: number
}

interface Props {
  onSave: (data: ManualSaveData) => Promise<void>
}

// ── Image resize ──────────────────────────────────────────────────
async function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = ev => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1024
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('canvas ctx null')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.82).split(',')[1], mimeType: 'image/jpeg' })
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ── Confidence badge ──────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const cfg = {
    low:    { label: 'Confiance faible',  bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
    medium: { label: 'Confiance moyenne', bg: 'rgba(234,179,8,0.12)',  color: '#EAB308' },
    high:   { label: 'Confiance haute',   bg: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
  }[level]
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Overlay spinner ───────────────────────────────────────────────
function OverlaySpinner() {
  return (
    <>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <svg width={32} height={32} viewBox="0 0 32 32" fill="none"
        style={{ animation: '_spin 0.75s linear infinite', display: 'block' }}>
        <circle cx={16} cy={16} r={13} stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        <path d="M16 3a13 13 0 0 1 13 13" stroke="white" strokeWidth={3} strokeLinecap="round" />
      </svg>
    </>
  )
}

// ── Warning icon ──────────────────────────────────────────────────
function IconWarning() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1={12} y1={9} x2={12} y2={13} />
      <line x1={12} y1={17} x2={12.01} y2={17} />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function MealModalPhotoAI({ onSave }: Props) {
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<ApiResult | null>(null)
  const [mealName, setMealName] = useState('')
  const [items,    setItems]    = useState<EditItem[]>([])
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dragging, setDragging] = useState(false)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Auto-analyse on file select ───────────────────────────────
  async function handleFile(f: File) {
    setPreview(URL.createObjectURL(f))
    setResult(null); setItems([]); setError(null)
    setLoading(true)
    try {
      const { base64, mimeType } = await resizeImage(f)
      const res = await fetch('/api/analyze-meal-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as ApiResult
      setResult(data)
      setMealName(data.meal_name)
      setItems(data.items.map(it => ({
        name: it.name, qty: it.qty, unit: it.unit, kcal: it.kcal,
        baseQty: it.qty || 1, baseKcal: it.kcal,
      })))
    } catch {
      setError('Analyse impossible. Reessaye avec une photo plus nette.')
    } finally { setLoading(false) }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''   // allow re-selecting same file
    if (f) void handleFile(f)
  }

  function reset() {
    setPreview(null); setResult(null)
    setItems([]); setMealName(''); setError(null); setLoading(false)
  }

  function changePhoto() {
    reset()
    // Inputs are always in DOM — open appropriate picker
    requestAnimationFrame(() => {
      if (isMobile) cameraRef.current?.click()
      else galleryRef.current?.click()
    })
  }

  // ── Item edit helpers ─────────────────────────────────────────
  function updateItemQty(idx: number, newQty: number) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const ratio = it.baseQty > 0 ? newQty / it.baseQty : 1
      return { ...it, qty: newQty, kcal: Math.round(it.baseKcal * ratio) }
    }))
  }
  function updateItemName(idx: number, name: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, name } : it))
  }
  function updateItemKcal(idx: number, kcal: number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, kcal } : it))
  }

  const totalKcal    = items.reduce((s, it) => s + it.kcal, 0)
  const originalKcal = result?.totals.kcal ?? 1
  const ratio        = originalKcal > 0 ? totalKcal / originalKcal : 1

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      await onSave({
        meal_name:   mealName || result.meal_name,
        ingredients: items.map(it => ({ name: it.name, qty: `${it.qty}`, unit: it.unit })),
        actual_kcal: totalKcal,
        actual_prot: Math.round(result.totals.prot * ratio),
        actual_gluc: Math.round(result.totals.gluc * ratio),
        actual_lip:  Math.round(result.totals.lip  * ratio),
      })
    } finally { setSaving(false) }
  }

  // ── Persistent hidden inputs (always in DOM) ──────────────────
  const hiddenInputs = (
    <>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onInputChange} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onInputChange} />
    </>
  )

  // ── Phase 1 : no photo selected ───────────────────────────────
  if (!preview && !result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {hiddenInputs}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => cameraRef.current?.click()}
              style={{ flex: 1, padding: '14px 0', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Camera
            </button>
            <button onClick={() => galleryRef.current?.click()}
              style={{ flex: 1, padding: '14px 0', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
              Galerie
            </button>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false)
              const f = e.dataTransfer.files[0]; if (f) void handleFile(f)
            }}
            onClick={() => galleryRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#06B6D4' : 'var(--border)'}`,
              borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(6,182,212,0.05)' : 'var(--bg-card2)',
              transition: 'border-color 0.15s, background 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Glisser une photo ou cliquer</span>
          </div>
        )}
      </div>
    )
  }

  // ── Phase 2 : photo selected — loading or error ───────────────
  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {hiddenInputs}

        {/* Preview + overlay */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview!} alt="preview"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', borderRadius: 12 }} />

          {loading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)',
              borderRadius: 12, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <OverlaySpinner />
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans,sans-serif', margin: 0 }}>
                Analyse en cours...
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }}>
              <IconWarning />
              {error}
            </div>
            <button onClick={changePhoto}
              style={{
                padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-dim)',
                fontSize: 12, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
              }}>
              Changer de photo
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Phase 3 : result ready ────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hiddenInputs}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ConfidenceBadge level={result.confidence} />
        <button onClick={reset}
          style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Recommencer
        </button>
      </div>

      {/* Meal name */}
      <input value={mealName} onChange={e => setMealName(e.target.value)}
        style={{ width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Syne,sans-serif', outline: 'none', boxSizing: 'border-box' }} />

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 54px', gap: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
          {['Aliment', 'Qte', 'Kcal'].map(h => (
            <span key={h} style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'DM Sans,sans-serif' }}>{h}</span>
          ))}
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 54px', gap: 6, alignItems: 'center' }}>
            <input value={it.name} onChange={e => updateItemName(i, e.target.value)}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input type="number" value={it.qty} min={0} onChange={e => updateItemQty(i, Number(e.target.value))}
                style={{ width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 5px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'DM Mono,monospace', textAlign: 'center' }} />
              <span style={{ fontSize: 9, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{it.unit}</span>
            </div>
            <input type="number" value={it.kcal} min={0} onChange={e => updateItemKcal(i, Number(e.target.value))}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', fontSize: 11, color: '#06B6D4', outline: 'none', fontFamily: 'DM Mono,monospace', textAlign: 'center' }} />
          </div>
        ))}
        {/* Totals row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 54px', gap: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>Total</span>
          <span />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#06B6D4', fontFamily: 'DM Mono,monospace', textAlign: 'center' }}>{totalKcal}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace', paddingLeft: 2 }}>
          <span>P {Math.round(result.totals.prot * ratio)}g</span>
          <span>G {Math.round(result.totals.gluc * ratio)}g</span>
          <span>L {Math.round(result.totals.lip  * ratio)}g</span>
        </div>
      </div>

      {result.notes && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>{result.notes}</div>
      )}

      {/* Save button */}
      <button onClick={() => void handleSave()} disabled={saving}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: saving ? 'var(--border)' : 'linear-gradient(90deg,#06B6D4,#3B82F6)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', fontFamily: 'Syne,sans-serif' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer ce repas'}
      </button>
    </div>
  )
}
