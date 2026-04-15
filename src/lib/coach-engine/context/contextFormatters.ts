// ══════════════════════════════════════════════════════════════
// CONTEXT FORMATTERS
// Transforme les données brutes de chaque page en texte structuré
// lisible par l'IA — injecté dans le system prompt du chatAgent.
//
// Règle : chaque formatter produit un bloc texte clair, avec
// sections nommées, valeurs concrètes, et mention explicite des
// données absentes. L'IA n'a plus besoin de demander.
// ══════════════════════════════════════════════════════════════

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return ''
  return `\n### ${title}\n${lines.map(l => `  ${l}`).join('\n')}`
}

function missing(fields: string[]): string {
  if (fields.length === 0) return ''
  return `\n### Données non disponibles dans l'application\n  ${fields.join(', ')}\n  IMPORTANT: Ces données ne sont pas encore saisies dans l'app. Ne demande PAS à l'utilisateur de les fournir manuellement. Indique-lui où les saisir dans l'app ou réponds en fonction de ce qui est disponible.`
}

// ── PLANNING ────────────────────────────────────────────────

export function formatPlanningContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE PLANNING ===']
  const absent: string[] = []

  // Semaine
  if (ctx.weekStart) {
    parts.push(section('Semaine analysée', [`Début de semaine : ${ctx.weekStart}`]))
  }

  // Séances planifiées
  const sessions = (ctx.sessions as any[]) ?? []
  if (sessions.length > 0) {
    const lines = sessions.map((s: any) => {
      const day = DAYS[s.day_index] ?? `Jour ${s.day_index}`
      const tss = s.tss ? ` | TSS: ${s.tss}` : ''
      const status = s.status === 'done' ? ' ✓ (réalisée)' : ' (planifiée)'
      return `${day}: [${s.sport}] ${s.title} — ${s.duration_min}min, intensité: ${s.intensity}${tss}${status}`
    })
    parts.push(section('Séances de la semaine', lines))
  } else {
    absent.push('séances de la semaine (aucune planifiée)')
  }

  // Intensités par jour
  const intensities = ctx.intensities as Record<string, string> | undefined
  if (intensities && Object.keys(intensities).length > 0) {
    const lines = Object.entries(intensities).map(([idx, val]) =>
      `${DAYS[Number(idx)] ?? `Jour ${idx}`}: ${val}`
    )
    parts.push(section('Intensité prévue par jour', lines))
  }

  // Objectifs / Courses depuis Calendar
  const races = (ctx.races as any[]) ?? []
  if (races.length > 0) {
    const upcoming = races.filter((r: any) => new Date(r.date) >= new Date())
    const lines = upcoming.slice(0, 5).map((r: any) => {
      const daysLeft = Math.ceil((new Date(r.date).getTime() - Date.now()) / 86_400_000)
      const goal = r.goal_time ? ` | Objectif: ${r.goal_time}` : r.goal ? ` | But: ${r.goal}` : ''
      return `${r.name} (${r.sport}) — ${r.date} [${r.level}] — dans ${daysLeft}j${goal}`
    })
    if (lines.length > 0) parts.push(section('Objectifs / Courses à venir', lines))
  } else {
    absent.push('courses / objectifs (non renseignés dans Calendar)')
  }

  // Zones
  const zones = ctx.zones as Record<string, any> | undefined
  if (zones) {
    parts.push(formatZonesSection(zones))
  } else {
    absent.push('zones d\'entraînement')
  }

  // Stats semaine
  if (sessions.length > 0) {
    const totalMin = sessions.reduce((s: number, x: any) => s + (x.duration_min || 0), 0)
    const totalTSS = sessions.reduce((s: number, x: any) => s + (x.tss || 0), 0)
    const done = sessions.filter((x: any) => x.status === 'done').length
    parts.push(section('Résumé semaine', [
      `${sessions.length} séances planifiées, ${done} réalisées`,
      `Volume total prévu: ${Math.round(totalMin / 60 * 10) / 10}h`,
      totalTSS > 0 ? `TSS total prévu: ${totalTSS}` : '',
    ].filter(Boolean)))
  }

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── STRATEGY / CALENDAR ─────────────────────────────────────

