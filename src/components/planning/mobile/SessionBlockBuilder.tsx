'use client'
// ══════════════════════════════════════════════════════════════════
// Builder de blocs mobile (§5) : header + toggle Manuel/IA + bandeau
// résumé 4 cellules + PROFIL D'INTENSITÉ (barres verticales par zone,
// CSS pur) + liste de BlockCard + boutons d'ajout. Adaptatif par sport.
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { IconPlus, IconRefresh, IconSparkles } from '@tabler/icons-react'
import type { SportType } from '@/app/planning/page'
import { zColor, fmtDur, secToPace, paceToSec, type AthleteRefs } from './editorial'
import { toBars, totalMin, totalDistance, newSingle, newInterval, type MBlock } from './blocks'
import { BlockCard } from './BlockCard'
import { Segmented } from './ui'

export function SessionBlockBuilder({ sport, accent, blocks, onChange, sm, sn, refs, builderTab, onBuilderTab }: {
  sport: SportType; accent: string; blocks: MBlock[]; onChange: (b: MBlock[]) => void
  sm: number; sn: number; refs: AthleteRefs
  builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const bars = toBars(blocks)
  const tot = totalMin(blocks)
  const dist = totalDistance(blocks)
  const isSwim = sport === 'swim'

  // 4ᵉ métrique : moyenne pondérée par la durée d'effort
  const fourth = (() => {
    let sumWM = 0, sumM = 0
    for (const b of blocks) {
      const m = b.mode === 'interval' && b.reps && b.effortMin ? b.reps * b.effortMin : b.durationMin
      if (sport === 'bike') { const w = parseInt(b.value || '0') || 0; sumWM += w * m; sumM += m }
      else { const s = paceToSec(b.value); if (!isNaN(s)) { sumWM += s * m; sumM += m } }
    }
    if (sumM === 0) return null
    if (sport === 'bike') return `${Math.round(sumWM / sumM)} W`
    return `${secToPace(sumWM / sumM)}${isSwim ? '/100m' : '/km'}`
  })()

  const cells: { label: string; value: string; color?: string }[] = [
    { label: 'SM métab.', value: String(sm), color: '#22b8c4' },
    { label: 'SN neuro', value: String(sn), color: '#a855f7' },
    isSwim ? { label: 'Distance', value: dist ? `${dist}m` : '—' } : { label: 'Durée', value: fmtDur(tot) },
    { label: sport === 'bike' ? 'Intensité moy.' : 'Allure moy.', value: fourth ?? '—' },
  ]

  function add(b: MBlock) { onChange([...blocks, b]); setOpenId(b.id) }
  function update(b: MBlock) { onChange(blocks.map(x => x.id === b.id ? b : x)) }
  function remove(id: string) { onChange(blocks.filter(x => x.id !== id)); if (openId === id) setOpenId(null) }
  function duplicate(id: string) {
    const i = blocks.findIndex(x => x.id === id); if (i < 0) return
    const copy = { ...blocks[i], id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }
    const nb = [...blocks]; nb.splice(i + 1, 0, copy); onChange(nb)
  }

  return (
    <div>
      {/* Header + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 className="se-fr" style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>Construction de la séance</h3>
        <Segmented accent={accent} value={builderTab} onChange={onBuilderTab}
          options={[{ key: 'manual', label: 'Manuel' }, { key: 'ai', label: '+ IA' }]} />
      </div>

      {/* Bandeau résumé 4 cellules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', overflow: 'hidden', marginBottom: 18 }}>
        {cells.map((c, i) => (
          <div key={c.label} style={{ padding: '12px 10px', borderLeft: i ? '1px solid var(--se-rule)' : 'none' }}>
            <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--se-dim)' }}>{c.label}</p>
            <p className="se-fr se-tnum" style={{ margin: '4px 0 0', fontSize: 21, fontWeight: 600, color: c.color ?? 'var(--se-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Profil d'intensité */}
      <div style={{ border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', padding: '14px 14px 10px', marginBottom: 18 }}>
        <p style={{ margin: '0 0 10px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>
          Profil d&apos;intensité <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {isSwim ? 'par distance' : 'haut = intensité'}</span>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150, paddingBottom: 2 }}>
            {[7, 6, 5, 4, 3, 2, 1].map(z => <span key={z} style={{ fontSize: 8.5, color: 'var(--se-dim)', lineHeight: 1 }}>Z{z}</span>)}
          </div>
          <div style={{ flex: 1, height: 150, display: 'flex', alignItems: 'flex-end', gap: 2, borderLeft: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', paddingLeft: 4 }}>
            {bars.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--se-dim)', alignSelf: 'center', margin: '0 auto' }}>Ajoute un bloc pour voir le profil</span>
              : bars.map(bar => (
                <div key={bar.id} title={`Z${bar.zone} · ${Math.round(bar.min)}min`} style={{
                  flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 3,
                  height: `${(Math.max(1, Math.min(7, bar.zone)) / 7) * 100}%`,
                  background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
                  borderRadius: '3px 3px 0 0',
                }} />
              ))}
          </div>
        </div>
      </div>

      {/* Liste des blocs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {blocks.map(b => (
          <BlockCard key={b.id} block={b} sport={sport} accent={accent} refs={refs}
            expanded={openId === b.id} onToggle={() => setOpenId(id => id === b.id ? null : b.id)}
            onChange={update} onRemove={() => remove(b.id)} onDuplicate={() => duplicate(b.id)} />
        ))}
      </div>

      {/* Boutons d'ajout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => add(newSingle(sport))} style={addBtn}><IconPlus size={15} /> Bloc simple</button>
        <button type="button" onClick={() => add(newInterval(sport))} style={addBtn}><IconRefresh size={15} /> {isSwim ? 'Série' : 'Intervalle'}</button>
      </div>

      {builderTab === 'ai' && (
        <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--se-rule)', borderRadius: 'var(--se-r)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--se-dim)', fontSize: 12 }}>
          <IconSparkles size={16} /> Génération IA disponible depuis le panneau Coach.
        </div>
      )}
    </div>
  )
}

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '12px', borderRadius: 'var(--se-r)', border: '1px dashed var(--se-rule)',
  background: 'transparent', color: 'var(--se-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
