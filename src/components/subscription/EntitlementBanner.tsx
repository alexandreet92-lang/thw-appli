'use client'
// ══════════════════════════════════════════════════════════════════
// Bandeau d'état d'abonnement, dans le flux du contenu (pas de fixed →
// aucun chevauchement avec les en-têtes flottants). Deux cas :
//  • essai premium (≤ 7 j restants) → compte à rebours + offres
//  • mode gratuit → rappel des limites IA + offres
// Neutre (bg-card2, aucun fond coloré), un seul accent primary sur le lien.
// Refermable pour la session (localStorage), réapparaît le lendemain.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEntitlements } from '@/hooks/useEntitlements'

function todayKey(): string {
  // Clé de rejet valable pour la journée (réapparaît le lendemain).
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function EntitlementBanner() {
  const { loading, isFree, isTrial, trialDaysLeft } = useEntitlements()
  const [dismissed, setDismissed] = useState(true)

  const show = !loading && (isFree || (isTrial && (trialDaysLeft ?? 99) <= 7))
  const dismissKey = isFree ? 'free' : `trial-${trialDaysLeft}`

  useEffect(() => {
    if (!show) return
    try {
      const raw = localStorage.getItem('thw_entbanner_dismissed')
      setDismissed(raw === `${todayKey()}:${dismissKey}`)
    } catch { setDismissed(false) }
  }, [show, dismissKey])

  if (!show || dismissed) return null

  const message = isFree
    ? "Mode Gratuit — les fonctions IA sont limitées."
    : trialDaysLeft === 0
      ? "Dernier jour d'essai premium."
      : `Essai premium — ${trialDaysLeft} jour${(trialDaysLeft ?? 0) > 1 ? 's' : ''} restant${(trialDaysLeft ?? 0) > 1 ? 's' : ''}.`

  const dismiss = () => {
    try { localStorage.setItem('thw_entbanner_dismissed', `${todayKey()}:${dismissKey}`) } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px clamp(16px, 4vw, 40px)', background: 'var(--bg-card2)',
      fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      <Link href="/settings/subscription" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Voir les offres →
      </Link>
      <button onClick={dismiss} aria-label="Masquer" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  )
}
