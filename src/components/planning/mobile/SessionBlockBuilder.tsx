'use client'
// ══════════════════════════════════════════════════════════════════
// Builder de blocs mobile (§5) : header + toggle Manuel/IA + bandeau
// résumé 4 cellules + PROFIL D'INTENSITÉ (barres verticales par zone,
// CSS pur) + liste de BlockCard + boutons d'ajout. Adaptatif par sport.
// ══════════════════════════════════════════════════════════════════
import { useState, useRef, useMemo, useEffect } from 'react'
import { IconPlus, IconRefresh, IconSparkles, IconMapPin, IconX, IconGripVertical, IconMicrophone, IconLungs, IconTrendingUp } from '@tabler/icons-react'
import { getZone, type SportType, type RunningSub } from '@/app/planning/page'
import { zColor, fmtDur, secToPace, paceToSec, type AthleteRefs } from './editorial'
import { toBars, totalMin, totalDistance, newSingle, newInterval, newHypoxie, newProgressive, recalc, barHeightPct, BAR_AXIS_TICKS, treadmillProfile, type MBlock, type EffortUnit } from './blocks'
import { syncBaseBlock, setBaseWatts, enduranceZ2Watts, type BaseCtx } from './parcoursBase'
import RouteElevationProfile, { type ProfilePortion, type SequencedPortion } from '@/components/gpx/RouteElevationProfile'
import { BlockCard } from './BlockCard'
import { EnduranceLiveSummary } from './EnduranceLiveSummary'
import { parseSessionText } from './parseSessionText'
import { Segmented } from './ui'
import { VoiceOverlay } from '@/components/ai/VoiceOverlay'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'
import type { PanelParcours } from './panelProps'
import { useI18n } from '@/lib/i18n'

