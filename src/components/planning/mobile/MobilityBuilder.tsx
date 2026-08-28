'use client'
// ══════════════════════════════════════════════════════════════════
// Builder MOBILITÉ — un bloc = un exercice de mobilité (tenue OU répétitions,
// par côté, séries). Catalogue par région du corps (src/data/mobilite.ts).
// La séance mobilité est HORS VOLUME : sa durée est indicative, jamais comptée
// dans les totaux (cf. countsInVolume). Persistée dans les blocs JSONB (mob).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconPlus, IconTrash, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import type { MBlock } from './blocks'
import { Stepper, FieldLabel } from './ui'
import {
  MOBILITY_LIBRARY, MOBILITY_REGION_LABEL, MOBILITY_REGION_ORDER,
  type MobilityExo, type MobilityRegion,
} from '@/data/mobilite'

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

/** Minutes indicatives d'un exercice (tenue×côtés×séries, ~3 s/rép). */
export function mobMinutes(mob: NonNullable<MBlock['mob']>): number {
  const sides = mob.perSide ? 2 : 1
  const per = mob.holdSec != null ? mob.holdSec : (mob.reps ?? 0) * 3
  return (per * sides * (mob.sets || 1)) / 60
}

function blockFromExo(exo: MobilityExo): MBlock {
  const mob = { region: exo.region, holdSec: exo.mode === 'hold' ? exo.holdSec : undefined, reps: exo.mode === 'reps' ? exo.reps : undefined, perSide: exo.perSide, sets: 1 }
  return { id: uid(), mode: 'single', type: 'effort', zone: 1, value: '', hrAvg: '', label: exo.nom, durationMin: Math.round(mobMinutes(mob) * 10) / 10, mob }
}

function itemDetail(mob: NonNullable<MBlock['mob']>, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const base = mob.holdSec != null ? `${mob.holdSec}s` : t('w3g.mob_reps_short', { n: mob.reps ?? 0 })
  const sets = (mob.sets || 1) > 1 ? `${mob.sets} × ` : ''
  return `${sets}${base}${mob.perSide ? ` · ${t('w3g.mob_per_side_detail')}` : ''}`
}

