'use client'
// ══════════════════════════════════════════════════════════════
// PLANNING SCOPE — quel utilisateur (athlète) la page Planning cible.
//   • null  → soi-même (interface athlète, comportement inchangé)
//   • <uid> → un athlète, défini par la route coach /coach/planning/[id]
// Un scope module-level (client, une seule vue Planning active à la fois)
// permet aux ~15 requêtes disséminées dans planning/page.tsx de résoudre l'id
// effectif sans threader une prop dans tout le monolithe.
// ══════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react'
import type { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

type SB = ReturnType<typeof createClient>

let _scopeUid: string | null = null

export function setPlanningScopeUid(uid: string | null) { _scopeUid = uid }
export function getPlanningScopeUid(): string | null { return _scopeUid }

// Vrai quand un coach consulte la fiche d'un athlète (≠ interface athlète).
export function isCoachScoped(): boolean { return _scopeUid != null }

// Résout l'id utilisateur effectif de TOUTES les requêtes planning : l'athlète
// ciblé si le coach édite sa fiche, sinon l'utilisateur connecté.
// Perf : getSession() lit le JWT LOCALEMENT (instantané) au lieu de getUser()
// qui fait un aller-retour RÉSEAU au serveur d'auth. Comme cette fonction est
// appelée par ~15 requêtes planning + à l'ouverture de l'éditeur, le passage
// à getSession supprime une latence réseau perçue (~secondes) avant de pouvoir
// éditer une séance. La RLS protège toujours les données (contexte auth réel).
export async function resolvePlanningUid(sb: SB): Promise<string | null> {
  if (_scopeUid) return _scopeUid
  void sb // conservé pour compat de signature ; on passe par le cache borné.
  // getCurrentUser() est mémoïsé ET borné (timeout 3 s) → cette fonction, appelée
  // par ~15 requêtes planning, ne peut plus rester bloquée sur l'auth (ce qui
  // figeait la page en squelettes éternels).
  const user = await getCurrentUser()
  return user?.id ?? null
}

// Contexte React (pour les composants qui veulent réagir au scope au rendu).
export const PlanningScopeContext = createContext<string | null>(null)
export function usePlanningScope(): string | null { return useContext(PlanningScopeContext) }
