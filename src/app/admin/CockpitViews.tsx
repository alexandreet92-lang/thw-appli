'use client'

// Vues « clarté » du Cockpit : l'essentiel, inscriptions, parcours, revenus, comptes.
// SVG brut + motion/react (déjà dans l'app) pour l'entrée. Aucune librairie de charts.
// Tokens uniquement (DESIGN.md) : un seul accent (--primary), pas de bordure décorative.

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Reveal } from '@/components/motion/Reveal'
import type { AdminMetrics, AdminAccount } from '@/lib/admin/types'
import { useI18n } from '@/lib/i18n'
import { lng, makeT, localeOf } from './cockpit-labels'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type T = ReturnType<typeof makeT>

function useCockpitT() {
  const { lang } = useI18n()
  const l = lng(lang)
  return { t: makeT(l), locale: localeOf(l) }
}

// ── Primitives ────────────────────────────────────────────────────
function SectionHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h3>
      {lead && <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 0', maxWidth: '64ch', lineHeight: 1.5 }}>{lead}</p>}
    </div>
  )
}

function Kpi({ label, value, unit, sub, help, helpLabel, delay }: {
  label: string; value: string; unit?: string; sub: string; help: string; helpLabel: string; delay: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <Reveal delay={delay}>
      <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)', height: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</span>
          <button type="button" aria-label={helpLabel} aria-expanded={open} onClick={() => setOpen(o => !o)} style={{
            width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-mid)',
            fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}>?</button>
        </div>
        <div className="tnum" style={{ fontFamily: FB, fontSize: 40, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1, marginTop: 10 }}>
          {value}{unit && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 4 }}>{unit}</span>}
        </div>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '8px 0 0', lineHeight: 1.45 }}>{sub}</p>
        {open && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: '12px 0 0', padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bg-hover)', lineHeight: 1.5 }}>{help}</p>}
      </div>
    </Reveal>
  )
}

const KpiGrid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--space-3)' }}>{children}</div>
)

// ── Inscriptions par mois ─────────────────────────────────────────
function MonthBars({ data, t, locale }: { data: { month: string; count: number }[]; t: T; locale: string }) {
  const reduce = useReducedMotion()
  const [hot, setHot] = useState<number | null>(null)
  const W = 640, H = 250, padL = 34, padB = 34, padT = 20
  const max = Math.max(4, ...data.map(d => d.count))
  const step = (W - padL - 8) / data.length
  const bw = Math.min(44, step * 0.62)
  const label = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString(locale, { month: 'short' })
  const full = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const grid = Array.from({ length: max + 1 }, (_, i) => i)
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={t('su_title')}>
        {grid.map(g => {
          const y = padT + (H - padT - padB) * (1 - g / max)
          return (
            <g key={g}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="var(--text)" strokeOpacity={g ? 0.07 : 0.2} />
              <text x={padL - 10} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-dim)">{g}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const x = padL + 4 + i * step + (step - bw) / 2
          const h = (H - padT - padB) * (d.count / max)
          const y = H - padB - h
          return (
            <g key={d.month} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)} onClick={() => setHot(hot === i ? null : i)} style={{ cursor: 'default' }}>
              <rect x={x - 6} y={padT} width={bw + 12} height={H - padT - padB} fill="transparent" />
              {d.count > 0 ? (
                <>
                  <motion.rect x={x} width={bw} rx={7} fill="var(--primary)" fillOpacity={hot === null || hot === i ? 1 : 0.45}
                    initial={reduce ? false : { y: H - padB, height: 0 }} animate={{ y, height: h }}
                    transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />
                  <text x={x + bw / 2} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--text)">{d.count}</text>
                </>
              ) : (
                <rect x={x} y={H - padB - 3} width={bw} height={3} rx={1.5} fill="var(--text)" fillOpacity={0.15} />
              )}
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--text-dim)">{label(d.month)}</text>
            </g>
          )
        })}
      </svg>
      {hot !== null && (
        <div style={{
          position: 'absolute', top: 0, left: `${((padL + 4 + hot * step + step / 2) / W) * 100}%`, transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--bg)', fontFamily: FB, fontSize: 12, padding: '6px 10px', borderRadius: 'var(--r-sm)',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {data[hot].count === 1 ? t('su_tip1', { m: full(data[hot].month) }) : t('su_tipn', { m: full(data[hot].month), n: data[hot].count })}
        </div>
      )}
    </div>
  )
}

