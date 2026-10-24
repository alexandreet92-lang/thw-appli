// Types partagés du Cockpit admin. AUCUN import serveur ici : ce fichier est
// importé par le composant client (AdminDashboard) pour le typage des props.

export interface DayPoint { date: string; value: number }

/** Offre RÉELLE d'un compte (et non le statut brut de la base). */
export type RealOffer = 'owner' | 'paid' | 'comp' | 'trial' | 'free'

export interface AdminAccount {
  id: string
  emailMasked: string
  createdAt: string
  lastSignInAt: string | null
  lastSeenAt: string | null
  emailConfirmed: boolean
  provider: string
  offer: RealOffer
  tier: string | null            // palier réel (payant ou offert)
  trialDaysLeft: number | null   // seulement si offer = 'trial'
  abandonedCheckout: boolean     // ligne d'abonnement sans paiement réel
}

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
  signupsByDay: DayPoint[]                       // 30 derniers jours, nouveaux/jour
  tierBreakdown: { tier: string; count: number }[]

  accounts: AdminAccount[]
  signupsByMonth: { month: string; count: number }[]   // 12 derniers mois, AAAA-MM
  funnel: { created: number; confirmed: number; signedIn: number; active30: number; paid: number }

  revenue: {
    mrrEur: number
    arrEur: number
    arpuEur: number
    trialToPaidPct: number | null
    activePaid: number
    trials: number
    mrrByTierEur: { tier: string; eur: number }[]   // MRR par palier (€)
  }

  ai: {
    models: { model: string; calls: number; tokens: number; costEur: number; revenueSharePct: number | null }[]
    totalTokens: number
    totalCalls: number
    totalCostEur: number
    tokensByDay: DayPoint[]
    callsByDay: DayPoint[]
    conversations: number
    features: { type: string; count: number }[]
    topConsumers: { userId: string; email: string | null; tokens: number }[]
    marginAlert: boolean        // coût IA > seuil % du MRR
  }

  product: {
    enabled: boolean            // collecte analytics active ?
    topPages: { path: string; avgMs: number; views: number }[]
    topFeatures: { name: string; count: number }[]
    mobilePct: number | null
    activities: { total: number; last7: number; last30: number; byDay: DayPoint[] }
  }

  engagement: {
    dau: number
    wau: number
    mau: number
    inactive30: number
    newToday: number
    newLast7: number
    newLast30: number
  }

  integrations: {
    providers: { provider: string; total: number; ok: number }[]
    sports: { sport: string; count: number }[]
  }

  community: {
    members: number
    messages30: number
    dms30: number
    channels: number
  }
}
