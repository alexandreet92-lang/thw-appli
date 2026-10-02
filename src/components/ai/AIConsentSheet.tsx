'use client'
// ══════════════════════════════════════════════════════════════
// Feuille de consentement IA — affichée UNE SEULE FOIS (App Store 5.1.2(i) :
// divulguer le partage de données personnelles avec une IA tierce et obtenir
// l'accord). Formulation volontairement neutre : « notre partenaire d'IA »,
// aucun nom de fournisseur.
//  · Mobile : bottom sheet (glisser vers le bas = « Plus tard »).
//  · Desktop : carte centrée en bas, même contenu.
// « Continuer » = accord persistant (local + compte) ; « Plus tard » = rien
// n'est envoyé, la feuille reviendra au prochain envoi.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { MobileSheet } from './MobileSheet'
import { ModelEffigy, type EffigyModel } from './ModelEffigy'
import { AimCardStyles, AimPill, AIM_EASE } from './mobile/cards/kit'

const PRIVACY_URL = '/site/confidentialite.html'

function Body({ model, onContinue, onLater }: { model: EffigyModel; onContinue: () => void; onLater: () => void }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const rise = (i: number) => ({
    initial: reduce ? false as const : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: AIM_EASE, delay: 0.08 + i * 0.05 },
  })
  return (
    <div className="aimc" style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column' }}>
      <AimCardStyles />
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: AIM_EASE }}
        style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: 'var(--aimc-grp)', display: 'grid', placeItems: 'center', marginBottom: 16 }}
      >
        <ModelEffigy model={model} size={30} />
      </motion.div>
      <motion.h2 {...rise(0)} style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        {t('ai2.consent.title')}
      </motion.h2>
      <motion.p {...rise(1)} style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5, color: 'var(--text-mid)' }}>
        {t('ai2.consent.body')}
      </motion.p>
      <motion.a
        {...rise(2)}
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener"
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 15, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
      >
        {t('ai2.consent.privacy')}
      </motion.a>
      <motion.div {...rise(3)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, marginTop: 10 }}>
        <AimPill variant="primary" onClick={onContinue} style={{ minHeight: 52, fontSize: 16 }}>
          {t('ai2.consent.continue')}
        </AimPill>
        <AimPill variant="ghost" onClick={onLater} style={{ minHeight: 48 }}>
          {t('ai2.consent.later')}
        </AimPill>
      </motion.div>
    </div>
  )
}

export function AIConsentSheet({ isDesktop, model = 'athena', onAccept, onLater }: {
  isDesktop: boolean
  model?: EffigyModel
  /** Appelé après l'animation de fermeture, accord donné. */
  onAccept: () => void
  /** Appelé après fermeture sans accord (bouton, glissé, voile, Échap). */
  onLater: () => void
}) {
  const closeRef = useRef<(() => void) | null>(null)
  const decisionRef = useRef<'accept' | 'later'>('later')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const accept = () => {
    haptic('success')
    decisionRef.current = 'accept'
    if (closeRef.current) closeRef.current()
    else onAccept()
  }
  const later = () => {
    haptic('light')
    decisionRef.current = 'later'
    if (closeRef.current) closeRef.current()
    else onLater()
  }
  const settle = () => { if (decisionRef.current === 'accept') onAccept(); else onLater() }

  if (!isDesktop) {
    return (
      <MobileSheet
        onClose={settle}
        surface="var(--surface-card)"
        zIndex={10050}
        closeRef={closeRef}
      >
        <Body model={model} onContinue={accept} onLater={later} />
      </MobileSheet>
    )
  }

  if (!mounted) return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={later}
      style={{ position: 'fixed', inset: 0, zIndex: 10050, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'var(--scrim)', padding: '16px 14px calc(env(safe-area-inset-bottom) + 24px)' }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: AIM_EASE }}
        style={{ width: '100%', maxWidth: 440, background: 'var(--surface-card)', color: 'var(--text)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)', padding: '20px 12px 4px' }}
      >
        <Body model={model} onContinue={accept} onLater={later} />
      </motion.div>
    </div>,
    document.body,
  )
}
