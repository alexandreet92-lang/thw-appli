// ══════════════════════════════════════════════════════════════════
// Agrégats de la page Statistiques — SERVEUR UNIQUEMENT (service role).
// Re-vérifie l'identité admin avant toute lecture (défense en profondeur).
// Échelle actuelle : lecture paginée + agrégation en JS, plafonnée.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin/guard'
import type { StatsPayload, Kpi, Share, Step, SourceRow, PageRow, TestRow, Cohort, SourceRetention, QrRow, QrComment } from './types'

const D = 86_400_000
const CAP = 40_000
const TZ = 'Europe/Paris'

interface Hit { at: string; sid: string | null; vid: string | null; event: string; path: string | null; source: string | null; device: string | null; browser: string | null; lang: string | null; props: Record<string, unknown> | null; user_id: string | null }
interface Prof { id: string; created_at: string; last_seen_at: string | null; onboarding_completed: boolean | null }
interface Camp { id: string; test_key: string | null; status: string; created_at: string; completed_on: string | null; age_at_start: number | null; age_band: string | null; scale_sex: string | null; body_weight_kg: number | null }
interface Res { campaign_id: string; test_slug: string; status: string }
interface Snap { campaign_id: string; total_points: number | null }
interface QSrc { code: string; etablissement: string; ville: string | null }
interface QPart { code: string | null; etape: string; compte_cree: boolean; commentaire: string | null; created_at: string }

type PageResult = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
async function all<T>(q: (from: number, to: number) => PageResult, cap = CAP): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error || !data) break
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

const ymd = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const dayOf = (t: number | string) => ymd.format(new Date(t))
const wh = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
const avg = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)
const uniq = <T,>(v: T[]) => new Set(v).size
const share = (m: Map<string, number>, max = 8): Share[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([key, value]) => ({ key, value }))
const inc = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n)

const PLANS_RE = /abonnement|theme\.html|recharge|compte\.html|login\.html|\/auth/i
const TEST_RE = /tests?\.html|test-de-forme|cadences|\/defi|historique/i

