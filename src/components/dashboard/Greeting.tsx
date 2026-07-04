'use client'
// ══════════════════════════════════════════════════════════════
// Salutation + badge plan/essai. Source : profiles (useProfile)
// + user_subscriptions (tier, status, trial_ends_at).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { FD, FB, formatLongDate, daysUntil } from './lib'

type TFn = (key: string, vars?: Record<string, string | number>) => string

const PLAN_LABEL: Record<string, string> = {
  premium: 'Premium', pro: 'Pro', expert: 'Expert',
}

interface SubRow { tier: string | null; status: string | null; trial_ends_at: string | null }

function badgeText(sub: SubRow | null, t: TFn): string | null {
  if (!sub) return null
  const isTrial = sub.status === 'trialing' || sub.tier === 'trial'
  if (isTrial) {
    const days = sub.trial_ends_at ? daysUntil(sub.trial_ends_at) : 0
    return t('dashboard.trialBadge', { days })
  }
  return sub.tier ? (PLAN_LABEL[sub.tier] ?? sub.tier) : null
}

export function Greeting({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { t } = useI18n()
  const { profile } = useProfile()
  const [sub, setSub] = useState<SubRow | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_subscriptions')
        .select('tier, status, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!cancelled) setSub((data as SubRow | null) ?? null)
    })()
    return () => { cancelled = true }
  }, [])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null
  const badge = badgeText(sub, t)

  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontFamily: FD, fontSize: 28, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
          {firstName ? t('dashboard.greetingName', { name: firstName }) : t('dashboard.greeting')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{formatLongDate()}</span>
          {badge && (
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 999 }}>
              {badge}
            </span>
          )}
        </div>
      </div>
      {rightSlot}
    </header>
  )
}
