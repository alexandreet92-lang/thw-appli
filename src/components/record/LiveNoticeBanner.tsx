'use client'
// ──────────────────────────────────────────────────────────────────────────
// LiveNoticeBanner — bandeau transitoire des écrans live (rappels hydratation
// / nutrition, perte GPS, alertes pente/vitesse) + hooks associés, répliqués
// du mécanisme de CyclingScreen pour être partagés par les autres sports.
// ──────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react'
import { playLapBeep, setLapBeepSoundEnabled } from './lapBeep'
import { useI18n } from '@/lib/i18n'

/** Réglage alerts.vibration — renvoie un vibrate() muet si désactivé. */
export function useVibrate(enabled: boolean): (pattern: number | number[]) => void {
  return useCallback((pattern: number | number[]) => {
    if (!enabled) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* non supporté */ }
    }
  }, [enabled])
}

/** Réglage alerts.sound — synchronise le module lapBeep (sans fuite hors écran). */
export function useLapBeepSound(enabled: boolean): void {
  useEffect(() => {
    setLapBeepSoundEnabled(enabled)
    return () => setLapBeepSoundEnabled(true) // ne pas laisser le mute fuiter hors de l'écran
  }, [enabled])
}

/** Bandeau transitoire : affiche une clé i18n ~6 s avec bip + vibration. */
export function useLiveNotice(vibrate: (pattern: number | number[]) => void): {
  noticeKey: string | null
  showNotice: (key: string) => void
} {
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showNotice = useCallback((key: string) => {
    setNoticeKey(key)
    playLapBeep()
    vibrate([120, 80, 120])
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNoticeKey(null), 6000)
  }, [vibrate])
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])
  return { noticeKey, showNotice }
}

export default function LiveNoticeBanner({ noticeKey }: { noticeKey: string | null }) {
  const { t } = useI18n()
  if (!noticeKey) return null
  return (
    <div style={{ position: 'fixed', top: 'calc(100px + env(safe-area-inset-top))', left: 16, right: 16, zIndex: 1000, background: 'rgba(6,182,212,0.92)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}> {/* design-allow-color */}
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', flexShrink: 0 }} /> {/* design-allow-color */}
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t(noticeKey)}</span> {/* design-allow-color */}
    </div>
  )
}
