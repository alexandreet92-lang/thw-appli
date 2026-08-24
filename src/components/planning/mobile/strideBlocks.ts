// ══════════════════════════════════════════════════════════════════
// Modèle de blocs pour le builder INTERVALS STRIDES (agilité / cônes).
// Chaque bloc = un atelier (preset, personnalisé ou libre), porté par le
// champ additif `at` sur un MBlock (persiste tel quel dans blocks JSONB).
// ══════════════════════════════════════════════════════════════════
import type { Block } from '@/app/planning/page'
import type { MBlock } from './blocks'
import type { AtelierPreset } from './atelierPresets'

const uid = () => `at_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

export interface AtelierExt {
  kind: 'atelier'
  presetId: string          // id du preset, 'custom_<uuid>' ou 'free'
  name: string
  zone: number              // 1–5 (intensité de l'atelier)
  reps: number              // répétitions
  effortSec: number         // durée d'une répétition (s)
  recoverySec: number       // récup entre répétitions
  restBetweenSec: number    // repos entre blocs
  note: string
  svg?: string              // diagramme (inline SVG) — preset/custom
}
export type StrideBlock = MBlock & { at: AtelierExt }

export function atelierMin(x: AtelierExt): number {
  return Math.max(1, Math.round((x.reps * (x.effortSec + x.recoverySec) + x.restBetweenSec) / 60))
}

export function syncStrideBlock(b: StrideBlock): StrideBlock {
  return {
    ...b, mode: 'single', type: 'effort',
    durationMin: atelierMin(b.at), zone: Math.max(1, Math.min(5, b.at.zone)),
    label: b.at.name || 'Atelier', value: b.value ?? '', hrAvg: b.hrAvg ?? '',
  }
}

function make(at: AtelierExt): StrideBlock {
  return syncStrideBlock({ id: uid(), mode: 'single', type: 'effort', durationMin: 0, zone: at.zone, value: '', hrAvg: '', label: at.name, at })
}

export function newAtelierFromPreset(p: AtelierPreset): StrideBlock {
  return make({ kind: 'atelier', presetId: p.id, name: p.name, zone: p.zone, reps: 4, effortSec: 20, recoverySec: 40, restBetweenSec: 120, note: p.desc, svg: p.svg })
}
export function newFreeAtelier(): StrideBlock {
  return make({ kind: 'atelier', presetId: 'free', name: 'Atelier libre', zone: 4, reps: 4, effortSec: 20, recoverySec: 40, restBetweenSec: 120, note: '' })
}
export function newAtelierFromCustom(c: { id: string; name: string; zone: number; reps: number; recovery_sec: number; rest_between_sec: number; note: string | null; svg: string | null }): StrideBlock {
  return make({ kind: 'atelier', presetId: `custom_${c.id}`, name: c.name, zone: c.zone, reps: c.reps, effortSec: 20, recoverySec: c.recovery_sec, restBetweenSec: c.rest_between_sec, note: c.note ?? '', svg: c.svg ?? undefined })
}

export function isStrideBlock(b: Block | MBlock): b is StrideBlock {
  return !!(b as StrideBlock).at && (b as StrideBlock).at.kind === 'atelier'
}
