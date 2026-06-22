'use client'

// Cockpit admin (client) — réutilise le composant d'onglets existant (SectionLayout,
// comme la page Récupération) et la charte de l'app (tokens, fond, logo shuriken).
// Aucune lib de charts : SVG brut. Données reçues en props (calculées serveur).

import { LayoutDashboard, Euro, Cpu, MousePointerClick, Activity, Plug } from 'lucide-react'
import { SectionLayout, type SectionDef } from '@/components/navigation/SectionLayout'
import type { AdminMetrics } from '@/lib/admin/types'

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
  if (!rows.length) return <Empty text="Aucune donnée sur la période." />
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
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <Empty text="Aucun abonné." />
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
  const o = m.overview
  return (
    <div>
      <Grid>
        <Stat label="Utilisateurs" value={fmt(o.totalUsers)} sub={`${o.netGrowthMonth >= 0 ? '+' : ''}${o.netGrowthMonth} ce mois`} />
        <Stat label="Actifs maintenant" value={fmt(o.activeNow)} sub="< 5 min" />
        <Stat label="MRR" value={eur(o.mrrEur)} sub={`ARR ${eur(o.mrrEur * 12)}`} />
        <Stat label="Stickiness" value={`${o.stickinessPct}%`} sub="DAU / MAU" />
      </Grid>
      <Section title="Activité"><Grid>
        <Stat label="DAU" value={fmt(o.dau)} sub="actifs / 24 h" />
        <Stat label="WAU" value={fmt(o.wau)} sub="actifs / 7 j" />
        <Stat label="MAU" value={fmt(o.mau)} sub="actifs / 30 j" />
      </Grid></Section>
      <Section title="Croissance (inscrits cumulés, 30 j)"><Spark points={m.signupsCumulative} label="Inscrits" /></Section>
      <Section title="Répartition par abonnement">
        <Donut segments={m.tierBreakdown.map(t => ({ label: t.tier, value: t.count, color: TIER_COLOR[t.tier] ?? 'var(--text-dim)' }))} />
      </Section>
    </div>
  )
}

function Revenue({ m }: { m: AdminMetrics }) {
  const r = m.revenue
  return (
    <div>
      <Grid>
        <Stat label="MRR" value={eur(r.mrrEur)} />
        <Stat label="ARR" value={eur(r.arrEur)} />
        <Stat label="ARPU" value={eur(r.arpuEur)} sub="par payant" />
        <Stat label="Conv. essai→payant" value={r.trialToPaidPct == null ? '—' : `${r.trialToPaidPct}%`} />
      </Grid>
      <Section title="Funnel"><Grid>
        <Stat label="Payants actifs" value={fmt(r.activePaid)} />
        <Stat label="En essai" value={fmt(r.trials)} />
      </Grid></Section>
      <Section title="MRR par palier">
        <BarList rows={m.tierBreakdown.map(t => ({ label: t.tier, value: t.count, color: TIER_COLOR[t.tier], right: `${t.count}` }))} />
      </Section>
    </div>
  )
}

function AI({ m }: { m: AdminMetrics }) {
  const a = m.ai
  return (
    <div>
      <Grid>
        <Stat label="Modèle dominant" value={a.models[0]?.model ?? '—'} sub={a.models[0] ? `${fmt(a.models[0].calls)} appels` : undefined} />
        <Stat label="Tokens (30 j)" value={fmt(a.totalTokens)} />
        <Stat label="Coût IA (30 j)" value={eur(a.totalCostEur)} sub={m.revenue.mrrEur > 0 ? `${Math.round((a.totalCostEur / m.revenue.mrrEur) * 100)}% du MRR` : undefined} alert={a.marginAlert} />
        <Stat label="Conversations" value={fmt(a.conversations)} />
      </Grid>
      {a.marginAlert && (
        <div style={{ marginTop: 'var(--space-3)', background: 'var(--bg-card2)', border: '1px solid var(--charge-hard)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)' }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--charge-hard)', fontWeight: 600 }}>⚠ Coût IA &gt; 30 % du MRR — surveille tes marges.</span>
        </div>
      )}
      <Section title="Coût & usage par modèle">
        <BarList rows={a.models.map(mm => ({ label: mm.model, value: mm.tokens, color: 'var(--primary)', right: `${eur(mm.costEur)} · ${fmt(mm.tokens)} tk` }))} />
      </Section>
      <Section title="Tokens par jour (30 j)"><Spark points={a.tokensByDay} label="Tokens" /></Section>
      <Section title="Actions IA (usage_logs)">
        <BarList rows={a.features.map(f => ({ label: f.type, value: f.count }))} />
      </Section>
      <Section title="Top consommateurs">
        <BarList rows={a.topConsumers.map(c => ({ label: `${c.userId.slice(0, 8)}…`, value: c.tokens, right: `${fmt(c.tokens)} tk` }))} />
      </Section>
    </div>
  )
}

