// Notification « séance enregistrée » — émise dès qu'une activité est
// sauvegardée dans l'entraînement (fin d'enregistrement OU import externe).
// Best-effort (ne jette jamais) : réutilise le canal in-app + push existant
// via la clé `entrainement.seance_telechargee` (togglée dans les réglages).
import { emitNotification } from './emit'

const SPORT_LABEL: Record<string, string> = {
  running: 'Course à pied', cycling: 'Vélo', hometrainer: 'Home trainer',
  treadmill: 'Tapis', trail: 'Trail', mtb: 'VTT', hiking: 'Randonnée',
  swim: 'Natation', swimming: 'Natation', openwater: 'Eau libre', rowing: 'Aviron',
  ski: 'Ski', gym: 'Muscu', strength: 'Muscu', hyrox: 'Hyrox',
  yoga: 'Yoga', boxe: 'Boxe', padel: 'Padel',
}

export function notifyActivitySaved(params: { sport: string; title?: string | null }): void {
  const label = SPORT_LABEL[params.sport] ?? 'Séance'
  const body = params.title?.trim()
    ? `${params.title.trim()} a été ajoutée à ton entraînement.`
    : `Ta séance ${label.toLowerCase()} a été ajoutée à ton entraînement.`
  emitNotification({
    key: 'entrainement.seance_telechargee',
    title: 'Séance enregistrée',
    body,
    url: '/activities',
  })
}
