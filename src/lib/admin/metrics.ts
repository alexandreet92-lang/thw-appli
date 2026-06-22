// ══════════════════════════════════════════════════════════════════
// Agrégats du Cockpit admin — SERVEUR UNIQUEMENT (service role, bypass RLS).
// Défense en profondeur : re-vérifie l'identité admin avant toute requête.
//
// Échelle actuelle (pré-lancement) : on requête directement les tables et on
// agrège en JS, avec des plafonds (.limit). TODO à gros volume : fonctions SQL
// d'agrégation (RPC) + table de rollups `analytics_daily` + index BRIN sur
// analytics_events.created_at, plutôt que de remonter les lignes.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from './guard'
import type { AdminMetrics, DayPoint } from './types'

// Prix abonnement (EUR / mois) — source : tier-limits (Premium 14 · Pro 26 · Expert 49).
const TIER_PRICE_EUR: Record<string, number> = { premium: 14, pro: 26, expert: 49 }
// Coût IA estimé par modèle (EUR / million de tokens, mélangé in/out). À affiner.
const MODEL_COST_PER_MTOK: Record<string, number> = { hermes: 0.8, athena: 7, zeus: 9 }
const MODEL_COST_DEFAULT = 5
// Seuil d'alerte marge : coût IA total > X % du MRR.
const MARGIN_ALERT_PCT = 30
const ROW_CAP = 5000

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

