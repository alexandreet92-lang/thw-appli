// ══════════════════════════════════════════════════════════════
// src/lib/coach/session-library.ts  (SERVER-safe — données pures)
//
// Expose la BIBLIOTHÈQUE DE SÉANCES au coach IA. Deux sources :
//   1. le catalogue curé (src/data/seances/*) — running, vélo, trail,
//      natation, aviron : les archétypes que tu écris ;
//   2. (ajouté côté resolver) les séances PERSO de l'athlète
//      (table session_favorites).
//
// Ce module ne gère QUE le catalogue statique (pas de Supabase ici,
// pour rester importable partout). Les séances ont deux variantes de
// type (endurance commun vs running/vélo) : on lit les champs de façon
// DÉFENSIVE via une forme structurelle permissive, jamais d'accès dur.
// ══════════════════════════════════════════════════════════════

import { SEANCES_RUNNING } from '@/data/seances/running/index'
import { SEANCES_VELO } from '@/data/seances/velo/index'
import { SEANCES_TRAIL } from '@/data/seances/trail'
import { SEANCES_NATATION } from '@/data/seances/natation'
import { SEANCES_AVIRON } from '@/data/seances/aviron'

// ── Forme permissive commune aux variantes de Seance ──────────
interface RawRecup {
  zone?: string
  dureeSec?: number
  distanceM?: number
  label?: string
  actif?: boolean
}
interface RawBloc {
  phase?: string
  zone?: string
  label?: string
  intensiteRef?: string
  puissance?: string
  reps?: number
  dureeSec?: number
  distanceM?: number
  recup?: RawRecup
}
interface RawSeance {
  id: string
  nom: string
  sport: string
  bucket?: string
  filiere?: string
  objectif?: string
  intensite?: string
  rpe?: number
  pourQui?: string
  phase?: string
  tags?: string[]
  blocs?: RawBloc[]
  conseil?: string
  dureeMinMin?: number
  dureeMaxMin?: number
  dureeEstimeeMin?: number
}

// ── Catalogue agrégé, étiqueté par « famille » de sport (clé app) ──
interface CatalogEntry {
  sportKey: string            // 'run' | 'bike' | 'trail' | 'swim' | 'rowing'
  seance: RawSeance
}

const CATALOG: CatalogEntry[] = [
  ...(SEANCES_RUNNING as unknown as RawSeance[]).map(s => ({ sportKey: 'run',    seance: s })),
  ...(SEANCES_VELO     as unknown as RawSeance[]).map(s => ({ sportKey: 'bike',   seance: s })),
  ...(SEANCES_TRAIL    as unknown as RawSeance[]).map(s => ({ sportKey: 'trail',  seance: s })),
  ...(SEANCES_NATATION as unknown as RawSeance[]).map(s => ({ sportKey: 'swim',   seance: s })),
  ...(SEANCES_AVIRON   as unknown as RawSeance[]).map(s => ({ sportKey: 'rowing', seance: s })),
]

// Alias : le sport demandé par le modèle (ou l'utilisateur) → clé catalogue.
const SPORT_ALIAS: Record<string, string> = {
  run: 'run', running: 'run', course: 'run',
  bike: 'bike', velo: 'bike', cycling: 'bike', 'virtual_bike': 'bike', cyclisme: 'bike',
  trail: 'trail', 'trail_run': 'trail',
  swim: 'swim', natation: 'swim', nat: 'swim',
  rowing: 'rowing', aviron: 'rowing', rameur: 'rowing',
}

function normSport(q: string): string | null {
  const t = q.trim().toLowerCase()
  if (!t) return null
  if (SPORT_ALIAS[t]) return SPORT_ALIAS[t]
  // sous-chaîne tolérante (ex: "trail running" → trail)
  for (const [k, v] of Object.entries(SPORT_ALIAS)) if (t.includes(k)) return v
  return null
}

