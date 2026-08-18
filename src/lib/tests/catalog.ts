// ══════════════════════════════════════════════════════════════
// Catalogue léger des tests de forme (id + nom + résumé), partagé entre la
// page Performance (bulle tests) et le calendrier (objectif « Test »). Permet
// de LIER un test planifié dans le calendrier à un test de la page Performance
// via son slug. Clés sport alignées sur TestSport (running|cycling|natation|
// aviron|hyrox) + gym pour le renfo.
// ══════════════════════════════════════════════════════════════

export type CatalogSport = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox' | 'gym'

export interface CatalogTest { id: string; name: string; desc: string }

export const TEST_CATALOG: Record<CatalogSport, CatalogTest[]> = {
  running: [
    { id: 'vma', name: 'VMA', desc: 'Vitesse Maximale Aérobie sur piste (~6 min).' },
    { id: 'cooper', name: 'Cooper', desc: '12 min d’effort maximal → estimation VO2max.' },
    { id: 'running-10km', name: 'Résistance 10 km', desc: 'Meilleur temps sur 10 km (seuil lactique).' },
    { id: 'vo2max-run', name: 'VO2max', desc: 'Test gradué jusqu’à épuisement.' },
    { id: 'tmi', name: 'TMI', desc: 'Maintien d’intensité au seuil (30 min).' },
    { id: 'lactate-run', name: 'Test lactate', desc: 'Lactatémie à différentes intensités (SL1/SL2).' },
  ],
  cycling: [
    { id: 'cp20', name: 'FTP (CP20)', desc: 'Critical Power 20 min × 0.95 = FTP.' },
    { id: 'vo2max-cycling', name: 'Ramp test', desc: 'Paliers +20 W / 2 min → PMA, FTP, VO2max.' },
    { id: 'cycling-z4', name: 'Résistance Z4', desc: 'Durée max tenue à 95–105 % FTP.' },
    { id: 'wingate', name: 'Wingate', desc: 'Sprint anaérobie 30 s à résistance max.' },
    { id: 'lactate-cycling', name: 'Lactate', desc: 'Profil lactatémique sur ergocycle.' },
  ],
  natation: [
    { id: 'css', name: 'CSS', desc: 'Critical Swim Speed (400 m + 200 m).' },
    { id: 'vmax-swim', name: 'VMax', desc: 'Vitesse max sur 25 / 50 m.' },
    { id: 'hypoxie', name: 'Hypoxie', desc: 'Distance max en apnée au crawl.' },
  ],
  aviron: [
    { id: '2000m-row', name: '2000 m', desc: 'Test référence Concept2 (~7 min).' },
    { id: '30min-row', name: '30 minutes', desc: 'Distance max en 30 min → FTP aviron.' },
    { id: 'vo2max-row', name: 'VO2max', desc: 'Test rampe sur ergomètre.' },
  ],
  hyrox: [
    { id: 'run-compromised', name: 'Run Compromised', desc: 'Cumul des 8 × 1 km sous fatigue.' },
    { id: 'hyrox-force', name: 'Force', desc: 'Deadlift / Squat / Bench 1RM + max reps PDC.' },
    { id: 'hyrox-endurance-wod', name: 'Endurance fonctionnelle', desc: '5 rounds 20 tractions / 40 pompes / 60 squats.' },
    { id: 'hyrox-explosivite', name: 'Explosivité', desc: 'Saut avant, triple saut, sprint 20 m.' },
  ],
  gym: [
    { id: 'gym-1rm', name: '1RM', desc: 'Charge maximale sur 1 répétition (squat/bench/deadlift).' },
    { id: 'gym-max-reps', name: 'Max reps PDC', desc: 'Répétitions max au poids du corps (tractions/pompes/dips).' },
    { id: 'gym-explosivite', name: 'Explosivité', desc: 'Saut vertical, medecine ball, sprint court.' },
  ],
}

export function testsForSport(sport: CatalogSport): CatalogTest[] {
  return TEST_CATALOG[sport] ?? []
}
export function findCatalogTest(slug: string): { sport: CatalogSport; test: CatalogTest } | null {
  for (const sport of Object.keys(TEST_CATALOG) as CatalogSport[]) {
    const test = TEST_CATALOG[sport].find(t => t.id === slug)
    if (test) return { sport, test }
  }
  return null
}
