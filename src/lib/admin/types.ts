// Types partagés du Cockpit admin. AUCUN import serveur ici : ce fichier est
// importé par le composant client (AdminDashboard) pour le typage des props.

export interface DayPoint { date: string; value: number }

export interface AdminMetrics {
  generatedAt: string

  overview: {
    totalUsers: number
    activeNow: number          // last_seen_at < 5 min
    dau: number
    wau: number
    mau: number
    mrrEur: number
    stickinessPct: number      // DAU / MAU * 100
    netGrowthMonth: number     // inscrits ce mois − mois précédent
  }

  signupsCumulative: DayPoint[]                 // 30 derniers jours, cumulés
  tierBreakdown: { tier: string; count: number }[]

  revenue: {
    mrrEur: number
    arrEur: number
    arpuEur: number
    trialToPaidPct: number | null
    activePaid: number
    trials: number
  }

  ai: {
    models: { model: string; calls: number; tokens: number; costEur: number; revenueSharePct: number | null }[]
    totalTokens: number
    totalCostEur: number
    tokensByDay: DayPoint[]
    conversations: number
    features: { type: string; count: number }[]
    topConsumers: { userId: string; tokens: number }[]
    marginAlert: boolean        // coût IA > seuil % du MRR
  }

  product: {
    enabled: boolean            // collecte analytics active ?
    topPages: { path: string; avgMs: number; views: number }[]
    topFeatures: { name: string; count: number }[]
    mobilePct: number | null
  }

  engagement: {
    dau: number
    wau: number
    mau: number
    inactive30: number
    newLast7: number
  }

  integrations: {
    providers: { provider: string; total: number; ok: number }[]
    sports: { sport: string; count: number }[]
  }
}