export async function getSiteStats(rangeDays: number): Promise<StatsPayload> {
  const chk = await checkAdmin()
  if (!chk.ok) throw new Error('FORBIDDEN')

  const sb = createServiceClient()
  const now = Date.now()
  const range = [0, 7, 30, 90].includes(rangeDays) ? rangeDays : 30

  // ── Lectures ──────────────────────────────────────────────────
  const hitsAll = await all<Hit>((a, b) => sb.from('site_hits').select('at,sid,vid,event,path,source,device,browser,lang,props,user_id').order('at', { ascending: true }).range(a, b))
  const since = hitsAll[0]?.at ?? null
  const profs = await all<Prof>((a, b) => sb.from('profiles').select('id,created_at,last_seen_at,onboarding_completed').range(a, b), 20000)
  const camps = await all<Camp>((a, b) => sb.from('cadences_campaigns').select('id,test_key,status,created_at,completed_on,age_at_start,age_band,scale_sex,body_weight_kg').range(a, b), 20000)
  const results = await all<Res>((a, b) => sb.from('cadences_results').select('campaign_id,test_slug,status').range(a, b), 40000)
  const snaps = await all<Snap>((a, b) => sb.from('cadences_snapshots').select('campaign_id,total_points').range(a, b), 20000)
  const qSrc = await all<QSrc>((a, b) => sb.from('decouverte_sources').select('code,etablissement,ville').range(a, b), 2000)
  const qPart = await all<QPart>((a, b) => sb.from('decouverte_participations').select('code,etape,compte_cree,commentaire,created_at').order('created_at', { ascending: false }).range(a, b), 20000)
  const subs = await all<{ status: string | null }>((a, b) => sb.from('user_subscriptions').select('status').range(a, b), 20000)

  // ── Fenêtres ──────────────────────────────────────────────────
  const firstTs = Math.min(...[since ? new Date(since).getTime() : now, ...profs.map(p => new Date(p.created_at).getTime())])
  const spanDays = range || Math.min(365, Math.max(7, Math.ceil((now - firstTs) / D) + 1))
  const t1 = now, t0 = now - spanDays * D
  const p1 = t0, p0 = t0 - spanDays * D
  const hasPrev = range !== 0
  const inCur = (iso: string) => { const t = new Date(iso).getTime(); return t >= t0 && t < t1 }
  const inPrev = (iso: string) => { const t = new Date(iso).getTime(); return hasPrev && t >= p0 && t < p1 }
  const days: string[] = []
  for (let i = spanDays - 1; i >= 0; i--) days.push(dayOf(now - i * D))
  const dayIdx = new Map(days.map((d, i) => [d, i]))
  const byDay = (iso: string[]) => { const s = new Array<number>(days.length).fill(0); for (const x of iso) { const i = dayIdx.get(dayOf(x)); if (i != null) s[i]++ } return s }

  const cur = hitsAll.filter(h => inCur(h.at))
  const prev = hitsAll.filter(h => inPrev(h.at))

  // Visiteurs uniques = somme des visiteurs distincts par jour (empreinte journalière).
  const dailyUniques = (hs: Hit[]) => { const m = new Map<string, Set<string>>(); for (const h of hs) if (h.event === 'pageview' && h.vid) { const k = dayOf(h.at); (m.get(k) ?? m.set(k, new Set()).get(k)!).add(h.vid) } return m }
  const uCur = dailyUniques(cur), uPrev = dailyUniques(prev)
  const sumSets = (m: Map<string, Set<string>>) => [...m.values()].reduce((s, x) => s + x.size, 0)
  const visitorsByDay = days.map(d => uCur.get(d)?.size ?? 0)

  const pv = (hs: Hit[]) => hs.filter(h => h.event === 'pageview')
  const sessions = (hs: Hit[]) => uniq(pv(hs).map(h => h.sid))

  // ── Comptes / tests (données réelles) ─────────────────────────
  const signupsCur = profs.filter(p => inCur(p.created_at)), signupsPrev = profs.filter(p => inPrev(p.created_at))
  const completedCamps = camps.filter(c => c.status === 'completed')
  const doneAt = (c: Camp) => c.completed_on ? `${c.completed_on}T12:00:00Z` : c.created_at
  const testsDoneCur = completedCamps.filter(c => inCur(doneAt(c))), testsDonePrev = completedCamps.filter(c => inPrev(doneAt(c)))
  const sevenAgo = now - 7 * D, d1 = now - D, d30 = now - 30 * D
  const seen = (p: Prof) => (p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0)
  const active7 = profs.filter(p => seen(p) > sevenAgo).length
  const paid = subs.filter(s => s.status === 'active').length

  const retained = (days_: number, from: number, to: number) => {
    const el = profs.filter(p => { const c = new Date(p.created_at).getTime(); return c >= from && c < to && now - c >= days_ * D })
    const ok = el.filter(p => seen(p) >= new Date(p.created_at).getTime() + days_ * D)
    return { n: el.length, ok: ok.length }
  }
  const j7 = retained(7, t0 - 60 * D, now), j30 = retained(30, t0 - 90 * D, now)
  const j7Cur = retained(7, t0, t1), j7Prev = hasPrev ? retained(7, p0, p1) : { n: 0, ok: 0 }

  // Les entonnoirs ne comptent que des sessions qui ont ouvert au moins une page du site
  // (un onglet ouvert directement dans l'app n'est pas un « visiteur »).
  const funnels = (hs: Hit[]) => {
    const vis = new Set(hs.filter(h => h.event === 'pageview' && h.sid).map(h => h.sid as string))
    const sidSet = (f: (h: Hit) => boolean) => new Set(hs.filter(h => f(h) && h.sid && vis.has(h.sid)).map(h => h.sid as string))
    const plans = sidSet(h => (h.event === 'pageview' && PLANS_RE.test(h.path ?? '')) || h.event === 'cta')
    const sign = sidSet(h => h.event === 'signup')
    const app = sidSet(h => h.event === 'signup' || h.event === 'app_open')
    const testPg = sidSet(h => h.event === 'pageview' && TEST_RE.test(h.path ?? ''))
    const started = sidSet(h => h.event === 'test_start')
    const finished = sidSet(h => h.event === 'test_done')
    const afterTest = [...sign].filter(s => finished.has(s)).length
    return { vis, plans, sign, app, testPg, started, finished, afterTest }
  }
  const fCur = funnels(cur), fPrev = funnels(prev)

  // Utilisateurs inscrits via une session suivie → activité à 7 j.
  const profById = new Map(profs.map(p => [p.id, p]))
  const signupHits = cur.filter(h => h.event === 'signup' && h.user_id && h.sid && fCur.vis.has(h.sid))
  const isActive7 = (uid: string) => { const p = profById.get(uid); return !!p && now - new Date(p.created_at).getTime() >= 7 * D && seen(p) >= new Date(p.created_at).getTime() + 7 * D }
  const isEligible7 = (uid: string) => { const p = profById.get(uid); return !!p && now - new Date(p.created_at).getTime() >= 7 * D }
  const signupUsers = new Map<string, string>() // user_id -> source
  for (const h of signupHits) if (h.user_id) signupUsers.set(h.user_id, h.source ?? 'direct')
  const activeFromTracked = [...signupUsers.keys()].filter(isActive7).length

  // ── Vue d'ensemble ────────────────────────────────────────────
  const visTotCur = sumSets(uCur), visTotPrev = sumSets(uPrev)
  const rateCur = pct(fCur.sign.size, fCur.vis.size), ratePrev = pct(fPrev.sign.size, fPrev.vis.size)
  const kpis: Kpi[] = [
    { key: 'visitors', value: visTotCur, prev: hasPrev ? visTotPrev : null, format: 'int', series: visitorsByDay },
    { key: 'pageviews', value: pv(cur).length, prev: hasPrev ? pv(prev).length : null, format: 'int', series: byDay(pv(cur).map(h => h.at)) },
    { key: 'accounts', value: signupsCur.length, prev: hasPrev ? signupsPrev.length : null, format: 'int', series: byDay(signupsCur.map(p => p.created_at)) },
    { key: 'conv', value: rateCur, prev: hasPrev ? ratePrev : null, format: 'pct1' },
    { key: 'testsDone', value: testsDoneCur.length, prev: hasPrev ? testsDonePrev.length : null, format: 'int', series: byDay(testsDoneCur.map(doneAt)) },
    { key: 'active7', value: active7, prev: null, format: 'int' },
    { key: 'j7', value: pct(j7Cur.ok, j7Cur.n), prev: hasPrev && j7Prev.n ? pct(j7Prev.ok, j7Prev.n) : null, format: 'pct' },
    { key: 'paid', value: paid, prev: null, format: 'int' },
  ]

  const srcMap = new Map<string, { s: Set<string>; g: Set<string> }>()
  const firstSource = new Map<string, string>()
  for (const h of cur) if (h.sid && h.event === 'pageview' && !firstSource.has(h.sid)) firstSource.set(h.sid, h.source ?? 'direct')
  for (const [sid, src] of firstSource) (srcMap.get(src) ?? srcMap.set(src, { s: new Set(), g: new Set() }).get(src)!).s.add(sid)
  for (const sid of fCur.sign) { const src = firstSource.get(sid); if (src) srcMap.get(src)?.g.add(sid) }
  const sources: SourceRow[] = [...srcMap.entries()].map(([source, v]) => ({ source, sessions: v.s.size, signups: v.g.size, rate: pct(v.g.size, v.s.size) })).sort((a, b) => b.sessions - a.sessions)

  const funnelSignup: Step[] = [
    { key: 'visitors', count: fCur.vis.size }, { key: 'plans', count: fCur.plans.size }, { key: 'account', count: fCur.sign.size },
    { key: 'app', count: fCur.app.size }, { key: 'active7', count: activeFromTracked },
  ]
  const funnelTest: Step[] = [
    { key: 'visitors', count: fCur.vis.size }, { key: 'testPage', count: fCur.testPg.size }, { key: 'started', count: fCur.started.size },
    { key: 'finished', count: fCur.finished.size }, { key: 'afterTest', count: fCur.afterTest },
  ]

  // ── Trafic ────────────────────────────────────────────────────
  const views = pv(cur)
  const lastPage = new Map<string, string>()
  for (const h of views) if (h.sid) lastPage.set(h.sid, h.path ?? '/')
  const exits = new Map<string, number>(); for (const p of lastPage.values()) inc(exits, p)
  const dur = new Map<string, number[]>()
  for (const h of cur) if (h.event === 'leave') { const ms = Number(h.props?.ms); if (Number.isFinite(ms) && ms > 500) (dur.get(h.path ?? '/') ?? dur.set(h.path ?? '/', []).get(h.path ?? '/')!).push(ms / 1000) }
  const pgMap = new Map<string, { v: number; u: Set<string> }>()
  for (const h of views) { const k = h.path ?? '/'; const e = pgMap.get(k) ?? pgMap.set(k, { v: 0, u: new Set() }).get(k)!; e.v++; if (h.vid) e.u.add(h.vid) }
  const pages: PageRow[] = [...pgMap.entries()].map(([path, e]) => ({ path, views: e.v, visitors: e.u.size, avgSec: avg(dur.get(path) ?? []), exitPct: pct(exits.get(path) ?? 0, e.v) })).sort((a, b) => b.views - a.views).slice(0, 15)
  const dev = new Map<string, number>(), lng = new Map<string, number>(), brw = new Map<string, number>()
  const firstOf = new Map<string, Hit>(); for (const h of views) if (h.sid && !firstOf.has(h.sid)) firstOf.set(h.sid, h)
  for (const h of firstOf.values()) { inc(dev, h.device ?? '—'); inc(lng, (h.lang ?? '—').slice(0, 2)); inc(brw, h.browser ?? '—') }
  const heat = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const h of views) { const parts = wh.formatToParts(new Date(h.at)); const w = WD[parts.find(p => p.type === 'weekday')?.value ?? 'Mon'] ?? 0; const hr = Number(parts.find(p => p.type === 'hour')?.value ?? 0); heat[w][hr % 24]++ }

  // ── Tests ─────────────────────────────────────────────────────
  const campsCur = camps.filter(c => inCur(c.created_at))
  const stale = now - 30 * D
  const tmap = new Map<string, TestRow>()
  for (const c of campsCur) {
    const k = c.test_key ?? 'decaform'
    const r = tmap.get(k) ?? tmap.set(k, { test: k, started: 0, completed: 0, inProgress: 0, abandoned: 0 }).get(k)!
    r.started++
    if (c.status === 'completed') r.completed++
    else if (new Date(c.created_at).getTime() < stale) r.abandoned++
    else r.inProgress++
  }
  const table = [...tmap.values()].sort((a, b) => b.started - a.started)
  const stepOrder = ['intro', 'profil', 'leger', 'rest', 'circuit']
  const lastStep = new Map<string, string>(), doneForme = new Set<string>()
  for (const h of cur) {
    if (!h.sid || h.props?.t !== 'forme') continue
    if (h.event === 'test_step') lastStep.set(h.sid, String(h.props?.s ?? ''))
    if (h.event === 'test_done') doneForme.add(h.sid)
  }
  const dropM = new Map<string, number>()
  for (const [sid, st] of lastStep) if (!doneForme.has(sid) && st !== 'result') inc(dropM, st)
  const drop: Step[] = stepOrder.filter(s => dropM.has(s)).map(s => ({ key: s, count: dropM.get(s)! }))

  const snapBy = new Map(snaps.map(s => [s.campaign_id, s.total_points]))
  const done = completedCamps.filter(c => inCur(doneAt(c)) || range === 0)
  const bucket = new Map<string, number>(); for (let i = 0; i < 10; i++) bucket.set(`${i * 10}-${i * 10 + 9}`, 0)
  const bandAcc = new Map<string, number[]>()
  for (const c of done) {
    const pts = snapBy.get(c.id); if (pts == null) continue
    const b = Math.min(9, Math.floor(Number(pts) / 10)); inc(bucket, `${b * 10}-${b * 10 + 9}`)
    const band = c.age_band ?? '—'; (bandAcc.get(band) ?? bandAcc.set(band, []).get(band)!).push(Number(pts))
  }
  const ageBars = [...bandAcc.entries()].map(([band, v]) => ({ band, avg: Math.round((avg(v) ?? 0) * 10) / 10, n: v.length })).sort((a, b) => parseInt(a.band) - parseInt(b.band))
  const isF = (s: string | null) => !!s && /^(f|fem|woman|femme)/i.test(s)
  const whoM = new Map<string, number>(); for (const c of campsCur) inc(whoM, c.age_band ?? '—')
  const ages = campsCur.map(c => c.age_at_start).filter((x): x is number => x != null)
  const wts = campsCur.map(c => Number(c.body_weight_kg)).filter(x => Number.isFinite(x) && x > 0)
  const resBy = new Map<string, { t: number; s: number }>()
  for (const r of results) { const e = resBy.get(r.test_slug) ?? resBy.set(r.test_slug, { t: 0, s: 0 }).get(r.test_slug)!; e.t++; if (r.status !== 'validated') e.s++ }
  const skipped = [...resBy.entries()].map(([slug, e]) => ({ slug, total: e.t, skipped: e.s, pct: pct(e.s, e.t) })).filter(x => x.skipped > 0).sort((a, b) => b.pct - a.pct || b.skipped - a.skipped).slice(0, 10)
  const tStarted = campsCur.length, tDone = campsCur.filter(c => c.status === 'completed').length
  const campsPrev = camps.filter(c => inPrev(c.created_at))
  const tkpis: Kpi[] = [
    { key: 'tStarted', value: tStarted, prev: hasPrev ? campsPrev.length : null, format: 'int', series: byDay(campsCur.map(c => c.created_at)) },
    { key: 'tDone', value: tDone, prev: hasPrev ? campsPrev.filter(c => c.status === 'completed').length : null, format: 'int' },
    { key: 'tCompletion', value: pct(tDone, tStarted), prev: hasPrev && campsPrev.length ? pct(campsPrev.filter(c => c.status === 'completed').length, campsPrev.length) : null, format: 'pct' },
    { key: 'tAvgScore', value: Math.round((avg(done.map(c => Number(snapBy.get(c.id))).filter(Number.isFinite)) ?? 0) * 10) / 10, prev: null, format: 'int' },
  ]

  // ── Rétention ─────────────────────────────────────────────────
  const monday = (t: number) => { const d = new Date(t); const k = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - k)).getTime() }
  const cohorts: Cohort[] = []
  const thisWeek = monday(now)
  for (let w = 7; w >= 0; w--) {
    const start = thisWeek - w * 7 * D, end = start + 7 * D
    const ps = profs.filter(p => { const c = new Date(p.created_at).getTime(); return c >= start && c < end })
    const cells: (number | null)[] = []
    for (let k = 0; k < 8; k++) {
      if (!ps.length || end + k * 7 * D - 7 * D > now) { cells.push(null); continue }
      cells.push(k === 0 ? 100 : pct(ps.filter(p => seen(p) >= new Date(p.created_at).getTime() + k * 7 * D).length, ps.length))
    }
    cohorts.push({ week: dayOf(start), size: ps.length, cells })
  }
  const act = hitsAll.filter(h => (h.event === 'app_open' || h.event === 'signup') && h.user_id)
  const actD = new Array<number>(days.length).fill(0), actW = [...actD], actM = [...actD]
  days.forEach((d, i) => {
    const end = new Date(`${d}T23:59:59Z`).getTime()
    const win = (n: number) => uniq(act.filter(h => { const t = new Date(h.at).getTime(); return t <= end && t > end - n * D }).map(h => h.user_id))
    actD[i] = win(1); actW[i] = win(7); actM[i] = win(30)
  })
  const ids = signupsCur.map(p => p.id).slice(0, 1500)
  const firstWeekSets: Record<string, Set<string>> = { onboarding: new Set(), strava: new Set(), activity: new Set(), test: new Set(), coach: new Set(), plan: new Set() }
  const created = new Map(profs.map(p => [p.id, new Date(p.created_at).getTime()]))
  for (const p of signupsCur) if (p.onboarding_completed) firstWeekSets.onboarding.add(p.id)
  const within = (uid: string, iso: string) => { const c = created.get(uid); return c != null && new Date(iso).getTime() - c <= 7 * D }
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    const [oa, ac, ai, ps] = await Promise.all([
      all<{ user_id: string; provider: string | null; created_at: string }>((a, b) => sb.from('oauth_tokens').select('user_id,provider,created_at').in('user_id', chunk).range(a, b), 5000),
      all<{ user_id: string; created_at: string }>((a, b) => sb.from('activities').select('user_id,created_at').in('user_id', chunk).range(a, b), 20000),
      all<{ user_id: string; created_at: string }>((a, b) => sb.from('ai_conversations').select('user_id,created_at').in('user_id', chunk).range(a, b), 10000),
      all<{ user_id: string; created_at: string }>((a, b) => sb.from('planned_sessions').select('user_id,created_at').in('user_id', chunk).range(a, b), 20000),
    ])
    for (const r of oa) if (r.provider === 'strava' && within(r.user_id, r.created_at)) firstWeekSets.strava.add(r.user_id)
    for (const r of ac) if (within(r.user_id, r.created_at)) firstWeekSets.activity.add(r.user_id)
    for (const r of ai) if (within(r.user_id, r.created_at)) firstWeekSets.coach.add(r.user_id)
    for (const r of ps) if (within(r.user_id, r.created_at)) firstWeekSets.plan.add(r.user_id)
  }
  const campUsers = await all<{ user_id: string; created_at: string }>((a, b) => sb.from('cadences_campaigns').select('user_id,created_at').range(a, b), 20000)
  for (const r of campUsers) if (created.has(r.user_id) && ids.includes(r.user_id) && within(r.user_id, r.created_at)) firstWeekSets.test.add(r.user_id)
  const firstWeek: Share[] = Object.entries(firstWeekSets).map(([key, s]) => ({ key, value: pct(s.size, signupsCur.length) }))
  const srcRet = new Map<string, SourceRetention>()
  for (const [uid, src] of signupUsers) {
    const r = srcRet.get(src) ?? srcRet.set(src, { source: src, signups: 0, eligible: 0, active7: 0, pct: null }).get(src)!
    r.signups++; if (isEligible7(uid)) { r.eligible++; if (isActive7(uid)) r.active7++ }
  }
  const bySource = [...srcRet.values()].map(r => ({ ...r, pct: r.eligible ? pct(r.active7, r.eligible) : null })).sort((a, b) => b.signups - a.signups)
  const rkpis: Kpi[] = [
    { key: 'j7', value: pct(j7.ok, j7.n), prev: null, format: 'pct' },
    { key: 'j30', value: pct(j30.ok, j30.n), prev: null, format: 'pct' },
    { key: 'stick', value: pct(profs.filter(p => seen(p) > d1).length, profs.filter(p => seen(p) > d30).length), prev: null, format: 'pct' },
    { key: 'mau', value: profs.filter(p => seen(p) > d30).length, prev: null, format: 'int' },
  ]

  // ── Partenaires QR ────────────────────────────────────────────
  const qCur = qPart.filter(p => inCur(p.created_at)), qPrev = qPart.filter(p => inPrev(p.created_at))
  const rows: QrRow[] = qSrc.map(s => {
    const m = qCur.filter(p => p.code === s.code)
    const fin = m.filter(p => p.etape === 'termine').length
    const started = m.filter(p => p.etape === 'commence').length + fin
    const accounts = m.filter(p => p.compte_cree).length
    return { code: s.code, name: s.etablissement, city: s.ville, opens: m.length, started, finished: fin, accounts, rate: pct(accounts, m.length) }
  }).sort((a, b) => b.accounts - a.accounts || b.opens - a.opens)
  const nameOf = new Map(qSrc.map(s => [s.code, s.etablissement]))
  const comments: QrComment[] = qPart.filter(p => p.commentaire?.trim()).slice(0, 8).map(p => ({ text: p.commentaire!.trim(), place: nameOf.get(p.code ?? '') ?? '—', date: p.created_at }))
  const sumQ = (xs: QPart[]) => ({ o: xs.length, s: xs.filter(p => p.etape !== 'ouvert').length, a: xs.filter(p => p.compte_cree).length })
  const qc = sumQ(qCur), qp = sumQ(qPrev)
  const qkpis: Kpi[] = [
    { key: 'qOpens', value: qc.o, prev: hasPrev ? qp.o : null, format: 'int', series: byDay(qCur.map(p => p.created_at)) },
    { key: 'qStarted', value: qc.s, prev: hasPrev ? qp.s : null, format: 'int' },
    { key: 'qAccounts', value: qc.a, prev: hasPrev ? qp.a : null, format: 'int' },
    { key: 'qRate', value: pct(qc.a, qc.o), prev: hasPrev && qp.o ? pct(qp.a, qp.o) : null, format: 'pct1' },
  ]

  return {
    generatedAt: new Date().toISOString(), range, days,
    tracking: { hits: hitsAll.length, since },
    overview: { kpis, visitorsByDay, signupsByDay: byDay(signupsCur.map(p => p.created_at)), testsByDay: byDay(testsDoneCur.map(doneAt)), sources, funnelSignup, funnelTest },
    traffic: { pages, devices: share(dev), langs: share(lng), browsers: share(brw), heat },
    tests: { kpis: tkpis, table, drop, scores: [...bucket.entries()].map(([key, value]) => ({ key, value })), ageBars, who: share(whoM, 6), avgAge: avg(ages) == null ? null : Math.round(avg(ages)!), avgWeight: avg(wts) == null ? null : Math.round(avg(wts)!), pctWomen: campsCur.length ? pct(campsCur.filter(c => isF(c.scale_sex)).length, campsCur.length) : null, skipped },
    retention: { kpis: rkpis, cohorts, active: { d: actD, w: actW, m: actM }, firstWeek, bySource },
    qr: { kpis: qkpis, rows, comments, byDay: byDay(qCur.map(p => p.created_at)) },
  }
}
