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
  'Token has expired or is invalid': 'Ce lien de réinitialisation a expiré. Demandes-en un nouveau.',
  'default':                      'Une erreur est survenue. Réessaie dans quelques instants.',
}

export function getAuthError(error: unknown): string {
  if (!error) return ''
  const e = error as { message?: string; error_description?: string }
  const msg = e.message ?? e.error_description ?? String(error)
  for (const [key, value] of Object.entries(AUTH_ERRORS)) {
    if (key === 'default') continue
    if (msg.toLowerCase().includes(key.toLowerCase())) return value
  }
  return AUTH_ERRORS['default']
}