// ── Parcours ──────────────────────────────────────────────────────
function Funnel({ f, t }: { f: AdminMetrics['funnel']; t: T }) {
  const reduce = useReducedMotion()
  const rows = [
    { l: t('f_created'), v: f.created }, { l: t('f_confirmed'), v: f.confirmed }, { l: t('f_signed'), v: f.signedIn },
    { l: t('f_active'), v: f.active30 }, { l: t('f_paid'), v: f.paid },
  ]
  const max = Math.max(f.created, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {rows.map((r, i) => (
        <div key={r.l} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) minmax(0, 1fr) 36px', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{r.l}</span>
          <div style={{ height: 10, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', borderRadius: 'var(--r-pill)', background: 'var(--primary)', transformOrigin: 'left', width: `${(r.v / max) * 100}%` }}
              initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <b className="tnum" style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{r.v}</b>
        </div>
      ))}
    </div>
  )
}

// ── Vue d'ensemble ────────────────────────────────────────────────
export function OverviewV2({ m }: { m: AdminMetrics }) {
  const { t, locale } = useCockpitT()
  const fmt = (n: number) => n.toLocaleString(locale)
  const others = m.accounts.filter(a => a.offer !== 'owner' && a.lastSignInAt).length
  const trials = m.revenue.trials
  const peak = useMemo(() => m.signupsByMonth.reduce((a, b) => (b.count > a.count ? b : a), { month: '', count: 0 }), [m.signupsByMonth])
  const last = m.accounts.length ? m.accounts[m.accounts.length - 1].createdAt : null
  const dayFmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const monthFmt = (mo: string) => new Date(`${mo}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const hl = t('help')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <section>
        <SectionHead title={t('essential')} lead={t('essential_lead')} />
        <KpiGrid>
          <Kpi delay={0} helpLabel={hl} label={t('k_accounts')} value={fmt(m.overview.totalUsers)} sub={t('k_accounts_s', { n: others })} help={t('k_accounts_h')} />
          <Kpi delay={0.05} helpLabel={hl} label={t('k_active')} value={fmt(m.overview.mau)} unit={`/ ${fmt(m.overview.totalUsers)}`} sub={t('k_active_s', { n: m.overview.mau, t: m.overview.totalUsers })} help={t('k_active_h')} />
          <Kpi delay={0.1} helpLabel={hl} label={t('k_mrr')} value={fmt(m.revenue.mrrEur)} unit="€" sub={m.revenue.activePaid > 0 ? t('k_mrr_s', { n: m.revenue.activePaid }) : t('k_mrr_s0')} help={t('k_mrr_h')} />
          <Kpi delay={0.15} helpLabel={hl} label={t('k_trials')} value={fmt(trials)} sub={trials > 0 ? t('k_trials_s', { n: trials }) : t('k_trials_s0')} help={t('k_trials_h')} />
        </KpiGrid>
      </section>

      <section>
        <SectionHead title={t('su_title')} lead={t('su_lead')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)', minWidth: 0, gridColumn: 'span 2' }}>
            <MonthBars data={m.signupsByMonth} t={t} locale={locale} />
          </div>
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)', minWidth: 0 }}>
            <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('su_says')}</h4>
            <p style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', margin: '10px 0 0', lineHeight: 1.5 }}>
              {peak.count > 0 ? t('su_peak', { m: monthFmt(peak.month), n: peak.count }) : t('su_none')}
            </p>
            {last && <p style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', margin: '10px 0 0', lineHeight: 1.5 }}>{t('su_last', { d: dayFmt(last) })}</p>}
          </div>
        </div>
      </section>

      <section>
        <SectionHead title={t('fu_title')} lead={t('fu_lead')} />
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)' }}>
          <Funnel f={m.funnel} t={t} />
        </div>
      </section>
    </div>
  )
}

// ── Revenus ───────────────────────────────────────────────────────
export function RevenueV2({ m }: { m: AdminMetrics }) {
  const { t, locale } = useCockpitT()
  const r = m.revenue
  const eur = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 })
  const hl = t('help')
  return (
    <section>
      <SectionHead title={t('k_mrr')} lead={t('r_lead')} />
      <KpiGrid>
        <Kpi delay={0} helpLabel={hl} label={t('k_mrr')} value={eur(r.mrrEur)} unit="€" sub={r.activePaid > 0 ? t('k_mrr_s', { n: r.activePaid }) : t('k_mrr_s0')} help={t('r_mrr_h')} />
        <Kpi delay={0.05} helpLabel={hl} label={t('r_arr')} value={eur(r.arrEur)} unit="€" sub={t('r_arr_s')} help={t('r_arr_h')} />
        <Kpi delay={0.1} helpLabel={hl} label={t('r_paying')} value={String(r.activePaid)} sub={t('r_paying_s')} help={t('r_paying_h')} />
        <Kpi delay={0.15} helpLabel={hl} label={t('r_conv')} value={r.trialToPaidPct == null ? '—' : String(r.trialToPaidPct)} unit={r.trialToPaidPct == null ? undefined : '%'} sub={t('r_conv_s')} help={t('r_conv_h')} />
      </KpiGrid>
    </section>
  )
}

// ── Comptes ───────────────────────────────────────────────────────
function offerLabel(a: AdminAccount, t: T): string {
  if (a.offer === 'owner') return t('o_owner')
  if (a.offer === 'paid') return `${t('o_paid')}${a.tier ? ` (${a.tier})` : ''}`
  if (a.offer === 'comp') return `${t('o_comp')}${a.tier ? ` (${a.tier})` : ''}`
  if (a.offer === 'trial') return t('o_trial', { n: a.trialDaysLeft ?? 0 })
  return t('o_free')
}

export function AccountsV2({ m }: { m: AdminMetrics }) {
  const { t, locale } = useCockpitT()
  const d = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()
  const tag = (txt: string) => (
    <span style={{ display: 'inline-flex', fontFamily: FB, fontSize: 12, fontWeight: 500, color: 'var(--text)', background: 'var(--bg-hover)', padding: '3px 10px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap' }}>{txt}</span>
  )
  const th: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'left', padding: '0 12px 10px' }
  const td: React.CSSProperties = { fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', padding: '12px', whiteSpace: 'nowrap' }
  const accounts = [...m.accounts].reverse()
  return (
    <section>
      <SectionHead title={t('a_title')} lead={t('a_lead')} />
      <Reveal>
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead><tr><th style={th}>{t('a_account')}</th><th style={th}>{t('a_created')}</th><th style={th}>{t('a_last')}</th><th style={th}>{t('a_offer')}</th></tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td style={{ ...td, color: 'var(--text)', fontWeight: 500 }}>{a.emailMasked}</td>
                  <td style={td}>{d(a.createdAt)}</td>
                  <td style={td}>{a.lastSignInAt ? (sameDay(a.lastSignInAt) ? t('a_today') : d(a.lastSignInAt)) : t('a_never')}</td>
                  <td style={{ ...td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tag(offerLabel(a, t))}
                    {!a.emailConfirmed && tag(t('t_unconf'))}
                    {a.abandonedCheckout && tag(t('t_abandon'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: 'var(--space-4) 0 0', padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bg-hover)', lineHeight: 1.5 }}>{t('a_note')}</p>
        </div>
      </Reveal>
    </section>
  )
}
