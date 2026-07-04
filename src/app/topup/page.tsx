'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/lib/i18n'
import { CheckCircle2, Lock, Zap, ArrowRight } from 'lucide-react'
import {
  GRAD, GRAD_H, PACKS, USAGES, TokenGauge, Header, Footer, TopupStyles, type Pack,
} from './shared'

interface SessionInfo {
  plan: string
  monthly: { used: number; limit: number; resets_at: string }
  bonus_tokens: number
}

const STEPS = [
  { Ic: CheckCircle2, title: 'Choisis ton pack', desc: 'Sélectionne le pack qui te convient.' },
  { Ic: Lock,         title: 'Paie en sécurité', desc: 'Paiement chiffré via Stripe, aucune donnée bancaire stockée.' },
  { Ic: Zap,          title: 'Crédité instantanément', desc: "Retourne dans l'app, ton solde est à jour." },
]

function PackCard({ pack, loading, onChoose }: { pack: Pack; loading: string | null; onChoose: (p: Pack) => void }) {
  const { t } = useI18n()
  const [hover, setHover] = useState(false)
  const feat = pack.featured

  const packNames: Record<string, string> = {
    discovery:   t('misc.packDiscovery'),
    performance: t('misc.packPerformance'),
    elite:       t('misc.packElite'),
  }
  const packDescs: Record<string, string> = {
    discovery:   t('misc.packDiscoveryDesc'),
    performance: t('misc.packPerformanceDesc'),
    elite:       t('misc.packEliteDesc'),
  }
  const packName = packNames[pack.id] ?? pack.name
  const packDesc = packDescs[pack.id] ?? pack.desc

  const inner = (
    <div className="pack-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', height: '100%',
        background: feat ? 'linear-gradient(180deg, rgba(6,182,212,0.06) 0%, var(--bg-card) 42%)' : 'var(--bg-card)',
        borderRadius: feat ? 17 : 16,
        border: feat ? 'none' : `1px solid ${hover ? 'rgba(6,182,212,0.35)' : 'var(--border)'}`,
        padding: '26px 24px 22px', display: 'flex', flexDirection: 'column',
        boxShadow: hover && !feat ? '0 16px 40px -16px rgba(6,182,212,0.28)' : 'var(--shadow-card)',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: feat ? 3 : 2, background: feat ? GRAD_H : `linear-gradient(90deg, ${pack.accent}70, transparent 65%)` }} />
      {feat && (
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, background: GRAD, color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 2px 14px rgba(6,182,212,0.4)' }}>★ {t('misc.recommended')}</div>
      )}
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.02em', marginBottom: 14 }}>{packName}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>{pack.tokensLabel}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>tokens</span>
      </div>
      <div style={{ marginTop: 14, marginBottom: 18 }}>
        <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-alt)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${pack.vol * 100}%`, borderRadius: 999, background: feat ? GRAD_H : `linear-gradient(90deg, ${pack.accent}, ${pack.accent}88)`, boxShadow: `0 0 10px ${pack.accent}66` }} />
        </div>
        {pack.per && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--text-dim)', marginTop: 8 }}>{pack.per} tokens</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 38, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{pack.price} €</span>
        {pack.save && <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 }}>{pack.save}</span>}
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.5, color: 'var(--text-mid)', flex: 1, margin: '6px 0 20px' }}>{packDesc}</p>
      <button onClick={() => onChoose(pack)} disabled={!!loading} aria-label={t('misc.choosePackAria', { name: packName })}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '13px 18px', borderRadius: 10, border: feat ? 'none' : '1px solid #06B6D4',
          background: feat ? GRAD : 'rgba(6,182,212,0.08)', color: feat ? '#fff' : '#06B6D4',
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', opacity: loading && loading !== pack.id ? 0.5 : 1,
          boxShadow: feat ? '0 4px 22px rgba(6,182,212,0.36)' : 'none',
        }}>
        {loading === pack.id ? <><span className="spinner" /> {t('misc.redirecting')}</> : <>{t('misc.chooseThisPack')} <ArrowRight size={15} /></>}
      </button>
    </div>
  )

  if (feat) return <div className="topup-reveal" style={{ background: GRAD, borderRadius: 19, padding: 1.5, animation: 'topupProGlow 4s ease-in-out infinite', alignSelf: 'stretch' }}>{inner}</div>
  return <div className="topup-reveal" style={{ alignSelf: 'stretch' }}>{inner}</div>
}

function TopupInner() {
  useTheme()
  const { t } = useI18n()
  const params = useSearchParams()
  const router = useRouter()
  const session = params.get('session')

  const stepTitles = [t('misc.stepChooseTitle'), t('misc.stepPayTitle'), t('misc.stepCreditTitle')]
  const stepDescs  = [t('misc.stepChooseDesc'), t('misc.stepPayDesc'), t('misc.stepCreditDesc')]
  const usageTitles = [t('misc.usageHermesTitle'), t('misc.usageAthenaTitle'), t('misc.usageZeusTitle'), t('misc.usageBriefingTitle')]
  const usageDescs  = [t('misc.usageHermesDesc'), t('misc.usageAthenaDesc'), t('misc.usageZeusDesc'), t('misc.usageBriefingDesc')]

  const [info, setInfo] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    ;(async () => {
      try {
        const res = await fetch('/api/topup/verify-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: session }),
        })
        if (res.status === 410 || res.status === 404) { router.replace('/topup/expired'); return }
        if (res.ok) setInfo(await res.json() as SessionInfo)
      } catch { /* fallback affiché */ }
    })()
  }, [session, router])

  async function choose(pack: Pack) {
    if (loading) return
    if (!session) { setError(t('misc.topupInvalidLink')); return }
    setLoading(pack.id); setError(null)
    try {
      const res = await fetch('/api/topup/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: session, pack_id: pack.id }),
      })
      const json = await res.json() as { checkout_url?: string; error?: string }
      if (!res.ok || !json.checkout_url) throw new Error(json.error ?? t('misc.error'))
      window.location.href = json.checkout_url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('misc.error'))
      setLoading(null)
    }
  }

  // Solde : restant (quota - utilisé + bonus) / quota
  const limit = info?.monthly.limit ?? 1000000
  const used = info?.monthly.used ?? 0
  const bonus = info?.bonus_tokens ?? 0
  const remaining = Math.max(0, limit - used) + bonus
  const planLabel = info ? `${t('misc.plan')} ${info.plan.charAt(0).toUpperCase() + info.plan.slice(1)}` : t('misc.plan')
  const resetDays = info ? Math.max(0, Math.ceil((new Date(info.monthly.resets_at).getTime() - Date.now()) / 86_400_000)) : null

  return (
    <div className="topup-root">
      <TopupStyles />
      <Header />

      {/* Hero solde */}
      <section style={{ paddingTop: 64, paddingBottom: 8 }}>
        <div className="topup-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="topup-reveal topup-eyebrow" style={{ marginBottom: 26 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06B6D4', boxShadow: '0 0 8px #06B6D4', animation: 'topupPulse 2s infinite', display: 'inline-block' }} />
            {t('misc.secureLink24h')}
          </div>
          <div className="topup-reveal" style={{ marginBottom: 22 }}>
            <TokenGauge value={remaining} total={limit} label={t('misc.currentBalance')} sub={t('misc.monthlyQuota')} />
          </div>
          <div className="topup-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999, border: '1px solid var(--border-mid)', background: 'var(--bg-card)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#06B6D4' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#06B6D4', display: 'inline-block' }} /> {planLabel}
            </span>
            {resetDays !== null && <>
              <span style={{ width: 1, height: 12, background: 'var(--border-mid)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>{t(resetDays > 1 ? 'misc.resetInDaysPlural' : 'misc.resetInDaysSingular', { n: resetDays })}</span>
            </>}
          </div>
        </div>
      </section>

      {/* Packs */}
      <section style={{ paddingTop: 72, paddingBottom: 8 }}>
        <div className="topup-wrap">
          <div className="topup-reveal" style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto 44px' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(30px, 4.4vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: 'var(--text)', marginBottom: 16 }}>
              {t('misc.rechargeYour')} <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t('misc.fuel')}</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.6, color: 'var(--text-mid)' }}>
              {t('misc.topupIntro')}
            </p>
            {error && <p style={{ marginTop: 16, fontSize: 13, color: '#ef4444' }}>{error}</p>}
          </div>
          <div className="packs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr 1fr', gap: 16, maxWidth: 940, margin: '0 auto', alignItems: 'stretch' }}>
            {PACKS.map(p => <PackCard key={p.id} pack={p} loading={loading} onChoose={choose} />)}
          </div>
        </div>
      </section>

      {/* Repères tokens */}
      <section style={{ paddingTop: 96, paddingBottom: 8 }}>
        <div className="topup-wrap">
          <div className="topup-reveal" style={{ textAlign: 'center', marginBottom: 36 }}>
            <span className="topup-eyebrow" style={{ marginBottom: 14 }}>{t('misc.benchmarks')}</span>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: 14 }}>{t('misc.whatTokensMean')}</h2>
          </div>
          <div className="usage-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 780, margin: '0 auto' }}>
            {USAGES.map(({ Ic, amt, c }, i) => (
              <div key={i} className="topup-reveal" style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${c}, transparent 70%)` }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${c}12`, border: `1px solid ${c}30`, color: c, boxShadow: `0 0 12px ${c}22` }}><Ic size={20} /></div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: c }}>{amt}<span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 3 }}>tok</span></span>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', marginBottom: 5 }}>{usageTitles[i]}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{usageDescs[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section style={{ paddingTop: 96, paddingBottom: 96 }}>
        <div className="topup-wrap">
          <div className="topup-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
            <span className="topup-eyebrow" style={{ marginBottom: 14 }}>{t('misc.threeSteps')}</span>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: 14 }}>{t('misc.howItWorks')}</h2>
          </div>
          <div className="steps-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 820, margin: '0 auto' }}>
            <div className="steps-line" style={{ position: 'absolute', top: 30, left: '16%', right: '16%', height: 2, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), rgba(91,111,255,0.4), transparent)', zIndex: 0 }} />
            {STEPS.map(({ Ic }, i) => (
              <div key={i} className="topup-reveal" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid rgba(6,182,212,0.4)', color: '#06B6D4', boxShadow: '0 0 28px rgba(6,182,212,0.22), 0 0 0 6px var(--bg)' }}><Ic size={24} /></div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', marginBottom: 7 }}>{stepTitles[i]}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-mid)', maxWidth: 220, margin: '0 auto' }}>{stepDescs[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function TopupPage() {
  return (
    <Suspense fallback={null}>
      <TopupInner />
    </Suspense>
  )
}