export function MobilityBuilder({ blocks, accent, onChange }: {
  blocks: MBlock[]; accent: string; onChange: (b: MBlock[]) => void
}) {
  const { t } = useI18n()
  const [openRegion, setOpenRegion] = useState<MobilityRegion | null>(MOBILITY_REGION_ORDER[0])
  const items = blocks.filter(b => b.mob)

  function add(exo: MobilityExo) { onChange([...blocks, blockFromExo(exo)]) }
  function patch(id: string, mobPatch: Partial<NonNullable<MBlock['mob']>>) {
    onChange(blocks.map(b => {
      if (b.id !== id || !b.mob) return b
      const mob = { ...b.mob, ...mobPatch }
      return { ...b, mob, durationMin: Math.round(mobMinutes(mob) * 10) / 10 }
    }))
  }
  function remove(id: string) { onChange(blocks.filter(b => b.id !== id)) }
  function move(i: number, dir: -1 | 1) {
    const list = blocks.filter(b => b.mob)
    const j = i + dir; if (j < 0 || j >= list.length) return
    const ids = list.map(b => b.id);[ids[i], ids[j]] = [ids[j], ids[i]]
    onChange([...list].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)))
  }

  const totalMin = items.reduce((s, b) => s + (b.durationMin ?? 0), 0)

  return (
    <div>
      {/* Bandeau : nb d'exos + durée indicative (HORS volume) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h3 className="se-fr" style={{ margin: 0, fontSize: 19, fontWeight: 600, flex: 1 }}>{t('w3g.mob_session')}</h3>
        <span className="se-tnum" style={{ fontSize: 12, color: 'var(--se-dim)' }}>
          {items.length > 1 ? t('w3g.mob_summary_plural', { count: items.length, min: Math.round(totalMin) }) : t('w3g.mob_summary', { count: items.length, min: Math.round(totalMin) })}
        </span>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--se-dim)', lineHeight: 1.5 }}>
        {t('w3g.mob_volume_note')}
      </p>

      {/* Liste des exercices sélectionnés */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {items.map((b, i) => (
            <div key={b.id} style={{ border: '1px solid var(--se-rule)', borderLeft: `3px solid ${accent}`, borderRadius: 'var(--se-r)', padding: 12, background: 'var(--se-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent }}>{MOBILITY_REGION_LABEL[b.mob!.region as MobilityRegion] ?? b.mob!.region}</span>
                <span className="se-fr" style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--se-text)' }}>{b.label}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('w3g.mob_move_up')} style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}><IconChevronUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={t('w3g.mob_move_down')} style={{ ...iconBtn, opacity: i === items.length - 1 ? 0.3 : 1 }}><IconChevronDown size={15} /></button>
                <button onClick={() => remove(b.id)} aria-label={t('w3g.mob_remove')} style={{ ...iconBtn, color: '#ff5f5f' }}><IconTrash size={15} /></button>
              </div>
              <div className="se-fgrid">
                {b.mob!.holdSec != null
                  ? <div><FieldLabel>{t('w3g.mob_hold')}</FieldLabel><Stepper value={String(b.mob!.holdSec)} unit="s" onChange={v => patch(b.id, { holdSec: Math.max(5, parseInt(v) || 0) })} onDec={() => patch(b.id, { holdSec: Math.max(5, (b.mob!.holdSec ?? 0) - 5) })} onInc={() => patch(b.id, { holdSec: (b.mob!.holdSec ?? 0) + 5 })} /></div>
                  : <div><FieldLabel>{t('w3g.mob_reps')}</FieldLabel><Stepper value={String(b.mob!.reps ?? 0)} onChange={v => patch(b.id, { reps: Math.max(1, parseInt(v) || 1) })} onDec={() => patch(b.id, { reps: Math.max(1, (b.mob!.reps ?? 1) - 1) })} onInc={() => patch(b.id, { reps: (b.mob!.reps ?? 0) + 1 })} /></div>}
                <div><FieldLabel>{t('w3g.mob_sets')}</FieldLabel><Stepper value={String(b.mob!.sets)} onChange={v => patch(b.id, { sets: Math.max(1, parseInt(v) || 1) })} onDec={() => patch(b.id, { sets: Math.max(1, b.mob!.sets - 1) })} onInc={() => patch(b.id, { sets: b.mob!.sets + 1 })} /></div>
                <div>
                  <FieldLabel>{t('w3g.mob_sides')}</FieldLabel>
                  <button type="button" onClick={() => patch(b.id, { perSide: !b.mob!.perSide })}
                    style={{ width: '100%', height: 38, borderRadius: 'var(--se-r-sm, 8px)', cursor: 'pointer', fontSize: 12, fontWeight: 600, border: `1px solid ${b.mob!.perSide ? accent : 'var(--se-rule)'}`, background: b.mob!.perSide ? `${accent}14` : 'transparent', color: b.mob!.perSide ? accent : 'var(--se-dim)' }}>
                    {b.mob!.perSide ? t('w3g.mob_per_side_btn') : t('w3g.mob_symmetric')}
                  </button>
                </div>
              </div>
              <p style={{ margin: '8px 2px 0', fontSize: 10, color: 'var(--se-dim)' }}>{itemDetail(b.mob!, t)} · ≈ {Math.round((b.durationMin ?? 0) * 10) / 10} min</p>
            </div>
          ))}
        </div>
      )}

      {/* Catalogue par région */}
      <div style={{ border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', overflow: 'hidden' }}>
        {MOBILITY_REGION_ORDER.map(region => {
          const exos = MOBILITY_LIBRARY.filter(e => e.region === region)
          const open = openRegion === region
          return (
            <div key={region} style={{ borderTop: '1px solid var(--se-rule-soft)' }}>
              <button type="button" onClick={() => setOpenRegion(open ? null : region)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <span className="se-fr" style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--se-text)' }}>{MOBILITY_REGION_LABEL[region]}</span>
                <span className="se-tnum" style={{ fontSize: 11, color: 'var(--se-dim)' }}>{exos.length}</span>
                {open ? <IconChevronUp size={16} color="var(--se-dim)" /> : <IconChevronDown size={16} color="var(--se-dim)" />}
              </button>
              {open && (
                <div style={{ padding: '0 14px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {exos.map(exo => (
                    <button key={exo.id} type="button" onClick={() => add(exo)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 999, border: '1px dashed var(--se-rule)', background: 'transparent', color: 'var(--se-text)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      <IconPlus size={13} color={accent} /> {exo.nom}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
