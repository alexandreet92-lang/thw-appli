'use client'
import { useState, useRef } from 'react'
import MacroDonuts from '../MacroDonuts'

export interface PhotoMacroResult {
  kcal:       number
  prot:       number
  gluc:       number
  lip:        number
  confidence: number
}

interface Props {
  onUse:    (r: PhotoMacroResult) => Promise<void>
  onAdjust: (r: PhotoMacroResult) => void
}

export default function MealModalPhotoAI({ onUse, onAdjust }: Props) {
  const [file,    setFile]    = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<PhotoMacroResult | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/analyze-meal-photo', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as PhotoMacroResult
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur analyse')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card2)', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Glisser une photo ou cliquer</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      <button onClick={() => void analyze()} disabled={!file || loading}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: file && !loading ? 'linear-gradient(90deg,#8B5CF6,#06B6D4)' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: file && !loading ? 'pointer' : 'default', fontFamily: 'Syne,sans-serif' }}>
        {loading ? 'Analyse en cours...' : 'Analyser avec IA'}
      </button>

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', padding: '4px 0' }}>{error}</div>
      )}

      {result && (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>Resultat IA</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
              background: result.confidence > 0.7 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color:      result.confidence > 0.7 ? '#22C55E' : '#EAB308',
            }}>
              {Math.round(result.confidence * 100)}% confiance
            </span>
          </div>
          <MacroDonuts kcal={result.kcal} prot={result.prot} gluc={result.gluc} lip={result.lip} size={52} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button onClick={() => void onUse(result)}
              style={{ padding: '8px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#06B6D4,#3B82F6)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>
              Utiliser ces valeurs
            </button>
            <button onClick={() => onAdjust(result)}
              style={{ padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Ajuster manuellement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
