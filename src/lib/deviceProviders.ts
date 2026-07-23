// Registre des fournisseurs « push d'itinéraire vers l'appareil » (Garmin, Wahoo).
// Chaque provider est ACTIVÉ uniquement si ses clés d'API sont présentes dans
// l'environnement → tant qu'on n'a pas l'accès partenaire, il reste invisible
// dans l'UI (pas de bouton mort). Voir docs/DEVICE_EXPORT.md.

export type DevicePushProvider = 'garmin' | 'wahoo'

export interface DeviceProviderMeta {
  id: DevicePushProvider
  name: string
  color: string
  oauth: '1.0a' | '2.0'
}

export const DEVICE_PROVIDERS: Record<DevicePushProvider, DeviceProviderMeta> = {
  garmin: { id: 'garmin', name: 'Garmin', color: '#007CC3', oauth: '1.0a' },
  wahoo:  { id: 'wahoo',  name: 'Wahoo',  color: '#E8002D', oauth: '2.0' },
}

// Un provider n'est « configuré » que si ses secrets sont présents. Pour Wahoo,
// on exige un flag dédié (WAHOO_ROUTE_PUSH) : le connecteur Wahoo existe déjà en
// LECTURE, on n'active l'écriture d'itinéraires qu'une fois le scope obtenu.
export function isDeviceProviderConfigured(p: DevicePushProvider): boolean {
  if (p === 'garmin') return !!(process.env.GARMIN_CONSUMER_KEY && process.env.GARMIN_CONSUMER_SECRET)
  if (p === 'wahoo')  return process.env.WAHOO_ROUTE_PUSH === '1' && !!(process.env.WAHOO_CLIENT_ID && process.env.WAHOO_CLIENT_SECRET)
  return false
}

export function configuredDeviceProviders(): DevicePushProvider[] {
  return (Object.keys(DEVICE_PROVIDERS) as DevicePushProvider[]).filter(isDeviceProviderConfigured)
}
