'use client'

// Cockpit admin (client) — réutilise le composant d'onglets existant (SectionLayout,
// comme la page Récupération) et la charte de l'app (tokens, fond, logo shuriken).
// Aucune lib de charts : SVG brut. Données reçues en props (calculées serveur).

import { LayoutDashboard, Euro, Cpu, MousePointerClick, Activity, Plug } from 'lucide-react'
import { SectionLayout, type SectionDef } from '@/components/navigation/SectionLayout'
import type { AdminMetrics } from '@/lib/admin/types'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const TIER_COLOR: Record<string, string> = {
  premium: 'var(--charge-low)', pro: 'var(--primary)', expert: 'var(--ai-accent)', trial: 'var(--charge-mid)', inconnu: 'var(--text-dim)',
}
const fmt = (n: number) => n.toLocaleString('fr-FR')
const eur = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`

// ── Primitives ────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', minWidth: 0 }}>{children}</div>
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>{children}</div>
}
function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <Card>
      <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      <div className="tnum" style={{ fontFamily: FB, fontSize: 24, fontWeight: 600, color: alert ? 'var(--charge-hard)' : 'var(--text)', marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <h3 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>{title}</h3>
      {children}
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <Card><span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{text}</span></Card>
}

// Barres horizontales (classement)
function BarList({ rows }: { rows: { label: string; value: number; right?: string; color?: string }[] }) {
  const { t } = useI18n()
  if (!rows.length) return <Empty text={t('admin.emptyNoData')} />
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 4 }}>
              <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{r.right ?? fmt(r.value)}</span>
            </div>
            <svg width="100%" height={6} style={{ display: 'block' }}>
              <rect x={0} y={0} width="100%" height={6} rx={3} fill="var(--border)" />
              <rect x={0} y={0} width={`${(r.value / max) * 100}%`} height={6} rx={3} fill={r.color ?? 'var(--primary)'} />
            </svg>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Sparkline (courbe)
function Spark({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  const vals = points.map(p => p.value)
  const W = 320, H = 90, padT = 8, padB = 8
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0)
  const range = (max - min) || 1
  const x = (i: number) => (i / Math.max(points.length - 1, 1)) * W
  const y = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H - padB} L0,${H - padB} Z`
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>{label}</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmt(vals[vals.length - 1] ?? 0)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs><linearGradient id="adminSpark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
        <path d={area} fill="url(#adminSpark)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </Card>
  )
}

