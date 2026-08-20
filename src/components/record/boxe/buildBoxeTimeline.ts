// ══════════════════════════════════════════════════════════════════
// Déroule une séance de boxe PLANIFIÉE (moves composés + circuits) en une
// timeline linéaire d'étapes que le lecteur en direct exécute pas à pas :
// préparation → (par circuit → par tour → par move → effort + récup) → terminé.
// Le move « round » a ses propres rounds internes (temps + repos + intensité).
// ══════════════════════════════════════════════════════════════════
import type { ComposedMove, ComposedCircuit, RoundSupport } from '@/components/planning/composedSports'
import { ROUND_SUPPORT_LABEL, moveDef, composedMoveLabel } from '@/components/planning/composedSports'

export type BoxePhase = 'prepare' | 'work' | 'rest' | 'done'

export interface BoxeStep {
  phase: BoxePhase
  label: string           // « Round 2 », « Pompes », « Repos »…
  detail?: string         // « Sac classique · intensité 7/10 », « ×15 », combos…
  durationSec: number     // 0 = étape aux répétitions (avance manuelle)
  measure: 'time' | 'reps'
  reps?: number
  circuitName?: string
  circuitIdx: number
  tour?: number           // tour du circuit
  tours?: number          // nombre de tours du circuit
  isRound: boolean        // true = round de boxe (compté dans « rounds faits »)
  nextLabel?: string      // libellé du prochain EFFORT (renseigné en 2e passe)
}

const PREPARE_SEC = 10

function supportLabel(s?: RoundSupport): string { return s ? ROUND_SUPPORT_LABEL[s] : 'Round' }

export interface BoxeSession { title: string; moves: ComposedMove[]; circuits: ComposedCircuit[] }

export function buildBoxeTimeline(session: BoxeSession): BoxeStep[] {
  const { moves, circuits } = session
  const steps: BoxeStep[] = []
  const list: ComposedCircuit[] = circuits.length ? circuits : [{ id: 'c1', rounds: 1, restSec: 0 }]
  const firstId = list[0].id

  steps.push({ phase: 'prepare', label: 'Préparez-vous', durationSec: PREPARE_SEC, measure: 'time', circuitIdx: 0, isRound: false })

  list.forEach((circuit, ci) => {
    const cMoves = moves.filter(m => (m.circuitId ?? firstId) === circuit.id)
    const tours = Math.max(1, circuit.rounds)
    for (let tour = 1; tour <= tours; tour++) {
      cMoves.forEach(m => {
        const def = moveDef('boxe', m.kind)
        const baseLabel = composedMoveLabel(m, def)
        if (m.kind === 'round') {
          const nRounds = Math.max(1, m.rounds ?? 1)
          const work = m.timeSec ?? 180
          const rest = m.restSec ?? 60
          for (let r = 1; r <= nRounds; r++) {
            const intensity = m.roundIntensities?.[r - 1]
            const bits = [supportLabel(m.roundSupport)]
            if (intensity) bits.push(`intensité ${intensity}/10`)
            if (m.combos?.length) bits.push(m.combos.join(' · '))
            steps.push({ phase: 'work', label: `Round ${r}/${nRounds}`, detail: bits.join(' · '), durationSec: work, measure: 'time', circuitName: circuit.name, circuitIdx: ci, tour, tours, isRound: true })
            if (r < nRounds && rest > 0) steps.push({ phase: 'rest', label: 'Repos', durationSec: rest, measure: 'time', circuitIdx: ci, isRound: false })
          }
        } else if (m.measure === 'reps' && !m.timeSec) {
          const detail = [m.reps ? `×${m.reps}` : '', m.weightKg ? `${m.weightKg} kg` : ''].filter(Boolean).join(' · ')
          steps.push({ phase: 'work', label: baseLabel, detail: detail || undefined, durationSec: 0, measure: 'reps', reps: m.reps, circuitName: circuit.name, circuitIdx: ci, tour, tours, isRound: false })
        } else {
          const detail = m.weightKg ? `${m.weightKg} kg` : undefined
          steps.push({ phase: 'work', label: baseLabel, detail, durationSec: m.timeSec ?? 60, measure: 'time', circuitName: circuit.name, circuitIdx: ci, tour, tours, isRound: false })
        }
        if (m.restAfterSec && m.restAfterSec > 0) steps.push({ phase: 'rest', label: 'Récup', durationSec: m.restAfterSec, measure: 'time', circuitIdx: ci, isRound: false })
      })
      if (tour < tours && circuit.restSec > 0) steps.push({ phase: 'rest', label: 'Repos de circuit', durationSec: circuit.restSec, measure: 'time', circuitIdx: ci, isRound: false })
    }
  })

  steps.push({ phase: 'done', label: 'Terminé', durationSec: 0, measure: 'time', circuitIdx: list.length - 1, isRound: false })

  // 2e passe : renseigne nextLabel = prochain effort de chaque étape.
  for (let i = 0; i < steps.length; i++) {
    const next = steps.slice(i + 1).find(s => s.phase === 'work')
    if (next) steps[i].nextLabel = next.label + (next.detail ? ` · ${next.detail}` : '')
  }
  return steps
}

export function totalBoxeSeconds(steps: BoxeStep[]): number {
  return steps.reduce((s, st) => s + (st.measure === 'time' ? st.durationSec : (st.reps ?? 10) * 3), 0)
}
export function totalBoxeRounds(steps: BoxeStep[]): number {
  return steps.filter(s => s.isRound).length
}