export function formatStrategyContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE STRATÉGIE & CALENDRIER ===']
  const absent: string[] = []

  const races = (ctx.races as any[]) ?? []
  if (races.length > 0) {
    const now = new Date()
    const upcoming = races
      .filter((r: any) => new Date(r.date) >= now)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const past = races.filter((r: any) => new Date(r.date) < now)

    if (upcoming.length > 0) {
      const lines = upcoming.map((r: any) => {
        const daysLeft = Math.ceil((new Date(r.date).getTime() - now.getTime()) / 86_400_000)
        const goal = r.goal_time ? ` | Objectif: ${r.goal_time}` : r.goal ? ` | But: ${r.goal}` : ''
        const dist = r.run_distance || r.tri_distance || ''
        return `${r.name} — ${r.sport}${dist ? ` (${dist})` : ''} | ${r.date} | Priorité: ${r.level} | dans ${daysLeft}j${goal}`
      })
      parts.push(section('Courses / Objectifs à venir', lines))
    }

    if (past.length > 0) {
      const lines = past.slice(-3).map((r: any) => `${r.name} (${r.sport}) — ${r.date}`)
      parts.push(section('Courses passées récentes', lines))
    }
  } else {
    absent.push('courses et objectifs (aucune course saisie dans Calendar)')
  }

  // Profile / niveau
  const profile = ctx.profile as any
  if (profile) {
    const lines: string[] = []
    if (profile.full_name) lines.push(`Athlète: ${profile.full_name}`)
    if (profile.weight_kg) lines.push(`Poids: ${profile.weight_kg}kg`)
    if (profile.height_cm) lines.push(`Taille: ${profile.height_cm}cm`)
    if (lines.length > 0) parts.push(section('Profil athlète', lines))
  }

  // Zones
  const zones = ctx.zones as Record<string, any> | undefined
  if (zones) parts.push(formatZonesSection(zones))
  else absent.push('zones d\'entraînement')

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── RECOVERY ────────────────────────────────────────────────

export function formatRecoveryContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE RÉCUPÉRATION ===']
  const absent: string[] = []

  // Métriques du jour
  const todayLines: string[] = []
  if (ctx.readiness != null)   todayLines.push(`Readiness: ${ctx.readiness}/100`)
  if (ctx.hrv != null)         todayLines.push(`HRV: ${ctx.hrv}ms`)
  if (ctx.restingHr != null)   todayLines.push(`FC repos: ${ctx.restingHr}bpm`)
  if (ctx.fatigue != null)     todayLines.push(`Fatigue subjective: ${ctx.fatigue}/10`)
  if (ctx.energy != null)      todayLines.push(`Énergie: ${ctx.energy}/10`)
  if (ctx.stress != null)      todayLines.push(`Stress: ${ctx.stress}/10`)
  if (ctx.motivation != null)  todayLines.push(`Motivation: ${ctx.motivation}/10`)
  if (ctx.pain != null)        todayLines.push(`Douleur: ${ctx.pain}/10`)

  if (todayLines.length > 0) parts.push(section('Métriques du jour', todayLines))
  else absent.push('métriques du jour (readiness, HRV, FC repos)')

  // Sommeil
  const sleep = ctx.sleep as any
  if (sleep) {
    const sleepLines: string[] = []
    if (sleep.durationMin) sleepLines.push(`Durée: ${Math.floor(sleep.durationMin / 60)}h${sleep.durationMin % 60}min`)
    if (sleep.quality)     sleepLines.push(`Qualité: ${sleep.quality}/10`)
    if (sleep.deepMin)     sleepLines.push(`Sommeil profond: ${sleep.deepMin}min`)
    if (sleep.remMin)      sleepLines.push(`REM: ${sleep.remMin}min`)
    if (sleep.nightHrv)    sleepLines.push(`HRV nocturne: ${sleep.nightHrv}ms`)
    if (sleep.spo2)        sleepLines.push(`SpO2: ${sleep.spo2}%`)
    if (sleep.efficiencyPct) sleepLines.push(`Efficacité: ${sleep.efficiencyPct}%`)
    if (sleepLines.length > 0) parts.push(section('Sommeil', sleepLines))
  } else {
    absent.push('données de sommeil')
  }

  // Tendances 7j
  const trends = ctx.trends as any
  if (trends?.days7) {
    const d = trends.days7
    if (d.readiness?.length) {
      const avg = Math.round(d.readiness.reduce((a: number, b: number) => a + b, 0) / d.readiness.length)
      const trend = d.readiness[d.readiness.length - 1] > d.readiness[0] ? '↑' : '↓'
      parts.push(section('Tendance 7 jours', [
        `Readiness moyen: ${avg}/100 ${trend}`,
        `HRV moyen: ${d.hrv ? Math.round(d.hrv.reduce((a: number, b: number) => a + b, 0) / d.hrv.length) : 'N/A'}ms`,
        `Sommeil moyen: ${d.sleep ? (d.sleep.reduce((a: number, b: number) => a + b, 0) / d.sleep.length).toFixed(1) : 'N/A'}h`,
      ]))
    }
  }

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── SESSION BUILDER ─────────────────────────────────────────

