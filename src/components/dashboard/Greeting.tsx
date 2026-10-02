'use client'
// ══════════════════════════════════════════════════════════════
// Salutation + badge plan/essai. Source : profiles (useProfile)
// + user_subscriptions (tier, status, stripe_subscription_id).
//
// Essai 14 j : source de vérité = la DATE D'INSCRIPTION (auth.created_at),
// alignée sur getUserTier (check-quota.ts). On N'UTILISE PAS trial_ends_at
// (colonne jamais renseignée). Un abonnement payant réel (stripe_subscription_id
// + status active/trialing) prime toujours sur le badge d'essai.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { FD, FB, formatLongDate } from './lib'

const PLAN_LABEL: Record<string, string> = {
  premium: 'Premium', pro: 'Pro', expert: 'Expert',
}

// Durée de l'essai offert à l'inscription (jours). Doit rester alignée sur
// TRIAL_DAYS de src/lib/subscriptions/check-quota.ts.
const TRIAL_DAYS = 14

interface SubRow { tier: string | null; status: string | null; stripe_subscription_id: string | null }

/** Prénom + badge plan/essai (partagé par la salutation desktop et le héros mobile). */
function useGreetingData() {
  const { t } = useI18n()
  const { profile } = useProfile()
  const [sub, setSub] = useState<SubRow | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) return
      // Jours d'essai restants, dérivés de la date d'inscription.
      if (user.created_at) {
        const elapsed = (Date.now() - new Date(user.created_at).getTime()) / 86400000
        if (!cancelled) setTrialDaysLeft(Math.max(0, Math.ceil(TRIAL_DAYS - elapsed)))
      }
      const { data } = await supabase
        .from('user_subscriptions')
        .select('tier, status, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!cancelled) setSub((data as SubRow | null) ?? null)
    })()
    return () => { cancelled = true }
  }, [])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null

  // Abonnement payant réel → badge du plan ; sinon essai (si jours restants).
  const hasPaidSub = !!(sub?.stripe_subscription_id && (sub.status === 'active' || sub.status === 'trialing'))
  const badge: string | null = hasPaidSub
    ? (sub?.tier ? (PLAN_LABEL[sub.tier] ?? sub.tier) : null)
    : (trialDaysLeft && trialDaysLeft > 0 ? t('dashboard.trialBadge', { days: trialDaysLeft }) : null)

  return { firstName, badge }
}

export function Greeting({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { t } = useI18n()
  const { firstName, badge } = useGreetingData()

  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <div style={{ minWidth: 0 }}>
        <h1 data-guide="greeting" style={{ margin: 0, fontFamily: FD, fontSize: 28, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
          {firstName ? t('dashboard.greetingName', { name: firstName }) : t('dashboard.greeting')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{formatLongDate()}</span>
          {badge && (
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>
              {badge}
            </span>
          )}
        </div>
      </div>
      {rightSlot}
    </header>
  )
}

/** Moment de la journée → salutation (matin / après-midi / soir). */
function greetingKey(h: number): 'gm.goodMorning' | 'gm.goodAfternoon' | 'gm.goodEvening' {
  if (h >= 5 && h < 12) return 'gm.goodMorning'
  if (h >= 12 && h < 18) return 'gm.goodAfternoon'
  return 'gm.goodEvening'
}

/**
 * Héros de l'accueil MOBILE (façon Strava / Claude iOS) : date en sur-titre
 * discret, salutation en grand (Inter 28, graisse 800, approche serrée), badge
 * de plan/essai en pastille. Entrée en fondu + montée (CSS .dash-hero).
 */
export function HomeHero() {
  const { t } = useI18n()
  const { firstName, badge } = useGreetingData()
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => { setHour(new Date().getHours()) }, [])
  const hello = hour === null ? t('dashboard.greeting') : t(greetingKey(hour))
  return (
    <header className="dash-hero">
      <p style={{ margin: 0, fontFamily: FB, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>
        {formatLongDate()}
      </p>
      <h1 style={{ margin: '6px 0 0', fontFamily: FB, fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'var(--text)', overflowWrap: 'anywhere' }}>
        {firstName ? `${hello}, ${firstName}` : hello}
      </h1>
      {badge && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '4px 10px', borderRadius: 'var(--r-pill)', background: 'var(--dash-chip, var(--bg-hover))', fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
          {badge}
        </span>
      )}
    </header>
  )
}
