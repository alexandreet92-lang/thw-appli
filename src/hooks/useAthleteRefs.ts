'use client'
// ══════════════════════════════════════════════════════════════
// useAthleteRefs — repères de zones de L'ATHLÈTE EFFECTIF (soi-même,
// ou l'athlète consulté par un coach via le scope planning).
//   • ftp                    → W (source canonique : training_zones.bike)
//   • runThresholdPaceSec    → s/km (allure seuil course)
//   • cssSecPer100m          → s/100m (seuil natation)
//   • rowThresholdSecPer500m → s/500m (seuil aviron/ergo)
//
// Objectif : que TOUTES les visualisations de zones (aperçu au survol,
// détail de séance, barres d'intensité) utilisent le VRAI FTP de l'athlète
// (ex. 118 W) au lieu du repli générique 200 W. Un cache module-level évite
// de refaire la requête pour chaque carte/aperçu — une seule vue Planning
// est active à la fois côté client.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'

export interface AthleteRefs {
  ftp: number | null
  runThresholdPaceSec: number | null
  cssSecPer100m: number | null
  rowThresholdSecPer500m: number | null
}

const EMPTY: AthleteRefs = { ftp: null, runThresholdPaceSec: null, cssSecPer100m: null, rowThresholdSecPer500m: null }

// Cache par uid + promesse en vol (dédoublonne les requêtes concurrentes).
const cache = new Map<string, AthleteRefs>()
const inflight = new Map<string, Promise<AthleteRefs>>()

async function fetchRefs(): Promise<AthleteRefs> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb)
  if (!uid) return EMPTY
  if (cache.has(uid)) return cache.get(uid)!
  if (inflight.has(uid)) return inflight.get(uid)!

  const p = (async (): Promise<AthleteRefs> => {
    const [perfRes, zonesRes] = await Promise.all([
      sb.from('athlete_performance_profile')
        .select('ftp_watts,threshold_pace_s_km,css_s_100m,rowing_threshold_pace_s_500m')
        .eq('user_id', uid).maybeSingle().then((r: { data: Record<string, unknown> | null }) => r, () => ({ data: null })),
      sb.from('training_zones').select('ftp_watts').eq('user_id', uid).eq('sport', 'bike')
        .eq('is_current', true).maybeSingle().then((r: { data: Record<string, unknown> | null }) => r, () => ({ data: null })),
    ])
    const perf = (perfRes as { data: Record<string, unknown> | null }).data
    const zones = (zonesRes as { data: Record<string, unknown> | null }).data
    const refs: AthleteRefs = {
      ftp: (zones?.ftp_watts as number) ?? (perf?.ftp_watts as number) ?? null,
      runThresholdPaceSec: (perf?.threshold_pace_s_km as number) ?? null,
      cssSecPer100m: (perf?.css_s_100m as number) ?? null,
      rowThresholdSecPer500m: (perf?.rowing_threshold_pace_s_500m as number) ?? null,
    }
    cache.set(uid, refs)
    inflight.delete(uid)
    return refs
  })()
  inflight.set(uid, p)
  return p
}

// Invalide le cache (à appeler après modification des zones/FTP de l'athlète).
export function invalidateAthleteRefs() { cache.clear(); inflight.clear() }

export function useAthleteRefs(): AthleteRefs {
  const [refs, setRefs] = useState<AthleteRefs>(EMPTY)
  useEffect(() => {
    let cancelled = false
    void fetchRefs().then(r => { if (!cancelled) setRefs(r) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  return refs
}