function Product({ m }: { m: AdminMetrics }) {
  const p = m.product
  return (
    <div>
      {!p.enabled && <Empty text="Collecte comportementale désactivée (NEXT_PUBLIC_ANALYTICS_ENABLED=false). Active-la une fois la politique de confidentialité + le consentement en ligne pour remplir cet onglet." />}
      <Section title="Pages — temps moyen">
        <BarList rows={p.topPages.map(pg => ({ label: pg.path, value: pg.avgMs, right: `${(pg.avgMs / 1000).toFixed(1)} s · ${pg.views} vues` }))} />
      </Section>
      <Section title="Fonctionnalités les plus utilisées">
        <BarList rows={p.topFeatures.map(f => ({ label: f.name, value: f.count }))} />
      </Section>
      <Section title="Plateforme">
        <Grid><Stat label="Part mobile" value={p.mobilePct == null ? '—' : `${p.mobilePct}%`} /></Grid>
      </Section>
    </div>
  )
}

function Engagement({ m }: { m: AdminMetrics }) {
  const e = m.engagement
  return (
    <div>
      <Grid>
        <Stat label="DAU" value={fmt(e.dau)} />
        <Stat label="WAU" value={fmt(e.wau)} />
        <Stat label="MAU" value={fmt(e.mau)} />
        <Stat label="Nouveaux (7 j)" value={fmt(e.newLast7)} />
      </Grid>
      <Section title="Rétention"><Grid>
        <Stat label="Inactifs > 30 j" value={fmt(e.inactive30)} sub={`sur ${fmt(m.overview.totalUsers)} users`} />
      </Grid></Section>
      <Empty text="Rétention par cohortes (J1/J7/J30) : disponible une fois la collecte analytics active et plusieurs cohortes accumulées." />
    </div>
  )
}

function Integrations({ m }: { m: AdminMetrics }) {
  const i = m.integrations
  return (
    <div>
      <Section title="Syncs par provider (30 j)">
        <BarList rows={i.providers.map(p => ({ label: p.provider, value: p.total, right: `${p.ok}/${p.total} ok` }))} />
      </Section>
      <Section title="Répartition par sport">
        <BarList rows={i.sports.map(s => ({ label: s.sport, value: s.count }))} />
      </Section>
    </div>
  )
}

export function AdminDashboard({ metrics, adminEmail }: { metrics: AdminMetrics; adminEmail: string | null }) {
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_4bras.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Cockpit</h1>
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {adminEmail} · {new Date(metrics.generatedAt).toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  )

  const sections: SectionDef[] = [
    { id: 'overview', label: "Vue d'ensemble", short: 'Vue', subtitle: 'Croissance & présence', icon: LayoutDashboard, content: <Overview m={metrics} /> },
    { id: 'revenue', label: 'Revenus', subtitle: 'MRR · ARPU · funnel', icon: Euro, content: <Revenue m={metrics} /> },
    { id: 'ai', label: 'IA & coûts', short: 'IA', subtitle: 'Modèles · tokens · marges', icon: Cpu, content: <AI m={metrics} /> },
    { id: 'product', label: 'Produit', subtitle: 'Pages · fonctionnalités', icon: MousePointerClick, content: <Product m={metrics} /> },
    { id: 'engagement', label: 'Engagement', subtitle: 'Rétention · activité', icon: Activity, content: <Engagement m={metrics} /> },
    { id: 'integrations', label: 'Intégrations', short: 'Intég.', subtitle: 'Syncs · sports', icon: Plug, content: <Integrations m={metrics} /> },
  ]

  return <SectionLayout header={header} sections={sections} urlParam="tab" />
}
