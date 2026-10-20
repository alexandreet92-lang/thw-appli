// Types partagés de la page Statistiques (admin). Aucun import serveur ici.

export interface Kpi { key: string; value: number; prev: number | null; format: 'int' | 'pct' | 'pct1'; series?: number[] }
export interface Share { key: string; value: number }
export interface Step { key: string; count: number }

export interface SourceRow { source: string; sessions: number; signups: number; rate: number }
export interface PageRow { path: string; views: number; visitors: number; avgSec: number | null; exitPct: number }
export interface TestRow { test: string; started: number; completed: number; inProgress: number; abandoned: number }
export interface Cohort { week: string; size: number; cells: (number | null)[] }
export interface SourceRetention { source: string; signups: number; eligible: number; active7: number; pct: number | null }
export interface QrRow { code: string; name: string; city: string | null; opens: number; started: number; finished: number; accounts: number; rate: number }
export interface QrComment { text: string; place: string; date: string }

export interface StatsPayload {
  generatedAt: string
  range: number                     // jours ; 0 = tout
  days: string[]                    // libellés AAAA-MM-JJ de la période
  tracking: { hits: number; since: string | null }
  overview: {
    kpis: Kpi[]
    visitorsByDay: number[]
    signupsByDay: number[]
    testsByDay: number[]
    sources: SourceRow[]
    funnelSignup: Step[]
    funnelTest: Step[]
  }
  traffic: {
    pages: PageRow[]
    devices: Share[]
    langs: Share[]
    browsers: Share[]
    heat: number[][]                // [jour 0=lundi][heure]
  }
  tests: {
    kpis: Kpi[]
    table: TestRow[]
    drop: Step[]
    scores: Share[]
    ageBars: { band: string; avg: number; n: number }[]
    who: Share[]
    avgAge: number | null
    avgWeight: number | null
    pctWomen: number | null
    skipped: { slug: string; total: number; skipped: number; pct: number }[]
  }
  retention: {
    kpis: Kpi[]
    cohorts: Cohort[]
    active: { d: number[]; w: number[]; m: number[] }
    firstWeek: Share[]               // value = % des inscrits
    bySource: SourceRetention[]
  }
  qr: {
    kpis: Kpi[]
    rows: QrRow[]
    comments: QrComment[]
    byDay: number[]
  }
}
