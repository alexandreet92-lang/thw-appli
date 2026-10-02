'use client'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useIsMobile } from '@/components/ai/mobile/MobileKit'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const { t } = useI18n()
  const mobile = useIsMobile()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stoppedRef = useRef(false)

  useEffect(() => {
    void startCamera()
    return () => stopCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopCamera = () => {
    stoppedRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const handleDetected = (value: string) => {
    if (stoppedRef.current) return
    stopCamera()
    onDetected(value)
  }

  const startCamera = async () => {
    if (!('mediaDevices' in navigator)) {
      setError(t('w3h.cam_unavailable'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      startDetection()
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') setError(t('w3h.cam_denied'))
        else if (err.name === 'NotFoundError') setError(t('w3h.cam_not_found'))
        else setError(t('w3h.cam_error'))
      }
    }
  }

  const startDetection = () => {
    if (!('BarcodeDetector' in window)) {
      setError(t('w3h.scanner_unsupported'))
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    })
    const detect = async () => {
      if (stoppedRef.current) return
      if (!videoRef.current || videoRef.current.readyState < 2) {
        requestAnimationFrame(detect); return
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const barcodes: any[] = await detector.detect(videoRef.current)
        if (barcodes.length > 0) { handleDetected(barcodes[0].rawValue as string); return }
      } catch { /* continue */ }
      requestAnimationFrame(detect)
    }
    requestAnimationFrame(detect)
  }

  if (mobile) {
    // Mobile : plein écran caméra (z au-dessus des feuilles), en-tête sûr (encoche),
    // titre centré 17/700, bouton rond 44 px translucide, erreur = carte + pilule.
    const close = () => { stopCamera(); onClose() }
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 19000, fontFamily: 'var(--font-body)' }}>
        <div className="flex items-center flex-shrink-0" style={{ gap: 10, padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', position: 'relative', zIndex: 2 }}>
          <span style={{ width: 44, flexShrink: 0 }} />
          <p className="text-white" style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{t('w3h.scan_product')}</p>
          <button type="button" onClick={close} aria-label={t('w3h.close')}
            className="rounded-full bg-white/15 flex items-center justify-center" style={{ width: 44, height: 44, flexShrink: 0, border: 'none', cursor: 'pointer', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ gap: 16, padding: '0 24px', textAlign: 'center' }}>
              <p className="text-white" style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{error}</p>
              <button type="button" onClick={onClose} className="bg-white text-black"
                style={{ width: '100%', maxWidth: 320, minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t('w3h.close')}
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-72 h-44">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-cyan-400 opacity-80 animate-scan-line" />
                </div>
              </div>
              <p className="absolute left-0 right-0 text-center text-white/80"
                style={{ bottom: 'calc(28px + env(safe-area-inset-bottom))', margin: 0, fontSize: 15, fontWeight: 500 }}>
                <span className="bg-black/40 rounded-full" style={{ display: 'inline-block', padding: '8px 16px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>{t('w3h.point_barcode')}</span>
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <p className="text-white font-medium text-base" style={{ fontFamily: 'var(--font-body)' }}>
          {t('w3h.scan_product')}
        </p>
        <button
          onClick={() => { stopCamera(); onClose() }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <p className="text-white/80 text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="bg-white text-black rounded-xl px-6 py-3 text-sm font-medium">
              {t('w3h.close')}
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-44">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-cyan-400 opacity-80 animate-scan-line" />
              </div>
            </div>
            <p className="absolute bottom-10 left-0 right-0 text-center text-white/60 text-sm">
              {t('w3h.point_barcode')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