// Donut répartition
function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const { t } = useI18n()
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <Empty text={t('admin.emptyNoSubscriber')} />
  const r = 42, sw = 14, c = 2 * Math.PI * r
  let acc = 0
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <svg width={110} height={110} viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx={55} cy={55} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
          {segments.map((s, i) => {
            const dash = (s.value / total) * c
            const el = <circle key={i} cx={55} cy={55} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} />
            acc += dash
            return el
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {segments.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text)', textTransform: 'capitalize' }}>{s.label}</span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── Onglets ───────────────────────────────────────────────────────
function Overview({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const o = m.overview
  return (
    <div>
      <Grid>
        <Stat label={t('admin.stat.users')} value={fmt(o.totalUsers)} sub={t('admin.overview.netGrowthSub', { n: `${o.netGrowthMonth >= 0 ? '+' : ''}${o.netGrowthMonth}` })} />
        <Stat label={t('admin.overview.activeNow')} value={fmt(o.activeNow)} sub="< 5 min" />
        <Stat label="MRR" value={eur(o.mrrEur)} sub={`ARR ${eur(o.mrrEur * 12)}`} />
        <Stat label="Stickiness" value={`${o.stickinessPct}%`} sub="DAU / MAU" />
      </Grid>
      <Section title={t('admin.section.activity')}><Grid>
        <Stat label="DAU" value={fmt(o.dau)} sub={t('admin.overview.dauSub')} />
        <Stat label="WAU" value={fmt(o.wau)} sub={t('admin.overview.wauSub')} />
        <Stat label="MAU" value={fmt(o.mau)} sub={t('admin.overview.mauSub')} />
      </Grid></Section>
      <Section title={t('admin.overview.growthTitle')}><Spark points={m.signupsCumulative} label={t('admin.overview.signups')} /></Section>
      <Section title={t('admin.overview.tierTitle')}>
        <Donut segments={m.tierBreakdown.map(row => ({ label: row.tier, value: row.count, color: TIER_COLOR[row.tier] ?? 'var(--text-dim)' }))} />
      </Section>
    </div>
  )
}

function Revenue({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const r = m.revenue
  return (
    <div>
      <Grid>
        <Stat label="MRR" value={eur(r.mrrEur)} />
        <Stat label="ARR" value={eur(r.arrEur)} />
        <Stat label="ARPU" value={eur(r.arpuEur)} sub={t('admin.revenue.arpuSub')} />
        <Stat label={t('admin.revenue.trialConv')} value={r.trialToPaidPct == null ? '—' : `${r.trialToPaidPct}%`} />
      </Grid>
      <Section title="Funnel"><Grid>
        <Stat label={t('admin.revenue.activePaid')} value={fmt(r.activePaid)} />
        <Stat label={t('admin.revenue.trials')} value={fmt(r.trials)} />
      </Grid></Section>
      <Section title={t('admin.revenue.mrrByTier')}>
        <BarList rows={m.tierBreakdown.map(row => ({ label: row.tier, value: row.count, color: TIER_COLOR[row.tier], right: `${row.count}` }))} />
      </Section>
    </div>
  )
}

function AI({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const a = m.ai
  return (
    <div>
      <Grid>
        <Stat label={t('admin.ai.topModel')} value={a.models[0]?.model ?? '—'} sub={a.models[0] ? t('admin.ai.callsSub', { n: fmt(a.models[0].calls) }) : undefined} />
        <Stat label={t('admin.ai.tokens30')} value={fmt(a.totalTokens)} />
        <Stat label={t('admin.ai.cost30')} value={eur(a.totalCostEur)} sub={m.revenue.mrrEur > 0 ? t('admin.ai.mrrPctSub', { n: Math.round((a.totalCostEur / m.revenue.mrrEur) * 100) }) : undefined} alert={a.marginAlert} />
        <Stat label="Conversations" value={fmt(a.conversations)} />
      </Grid>
      {a.marginAlert && (
        <div style={{ marginTop: 'var(--space-3)', background: 'var(--bg-card2)', border: '1px solid var(--charge-hard)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)' }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--charge-hard)', fontWeight: 600 }}>{t('admin.ai.marginWarning')}</span>
        </div>
      )}
      <Section title={t('admin.ai.costUsageByModel')}>
        <BarList rows={a.models.map(mm => ({ label: mm.model, value: mm.tokens, color: 'var(--primary)', right: `${eur(mm.costEur)} · ${fmt(mm.tokens)} tk` }))} />
      </Section>
      <Section title={t('admin.ai.tokensPerDay')}><Spark points={a.tokensByDay} label="Tokens" /></Section>
      <Section title={t('admin.ai.aiActions')}>
        <BarList rows={a.features.map(f => ({ label: f.type, value: f.count }))} />
      </Section>
      <Section title={t('admin.ai.topConsumers')}>
        <BarList rows={a.topConsumers.map(c => ({ label: `${c.userId.slice(0, 8)}…`, value: c.tokens, right: `${fmt(c.tokens)} tk` }))} />
      </Section>
    </div>
  )
}

function Product({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const p = m.product
  return (
    <div>
      {!p.enabled && <Empty text={t('admin.product.analyticsDisabled')} />}
      <Section title={t('admin.product.pagesAvgTime')}>
        <BarList rows={p.topPages.map(pg => ({ label: pg.path, value: pg.avgMs, right: t('admin.product.pageRight', { s: (pg.avgMs / 1000).toFixed(1), v: pg.views }) }))} />
      </Section>
      <Section title={t('admin.product.topFeatures')}>
        <BarList rows={p.topFeatures.map(f => ({ label: f.name, value: f.count }))} />
      </Section>
      <Section title={t('admin.product.platform')}>
        <Grid><Stat label={t('admin.product.mobileShare')} value={p.mobilePct == null ? '—' : `${p.mobilePct}%`} /></Grid>
      </Section>
    </div>
  )
}

function Engagement({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const e = m.engagement
  return (
    <div>
      <Grid>
        <Stat label="DAU" value={fmt(e.dau)} />
        <Stat label="WAU" value={fmt(e.wau)} />
        <Stat label="MAU" value={fmt(e.mau)} />
        <Stat label={t('admin.engagement.new7')} value={fmt(e.newLast7)} />
      </Grid>
      <Section title={t('admin.engagement.retention')}><Grid>
        <Stat label={t('admin.engagement.inactive30')} value={fmt(e.inactive30)} sub={t('admin.engagement.inactiveSub', { n: fmt(m.overview.totalUsers) })} />
      </Grid></Section>
      <Empty text={t('admin.engagement.cohortEmpty')} />
    </div>
  )
}

function Integrations({ m }: { m: AdminMetrics }) {
  const { t } = useI18n()
  const i = m.integrations
  return (
    <div>
      <Section title={t('admin.integrations.syncsByProvider')}>
        <BarList rows={i.providers.map(p => ({ label: p.provider, value: p.total, right: `${p.ok}/${p.total} ok` }))} />
      </Section>
      <Section title={t('admin.integrations.bySport')}>
        <BarList rows={i.sports.map(s => ({ label: s.sport, value: s.count }))} />
      </Section>
    </div>
  )
}

export function AdminDashboard({ metrics, adminEmail }: { metrics: AdminMetrics; adminEmail: string | null }) {
  const { t } = useI18n()
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_4bras.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Cockpit</h1>
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {adminEmail} · {new Date(metrics.generatedAt).toLocaleString('fr-FR')}
        </p>
      </div>
      {/* Aperçu de la page de connexion (admin only) — nouvel onglet, session conservée */}
      <a href="/auth" target="_blank" rel="noopener noreferrer" style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
        borderRadius: 999, border: '1px solid var(--border-mid)', background: 'var(--bg-card2)',
        color: 'var(--text)', fontFamily: FB, fontSize: 12, fontWeight: 600, textDecoration: 'none',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
        {t('admin.viewLoginPage')}
      </a>
    </div>
  )

  const sections: SectionDef[] = [
    { id: 'overview', label: t('admin.tab.overview'), short: t('admin.tab.overviewShort'), subtitle: t('admin.tab.overviewSub'), icon: LayoutDashboard, content: <Overview m={metrics} /> },
    { id: 'revenue', label: t('admin.tab.revenue'), subtitle: 'MRR · ARPU · funnel', icon: Euro, content: <Revenue m={metrics} /> },
    { id: 'ai', label: t('admin.tab.ai'), short: t('admin.tab.aiShort'), subtitle: t('admin.tab.aiSub'), icon: Cpu, content: <AI m={metrics} /> },
    { id: 'product', label: t('admin.tab.product'), subtitle: t('admin.tab.productSub'), icon: MousePointerClick, content: <Product m={metrics} /> },
    { id: 'engagement', label: 'Engagement', subtitle: t('admin.tab.engagementSub'), icon: Activity, content: <Engagement m={metrics} /> },
    { id: 'integrations', label: t('admin.tab.integrations'), short: t('admin.tab.integrationsShort'), subtitle: 'Syncs · sports', icon: Plug, content: <Integrations m={metrics} /> },
  ]

  return <SectionLayout header={header} sections={sections} urlParam="tab" />
}
