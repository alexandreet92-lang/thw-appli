'use client'
// ══════════════════════════════════════════════════════════════════
// Builder de blocs mobile (§5) : header + toggle Manuel/IA + bandeau
// résumé 4 cellules + PROFIL D'INTENSITÉ (barres verticales par zone,
// CSS pur) + liste de BlockCard + boutons d'ajout. Adaptatif par sport.
// ══════════════════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { IconPlus, IconRefresh, IconSparkles, IconMapPin, IconX, IconGripVertical } from '@tabler/icons-react'
import type { SportType, RunningSub } from '@/app/planning/page'
import { zColor, fmtDur, secToPace, paceToSec, type AthleteRefs } from './editorial'
import { toBars, totalMin, totalDistance, newSingle, newInterval, type MBlock } from './blocks'
import { BlockCard } from './BlockCard'
import { Segmented } from './ui'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'
import type { PanelParcours } from './panelProps'
import { useI18n } from '@/lib/i18n'

export function SessionBlockBuilder({ sport, runningSub, accent, blocks, onChange, sm, sn, refs, parcoursData, builderTab, onBuilderTab }: {
  sport: SportType; runningSub?: RunningSub; accent: string; blocks: MBlock[]; onChange: (b: MBlock[]) => void
  sm: number; sn: number; refs: AthleteRefs; parcoursData?: PanelParcours
  builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const { t: tr } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [parcoursFile, setParcoursFile] = useState<File | null>(null)
  const parcoursInputRef = useRef<HTMLInputElement>(null)
  // Drag-to-reorder (souris + tactile via pointer events)
  const dragId = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bars = toBars(blocks)
  const tot = totalMin(blocks)
  const dist = totalDistance(blocks)
  const isSwim = sport === 'swim'

  // ── Hauteur de barre CONTINUE selon l'intensité réelle (pas seulement la zone) ──
  // 200 W et 210 W sont dans la même zone (même couleur) mais 210 W doit être un peu
  // plus haut : la position dans la bande de zone reflète où tombe l'intensité.
  const nZones = sport === 'bike' || sport === 'elliptique' ? 7 : 5
  // Références de seuil, repli aligné sur le modèle de zones du planning
  // (ATHLETE : FTP 301, allure seuil 248 s/km, CSS 88 s/100m).
  const refFtp = refs.ftp ?? 301
  const refRun = refs.runThresholdPaceSec ?? 248
  const refCss = refs.cssSecPer100m ?? 88
  const ZONE_TOPS = sport === 'bike' || sport === 'elliptique'
    ? [0.55, 0.75, 0.87, 1.05, 1.20, 1.50, 1.85]   // % FTP (7 zones)
    : [0.78, 0.87, 0.94, 1.02, 1.15]               // % allure seuil (5 zones)
  function barHeightPct(bar: { zone: number; value?: string }): number {
    // ratio intensité / seuil
    let ratio: number | null = null
    if (sport === 'bike' || sport === 'elliptique') {
      const w = parseInt(bar.value ?? '') || 0
      if (w > 0) ratio = w / refFtp
    } else {
      const p = paceToSec(bar.value ?? '')
      if (!isNaN(p) && p > 0) ratio = (isSwim ? refCss : refRun) / p
    }
    const zoneInt = Math.max(1, Math.min(nZones, bar.zone))
    let posF = zoneInt   // repli : ancrage sur la zone entière
    if (ratio != null) {
      let lo = 0
      for (let i = 0; i < ZONE_TOPS.length; i++) {
        const hi = ZONE_TOPS[i]
        if (ratio <= hi || i === ZONE_TOPS.length - 1) {
          const frac = Math.max(0, Math.min(1, (ratio - lo) / (hi - lo || 1)))
          posF = Math.max(0.35, Math.min(nZones, i + frac))
          break
        }
        lo = hi
      }
    }
    return (posF / nZones) * 100
  }

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
    { label: tr('planning.smMetab'), value: String(sm), color: '#22b8c4' },
    { label: tr('planning.snNeuro'), value: String(sn), color: '#a855f7' },
    isSwim ? { label: tr('planning.distance'), value: dist ? `${dist}m` : '—' } : { label: tr('planning.duration'), value: fmtDur(tot) },
    { label: sport === 'bike' ? tr('planning.avgIntensity') : tr('planning.avgPace'), value: fourth ?? '—' },
  ]

  function add(b: MBlock) { onChange([...blocks, b]); setOpenId(b.id) }
  function update(b: MBlock) { onChange(blocks.map(x => x.id === b.id ? b : x)) }
  function remove(id: string) { onChange(blocks.filter(x => x.id !== id)); if (openId === id) setOpenId(null) }
  function duplicate(id: string) {
    const i = blocks.findIndex(x => x.id === id); if (i < 0) return
    const copy = { ...blocks[i], id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }
    const nb = [...blocks]; nb.splice(i + 1, 0, copy); onChange(nb)
  }

  // ── Réordonnancement par glisser (poignée) ──
  function onDragStart(id: string, e: React.PointerEvent) {
    e.preventDefault()
    dragId.current = id; setDragging(id)
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragId.current) return
    const ids = blocks.map(b => b.id)
    const from = ids.indexOf(dragId.current)
    if (from < 0) return
    let to = from
    for (let i = 0; i < ids.length; i++) {
      const el = rowRefs.current[ids[i]]; if (!el) continue
      const r = el.getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) { to = i; break }
      to = i
    }
    if (to !== from) {
      const nb = [...blocks]
      const [m] = nb.splice(from, 1)
      nb.splice(to, 0, m)
      onChange(nb)
    }
  }
  function onDragEnd() { dragId.current = null; setDragging(null) }

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
      if (!jsonStr) { setAiError(tr('planning.aiInvalidResponse', { r: raw.slice(0, 200) || tr('planning.empty') })); return }
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
          label: typeof b.label === 'string' ? b.label : tr('planning.bloc'),
          reps: reps || undefined, effortMin: effortMin || undefined, recoveryMin: recoveryMin || undefined,
          recoveryZone: typeof b.recoveryZone === 'number' ? b.recoveryZone : 1,
        }
      })
      if (newBlocks.length === 0) { setAiError(tr('planning.aiEmptyArray')); return }
      onChange(newBlocks)
      setAiPrompt('')
      onBuilderTab('manual')
    } catch (e) {
      setAiError(tr('planning.errorPrefix', { e: e instanceof Error ? e.message : String(e) }))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div>
      {/* Header + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 className="se-fr" style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{tr('planning.sessionBuilder')}</h3>
        <Segmented accent={accent} value={builderTab} onChange={onBuilderTab}
          options={[{ key: 'manual', label: tr('planning.manual') }, { key: 'ai', label: tr('planning.aiPlus') }]} />
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
          {tr('planning.intensityProfile')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {isSwim ? tr('planning.byDistance') : tr('planning.highIsIntensity')}</span>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150, paddingBottom: 2 }}>
            {Array.from({ length: nZones }, (_, k) => nZones - k).map(z => <span key={z} style={{ fontSize: 8.5, color: 'var(--se-dim)', lineHeight: 1 }}>Z{z}</span>)}
          </div>
          <div style={{ flex: 1, height: 150, display: 'flex', alignItems: 'flex-end', gap: 2, borderLeft: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', paddingLeft: 4 }}>
            {bars.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--se-dim)', alignSelf: 'center', margin: '0 auto' }}>{tr('planning.addBlockToSeeProfile')}</span>
              : bars.map(bar => (
                <div key={bar.id} title={`Z${bar.zone}${bar.value ? ` · ${bar.value}` : ''} · ${Math.round(bar.min)}min`} style={{
                  flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 3,
                  height: `${barHeightPct(bar)}%`,
                  background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
                  borderRadius: '3px 3px 0 0',
                }} />
              ))}
          </div>
        </div>
      </div>

      {/* Liste des blocs — glisser la poignée pour réordonner (souris + tactile) */}
      <div onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
        style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {blocks.map(b => (
          <div key={b.id} ref={el => { rowRefs.current[b.id] = el }}
            style={{ display: 'flex', alignItems: 'stretch', gap: 6, opacity: dragging === b.id ? 0.55 : 1, transition: 'opacity 0.12s' }}>
            <div onPointerDown={e => onDragStart(b.id, e)} aria-label={tr('planning.moveBlock')} title={tr('planning.dragToMove')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', color: 'var(--se-dim)', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}>
              <IconGripVertical size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <BlockCard block={b} sport={sport} runningSub={runningSub} accent={accent} refs={refs}
                expanded={openId === b.id} onToggle={() => setOpenId(id => id === b.id ? null : b.id)}
                onChange={update} onRemove={() => remove(b.id)} onDuplicate={() => duplicate(b.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* Boutons d'ajout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => add(newSingle(sport, runningSub === 'treadmill'))} style={addBtn}><IconPlus size={15} /> {tr('planning.simpleBlock')}</button>
        <button type="button" onClick={() => add(newInterval(sport, runningSub === 'treadmill'))} style={addBtn}><IconRefresh size={15} /> {isSwim ? tr('planning.series') : tr('planning.interval')}</button>
      </div>

      {/* IA : champ d'écriture → génération des blocs d'intensité */}
      {builderTab === 'ai' && (
        <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--se-rule)', borderRadius: 'var(--se-r)' }}>
          <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: accent }}>
            <IconSparkles size={15} /> {tr('planning.aiDescribeSession')}
          </p>
          <textarea
            value={aiPrompt}
            onChange={e => { setAiPrompt(e.target.value); if (aiError) setAiError(null) }}
            rows={4}
            placeholder={sport === 'bike' ? tr('planning.aiPlaceholderBike') : tr('planning.aiPlaceholderDefault')}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card2)', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', color: 'var(--se-text)', padding: 12, fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
          />
          <button type="button" onClick={() => void generate()} disabled={aiLoading || !aiPrompt.trim()}
            style={{ marginTop: 8, width: '100%', padding: 12, borderRadius: 'var(--se-r)', border: 'none', background: aiLoading ? 'var(--se-rule)' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: aiLoading || !aiPrompt.trim() ? 'default' : 'pointer', opacity: !aiPrompt.trim() ? 0.5 : 1 }}>
            {aiLoading ? tr('planning.generating') : tr('planning.generateBlocks')}
          </button>
          {aiError && (
            <p style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, lineHeight: 1.4 }}>{aiError}</p>
          )}
        </div>
      )}

      {/* Parcours : parcours lié au stage (auto) OU import manuel */}
      <div style={{ marginTop: 14 }}>
        {parcoursFile ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconMapPin size={15} color={accent} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--se-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parcoursFile.name}</span>
              <button type="button" onClick={() => setParcoursFile(null)} aria-label={tr('planning.removeParcours')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}><IconX size={15} /></button>
            </div>
            <ParcoursViewer file={parcoursFile} />
          </div>
        ) : (parcoursData?.elevationProfile && parcoursData.elevationProfile.length > 1) ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconMapPin size={15} color={accent} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--se-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parcoursData.name || tr('planning.stageParcours')}</span>
              <button type="button" onClick={() => parcoursInputRef.current?.click()} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{tr('planning.replace')}</button>
            </div>
            <ParcoursViewer data={parcoursData} />
          </div>
        ) : (
          <button type="button" onClick={() => parcoursInputRef.current?.click()} style={addBtn}>
            <IconMapPin size={15} /> {tr('planning.addParcours')}
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
