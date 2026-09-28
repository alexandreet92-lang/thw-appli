export const maxDuration = 120
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { buildAthleteContextSafe } from '@/lib/coach/athlete-context'
import { createClient } from '@/lib/supabase/server'

// ══════════════════════════════════════════════════════════════
// « Détailler cette semaine » — génère à la demande les séances
// détaillées (blocs calibrés) d'UNE semaine future d'un plan déjà
// créé (les semaines 4+ sont volontairement vides à la génération
// initiale pour éviter la troncature JSON). Écrit les planned_sessions
// et mémorise le détail dans training_plans.ai_context.
// ══════════════════════════════════════════════════════════════

interface PlanBloc {
  nom: string; duree_min: number; zone: number; repetitions: number
  recup_min: number; watts: number | null; allure: string | null; consigne: string
}
interface PlanSeance {
  jour: number; sport: string; titre: string; duree_min: number; tss: number
  intensite: 'low' | 'moderate' | 'high' | 'max'; heure: string; notes: string; rpe: number; blocs: PlanBloc[]
}
interface PlanSemaine {
  numero: number; type?: string; theme?: string; volume_h?: number
  tss_semaine?: number; note_coach?: string; seances?: PlanSeance[]
}
interface PlanProgram {
  nom?: string; methodologie?: string; points_cles?: string[]
  blocs_periodisation?: unknown[]; duree_semaines?: number; semaines?: PlanSemaine[]
}

const SPORT_MAP: Record<string, string> = {
  'Running': 'run', 'Course': 'run', 'Course à pied': 'run', 'Trail': 'run', 'Trail running': 'run',
  'Cyclisme': 'bike', 'Vélo': 'bike', 'Velo': 'bike', 'Cycling': 'bike', 'Virtual ride': 'bike',
  'Natation': 'swim', 'Swimming': 'swim',
  'Musculation': 'gym', 'Gym': 'gym', 'Fitness': 'gym',
  'Hyrox': 'hyrox', 'Rowing': 'rowing', 'Aviron': 'rowing',
}
const normSport = (raw: string): string => SPORT_MAP[raw] ?? SPORT_MAP[raw?.trim()] ?? raw?.toLowerCase()