export async function getAdminMetrics(): Promise<AdminMetrics> {
  // Défense en profondeur : la couche données re-vérifie, pas seulement la route.
  const chk = await checkAdmin()
  if (!chk.ok) throw new Error('FORBIDDEN')

  const sb = createServiceClient()
  const now = Date.now()
  const iso = (ms: number) => new Date(ms).toISOString()
  const D = 86_400_000
  const since5m = iso(now - 5 * 60_000)
  const since1d = iso(now - D)
  const since7d = iso(now - 7 * D)
  const since30d = iso(now - 30 * D)

  // ── Utilisateurs & présence ───────────────────────────────────
  const cTotal = await sb.from('profiles').select('*', { count: 'exact', head: true })
  const totalUsers = cTotal.count ?? 0
  const cActive = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen_at', since5m)
  const activeNow = cActive.count ?? 0
  const cDau = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen_at', since1d)
  const dau = cDau.count ?? 0
  const cWau = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen_at', since7d)
  const wau = cWau.count ?? 0
  const cMau = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen_at', since30d)
  const mau = cMau.count ?? 0
  const cNew7 = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', since7d)
  const newLast7 = cNew7.count ?? 0

  // Croissance nette : inscrits ce mois vs mois précédent
  const d = new Date()
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString()
  const cThis = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart)
  const cLast = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', monthStart)
  const netGrowthMonth = (cThis.count ?? 0) - (cLast.count ?? 0)

  // Inscrits cumulés (30 j)
  const { data: signups } = await sb.from('profiles').select('created_at').gte('created_at', since30d).limit(ROW_CAP)
  const baseline = totalUsers - (signups?.length ?? 0)
  const byDay = new Map<string, number>()
  for (const r of signups ?? []) byDay.set(dayKey(r.created_at as string), (byDay.get(dayKey(r.created_at as string)) ?? 0) + 1)
  const signupsCumulative: DayPoint[] = []
  let acc = baseline
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(new Date(now - i * D))
    acc += byDay.get(k) ?? 0
    signupsCumulative.push({ date: k, value: acc })
  }

  // ── Abonnements & revenus ─────────────────────────────────────
  const { data: subs } = await sb.from('user_subscriptions').select('tier, status').limit(ROW_CAP)
  const activeSubs = (subs ?? []).filter(s => s.status === 'active' || s.status === 'trialing')
  const tierMap = new Map<string, number>()
  for (const s of activeSubs) tierMap.set(s.tier ?? 'inconnu', (tierMap.get(s.tier ?? 'inconnu') ?? 0) + 1)
  // Fallback profiles.plan si aucune souscription
  if (tierMap.size === 0) {
    const { data: plans } = await sb.from('profiles').select('plan').limit(ROW_CAP)
    for (const p of plans ?? []) tierMap.set(p.plan ?? 'inconnu', (tierMap.get(p.plan ?? 'inconnu') ?? 0) + 1)
  }
  const tierBreakdown = [...tierMap.entries()].map(([tier, count]) => ({ tier, count })).sort((a, b) => b.count - a.count)

  const paidSubs = activeSubs.filter(s => s.status === 'active' && TIER_PRICE_EUR[s.tier ?? ''] != null)
  const trials = activeSubs.filter(s => s.status === 'trialing' || (s.tier ?? '') === 'trial').length
  const mrrEur = paidSubs.reduce((sum, s) => sum + (TIER_PRICE_EUR[s.tier ?? ''] ?? 0), 0)
  const activePaid = paidSubs.length
  const arpuEur = activePaid > 0 ? Math.round((mrrEur / activePaid) * 100) / 100 : 0
  const trialToPaidPct = (activePaid + trials) > 0 ? Math.round((activePaid / (activePaid + trials)) * 100) : null

  // ── IA : tokens, modèles, coûts ───────────────────────────────
  const { data: tokRows } = await sb.from('token_usage')
    .select('user_id, model, raw_tokens, tokens_used, created_at')
    .gte('created_at', since30d).limit(ROW_CAP)
  const modelAgg = new Map<string, { calls: number; tokens: number }>()
  const tokByDay = new Map<string, number>()
  const consumerAgg = new Map<string, number>()
  for (const r of tokRows ?? []) {
    const model = (r.model as string) ?? 'inconnu'
    const tokens = (r.raw_tokens as number) ?? (r.tokens_used as number) ?? 0
    const m = modelAgg.get(model) ?? { calls: 0, tokens: 0 }
    m.calls += 1; m.tokens += tokens; modelAgg.set(model, m)
    const k = dayKey(r.created_at as string)
    tokByDay.set(k, (tokByDay.get(k) ?? 0) + tokens)
    if (r.user_id) consumerAgg.set(r.user_id as string, (consumerAgg.get(r.user_id as string) ?? 0) + tokens)
  }
  const models = [...modelAgg.entries()].map(([model, v]) => {
    const costEur = Math.round((v.tokens / 1_000_000) * (MODEL_COST_PER_MTOK[model] ?? MODEL_COST_DEFAULT) * 100) / 100
    return { model, calls: v.calls, tokens: v.tokens, costEur, revenueSharePct: mrrEur > 0 ? Math.round((costEur / mrrEur) * 100) : null }
  }).sort((a, b) => b.tokens - a.tokens)
  const totalTokens = models.reduce((s, m) => s + m.tokens, 0)
  const totalCostEur = Math.round(models.reduce((s, m) => s + m.costEur, 0) * 100) / 100
  const tokensByDay: DayPoint[] = []
  for (let i = 29; i >= 0; i--) { const k = dayKey(new Date(now - i * D)); tokensByDay.push({ date: k, value: tokByDay.get(k) ?? 0 }) }
  const topConsumers = [...consumerAgg.entries()].map(([userId, tokens]) => ({ userId, tokens })).sort((a, b) => b.tokens - a.tokens).slice(0, 5)
  const marginAlert = mrrEur > 0 && totalCostEur > (mrrEur * MARGIN_ALERT_PCT) / 100

  const cConv = await sb.from('ai_conversations').select('*', { count: 'exact', head: true })
  const conversations = cConv.count ?? 0

  const { data: usageRows } = await sb.from('usage_logs').select('type').gte('created_at', since30d).limit(ROW_CAP)
  const featAgg = new Map<string, number>()
  for (const r of usageRows ?? []) featAgg.set(r.type as string, (featAgg.get(r.type as string) ?? 0) + 1)
  const features = [...featAgg.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)

  // ── Produit : analytics_events (collecte gated, souvent vide) ──
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'
  const { data: aeRows } = await sb.from('analytics_events')
    .select('event_name, path, duration_ms, is_mobile').gte('created_at', since30d).limit(ROW_CAP)
  const pageAgg = new Map<string, { sum: number; n: number; views: number }>()
  const featUseAgg = new Map<string, number>()
  let mobile = 0, mobileTotal = 0
  for (const r of aeRows ?? []) {
    if (r.event_name === 'page_view' && r.path) {
      const p = pageAgg.get(r.path as string) ?? { sum: 0, n: 0, views: 0 }
      p.views += 1
      if (typeof r.duration_ms === 'number') { p.sum += r.duration_ms as number; p.n += 1 }
      pageAgg.set(r.path as string, p)
    }
    if (r.event_name === 'feature_used') {
      const name = r.path ?? 'inconnu'
      featUseAgg.set(name as string, (featUseAgg.get(name as string) ?? 0) + 1)
    }
    if (typeof r.is_mobile === 'boolean') { mobileTotal += 1; if (r.is_mobile) mobile += 1 }
  }
  const topPages = [...pageAgg.entries()].map(([path, v]) => ({ path, avgMs: v.n ? Math.round(v.sum / v.n) : 0, views: v.views })).sort((a, b) => b.avgMs - a.avgMs).slice(0, 10)
  const topFeatures = [...featUseAgg.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const mobilePct = mobileTotal > 0 ? Math.round((mobile / mobileTotal) * 100) : null

  // ── Intégrations & métier ─────────────────────────────────────
  const { data: syncRows } = await sb.from('sync_logs').select('provider, status').gte('started_at', since30d).limit(ROW_CAP)
  const provAgg = new Map<string, { total: number; ok: number }>()
  for (const r of syncRows ?? []) {
    const p = provAgg.get(r.provider as string) ?? { total: 0, ok: 0 }
    p.total += 1
    if (['success', 'completed', 'ok', 'done'].includes((r.status as string) ?? '')) p.ok += 1
    provAgg.set(r.provider as string, p)
  }
  const providers = [...provAgg.entries()].map(([provider, v]) => ({ provider, total: v.total, ok: v.ok })).sort((a, b) => b.total - a.total)

  let sports: { sport: string; count: number }[] = []
  try {
    const { data: actRows } = await sb.from('activities').select('sport').limit(ROW_CAP)
    const sportAgg = new Map<string, number>()
    for (const r of actRows ?? []) sportAgg.set((r.sport as string) ?? 'inconnu', (sportAgg.get((r.sport as string) ?? 'inconnu') ?? 0) + 1)
    sports = [...sportAgg.entries()].map(([sport, count]) => ({ sport, count })).sort((a, b) => b.count - a.count)
  } catch { /* table absente / inaccessible → ignore */ }

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalUsers, activeNow, dau, wau, mau, mrrEur,
      stickinessPct: mau > 0 ? Math.round((dau / mau) * 100) : 0,
      netGrowthMonth,
    },
    signupsCumulative,
    tierBreakdown,
    revenue: { mrrEur, arrEur: mrrEur * 12, arpuEur, trialToPaidPct, activePaid, trials },
    ai: { models, totalTokens, totalCostEur, tokensByDay, conversations, features, topConsumers, marginAlert },
    product: { enabled: analyticsEnabled, topPages, topFeatures, mobilePct },
    engagement: { dau, wau, mau, inactive30: Math.max(0, totalUsers - mau), newLast7 },
    integrations: { providers, sports },
  }
}
