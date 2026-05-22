'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BarcodeDet {
  detect(target: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}
interface BarcodeCtor {
  new(opts?: { formats: string[] }): BarcodeDet
}

declare global {
  interface Window { BarcodeDetector?: BarcodeCtor }
}

interface Props {
  onDetected: (barcode: string) => void
  onClose:    () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const activeRef = useRef(true)
  const [error,   setError]   = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!window.BarcodeDetector) {
      setError('Scanner disponible sur mobile uniquement')
      return
    }

    let stream: MediaStream | null = null
    activeRef.current = true

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const detector = new window.BarcodeDetector!({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] })

        async function scan() {
          if (!activeRef.current || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) { stop(); onDetected(codes[0].rawValue); return }
          } catch { /* ignore frame errors */ }
          if (activeRef.current) requestAnimationFrame(() => void scan())
        }
        void scan()
      } catch { setError("Impossible d'acceder a la camera") }
    }

    function stop() {
      activeRef.current = false
      stream?.getTracks().forEach(t => t.stop())
    }

    void start()
    return () => { stop() }
  }, [mounted, onDetected])

  if (!mounted) return null

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 280, maxWidth: '90vw' }}>
        {error ? (
          <div style={{ color: '#fff', fontSize: 14, textAlign: 'center', padding: '40px 20px' }}>{error}</div>
        ) : (
          <>
            <video ref={videoRef} muted playsInline
              style={{ width: '100%', borderRadius: 12, display: 'block', background: '#000' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '30%', left: 12, right: 12, height: '40%', border: '2px solid #06B6D4', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
            </div>
            <p style={{ color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
              Placez le code-barres dans le cadre
            </p>
          </>
        )}
      </div>
      <button onClick={onClose}
        style={{ marginTop: 24, padding: '10px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.3)', background: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
        Fermer
      </button>
    </div>
  )

  return createPortal(content, document.body)
}
