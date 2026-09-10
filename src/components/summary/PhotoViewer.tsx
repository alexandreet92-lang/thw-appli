'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Photo { id: string; url: string; taken_at: string }
interface Props { photos: Photo[]; initialIndex: number; onClose: () => void }

export default function PhotoViewer({ photos, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex)
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])

  const requestClose = useCallback(() => { setClosing(true); setShown(false); setTimeout(onClose, 280) }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
      if (e.key === 'ArrowRight' && idx < photos.length - 1) setIdx(i => i + 1)
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(i => i - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, photos.length, requestClose])

  if (!mounted) return null

  const content = (
    <div
      onClick={requestClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease',
      }}
    >
      {/* Close */}
      <button
        onClick={requestClose}
        style={{ position: 'absolute', top: 'max(env(safe-area-inset-top),16px)', right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        ×
      </button>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[idx].url}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '92vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10 }}
      />

      {/* Dots */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, background: i === idx ? '#06B6D4' : 'rgba(255,255,255,0.35)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 200ms' }}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {photos.length > 1 && (
        <>
          {idx > 0 && (
            <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}>‹</button>
          )}
          {idx < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}>›</button>
          )}
        </>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