export function formatSessionContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE SESSION ===']
  const absent: string[] = []

  if (ctx.mode) parts.push(section('Mode actuel', [`Mode: ${ctx.mode}`]))

  const template = ctx.currentTemplate as any
  if (template) {
    parts.push(section('Template en cours', [
      `Sport: ${template.sport}`,
      template.title ? `Titre: ${template.title}` : '',
      template.duration_min ? `Durée cible: ${template.duration_min}min` : '',
      template.intensity ? `Intensité: ${template.intensity}` : '',
    ].filter(Boolean)))
  }

  // Zones disponibles
  const zones = ctx.zones as Record<string, any> | undefined
  if (zones) parts.push(formatZonesSection(zones))
  else absent.push('zones d\'entraînement (utiles pour prescrir les intensités)')

  // Courses à venir (pour contextualiser la séance)
  const races = (ctx.races as any[]) ?? []
  if (races.length > 0) {
    const next = races
      .filter((r: any) => new Date(r.date) >= new Date())
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    if (next) {
      const daysLeft = Math.ceil((new Date(next.date).getTime() - Date.now()) / 86_400_000)
      parts.push(section('Objectif principal', [
        `${next.name} (${next.sport}) dans ${daysLeft}j — priorité: ${next.level}`,
        next.goal_time ? `Objectif de temps: ${next.goal_time}` : '',
      ].filter(Boolean)))
    }
  } else {
    absent.push('objectif / course cible')
  }

  // Fatigue
  if (ctx.readiness != null || ctx.fatigue != null) {
    parts.push(section('État de forme', [
      ctx.readiness != null ? `Readiness: ${ctx.readiness}/100` : '',
      ctx.fatigue != null ? `Fatigue: ${ctx.fatigue}/10` : '',
    ].filter(Boolean)))
  }

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── NUTRITION ───────────────────────────────────────────────

export function formatNutritionContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE NUTRITION ===']
  const absent: string[] = []

  // Apports du jour
  const todayLines: string[] = []
  if (ctx.todayKcal != null)     todayLines.push(`Calories: ${ctx.todayKcal} kcal`)
  if (ctx.todayProtein != null)  todayLines.push(`Protéines: ${ctx.todayProtein}g`)
  if (ctx.todayCarbs != null)    todayLines.push(`Glucides: ${ctx.todayCarbs}g`)
  if (ctx.todayFat != null)      todayLines.push(`Lipides: ${ctx.todayFat}g`)
  if (todayLines.length > 0) parts.push(section('Apports aujourd\'hui (cumul)', todayLines))
  else absent.push('apports nutritionnels du jour')

  // Plan
  if (ctx.hasPlan) {
    const plan = ctx.plan as any
    if (plan) {
      const planLines: string[] = []
      if (plan.mode) planLines.push(`Mode: ${plan.mode}`)
      if (plan.protein_g_per_kg) planLines.push(`Protéines cible: ${plan.protein_g_per_kg}g/kg`)
      if (planLines.length > 0) parts.push(section('Plan nutritionnel actif', planLines))
    } else {
      parts.push(section('Plan nutritionnel', ['Plan actif (détails non chargés)']))
    }
  } else {
    absent.push('plan nutritionnel (non créé)')
  }

  // Contexte sportif
  const sportCtx = ctx.sportContext as any
  if (sportCtx) {
    parts.push(section('Contexte sportif du jour', [
      `Type de journée: ${sportCtx.today_type} (${sportCtx.today_label})`,
      sportCtx.tomorrow ? `Demain: ${sportCtx.tomorrow}` : '',
      sportCtx.upcoming_race ? `Course à venir: ${sportCtx.upcoming_race}` : '',
      sportCtx.tip ? `Conseil du jour: ${sportCtx.tip}` : '',
    ].filter(Boolean)))
  }

  // Repas saisis
  const meals = (ctx.meals as any[]) ?? []
  if (meals.length > 0) {
    const nonEmpty = meals.filter((m: any) => (m.entries ?? m.foods ?? []).length > 0)
    if (nonEmpty.length > 0) {
      const lines = nonEmpty.map((m: any) => {
        const foods = m.entries ?? m.foods ?? []
        const kcal = foods.reduce((s: number, f: any) => s + (f.kcal || 0), 0)
        return `${m.type}: ${foods.length} aliment(s), ~${Math.round(kcal)} kcal`
      })
      parts.push(section('Repas enregistrés aujourd\'hui', lines))
    }
  }

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── PERFORMANCE ─────────────────────────────────────────────

