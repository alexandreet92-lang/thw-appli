'use client'
// ══════════════════════════════════════════════════════════════════
// Builder de blocs mobile (§5) : header + toggle Manuel/IA + bandeau
// résumé 4 cellules + PROFIL D'INTENSITÉ (barres verticales par zone,
// CSS pur) + liste de BlockCard + boutons d'ajout. Adaptatif par sport.
// ══════════════════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { IconPlus, IconRefresh, IconSparkles, IconMapPin, IconX } from '@tabler/icons-react'
import type { SportType } from '@/app/planning/page'
import { zColor, fmtDur, secToPace, paceToSec, type AthleteRefs } from './editorial'
import { toBars, totalMin, totalDistance, newSingle, newInterval, type MBlock } from './blocks'
import { BlockCard } from './BlockCard'
import { Segmented } from './ui'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'

export function SessionBlockBuilder({ sport, accent, blocks, onChange, sm, sn, refs, builderTab, onBuilderTab }: {
  sport: SportType; accent: string; blocks: MBlock[]; onChange: (b: MBlock[]) => void
  sm: number; sn: number; refs: AthleteRefs
  builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [parcoursFile, setParcoursFile] = useState<File | null>(null)
  const parcoursInputRef = useRef<HTMLInputElement>(null)
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

  // Génération IA : on décrit la séance → l'IA renvoie les blocs d'intensité.
  async function generate() {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true); setAiError(null)
    try {
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: aiPrompt }], sport }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`)
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let raw = ''
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (!line.startsWith('data: ')) continue
            const p = line.slice(6).trim()
            if (p === '[DONE]') continue
            try { const d = JSON.parse(p) as Record<string, unknown>; if (typeof d.text === 'string') raw += d.text }
            catch { raw += p }
          }
        }
      }
      let jsonStr = ''
      const arr = raw.match(/\[[\s\S]*\]/)
      if (arr) jsonStr = arr[0]
      else {
        const obj = raw.match(/\{[\s\S]*\}/)
        if (obj) { try { const o = JSON.parse(obj[0]) as Record<string, unknown>; const a = (o.blocks ?? o.blocs) as unknown; if (Array.isArray(a)) jsonStr = JSON.stringify(a) } catch { /* noop */ } }
      }
      if (!jsonStr) { setAiError(`Réponse IA invalide : ${raw.slice(0, 200) || '(vide)'}`); return }
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>[]
      const newBlocks: MBlock[] = parsed.map((b, i) => {
        const value = String(b.value ?? '')
        const mode = (typeof b.mode === 'string' ? b.mode : 'single') as 'single' | 'interval'
        const reps = typeof b.reps === 'number' ? b.reps : 1
        const effortMin = typeof b.effortMin === 'number' ? b.effortMin : 0
        const recoveryMin = typeof b.recoveryMin === 'number' ? b.recoveryMin : 0
        const durationMin = typeof b.durationMin === 'number' ? b.durationMin : 0
        const zone = Math.max(1, Math.min(7, typeof b.zone === 'number' ? b.zone : 3))
        return {
          id: `ai_${Date.now()}_${i}`, mode, type: (typeof b.type === 'string' ? b.type : 'effort') as MBlock['type'],
          durationMin: mode === 'interval' ? Math.round(reps * (effortMin + recoveryMin) * 100) / 100 : durationMin,
          zone, value, hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '',
          label: typeof b.label === 'string' ? b.label : 'Bloc',
          reps: reps || undefined, effortMin: effortMin || undefined, recoveryMin: recoveryMin || undefined,
          recoveryZone: typeof b.recoveryZone === 'number' ? b.recoveryZone : 1,
        }
      })
      if (newBlocks.length === 0) { setAiError("L'IA a retourné un tableau vide."); return }
      onChange(newBlocks)
      setAiPrompt('')
      onBuilderTab('manual')
    } catch (e) {
      setAiError(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAiLoading(false)
    }
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

      {/* IA : champ d'écriture → génération des blocs d'intensité */}
      {builderTab === 'ai' && (
        <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--se-rule)', borderRadius: 'var(--se-r)' }}>
          <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: accent }}>
            <IconSparkles size={15} /> Décris ta séance, l&apos;IA crée les blocs
          </p>
          <textarea
            value={aiPrompt}
            onChange={e => { setAiPrompt(e.target.value); if (aiError) setAiError(null) }}
            rows={4}
            placeholder={sport === 'bike' ? 'Ex : 3×10min à 300W récup 5min, échauffement 15min…' : 'Ex : 10×400m @3:30/km récup 1min, échauffement 15min…'}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card2)', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', color: 'var(--se-text)', padding: 12, fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
          />
          <button type="button" onClick={() => void generate()} disabled={aiLoading || !aiPrompt.trim()}
            style={{ marginTop: 8, width: '100%', padding: 12, borderRadius: 'var(--se-r)', border: 'none', background: aiLoading ? 'var(--se-rule)' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: aiLoading || !aiPrompt.trim() ? 'default' : 'pointer', opacity: !aiPrompt.trim() ? 0.5 : 1 }}>
            {aiLoading ? 'Génération…' : 'Générer les blocs'}
          </button>
          {aiError && (
            <p style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, lineHeight: 1.4 }}>{aiError}</p>
          )}
        </div>
      )}

      {/* Parcours : importer / voir le parcours (ex. parcours lié au stage) */}
      <div style={{ marginTop: 14 }}>
        {parcoursFile ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconMapPin size={15} color={accent} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--se-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parcoursFile.name}</span>
              <button type="button" onClick={() => setParcoursFile(null)} aria-label="Retirer le parcours" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}><IconX size={15} /></button>
            </div>
            <ParcoursViewer file={parcoursFile} />
          </div>
        ) : (
          <button type="button" onClick={() => parcoursInputRef.current?.click()} style={addBtn}>
            <IconMapPin size={15} /> Intégrer un parcours
          </button>
        )}
        <input ref={parcoursInputRef} type="file" accept=".gpx,.tcx,.kml" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) setParcoursFile(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '12px', borderRadius: 'var(--se-r)', border: '1px dashed var(--se-rule)',
  background: 'transparent', color: 'var(--se-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
