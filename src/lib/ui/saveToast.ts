// ──────────────────────────────────────────────────────────────────────────
// Bus d'événements « sauvegarde » global.
// N'importe quel code peut signaler une sauvegarde réussie / échouée, et le
// composant <GlobalSaveToast/> (monté une seule fois à la racine) affiche
// l'animation « Enregistré ». Le client Supabase navigateur émet
// automatiquement sur chaque mutation (insert/update/upsert/delete), donc
// toute modification de donnée déclenche l'animation sans câblage manuel.
//
// UNE SEULE SOURCE DE VÉRITÉ PAR SAUVEGARDE :
//  • Formulaire avec bouton « Enregistrer » → le BOUTON se transforme en coche
//    (<SaveButton/> / useSaveAction). Il « réclame » la confirmation via
//    withLocalSaveFeedback() : les événements émis pendant la sauvegarde sont
//    marqués `claimed` et la pastille globale les ignore (plus de doublon).
//  • Sauvegarde d'arrière-plan (auto-save, bascule, débounce) → pastille globale.
//  • Conteneur qui gère déjà son propre retour visuel : attribut
//    `data-save-feedback="local"` → la pastille globale ignore les sauvegardes
//    déclenchées par une interaction à l'intérieur.
// ──────────────────────────────────────────────────────────────────────────
export type SaveStatus = 'saved' | 'error'
export const SAVE_EVENT = 'thw:save'
/** Attribut à poser sur un conteneur qui affiche sa propre confirmation. */
export const LOCAL_FEEDBACK_ATTR = 'data-save-feedback'

export interface SaveEventDetail {
  status: SaveStatus
  message?: string
  /** true → une confirmation locale (bouton) s'en charge : la pastille globale se tait. */
  claimed?: boolean
}

interface Claim { saved: boolean; errored: boolean }
const claims = new Set<Claim>()
// Petite fenêtre après la fin d'une sauvegarde locale : absorbe les émissions
// tardives (requêtes « fire and forget » lancées par la même action).
let graceUntil = 0
const GRACE_MS = 450

export function emitSave(status: SaveStatus, message?: string, opts: { unclaimed?: boolean } = {}): void {
  if (typeof window === 'undefined') return
  let claimed = false
  if (opts.unclaimed) {
    // Signal explicite (ex. échec d'une sauvegarde locale sans état d'erreur
    // sur place) → toujours visible.
  } else if (claims.size > 0) {
    claims.forEach(c => { if (status === 'error') c.errored = true; else c.saved = true })
    claimed = true
  } else if (Date.now() < graceUntil) {
    claimed = true
  }
  window.dispatchEvent(new CustomEvent<SaveEventDetail>(SAVE_EVENT, { detail: { status, message, claimed } }))
}

/** Sauvegarde réussie → pastille verte animée. */
export const emitSaved = (message?: string, opts?: { unclaimed?: boolean }): void => emitSave('saved', message, opts)
/** Échec de sauvegarde → pastille rouge. */
export const emitSaveError = (message?: string, opts?: { unclaimed?: boolean }): void => emitSave('error', message, opts)

export interface LocalSaveOutcome<T> {
  value: T | undefined
  /** true si `fn` a jeté OU si une mutation a signalé un échec pendant son exécution. */
  errored: boolean
  error?: unknown
}

/**
 * Exécute une sauvegarde dont la confirmation est affichée LOCALEMENT (bouton
 * qui se transforme). Les émissions `thw:save` pendant l'exécution ne
 * déclenchent pas la pastille globale, et un échec Supabase signalé pendant
 * l'exécution est remonté dans `errored` (même si `fn` ne renvoie rien).
 */
export async function withLocalSaveFeedback<T>(fn: () => Promise<T> | T): Promise<LocalSaveOutcome<T>> {
  const claim: Claim = { saved: false, errored: false }
  claims.add(claim)
  try {
    const value = await fn()
    return { value, errored: claim.errored }
  } catch (error) {
    return { value: undefined, errored: true, error }
  } finally {
    claims.delete(claim)
    graceUntil = Date.now() + GRACE_MS
  }
}