export function formatPerformanceContext(ctx: Record<string, unknown>): string {
  const parts: string[] = ['=== CONTEXTE PERFORMANCE ===']
  const absent: string[] = []

  // Activités récentes
  const activities = (ctx.recentActivities as any[]) ?? []
  if (activities.length > 0) {
    // Stats globales
    const totalMin = activities.reduce((s: number, a: any) => s + (a.duration_min || 0), 0)
    const totalTSS = activities.reduce((s: number, a: any) => s + (a.tss || 0), 0)
    const sports = [...new Set(activities.map((a: any) => a.sport_type || a.sport))]

    parts.push(section('Vue d\'ensemble (30 derniers jours)', [
      `${activities.length} activités — sports: ${sports.join(', ')}`,
      `Volume total: ${Math.round(totalMin / 60 * 10) / 10}h`,
      totalTSS > 0 ? `Charge totale (TSS): ${totalTSS}` : '',
    ].filter(Boolean)))

    // 5 dernières activités
    const recent = activities.slice(0, 5)
    const lines = recent.map((a: any) => {
      const sport = a.sport_type || a.sport || '?'
      const dist = a.distance_km ? ` | ${a.distance_km}km` : ''
      const pace = a.avg_pace_s_km ? ` | ${Math.floor(a.avg_pace_s_km / 60)}'${String(a.avg_pace_s_km % 60).padStart(2, '0')}/km` : ''
      const watts = a.avg_watts ? ` | ${a.avg_watts}W` : ''
      const hr = a.avg_hr ? ` | FC moy: ${a.avg_hr}bpm` : ''
      const tss = a.tss ? ` | TSS: ${a.tss}` : ''
      const date = a.started_at ? a.started_at.split('T')[0] : a.date || '?'
      return `${date} [${sport}] ${a.title || ''} — ${a.duration_min || '?'}min${dist}${pace}${watts}${hr}${tss}`
    })
    parts.push(section('Activités récentes', lines))
  } else {
    absent.push('activités récentes')
  }

  // Zones
  const zones = ctx.zones as Record<string, any> | undefined
  if (zones) parts.push(formatZonesSection(zones))
  else absent.push('zones d\'entraînement (FTP, seuils)')

  // Profil
  const profile = ctx.profile as any
  if (profile) {
    const lines: string[] = []
    if (profile.weight_kg) lines.push(`Poids: ${profile.weight_kg}kg`)
    if (lines.length > 0) parts.push(section('Profil', lines))
  }

  parts.push(missing(absent))
  return parts.filter(Boolean).join('')
}

// ── ZONES (helper partagé) ──────────────────────────────────

function formatZonesSection(zones: Record<string, any>): string {
  const lines: string[] = []

  const zoneMap: Record<string, string> = {
    run:       'Course à pied',
    bike:      'Cyclisme',
    swim:      'Natation',
    rowing:    'Aviron',
    hyrox_row: 'Hyrox Rameur',
    hyrox_ski: 'Hyrox Ski Erg',
  }

  for (const [sport, data] of Object.entries(zones)) {
    if (!data) continue
    const label = zoneMap[sport] || sport
    const parts: string[] = []
    if (data.ftp_watts) parts.push(`FTP: ${data.ftp_watts}W`)
    if (data.sl1) parts.push(`Seuil 1: ${data.sl1}`)
    if (data.sl2) parts.push(`Seuil 2: ${data.sl2}`)
    if (data.z1_value) parts.push(`Z1: ${data.z1_value}`)
    if (data.z2_value) parts.push(`Z2: ${data.z2_value}`)
    if (data.z3_value) parts.push(`Z3: ${data.z3_value}`)
    if (data.z4_value) parts.push(`Z4: ${data.z4_value}`)
    if (data.z5_value) parts.push(`Z5: ${data.z5_value}`)
    if (parts.length > 0) lines.push(`${label}: ${parts.join(' | ')}`)
  }

  return lines.length > 0 ? section('Zones d\'entraînement', lines) : ''
}

// ── DISPATCHER ──────────────────────────────────────────────

export function formatContextForAgent(
  agentId: string,
  ctx: Record<string, unknown>
): string {
  if (!ctx || Object.keys(ctx).length === 0) return ''

  switch (agentId) {
    case 'planning':     return formatPlanningContext(ctx)
    case 'strategy':     return formatStrategyContext(ctx)
    case 'readiness':    return formatRecoveryContext(ctx)
    case 'sessionBuilder': return formatSessionContext(ctx)
    case 'nutrition':    return formatNutritionContext(ctx)
    case 'performance':  return formatPerformanceContext(ctx)
    case 'adjustment':   return formatPlanningContext(ctx) // même données que planning
    default:             return `=== CONTEXTE ===\n${JSON.stringify(ctx, null, 2)}`
  }
}
