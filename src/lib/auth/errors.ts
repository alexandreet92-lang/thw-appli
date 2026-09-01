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
  // ── Envoi d'email cassé côté Supabase (SMTP saturé, non configuré, ou
  // domaine d'expédition refusé). Message EXPLICITE : sans ça, l'utilisateur
  // croit que l'email est parti alors que rien n'a quitté le serveur. ──
  'Error sending recovery email':     "L'email n'a pas pu être envoyé. Réessaie dans quelques minutes — si ça persiste, contacte le support.",
  'Error sending confirmation email': "L'email n'a pas pu être envoyé. Réessaie dans quelques minutes — si ça persiste, contacte le support.",
  'Error sending magic link email':   "L'email n'a pas pu être envoyé. Réessaie dans quelques minutes — si ça persiste, contacte le support.",
  'error sending email':              "L'email n'a pas pu être envoyé. Réessaie dans quelques minutes — si ça persiste, contacte le support.",
  // Quota d'envoi atteint (SMTP par défaut de Supabase : quelques mails/heure).
  'email rate limit exceeded':        "Trop d'emails demandés. Attends une heure avant de réessayer.",
  'over_email_send_rate_limit':       "Trop d'emails demandés. Attends une heure avant de réessayer.",
  'For security purposes, you can only request this after': 'Trop de demandes rapprochées. Patiente une minute avant de réessayer.',
  'Signups not allowed':              'Les inscriptions sont temporairement fermées.',
  'default':                      'Une erreur est survenue. Réessaie dans quelques instants.',
}

// Codes d'erreur portés par le lien d'email (query `?error=` posée par
// /auth/callback, ou fragment `#error_code=` renvoyé par GoTrue).
const LINK_ERRORS: Record<string, string> = {
  otp_expired:          'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.',
  access_denied:        'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.',
  pkce_exchange_failed: "Ce lien doit être ouvert sur l'appareil et le navigateur depuis lesquels tu l'as demandé. Refais une demande depuis cet appareil.",
  missing_token:        'Lien incomplet. Demande un nouveau lien.',
  bad_oauth_state:      'La connexion a expiré en cours de route. Réessaie.',
  signup_disabled:      'Les inscriptions sont temporairement fermées.',
}

// Traduit le code d'erreur d'un lien d'email en message affichable. Un code
// inconnu (erreur OAuth, panne côté Supabase…) reçoit un message neutre plutôt
// que « lien expiré », qui serait trompeur.
export function getAuthLinkError(code: string): string {
  return LINK_ERRORS[code] ?? 'La connexion a échoué. Réessaie, ou demande un nouveau lien.'
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
