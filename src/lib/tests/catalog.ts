// ══════════════════════════════════════════════════════════════
// Catalogue des tests de forme, partagé entre la page Performance (bulle
// tests), le calendrier (objectif « Test ») et le planning (planifier un test).
// La liste par sport dérive de la SOURCE DE VÉRITÉ unique `@/lib/tests/protocols`
// (mêmes tests que la page Performance), enrichie du renfo `gym` propre au
// planning/calendrier. Chaque test planifié peut être LIÉ à un test Performance
// via son slug.
// ══════════════════════════════════════════════════════════════

import { TESTS, PROTOCOLS, type TestProtocol } from '@/lib/tests/protocols'
import type { TestSport } from '@/app/performance/testTypes'

export type CatalogSport = TestSport | 'gym'

export interface CatalogTest { id: string; name: string; desc: string }

// Tests de renfo (muscu) — absents de la page Performance, propres au planning.
const GYM_TESTS: CatalogTest[] = [
  { id: 'gym-1rm', name: '1RM', desc: 'Charge maximale sur 1 répétition (squat/bench/deadlift).' },
  { id: 'gym-max-reps', name: 'Max reps PDC', desc: 'Répétitions max au poids du corps (tractions/pompes/dips).' },
  { id: 'gym-explosivite', name: 'Explosivité', desc: 'Saut vertical, medecine ball, sprint court.' },
]

// Dérive la liste par sport depuis le catalogue complet Performance.
export const TEST_CATALOG: Record<CatalogSport, CatalogTest[]> = {
  running:  TESTS.running.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
  cycling:  TESTS.cycling.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
  natation: TESTS.natation.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
  aviron:   TESTS.aviron.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
  hyrox:    TESTS.hyrox.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
  gym:      GYM_TESTS,
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
// Protocole complet (procédé) d'un test lié, si disponible.
export function protocolForSlug(slug: string | null | undefined): TestProtocol | null {
  if (!slug) return null
  return PROTOCOLS[slug] ?? null
}
