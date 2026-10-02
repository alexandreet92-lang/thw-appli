'use client'
// ══════════════════════════════════════════════════════════════════
// « Mon abonnement » — mise en page MOBILE (≤ 767 px), façon Strava / Claude :
// page gris chaud, cartes blanches radius 20 sans bordure, libellés gris en
// casse normale, listes à filets, cartes de formule blanches à cocher, une
// pilule cyan pleine largeur. Présentation pure : toute la logique (données,
// achat, gestion) reste dans page.tsx et arrive par les props.
// ══════════════════════════════════════════════════════════════════
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { SheetCard, SheetPill, SHEET_CARD_SHADOW } from '@/components/ui/BottomSheet'

const FB = 'var(--font-body)'
const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

export interface MobileUsageRow { key: string; label: string; used: number; limit: number; resetAt: string }
export interface MobilePlanRow { tier: string; name: string; subtitle: string }
export interface MobileFeatureRow { label: string; values: Record<string, string | boolean> }

interface Props {
  loading: boolean
  isUnlimited: boolean
  currentTier: string
  planTitle: string
  subStatus: string | null
  periodLine: string
  trialNote: string | null
  hasBilling: boolean
  banner: { type: 'success' | 'error'; msg: string } | null
  onCloseBanner: () => void
  canceled: boolean
  usage: MobileUsageRow[]
  plans: MobilePlanRow[]
  features: MobileFeatureRow[]
  onManage: () => void
  onChoose: (tier: string) => void
  resetLabel: (date: string) => string
  locale: string
}

function Rule() {
  return <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />
}

function Section({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      {label && <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-mid)', margin: '0 16px 8px' }}>{label}</p>}
      {children}
    </section>
  )
}

