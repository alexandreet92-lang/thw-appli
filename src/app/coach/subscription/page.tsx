'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Abonnement COACH — 6 packs par capacité d'athlètes. Base commune :
// Premium athlète + toutes les fonctions coach + 1 M tokens Studio.
// Changement / annulation via le portail de facturation Stripe.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { COACH_PACKS, getCoachPack, coachPackPriceEur, type CoachPackKey, type CoachTier } from '@/lib/subscriptions/coach-packs'
import CoachSubscribeEmailModal from '@/components/subscription/CoachSubscribeEmailModal'
import { getCoachAccessState, startCoachTrial, type CoachAccessState } from '@/lib/coach/owner'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

interface CurrentSub { pack_key: string; status: string; current_period_end: string | null }

export default function CoachSubscriptionPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [coachTier, setCoachTier] = useState<CoachTier>('premium')
  const [current, setCurrent] = useState<CurrentSub | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [emailPack, setEmailPack] = useState<CoachPackKey | null>(null)
  const [coachState, setCoachState] = useState<CoachAccessState | null>(null)
  const [trialErr, setTrialErr] = useState<string | null>(null)
  const [athleteCount, setAthleteCount] = useState<number | null>(null)

  useEffect(() => {
    void (async () => {
      const sb = createClient()
      const user = await getCurrentUser()
      if (user) {
        const { data } = await sb.from('coach_subscriptions').select('pack_key, status, current_period_end').eq('user_id', user.id).maybeSingle()
        setCurrent((data as CurrentSub) ?? null)
        // Capacité utilisée : nombre d'athlètes acceptés du roster.
        const { count } = await sb.from('coach_athlete')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', user.id).eq('status', 'accepted')
        setAthleteCount(count ?? 0)
      }
      setCoachState(await getCoachAccessState())
      setLoading(false)
    })()
  }, [])

  // Essai gratuit : proposé UNIQUEMENT à qui n'a jamais démarré d'essai et n'a pas
  // d'accès coach. C'est le point d'entrée manquant quand on arrive ici par lien
  // profond (le CTA du dashboard n'est pas passé).
  const canStartTrial = !!coachState && !coachState.access && !coachState.everStarted
  const startTrial = async () => {
    setBusy('trial'); setTrialErr(null)
    try { await startCoachTrial(); router.push('/coach') }
    catch { setTrialErr(t('w3c.trial_start_failed')); setBusy(null) }
  }

  // On ne redirige pas directement vers Stripe : on ouvre la modale qui envoie
  // le lien de paiement par email (preuve de possession de l'adresse).
  const subscribe = (packKey: CoachPackKey) => setEmailPack(packKey)

  const manage = async () => {
    setBusy('portal')
    try {
      const r = await fetch('/api/stripe/portal', { method: 'POST' })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else alert(d.error ?? t('w3c.portal_unavailable'))
    } catch { alert(t('w3c.network_error')) } finally { setBusy(null) }
  }

  const activePack = current && (current.status === 'active' || current.status === 'trialing') ? getCoachPack(current.pack_key) : null

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{t('w3c.coach_sub_title')}</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px' }}>{t('w3c.coach_sub_intro')}</p>

      {/* Essai gratuit 14 j — point d'entrée self-service (arrivée par lien profond) */}
      {canStartTrial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--bg-card2)', border: '1px solid var(--primary)', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('w3c.coach_trial_title')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>{t('w3c.coach_trial_desc')}</div>
            {trialErr && <div style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>{trialErr}</div>}
          </div>
          <button onClick={startTrial} disabled={busy === 'trial'} style={{ ...btnManage, background: 'var(--primary)', color: 'var(--on-primary)', opacity: busy === 'trial' ? 0.6 : 1 }}>{busy === 'trial' ? '…' : t('w3c.coach_trial_start')}</button>
        </div>
      )}

      {activePack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('w3c.active_pack')} · {activePack.label}</div>
            {athleteCount !== null && (() => {
              const full = athleteCount >= activePack.maxAthletes
              return (
                <div style={{ fontSize: 12.5, color: full ? '#ef4444' : 'var(--text-dim)', fontWeight: full ? 700 : 400, marginTop: 2 }}>
                  {athleteCount} / {activePack.maxAthletes} {t('w3c.athletes_capacity')}{full ? ` — ${t('w3c.capacity_full')}` : ''}
                </div>
              )
            })()}
            {current?.current_period_end && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>{t('w3c.next_renewal')} {new Date(current.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
          </div>
          <button onClick={manage} disabled={busy === 'portal'} style={btnManage}>{busy === 'portal' ? '…' : t('w3c.change_cancel')}</button>
        </div>
      )}

      {/* Toggle mensuel / annuel */}
      <div style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999, background: 'var(--bg-card2)', marginBottom: 20 }}>
        {(['monthly', 'yearly'] as const).map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: billing === b ? 'var(--bg-card)' : 'transparent', color: billing === b ? 'var(--primary)' : 'var(--text-mid)', boxShadow: billing === b ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
            {b === 'monthly' ? t('w3c.monthly') : t('w3c.annual')}{b === 'yearly' && <span style={{ fontSize: 11, marginLeft: 5, color: 'var(--text-dim)' }}>−17 %</span>}
          </button>
        ))}
      </div>

      {/* Formule athlète incluse : Pro ou Expert (le pack débloque ce niveau athlète). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 600 }}>Formule athlète incluse&nbsp;:</span>
        <div style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999, background: 'var(--bg-card2)' }}>
          {(['premium', 'pro', 'expert'] as const).map(tr => (
            <button key={tr} onClick={() => setCoachTier(tr)} style={{ padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: coachTier === tr ? 'var(--bg-card)' : 'transparent', color: coachTier === tr ? 'var(--primary)' : 'var(--text-mid)', boxShadow: coachTier === tr ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
              {tr === 'premium' ? 'Athlète Premium' : tr === 'pro' ? 'Athlète Pro' : 'Athlète Expert'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w3c.loading')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {COACH_PACKS.map(p => {
            const isCurrent = activePack?.key === p.key
            return (
              <div key={p.key} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{p.label}</div>
                {/* Prix masqués dans l'app (règles App Store). */}
                <div style={{ flex: 1 }} />
                {isCurrent ? (
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', padding: '11px 0' }}>{t('w3c.current_pack')}</div>
                ) : (
                  <button onClick={() => subscribe(p.key as CoachPackKey)} disabled={!!busy}
                    style={{ height: 44, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy === p.key ? '…' : activePack ? t('w3c.switch_to_pack') : t('w3c.choose')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 20, lineHeight: 1.5 }}>{t('w3c.coach_sub_footer')}</p>

      {emailPack && (() => {
        const p = getCoachPack(emailPack)
        if (!p) return null
        return (
          <CoachSubscribeEmailModal
            packKey={p.key}
            packName={p.name}
            packLabel={p.label}
            price={coachPackPriceEur(p, coachTier, billing)}
            billingPeriod={billing}
            tier={coachTier}
            onClose={() => setEmailPack(null)}
          />
        )
      })()}
    </div>
  )
}

const btnManage: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
