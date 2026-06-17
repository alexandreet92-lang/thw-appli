// ──────────────────────────────────────────────────────────────────────────
// Bus d'événements « sauvegarde » global.
// N'importe quel code peut signaler une sauvegarde réussie / échouée, et le
// composant <GlobalSaveToast/> (monté une seule fois à la racine) affiche
// l'animation « Enregistré ». Le client Supabase navigateur émet
// automatiquement sur chaque mutation (insert/update/upsert/delete), donc
// toute modification de donnée déclenche l'animation sans câblage manuel.
// ──────────────────────────────────────────────────────────────────────────
export type SaveStatus = 'saved' | 'error'
export const SAVE_EVENT = 'thw:save'

export interface SaveEventDetail {
  status: SaveStatus
  message?: string
}

export function emitSave(status: SaveStatus, message?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SaveEventDetail>(SAVE_EVENT, { detail: { status, message } }))
}

/** Sauvegarde réussie → pastille verte animée. */
export const emitSaved = (message?: string): void => emitSave('saved', message)
/** Échec de sauvegarde → pastille rouge. */
export const emitSaveError = (message?: string): void => emitSave('error', message)