function addDaysISO(startISO: string, days: number): string {
  const d = new Date(startISO + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Extraction JSON tolérante (retire un éventuel fence ``` et prend { … }).
function extractJson<T>(text: string): T {
  let s = text.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  const first = s.indexOf('{'); const last = s.lastIndexOf('}')
  if (first >= 0 && last > first) s = s.slice(first, last + 1)
  return JSON.parse(s) as T
}

const WEEK_SCHEMA = `{
  "seances": [
    {
      "jour": "number (0=lundi … 6=dimanche)",
      "sport": "string (running|cyclisme|natation|musculation|hyrox|rowing)",
      "titre": "string court",
      "duree_min": "number",
      "tss": "number",
      "intensite": "low|moderate|high|max",
      "heure": "HH:MM",
      "notes": "string court",
      "rpe": "number 1-10",
      "blocs": [
        { "nom": "string", "duree_min": "number", "zone": "number 1-5", "repetitions": "number", "recup_min": "number", "watts": "number|null", "allure": "string|null", "consigne": "string" }
      ]
    }
  ]
}`

async function postHandler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({})) as { planId?: string; weekNumber?: number }
    const planId = body.planId
    const weekNumber = Number(body.weekNumber)
    if (!planId || !Number.isFinite(weekNumber) || weekNumber < 1) {
      return Response.json({ error: 'planId et weekNumber requis' }, { status: 400 })
    }

    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: planRow, error: planErr } = await sb.from('training_plans')
      .select('id, start_date, ai_context')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (planErr || !planRow) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

    const aiContext = (planRow.ai_context ?? {}) as { program?: PlanProgram; questionnaire?: Record<string, unknown> }
    const program = aiContext.program
    const startDate = planRow.start_date as string | null
    if (!program || !Array.isArray(program.semaines) || !startDate) {
      return Response.json({ error: 'Plan sans structure détaillable' }, { status: 400 })
    }

    const idx = program.semaines.findIndex(s => Number(s.numero) === weekNumber)
    if (idx < 0) return Response.json({ error: `Semaine ${weekNumber} absente du plan` }, { status: 400 })
    const semaine = program.semaines[idx]
    if (Array.isArray(semaine.seances) && semaine.seances.length > 0) {
      return Response.json({ alreadyDetailed: true, created: 0 }, { status: 200 })
    }

    // ── Contexte athlète (CTL/zones/planning) + méthodo du plan ──
    const athleteContext = await buildAthleteContextSafe()
    const q = aiContext.questionnaire ?? {}
    const constraints = {
      seances_debut_prepa: q.seances_debut_prepa, seances_pic_prepa: q.seances_pic_prepa,
      jours_repos: q.jours_repos ?? q.repos, heures_par_semaine: q.heures_par_semaine,
      include_muscu: q.include_muscu, seances_muscu: q.seances_muscu,
      repartition_triathlon: q.repartition_triathlon, repartition_hyrox: q.repartition_hyrox,
      jour_seance_longue: q.jour_seance_longue, jour_seance_cle: q.jour_seance_cle,
    }

    const userPrompt = `Tu es un coach expert. Un PLAN d'entraînement existe déjà pour cet athlète ; détaille MAINTENANT une SEULE semaine (la semaine ${weekNumber}), qui n'a pas encore ses séances.

MÉTHODOLOGIE DU PLAN (à respecter fidèlement) :
${program.methodologie ?? '(non précisée)'}

POINTS CLÉS DU PLAN :
${(program.points_cles ?? []).map(p => `- ${p}`).join('\n') || '(aucun)'}

SEMAINE À DÉTAILLER (métadonnées déjà fixées lors de la création — respecte-les) :
${JSON.stringify(semaine, null, 2)}

CONTRAINTES ATHLÈTE (questionnaire) :
${JSON.stringify(constraints, null, 2)}
${athleteContext ? `\nCONTEXTE ATHLÈTE (charge réelle, zones, planning) :\n${athleteContext}\n` : ''}

CONSIGNES :
- Génère les séances de CETTE semaine uniquement, avec des blocs détaillés (échauffement → corps → retour au calme), intensités CHIFFRÉES calibrées sur les zones de l'athlète (watts vélo, allure run, FC), répétitions et récup.
- Respecte le nombre de séances, les jours de repos et la répartition par sport indiqués. N'inclus PAS de séance « repos » (les jours off sont simplement absents).
- Le TSS cumulé des séances doit approcher le "tss_semaine" cible ; le volume total doit approcher "volume_h".
- "jour" : 0=lundi … 6=dimanche. Place la séance longue et la séance clé aux jours préférés si indiqués.
- Jamais de séance vague (« 3h vélo ») : toujours la structure en blocs.

Réponds EXCLUSIVEMENT avec l'objet JSON suivant (aucun texte, aucun markdown, aucune balise) :
${WEEK_SCHEMA}`

    const client = getAnthropicClient()
    const resp = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: 6000,
      system: "Tu es un générateur de JSON pur. Ta réponse est EXCLUSIVEMENT l'objet JSON demandé : premier caractère {, dernier caractère }. Aucun texte autour.",
      messages: [{ role: 'user', content: userPrompt }],
    })
    const textBlock = resp.content.find(b => b.type === 'text')
    const rawText = textBlock?.type === 'text' ? textBlock.text : ''
    if (!rawText) return Response.json({ error: 'Pas de réponse du modèle' }, { status: 500 })

    let parsed: { seances?: PlanSeance[] }
    try { parsed = extractJson<{ seances?: PlanSeance[] }>(rawText) }
    catch { return Response.json({ error: 'Réponse IA invalide' }, { status: 500 }) }
    const seances = Array.isArray(parsed.seances) ? parsed.seances : []
    if (seances.length === 0) return Response.json({ error: 'Aucune séance générée' }, { status: 500 })

    // ── Insertion des planned_sessions de la semaine ──
    const weekStart = addDaysISO(startDate, (weekNumber - 1) * 7)
    let created = 0
    for (const seance of seances) {
      const titreLC = (seance.titre ?? '').toLowerCase().trim()
      if (/^(repos|rest|rest day|jour (de )?repos|off|jour off)$/i.test(titreLC)) continue
      if ((seance.duree_min ?? 0) === 0 && !titreLC) continue
      const originalContent = {
        sport: seance.sport, titre: seance.titre, time: seance.heure ?? null,
        duration_min: seance.duree_min, tss: seance.tss ?? null, intensity: seance.intensite ?? null,
        notes: seance.notes ?? null, rpe: seance.rpe ?? null, blocs: seance.blocs ?? [],
      }
      const row = {
        user_id: user.id, plan_id: planId, week_start: weekStart, day_index: seance.jour,
        sport: normSport(seance.sport), title: seance.titre, time: seance.heure ?? null,
        duration_min: seance.duree_min, tss: seance.tss ?? null, status: 'planned',
        intensity: seance.intensite ?? null, notes: seance.notes ?? null, rpe: seance.rpe ?? null,
        blocks: seance.blocs ?? [], plan_variant: 'A', validation_data: {},
        source: 'training_plan', original_content: originalContent,
      }
      const { error: insErr } = await sb.from('planned_sessions').insert(row)
      if (!insErr) created++
    }

    // ── Mémoriser le détail dans le plan (semaine désormais détaillée) ──
    program.semaines[idx] = { ...semaine, seances }
    await sb.from('training_plans')
      .update({ ai_context: { ...aiContext, program }, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('user_id', user.id)

    return Response.json({ ok: true, created, weekNumber })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('[training-plan/week] error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

export const POST = postHandler
