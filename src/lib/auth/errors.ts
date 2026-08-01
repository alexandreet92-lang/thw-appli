const TIMEOUT_MSG = 'Le serveur met trop de temps à répondre. Réessaie dans un instant.'

export const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials':   'Email ou mot de passe incorrect.',
  'Email not confirmed':          "Ton adresse email n'est pas encore confirmée. Vérifie ta boîte mail.",
  'Too many requests':            'Trop de tentatives. Attends quelques minutes avant de réessayer.',
  'User not found':               'Aucun compte trouvé avec cet email.',
  'User already registered':      'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'Signup requires a valid password': "Le mot de passe n'est pas valide.",
  'fetch failed':                 'Problème de connexion. Vérifie ton réseau.',
  'network error':                'Problème de connexion. Vérifie ton réseau.',
  // Passerelle / base de données lente : réponse tronquée (504/503/502/408).
  'request timeout':              TIMEOUT_MSG,
  'gateway timeout':              TIMEOUT_MSG,
  'context deadline exceeded':    TIMEOUT_MSG,
  'timeout':                      TIMEOUT_MSG,
  'Token has expired or is invalid': 'Ce lien de réinitialisation a expiré. Demandes-en un nouveau.',
  'default':                      'Une erreur est survenue. Réessaie dans quelques instants.',
}

// Codes HTTP qui traduisent une indisponibilité passagère (à retenter).
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function statusOf(error: unknown): number | undefined {
  const e = error as { status?: number; code?: number }
  return typeof e?.status === 'number' ? e.status
    : typeof e?.code === 'number' ? e.code
    : undefined
}

export function getAuthError(error: unknown): string {
  if (!error) return ''
  const e = error as { message?: string; error_description?: string }
  const msg = e.message ?? e.error_description ?? String(error)
  const st = statusOf(error)
  // 504/503/502/408 sans message parlant : on affiche le message « serveur lent ».
  if (st !== undefined && st >= 500 && st <= 504) return TIMEOUT_MSG
  for (const [key, value] of Object.entries(AUTH_ERRORS)) {
    if (key === 'default') continue
    if (msg.toLowerCase().includes(key.toLowerCase())) return value
  }
  return AUTH_ERRORS['default']
}

// Vrai si l'erreur vient d'une indisponibilité passagère (timeout, 5xx, réseau)
// et non d'un refus « métier » (mauvais identifiants, email non confirmé…).
// Sert à retenter une fois une connexion avant d'afficher une erreur.
export function isRetryableAuthError(error: unknown): boolean {
  if (!error) return false
  const st = statusOf(error)
  if (st !== undefined && RETRYABLE_STATUS.has(st)) return true
  const e = error as { message?: string; error_description?: string }
  const msg = (e.message ?? e.error_description ?? String(error)).toLowerCase()
  return ['timeout', 'deadline exceeded', 'fetch failed', 'network error', 'gateway', 'failed to fetch']
    .some(k => msg.includes(k))
}