// ── Résumé lisible de la structure des blocs ──────────────────
function fmtSec(sec?: number): string | null {
  if (!sec || sec <= 0) return null
  if (sec % 60 === 0) return `${sec / 60}min`
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}min${String(s).padStart(2, '0')}`
}

function fmtBloc(b: RawBloc): string {
  const dur = b.distanceM ? `${b.distanceM}m` : fmtSec(b.dureeSec)
  const zone = b.zone ? ` ${b.zone}` : ''
  const intens = b.intensiteRef || b.puissance
  const core = [dur, zone].filter(Boolean).join('').trim()
  const parts = [core || b.label]
  if (intens) parts.push(`@${intens}`)
  let out = parts.filter(Boolean).join(' ')
  if (b.reps && b.reps > 1) {
    const recup = b.recup
      ? ` / ${b.recup.distanceM ? `${b.recup.distanceM}m` : fmtSec(b.recup.dureeSec) ?? ''}${b.recup.zone ? ` ${b.recup.zone}` : ''} récup`.replace(/ +/g, ' ')
      : ''
    out = `${b.reps}×(${out}${recup})`
  }
  return out
}

function summarizeBlocs(blocs?: RawBloc[]): string {
  if (!blocs || blocs.length === 0) return ''
  return blocs.map(fmtBloc).filter(Boolean).join(' · ')
}

function duration(s: RawSeance): string | null {
  if (typeof s.dureeEstimeeMin === 'number') return `${s.dureeEstimeeMin}min`
  if (typeof s.dureeMinMin === 'number' && typeof s.dureeMaxMin === 'number') {
    return s.dureeMinMin === s.dureeMaxMin ? `${s.dureeMinMin}min` : `${s.dureeMinMin}–${s.dureeMaxMin}min`
  }
  return null
}

// ── Sortie compacte destinée au modèle ────────────────────────
export interface LibrarySession {
  source: 'catalogue'
  sport: string
  id: string
  nom: string
  objectif?: string
  intention?: string        // bucket / filière = la « famille » de la séance
  intensite?: string
  rpe?: number
  duree?: string
  pourQui?: string
  phase?: string
  tags?: string[]
  structure?: string
  conseil?: string
}

function toCompact(e: CatalogEntry): LibrarySession {
  const s = e.seance
  return {
    source: 'catalogue',
    sport: e.sportKey,
    id: s.id,
    nom: s.nom,
    objectif: s.objectif,
    intention: s.filiere || s.bucket,
    intensite: s.intensite,
    rpe: s.rpe,
    duree: duration(s) ?? undefined,
    pourQui: s.pourQui,
    phase: s.phase,
    tags: s.tags,
    structure: summarizeBlocs(s.blocs) || undefined,
    conseil: s.conseil,
  }
}

export interface LibraryQuery {
  sport?: string
  intention?: string        // sous-chaîne libre (bucket/filière/tag/objectif)
  zone?: string             // ex 'Z4'
  limit?: number
}

/**
 * Interroge le catalogue statique. Renvoie des séances compactes triées
 * (les plus pertinentes d'abord quand une intention est fournie).
 */
export function queryCatalog(q: LibraryQuery): LibrarySession[] {
  const limit = Math.min(Math.max(q.limit ?? 12, 1), 40)
  const sportKey = q.sport ? normSport(q.sport) : null
  const intention = (q.intention ?? '').trim().toLowerCase()
  const zone = (q.zone ?? '').trim().toUpperCase()

  let pool = CATALOG
  if (sportKey) pool = pool.filter(e => e.sportKey === sportKey)

  const scored = pool
    .map(e => {
      const s = e.seance
      let score = 0
      if (intention) {
        const hay = [s.bucket, s.filiere, s.objectif, s.nom, ...(s.tags ?? [])]
          .filter(Boolean).join(' ').toLowerCase()
        if (hay.includes(intention)) score += 3
        // match partiel par mot
        else if (intention.split(/\s+/).some(w => w.length > 2 && hay.includes(w))) score += 1
      }
      if (zone) {
        const hasZone = (s.blocs ?? []).some(b => (b.zone ?? '').toUpperCase() === zone)
        if (hasZone) score += 2
      }
      return { e, score }
    })
    // si un filtre qualitatif est demandé, on écarte les non-pertinents
    .filter(x => (intention || zone) ? x.score > 0 : true)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(x => toCompact(x.e))
}

/** Nombre de séances par sport — utile pour le descriptif de l'outil. */
export function catalogCounts(): Record<string, number> {
  return CATALOG.reduce((acc, e) => {
    acc[e.sportKey] = (acc[e.sportKey] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}