function Bone({ w, h }: { w: number | string; h: number }) {
  return <span aria-hidden style={{ display: 'block', width: w, height: h, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)' }} />
}

export function MobileSubscription(p: Props) {
  const { t } = useI18n()
  const firstOther = p.plans.find(x => x.tier !== p.currentTier && x.tier === 'pro') ?? p.plans.find(x => x.tier !== p.currentTier) ?? p.plans[0]
  const [selected, setSelected] = useState<string>(firstOther?.tier ?? 'pro')
  const sel = p.plans.find(x => x.tier === selected) ?? p.plans[0]
  const selIsCurrent = sel?.tier === p.currentTier

  const valueText = (v: string | boolean): ReactNode => {
    if (v === true) return <Check size={18} strokeWidth={2.6} color="var(--primary)" aria-label="✓" />
    if (v === false) return <span style={{ color: 'var(--text-dim)' }}>–</span>
    const map: Record<string, string> = {
      'Illimité': t('misc.unlimited'), '7 (quotidien)': t('misc.dailyValue'), '6 mois': t('misc.months6'), '24 mois': t('misc.months24'),
    }
    return map[v] ?? v
  }

  const statusOk = p.subStatus === 'active' || p.subStatus === 'trialing'
  const statusText = p.subStatus === 'active' ? t('misc.statusActive')
    : p.subStatus === 'trialing' ? t('misc.statusTrial')
    : p.subStatus === 'past_due' ? t('misc.statusPastDue')
    : t('misc.statusCanceled')

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-page)', padding: '16px 16px 48px', boxSizing: 'border-box', fontFamily: FB, color: 'var(--text)' }}>
      <header style={{ padding: '0 4px', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{t('misc.mySubscription')}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{t('misc.subIntro')}</p>
      </header>

      {p.banner && (
        <SheetCard style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '6px 6px 6px 16px' }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.banner.type === 'success' ? 'var(--primary)' : 'var(--danger)' }} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: p.banner.type === 'success' ? 'var(--text)' : 'var(--danger)' }}>{p.banner.msg}</span>
          <button type="button" onClick={p.onCloseBanner} aria-label={t('w3c.close')}
            style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </SheetCard>
      )}
      {p.canceled && !p.banner && (
        <SheetCard style={{ marginBottom: 20, padding: '14px 16px', fontSize: 15, color: 'var(--text-mid)' }}>{t('misc.paymentCanceled')}</SheetCard>
      )}

      {/* Formule actuelle */}
      <Section label={t('misc.currentPlan')}>
        <SheetCard>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {p.loading ? <><Bone w={140} h={20} /><Bone w={200} h={14} /></> : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>{p.planTitle}</span>
                  {(p.isUnlimited || p.subStatus) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
                      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: p.isUnlimited || statusOk ? 'var(--success)' : 'var(--danger)' }} />
                      {p.isUnlimited ? t('misc.unlimited') : statusText}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 15, color: 'var(--text-mid)' }}>{p.periodLine}</span>
              </>
            )}
          </div>
          {p.trialNote && (
            <div style={{ position: 'relative', padding: '14px 16px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>
              <Rule />{p.trialNote}
            </div>
          )}
          {p.hasBilling && (
            <button type="button" onClick={p.onManage}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '0 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, textAlign: 'left' }}>
              <Rule />
              <span style={{ flex: 1, fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>{t('misc.manageSubscription')}</span>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </SheetCard>
      </Section>

      {/* Utilisation */}
      {!p.isUnlimited && (
        <Section label={t('misc.currentUsage')}>
          <SheetCard>
            {p.loading
              ? [0, 1, 2].map(i => (
                  <div key={i} style={{ position: 'relative', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {i > 0 && <Rule />}<Bone w="55%" h={14} /><Bone w="100%" h={6} />
                  </div>
                ))
              : p.usage.map((u, i) => {
                  const pct = u.limit === Infinity ? 0 : Math.min(100, (u.used / Math.max(1, u.limit)) * 100)
                  const high = pct >= 85
                  const reset = new Date(u.resetAt).toLocaleDateString(p.locale, { day: 'numeric', month: 'short' })
                  return (
                    <div key={u.key} style={{ position: 'relative', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {i > 0 && <Rule />}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{u.label}</span>
                        <span style={{ ...num, fontSize: 15, color: 'var(--text-mid)' }}>{u.used} / {u.limit === Infinity ? '∞' : u.limit}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-chip)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: high ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.9s ease' }} />
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{p.resetLabel(reset)}</span>
                    </div>
                  )
                })}
          </SheetCard>
        </Section>
      )}

      {/* Formules */}
      {!p.isUnlimited && sel && (
        <Section label={t('misc.changePlan')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {p.plans.map(pl => {
              const on = pl.tier === selected
              const current = pl.tier === p.currentTier
              return (
                <button key={pl.tier} type="button" aria-pressed={on} onClick={() => setSelected(pl.tier)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 76, padding: 16, border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', fontFamily: FB,
                    boxShadow: on ? 'inset 0 0 0 2px var(--primary)' : SHEET_CARD_SHADOW, transition: 'box-shadow 0.2s ease' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{pl.name}</span>
                      {(current || pl.tier === 'expert') && (
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 600 }}>
                          {current ? t('misc.currentPlan') : t('misc.recommended')}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: 'var(--text-mid)' }}>{pl.subtitle}</span>
                  </span>
                  <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)' }}>
                    {on && <Check size={16} strokeWidth={3} color="var(--on-primary)" />}
                  </span>
                </button>
              )
            })}
          </div>

          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-mid)', margin: '22px 16px 8px' }}>{sel.name}</p>
          <SheetCard>
            {p.features.map((f, i) => (
              <div key={f.label} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '10px 16px' }}>
                {i > 0 && <Rule />}
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)' }}>{f.label}</span>
                <span style={{ ...num, fontSize: 15, color: 'var(--text-mid)', display: 'flex', alignItems: 'center', textAlign: 'right' }}>{valueText(f.values[sel.tier])}</span>
              </div>
            ))}
          </SheetCard>

          <div style={{ marginTop: 18 }}>
            <SheetPill onClick={() => { if (!selIsCurrent) p.onChoose(sel.tier) }} disabled={selIsCurrent}>
              {selIsCurrent ? t('misc.currentPlan') : t('misc.choosePlan', { name: sel.name })}
            </SheetPill>
          </div>
        </Section>
      )}

      {!p.isUnlimited && (
        <p style={{ margin: '8px 16px 0', fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.55 }}>{t('misc.subLegalNote')}</p>
      )}
    </div>
  )
}
