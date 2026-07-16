// ══════════════════════════════════════════════════════════════════
// Abstraction capteurs — SensorSource (une implémentation par plateforme).
// Le reste de l'app ne touche JAMAIS navigator.bluetooth directement : elle
// passe par SensorSource, choisi au runtime (cf. sensors/index.ts).
// Lecture seule : on s'abonne aux notifications BLE, aucune écriture de contrôle.
// ══════════════════════════════════════════════════════════════════

/** Type de capteur demandé à la connexion. */
export type SensorKind = 'trainer' | 'hr' | 'cadence'

/** Échantillon normalisé émis par n'importe quelle source. Champs optionnels :
 *  un capteur cardio ne remonte que heartRate, un trainer power/cadence. */
export interface SensorSample {
  power?: number
  cadence?: number
  heartRate?: number
  ts: number
}

/** Poignée opaque vers un appareil connecté (permet de le déconnecter). */
export interface SensorDevice {
  id: string
  kind: SensorKind
  name: string
  /** Déconnexion bas-niveau, appelée par SensorSource.disconnect. */
  close: () => void
}

/** Contrat commun à toutes les plateformes. */
export interface SensorSource {
  /** true si cette source peut fonctionner ici (capacité, pas user-agent). */
  isAvailable(): Promise<boolean>
  /** Ouvre le sélecteur d'appareil et connecte un capteur du type demandé. */
  connect(kind: SensorKind): Promise<SensorDevice>
  /** Déconnecte un appareil précédemment connecté. */
  disconnect(d: SensorDevice): Promise<void>
  /** S'abonne aux échantillons ; renvoie une fonction de désabonnement. */
  subscribe(cb: (s: SensorSample) => void): () => void
}