export function SessionBlockBuilder({ sport, runningSub, accent, blocks, onChange, sm, sn, refs, parcoursData, onParcoursFile, onParcoursRemove, riderKg, bikeKg, builderTab, onBuilderTab }: {
  sport: SportType; runningSub?: RunningSub; accent: string; blocks: MBlock[]; onChange: (b: MBlock[]) => void
  sm: number; sn: number; refs: AthleteRefs; parcoursData?: PanelParcours
  onParcoursFile?: (f: File) => void; onParcoursRemove?: () => void
  riderKg?: number; bikeKg?: number
  builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const { t: tr } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const voiceBaseRef = useRef('')   // texte du champ avant dictée (streaming live)
  const [parcoursFile, setParcoursFile] = useState<File | null>(null)
  const parcoursInputRef = useRef<HTMLInputElement>(null)
  // Drag-to-reorder (souris + tactile via pointer events)
  const dragId = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bars = toBars(blocks)
  const tot = totalMin(blocks)
  const dist = totalDistance(blocks, sport)
  const isSwim = sport === 'swim'
  const isRun = sport === 'run'

  // Tapis : profil ALTIMÉTRIQUE reconstruit depuis la pente des blocs (le tapis
  // n'a pas de trace GPS). Affiché sous le profil d'intensité s'il y a du D+.
  const isTreadmill = sport === 'run' && runningSub === 'treadmill'
  const treadProfile = useMemo(() => (isTreadmill ? treadmillProfile(blocks) : []), [isTreadmill, blocks])
  const treadGain = treadProfile.length ? Math.round(treadProfile[treadProfile.length - 1].ele) : 0
  const treadKm = treadProfile.length ? treadProfile[treadProfile.length - 1].distKm : 0

  // ── Hauteur de barre : règle unique partagée avec la popover de survol ──
  // barHeightPct (blocks.ts) : Z1 20 % · Z2 40 % · Z3 60 % · Z4 80 % · Z5+ 100 %,
  // avec ±8 % de nuance intra-zone (200 W ≠ 210 W) qui ne sort pas de la bande.
  const nZones = sport === 'bike' || sport === 'elliptique' ? 7 : 5
  // Graduations de l'axe : toujours Z1…Z5, les zones au-delà du seuil étant
  // confondues au sommet (« Z5+ » pour les sports à 7 zones).
  const axisTicks = Array.from({ length: BAR_AXIS_TICKS }, (_, k) => BAR_AXIS_TICKS - k)
    .map(z => (z === BAR_AXIS_TICKS && nZones > BAR_AXIS_TICKS ? `Z${z}+` : `Z${z}`))

  // ══════════════════════════════════════════════════════════════
  // Parcours vélo : bloc de FOND endurance Z2 + séquençage des portions
  // ══════════════════════════════════════════════════════════════
  const parcoursProfile = useMemo(
    () => parcoursData?.elevationProfile ?? [],
    [parcoursData],
  )
  const parcoursTotalKm = parcoursProfile.length > 1
    ? (parcoursData?.distance ?? parcoursProfile[parcoursProfile.length - 1].distKm)
    : 0
  const massKg = (riderKg ?? 75) + (bikeKg ?? 8)
  const hasParcours = sport === 'bike' && parcoursProfile.length > 1 && parcoursTotalKm > 0
  const baseCtx: BaseCtx = useMemo(() => ({
    profile: parcoursProfile, totalKm: parcoursTotalKm, massKg,
    defaultWatts: enduranceZ2Watts(refs.ftp),
  }), [parcoursProfile, parcoursTotalKm, massKg, refs.ftp])

  // Dès qu'un parcours est intégré : bloc de fond Z2 sur TOUT le parcours,
  // puis resegmentation automatique autour des blocs d'intensité.
  useEffect(() => {
    if (!hasParcours) return
    const next = syncBaseBlock(blocks, baseCtx, sport)
    if (next !== blocks) onChange(next)
  }, [hasParcours, blocks, baseCtx, sport, onChange])

  const baseBlock = hasParcours ? blocks.find(b => b._base) ?? null : null
  const baseWatts = parseInt(baseBlock?.value ?? '') || 0
  function bumpBaseWatts(delta: number) {
    if (!baseBlock) return
    onChange(setBaseWatts(blocks, Math.max(30, baseWatts + delta), baseCtx, sport))
  }

  const colorForWatts = (w: number) => zColor(getZone('bike', String(w)))

  /** Portions dessinées sur le profil : fond Z2 segmenté + blocs d'intensité.
   *  Chaque bloc porte `intensityPct` = hauteur (∝ zone) du bloc coloré dessiné
   *  sur le profil altimétrique (Z1 bas … Z5 plein), même échelle que le profil
   *  d'intensité (barHeightPct). */
  const parcoursPortions: ProfilePortion[] = useMemo(() => {
    if (!hasParcours) return []
    const pct = (zone: number, value?: string) => barHeightPct({ zone, value }, sport, refs) / 100
    const out: ProfilePortion[] = []
    const base = blocks.find(b => b._base)
    for (const s of base?._baseSegments ?? []) {
      out.push({
        startKm: s.startKm, endKm: s.endKm, color: zColor(base?.zone ?? 2), label: base?.label,
        intensityPct: pct(base?.zone ?? 2, base?.value),
      })
    }
    for (const b of blocks) {
      if (b._base || b._startKm == null || b._endKm == null) continue
      const isIv = b.mode === 'interval' && !!b.reps
      out.push({
        id: b.id, startKm: b._startKm, endKm: b._endKm,
        color: zColor(b.zone), label: b.label, highlight: true,
        watts: parseInt(b.value) || undefined,
        hrTarget: parseInt(b.hrAvg) || null,
        recoveryColor: zColor(b.recoveryZone ?? 1),
        intensityPct: pct(b.zone, b.value),
        recoveryPct: pct(b.recoveryZone ?? 1, b.recoveryValue),
        interval: isIv ? {
          reps: b.reps as number,
          effortSec: Math.round((b.effortMin ?? 0) * 60),
          recoverySec: Math.round((b.recoveryMin ?? 0) * 60),
          effortWatts: parseInt(b.value) || 0,
          recoveryWatts: parseInt(b.recoveryValue ?? '') || 0,
        } : undefined,
      })
    }
    return out
  }, [blocks, hasParcours, sport, refs])

  /** SequencedPortion → MBlock (bloc simple ou fractionné). */
  function blockFromPortion(p: SequencedPortion, id: string): MBlock {
    const hr = p.hrTarget != null ? String(p.hrTarget) : ''
    const kmLabel = `km ${p.startKm.toFixed(1).replace('.', ',')}→${p.endKm.toFixed(1).replace('.', ',')}`
    if (p.interval) {
      const iv = p.interval
      const effMin = iv.effortSec / 60
      const recMin = iv.recoverySec / 60
      const mmss = `${Math.floor(iv.effortSec / 60)}:${String(iv.effortSec % 60).padStart(2, '0')}`
      return recalc(sport, {
        id, mode: 'interval', type: 'effort',
        durationMin: Math.round(iv.reps * (effMin + recMin) * 100) / 100,
        zone: getZone('bike', String(iv.effortWatts)),
        value: String(iv.effortWatts), effortUnit: 'watts', hrAvg: hr,
        reps: iv.reps, effortMin: effMin, recoveryMin: recMin,
        recoveryValue: String(iv.recoveryWatts),
        recoveryZone: getZone('bike', String(iv.recoveryWatts)),
        label: `Fractionné ${iv.reps}×${mmss} ${kmLabel} @${iv.effortWatts}W`,
        _startKm: p.startKm, _endKm: p.endKm,
      })
    }
    return recalc(sport, {
      id, mode: 'single', type: 'effort',
      durationMin: Math.max(1, Math.round(p.estimatedMin)),
      zone: getZone('bike', String(p.watts)),
      value: String(p.watts), effortUnit: 'watts', hrAvg: hr,
      label: `${p.avgGradPct >= 2 ? 'Ascension' : 'Portion'} ${kmLabel} @${p.watts}W`,
      _startKm: p.startKm, _endKm: p.endKm,
    })
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

  // Natation (m) & course (km) : distance TOUJOURS affichée + durée. La distance
  // est mesurée si saisie, sinon dérivée de durée × allure (mode temps compris).
  const distLabel = isSwim ? (dist ? `${Math.round(dist)} m` : '—')
    : (dist ? `${(dist / 1000).toFixed(2).replace('.', ',')} km` : '—')
  const cells: { label: string; value: string; color?: string }[] = [
    { label: tr('planning.smMetab'), value: String(sm), color: '#22b8c4' },
    { label: tr('planning.snNeuro'), value: String(sn), color: '#a855f7' },
    ...((isSwim || isRun)
      ? [{ label: tr('planning.distance'), value: distLabel }, { label: tr('planning.duration'), value: tot > 0 ? fmtDur(tot) : '—' }]
      : [{ label: tr('planning.duration'), value: fmtDur(tot) }]),
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
        body: JSON.stringify({ messages: [{ role: 'user', content: aiPrompt }], sport, runningSub }),
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
      const isTreadmill = sport === 'run' && runningSub === 'treadmill'
      const newBlocks: MBlock[] = parsed.map((b, i) => {
        const value = String(b.value ?? '')
        const mode = (typeof b.mode === 'string' ? b.mode : 'single') as 'single' | 'interval'
        const reps = typeof b.reps === 'number' ? b.reps : 1
        const effortMin = typeof b.effortMin === 'number' ? b.effortMin : 0
        const recoveryMin = typeof b.recoveryMin === 'number' ? b.recoveryMin : 0
        const durationMin = typeof b.durationMin === 'number' ? b.durationMin : 0
        const zone = Math.max(1, Math.min(7, typeof b.zone === 'number' && b.zone > 0 ? b.zone : 3))
        // Tapis : l'IA renvoie vitesse km/h + pente → effortUnit 'kmh', la zone
        // (et le dénivelé) sont recalculés en tenant compte de la pente.
        const effortUnit: EffortUnit | undefined = typeof b.effortUnit === 'string'
          ? (b.effortUnit as EffortUnit)
          : (isTreadmill ? 'kmh' : undefined)
        const inclinePct = typeof b.inclinePct === 'number' ? b.inclinePct : (isTreadmill ? 0 : undefined)
        const base: MBlock = {
          id: `ai_${Date.now()}_${i}`, mode, type: (typeof b.type === 'string' ? b.type : 'effort') as MBlock['type'],
          durationMin: mode === 'interval' ? Math.round(reps * (effortMin + recoveryMin) * 100) / 100 : durationMin,
          zone, value, hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '',
          label: typeof b.label === 'string' ? b.label : tr('planning.bloc'),
          reps: reps || undefined, effortMin: effortMin || undefined, recoveryMin: recoveryMin || undefined,
          recoveryZone: typeof b.recoveryZone === 'number' ? b.recoveryZone : 1,
          effortUnit, inclinePct, inputMode: effortUnit === 'kmh' ? 'time' : undefined,
        }
        return effortUnit === 'kmh' ? recalc(sport, base) : base
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
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length},1fr)`, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', overflow: 'hidden', marginBottom: 18 }}>
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
            {axisTicks.map(z => <span key={z} style={{ fontSize: 8.5, color: 'var(--se-dim)', lineHeight: 1 }}>{z}</span>)}
          </div>
          <div data-testid="intensity-graph" style={{ flex: 1, height: 150, display: 'flex', alignItems: 'flex-end', gap: 2, borderLeft: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', paddingLeft: 4 }}>
            {bars.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--se-dim)', alignSelf: 'center', margin: '0 auto' }}>{tr('planning.addBlockToSeeProfile')}</span>
              : bars.map(bar => (
                <div key={bar.id} data-zone={bar.zone} data-km={bar.startKm ?? ''} title={`Z${bar.zone}${bar.value ? ` · ${bar.value}` : ''} · ${Math.round(bar.min)}min`} style={{
                  flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 3,
                  height: `${barHeightPct(bar, sport, refs)}%`,
                  background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
                  borderRadius: '3px 3px 0 0',
                }} />
              ))}
          </div>
        </div>
      </div>

      {/* Tapis : profil ALTIMÉTRIQUE (pente cumulée) sous le profil d'intensité */}
      {isTreadmill && treadProfile.length > 1 && treadGain > 0 && (
        <div style={{ border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', padding: '14px 14px 8px', marginBottom: 18 }}>
          <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>
            {tr('sed.elevationProfile')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>· +{treadGain} m D+</span>
          </p>
          <RouteElevationProfile profile={treadProfile} totalKm={treadKm} totalGainM={treadGain} height={92} staticMode />
        </div>
      )}

      {/* Fond de sortie : tout le parcours en endurance Z2, puissance éditable.
          Le changement se propage à TOUTES les portions Z2 (le fond est un bloc
          unique, segmenté autour des blocs d'intensité). */}
      {baseBlock && (
        <div data-testid="base-z2-strip" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', marginBottom: 12 }}>
          <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: zColor(baseBlock.zone) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--se-dim)' }}>
              Fond de sortie · endurance Z2
            </p>
            <p className="se-tnum" style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--se-dim)' }}>
              {(baseBlock._baseSegments ?? []).length || 1} portion{((baseBlock._baseSegments ?? []).length || 1) > 1 ? 's' : ''} · {fmtDur(baseBlock.durationMin)}
            </p>
          </div>
          <button type="button" onClick={() => bumpBaseWatts(-5)} aria-label="Baisser la puissance du fond" style={stepBtn}>−</button>
          <span className="se-tnum" data-testid="base-z2-watts" style={{ fontSize: 15, fontWeight: 600, color: 'var(--se-text)', minWidth: 52, textAlign: 'center' }}>{baseWatts} W</span>
          <button type="button" onClick={() => bumpBaseWatts(5)} aria-label="Augmenter la puissance du fond" style={stepBtn}>+</button>
        </div>
      )}

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

      {/* Boutons d'ajout — natation : 3e bouton « Hypoxie » ; course (extérieur) :
          3e bouton « Progressif » (allure croissante palier par palier). */}
      <div style={{ display: 'grid', gridTemplateColumns: (isSwim || (isRun && !isTreadmill)) ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => add(newSingle(sport, runningSub === 'treadmill'))} style={addBtn}><IconPlus size={15} /> {tr('planning.simpleBlock')}</button>
        <button type="button" onClick={() => add(newInterval(sport, runningSub === 'treadmill'))} style={addBtn}><IconRefresh size={15} /> {isSwim ? tr('planning.series') : tr('planning.interval')}</button>
        {isSwim && <button type="button" onClick={() => add(newHypoxie())} style={addBtn}><IconLungs size={15} /> {tr('planning.hypoxie')}</button>}
        {isRun && !isTreadmill && <button type="button" onClick={() => add(newProgressive(sport))} style={addBtn}><IconTrendingUp size={15} /> {tr('planning.progressive')}</button>}
      </div>

      {/* Résumé live (manuel) : durée + intensité moyenne — tapis : km, D+, allure, VAP */}
      {builderTab !== 'ai' && <EnduranceLiveSummary sport={sport} runningSub={runningSub} blocks={blocks} />}

      {/* IA : champ d'écriture → génération des blocs d'intensité */}
      {builderTab === 'ai' && (
        <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--se-rule)', borderRadius: 'var(--se-r)' }}>
          <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: accent }}>
            <IconSparkles size={15} /> {tr('planning.aiDescribeSession')}
          </p>
          <div style={{ position: 'relative' }}>
            <textarea
              value={aiPrompt}
              onChange={e => { setAiPrompt(e.target.value); if (aiError) setAiError(null) }}
              rows={4}
              placeholder={sport === 'bike' ? tr('planning.aiPlaceholderBike') : tr('planning.aiPlaceholderDefault')}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card2)', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', color: 'var(--se-text)', padding: '12px 40px 12px 12px', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
            />
            {/* Dictée : VoiceOverlay → le texte transcrit s'écrit en direct dans le champ */}
            <button type="button" onClick={() => { voiceBaseRef.current = aiPrompt; setVoiceOpen(true) }} aria-label={tr('planning.aiDescribeSession')}
              style={{ position: 'absolute', right: 8, bottom: 12, border: 'none', background: 'transparent', color: accent, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <IconMicrophone size={18} />
            </button>
          </div>
          <button type="button" onClick={() => void generate()} disabled={aiLoading || !aiPrompt.trim()}
            style={{ marginTop: 8, width: '100%', padding: 12, borderRadius: 'var(--se-r)', border: 'none', background: aiLoading ? 'var(--se-rule)' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: aiLoading || !aiPrompt.trim() ? 'default' : 'pointer', opacity: !aiPrompt.trim() ? 0.5 : 1 }}>
            {aiLoading ? tr('planning.generating') : tr('planning.generateBlocks')}
          </button>
          {aiError && (
            <p style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, lineHeight: 1.4 }}>{aiError}</p>
          )}
          {/* Résumé live sous « Générer les blocs » : dès qu'il y a des blocs,
              leurs stats ; SINON, estimation EN DIRECT du texte tapé (parseur
              client, zéro IA) — durée/vitesse/allure évoluent pendant la frappe. */}
          {(() => {
            const typedBlocks = blocks.length === 0 ? parseSessionText(aiPrompt, sport, runningSub) : []
            const useTyped = blocks.length === 0 && typedBlocks.length > 0
            return (
              <>
                <EnduranceLiveSummary sport={sport} runningSub={runningSub} blocks={useTyped ? typedBlocks : blocks} />
                {useTyped && (
                  <p style={{ margin: '4px 2px 0', fontSize: 10.5, color: 'var(--se-dim)' }}>{tr('planning.liveEstimate')}</p>
                )}
              </>
            )
          })()}
        </div>
      )}

      {voiceOpen && (
        <VoiceOverlay
          isDesktop={typeof window !== 'undefined' && window.innerWidth >= 1024}
          onLiveText={txt => { const base = voiceBaseRef.current; setAiPrompt(txt ? (base ? base.trimEnd() + ' ' : '') + txt : base) }}
          onConfirm={txt => { const base = voiceBaseRef.current; setAiPrompt(txt ? (base ? base.trimEnd() + ' ' : '') + txt.trim() : base); setVoiceOpen(false) }}
          onCancel={() => { setAiPrompt(voiceBaseRef.current); setVoiceOpen(false) }}
        />
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
              {onParcoursRemove && (
                <button type="button" onClick={onParcoursRemove} aria-label={tr('planning.removeParcours')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}><IconX size={15} /></button>
              )}
            </div>
            <ParcoursViewer
              data={parcoursData}
              portions={parcoursPortions}
              sequencing={sport === 'bike' ? {
                riderKg: riderKg ?? 75,
                bikeKg: bikeKg ?? 8,
                defaultWatts: refs.ftp ? Math.round(refs.ftp * 0.75 / 5) * 5 : 200,
                intervalWatts: refs.ftp ? Math.round(refs.ftp * 1.08 / 5) * 5 : 280,
                recoveryWatts: baseWatts || enduranceZ2Watts(refs.ftp),
                colorForWatts,
                onAddBlock: p => {
                  const id = `pc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
                  onChange([...blocks, blockFromPortion(p, id)])
                },
                onUpdateBlock: p => {
                  if (!p.id) return
                  onChange(blocks.map(b => b.id === p.id ? blockFromPortion(p, p.id as string) : b))
                },
                onRemoveBlock: id => {
                  onChange(blocks.filter(b => b.id !== id))
                  if (openId === id) setOpenId(null)
                },
              } : undefined}
            />
          </div>
        ) : (
          <button type="button" onClick={() => parcoursInputRef.current?.click()} style={addBtn}>
            <IconMapPin size={15} /> {tr('planning.addParcours')}
          </button>
        )}
        <input ref={parcoursInputRef} type="file" accept=".gpx,.tcx,.kml" style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) {
              // Persistance : le parent parse + stocke dans la séance (parcours_data).
              if (onParcoursFile) { onParcoursFile(f); setParcoursFile(null) }
              else setParcoursFile(f)
            }
            e.target.value = ''
          }} />
      </div>
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
  border: '1px solid var(--se-rule)', background: 'transparent',
  color: 'var(--se-text)', fontSize: 16, fontWeight: 600, lineHeight: 1, cursor: 'pointer',
}

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '12px', borderRadius: 'var(--se-r)', border: '1px dashed var(--se-rule)',
  background: 'transparent', color: 'var(--se-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
