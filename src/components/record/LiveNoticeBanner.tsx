'use client'
// ──────────────────────────────────────────────────────────────────────────
// LiveNoticeBanner — bandeau transitoire des écrans live (rappels hydratation
// / nutrition, perte GPS, alertes pente/vitesse) + hooks associés, répliqués
// du mécanisme de CyclingScreen pour être partagés par les autres sports.
// ──────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react'
import { playLapBeep, setLapBeepSoundEnabled } from './lapBeep'
import { useI18n } from '@/lib/i18n'
import { RkBanner } from './kit/RecordKit'

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
  // Pilule transitoire (langage RecordKit) — placée dans la zone de bandeaux
  // de l'écran live (sous l'en-tête).
  return <RkBanner key={noticeKey} dot="var(--primary)" live>{t(noticeKey)}</RkBanner>
}
