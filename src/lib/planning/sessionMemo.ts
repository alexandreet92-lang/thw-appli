// ══════════════════════════════════════════════════════════════════
// Mémo de séance IMPRIMABLE — « antisèche » qu'on imprime, apprend et
// emporte pour exécuter la séance sans écran.
//  • Endurance (vélo / course / natation / aviron) : UNE LIGNE PAR BLOC.
//    Pour le VÉLO, une bande fine « tube de cadre » à découper en plus.
//  • Force / Hyrox : circuits (plusieurs exercices répétés en tours).
// Génère un document HTML autonome, optimisé papier (noir sur blanc,
// gros caractères, A4). Aucune donnée fabriquée : seuls les champs
// réellement renseignés sont imprimés.
// ══════════════════════════════════════════════════════════════════

import type { Block, SportType } from '@/app/planning/page'
import type { ExerciseItem, ExoCircuit } from '@/components/planning/exercises'
import { totalMin, totalDistance, toBars, treadmillGainM, blockDistanceM, durFromDistance, effortDistanceM, type MBlock } from '@/components/planning/mobile/blocks'
import { paceToSec, secToPace } from '@/components/planning/mobile/editorial'

export interface SessionMemoParams {
  title:       string
  sport:       SportType
  sportLabel:  string
  subtitle:    string            // types d'entraînement, ex. "EF + Seuil"
  totalMin:    number
  tss?:        number | null
  rpe?:        number | null
  blocks:      Block[]
  exercises:   ExerciseItem[]
  circuits:    ExoCircuit[]
  circuitMap:  Record<string, string>   // exerciseId → circuitId
  runningSub?: string                    // 'treadmill' → D+ / VAP dispo
  generatedOn: string
}

// Zones 1-7 : couleur (bande latérale) + libellé texte (lisible en N&B).
const ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444', '#c026d3', '#7c3aed']
const ZONE_NAMES  = ['Récup', 'Endurance', 'Tempo', 'Seuil', 'VO2max', 'Anaérobie', 'Sprint']

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtMin(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

function fmtSec(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return ''
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Durée d'un intervalle LISIBLE — jamais "2.8'" (aberrant). Rendus :
//   30''  ·  1'30  ·  2'08  ·  1h05
function fmtIntervalTime(min: number | null | undefined): string {
  if (min == null || !isFinite(min) || min <= 0) return ''
  const total = Math.round(min * 60)
  if (total < 60) return `${total}''`
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return s ? `${m}'${String(s).padStart(2, '0')}` : `${m}'`
}

// Distance courte lisible : "800 m" / "1,2 km" / "5 km".
function fmtDistShort(m: number | null | undefined): string {
  if (!m || m <= 0) return ''
  if (m < 1000) return `${Math.round(m)} m`
  const km = m / 1000
  const s = Number.isInteger(km) ? String(km) : km.toFixed(km < 10 ? 2 : 1)
  return `${s.replace('.', ',')} km`
}

const isEndurance = (s: SportType) => ['bike', 'run', 'swim', 'rowing', 'elliptique'].includes(s)
const isStrength  = (s: SportType) => s === 'gym' || s === 'hyrox'

// Cible d'un bloc (watts vélo, allure course/natation, %VMA…). `value` est déjà
// mis en forme par le builder ; on ajoute juste l'unité manquante évidente.
function blockTarget(sport: SportType, b: Block): string {
  const eu = (b as MBlock).effortUnit
  const v = (b.value || '').trim()
  // Elliptique : niveau machine + zone (jamais d'allure /km).
  if (sport === 'elliptique') {
    if (eu === 'watts' && /^\d+$/.test(v)) return `${v} W`
    const lvl = (b as MBlock).machineLevel
    return lvl ? `Niv. ${lvl} · Z${b.zone}` : `Z${b.zone}`
  }
  if (!v) return ''
  if ((sport === 'bike' || eu === 'watts') && /^\d+$/.test(v)) return `${v} W`
  if (sport === 'run'  && /^\d{1,2}:\d{2}$/.test(v)) return `${v}/km`
  if (sport === 'swim' && /^\d{1,2}:\d{2}$/.test(v)) return `${v}/100m`
  if (sport === 'rowing' && /^\d{1,2}:\d{2}$/.test(v)) return `${v}/500m`
  return v
}

// Structure d'un bloc : « N × 800 m » (distance) ou « N × 8' » (temps) ou durée
// simple. RÈGLE : un bloc en mode DISTANCE s'affiche en DISTANCE, jamais converti
// en minutes décimales (fini le « 1 × 2.8' » qui n'avait aucun sens).
function blockStructure(sport: SportType, b: Block): string {
  const mb = b as MBlock
  const isDist = mb.inputMode === 'distance' && (mb.distanceM ?? 0) > 0
  if (b.mode === 'interval' && b.reps) {
    const per = isDist ? fmtDistShort(mb.distanceM) : fmtIntervalTime(b.effortMin)
    return `${b.reps} × ${per || '—'}`
  }
  if (isDist) return fmtDistShort(mb.distanceM)
  return fmtMin(b.durationMin)
}

// Estimation complémentaire par répétition : le TEMPS pour un bloc en distance
// (« ≈ 2'48 » d'après l'allure) ou la DISTANCE pour un bloc au temps (« ≈ 2,3 km »).
function blockEstimate(sport: SportType, b: Block): string {
  const mb = b as MBlock
  if (!['run', 'swim', 'rowing'].includes(sport)) return ''   // pas d'allure /km au vélo
  const pace = (b.value || '').trim()
  if (!/^\d{1,2}:\d{2}$/.test(pace)) return ''
  const isDist = mb.inputMode === 'distance' && (mb.distanceM ?? 0) > 0
  if (isDist) {
    const t = durFromDistance(sport, mb.distanceM ?? 0, pace)   // minutes
    const lbl = fmtIntervalTime(t)
    return lbl ? `≈ ${lbl}` : ''
  }
  const min = b.mode === 'interval' ? (b.effortMin ?? 0) : b.durationMin
  const m = effortDistanceM(sport, mb.effortUnit, pace, min)
  const lbl = fmtDistShort(m)
  return lbl ? `≈ ${lbl}` : ''
}

// Récup d'un intervalle : « récup 1'30 trot » / « récup 200 m » / « récup 1'30 @6:00/km ».
function recupLabel(b: Block): string {
  const mb = b as MBlock
  if (b.mode !== 'interval') return ''
  let amount = ''
  if ((mb.recoveryDistanceM ?? 0) > 0) amount = fmtDistShort(mb.recoveryDistanceM)
  else if ((b.recoveryMin ?? 0) > 0) amount = fmtIntervalTime(b.recoveryMin)
  if (!amount) return ''
  const style = mb.recoveryStyle === 'marche' ? 'marche' : mb.recoveryStyle === 'trot' ? 'trot' : ''
  const active = (b.recoveryValue || '').trim()
  const paceBit = /^\d{1,2}:\d{2}$/.test(active) ? `@${active}/km` : ''
  return `récup ${amount}${style ? ` ${style}` : ''}${paceBit ? ` ${paceBit}` : ''}`
}

// Aller-retour (navette course) : « ↔ aller-retour · 4 × 50 m ».
function shuttleLabel(b: Block): string {
  const mb = b as MBlock
  const leg = mb.shuttleLegM ?? 0
  const dist = mb.distanceM ?? 0
  if (leg <= 0 || dist <= 0) return ''
  const segs = Math.max(2, Math.round(dist / leg))
  return `↔ aller-retour · ${segs} × ${leg} m`
}

// Distance d'un bloc (mesurée ou dérivée durée×allure) → « 400 m » / « 2,5 km ».
function blockDistanceLabel(sport: SportType, b: Block): string {
  const m = blockDistanceM(sport, b as MBlock)
  if (!m || m <= 0) return ''
  return sport === 'swim' ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2).replace('.', ',')} km`
}

// ── Bloc endurance → ligne du mémo ─────────────────────────────────
function enduranceRows(sport: SportType, blocks: Block[]): string {
  return blocks.map((b, i) => {
    const zi = Math.min(6, Math.max(0, (b.zone || 1) - 1))
    const col = ZONE_COLORS[zi]
    const target = blockTarget(sport, b)
    const hr = (b.hrAvg || '').trim()
    const incl = b.inclinePct && b.inclinePct > 0 ? ` · ${b.inclinePct}%` : ''
    // Distance (course / natation / aviron) : TOUJOURS affichée sous la zone.
    const distLbl = blockDistanceLabel(sport, b)
    // Natation : matériel du bloc (pull buoy, planche, plaquettes, palmes).
    const equipment = (b as MBlock).equipment ?? []
    const equipHtml = equipment.length
      ? `<div class="row-equip">${equipment.map(e => `<span class="chip">${esc(e)}</span>`).join('')}</div>`
      : ''
    // Natation hypoxie : consigne de respiration.
    const hyp = (b as MBlock).hypoxie
    const hypLbl = hyp ? (hyp.mode === 'strokes' ? `Hypoxie · resp. tous les ${hyp.breathEvery ?? 6} coups` : 'Hypoxie · apnée') : ''
    // Compléments : temps/distance estimés, récup détaillée, aller-retour, cadence (vélo).
    const est = blockEstimate(sport, b)
    const recup = recupLabel(b)
    const shuttle = shuttleLabel(b)
    const cad = sport === 'bike' && ((b as MBlock).cadence || '').trim() ? `${((b as MBlock).cadence || '').trim()} rpm` : ''
    const subline = [`Z${b.zone} · ${ZONE_NAMES[zi]}`, distLbl, est, recup, shuttle, cad, esc(incl).trim(), hypLbl].filter(Boolean).join(' · ')
    return `<div class="row" style="border-left:6px solid ${col}">
      <div class="row-n">${i + 1}</div>
      <div class="row-main">
        <div class="row-label">${esc(b.label || `Bloc ${i + 1}`)}</div>
        <div class="row-zone">${subline}</div>
        ${equipHtml}
      </div>
      <div class="row-dur">${esc(blockStructure(sport, b))}</div>
      <div class="row-target">${esc(target || '—')}</div>
      <div class="row-hr">${hr ? `♥ ${esc(hr)}` : ''}</div>
      <label class="done" title="Cocher quand le bloc est terminé"><input type="checkbox"><span class="box"></span></label>
    </div>`
  }).join('')
}

// Synthèse endurance PRÉVUE : km, D+ (tapis), allure moyenne, VAP (course tapis),
// watts moyens (vélo). Alimente l'en-tête du mémo.
function enduranceSummary(sport: SportType, blocks: Block[], runningSub?: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  const mb = blocks as MBlock[]
  const min = totalMin(mb)
  const distM = totalDistance(mb, sport)
  const isPower = sport === 'bike' || sport === 'elliptique'
  const isTreadmill = sport === 'run' && runningSub === 'treadmill'
  if (distM > 0) out.push({ label: sport === 'swim' ? 'Distance' : 'km prévus', value: sport === 'swim' ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1).replace('.', ',')} km` })
  // D+ prévu (tapis : pente cumulée).
  if (isTreadmill) { const dplus = treadmillGainM(mb); if (dplus > 0) out.push({ label: 'D+ prévu', value: `${dplus} m` }) }
  // Intensité moyenne pondérée par la durée des barres.
  let num = 0, den = 0
  for (const bar of toBars(mb)) {
    if (!bar.min || bar.min <= 0) continue
    if (isPower) { const w = parseFloat(bar.value ?? ''); if (isFinite(w) && w > 0) { num += w * bar.min; den += bar.min } }
    else { const p = paceToSec(bar.value ?? ''); if (!isNaN(p) && p > 0) { num += p * bar.min; den += bar.min } }
  }
  if (isPower) {
    if (den > 0) out.push({ label: 'Watts moy', value: `${Math.round(num / den)} W` })
  } else if (sport === 'run' || sport === 'swim' || sport === 'rowing') {
    const unit = sport === 'swim' ? '/100m' : sport === 'rowing' ? '/500m' : '/km'
    let paceS = den > 0 ? num / den : 0
    if (paceS <= 0 && distM > 0 && min > 0) paceS = (min * 60) / (distM / (sport === 'swim' ? 100 : sport === 'rowing' ? 500 : 1000))
    if (paceS > 0) out.push({ label: 'Allure moy', value: `${secToPace(paceS)}${unit}` })
    // VAP (course tapis) : allure ajustée pente = temps / distance équivalente plat.
    if (isTreadmill) {
      const dplus = treadmillGainM(mb)
      const eqDistM = distM + 8 * dplus   // ~8 m plat par m de D+
      if (eqDistM > 0 && min > 0) out.push({ label: 'VAP', value: `${secToPace((min * 60) / (eqDistM / 1000))}/km` })
    }
  }
  return out
}

// ── Bande « tube de cadre » (vélo) — à découper, une ligne par bloc ─
function bikeStrip(blocks: Block[]): string {
  const lines = blocks.map((b, i) => {
    const zi = Math.min(6, Math.max(0, (b.zone || 1) - 1))
    const col = ZONE_COLORS[zi]
    const target = blockTarget('bike', b)
    return `<div class="strip-row" style="border-left:5px solid ${col}">
      <span class="strip-dur">${esc(blockStructure('bike', b))}</span>
      <span class="strip-target">${esc(target || `Z${b.zone}`)}</span>
      <span class="strip-z">Z${b.zone}</span>
    </div>`
  }).join('')
  return `<div class="strip-wrap">
    <div class="strip-cut">✂ — — — à découper · à coller sur le tube du cadre — — —</div>
    <div class="strip">
      <div class="strip-head">MÉMO</div>
      ${lines}
    </div>
    <div class="strip-cut">✂ — — — — — — — — — — — — — — — — — — — — — — —</div>
  </div>`
}

// ── Force / Hyrox → circuits ───────────────────────────────────────
function circuitsBlocks(sport: SportType, exercises: ExerciseItem[], circuits: ExoCircuit[], map: Record<string, string>): string {
  const list = circuits.length ? circuits : [{ id: 'default', name: 'Circuit', type: 'series', rounds: 1, restBetweenRoundsSec: 0 } as ExoCircuit]
  return list.map((c, ci) => {
    const exos = exercises.filter(e => (map[e.id] ?? 'default') === c.id)
    if (!exos.length) return ''
    const rounds = Math.max(1, c.rounds || 1)
    const tt = fmtSec(c.targetTimeSec)
    const rest = c.restBetweenRoundsSec ? `R ${c.restBetweenRoundsSec}s entre tours` : ''
    const meta = [tt && `objectif ${tt}`, rest].filter(Boolean).join(' · ')
    // Colonnes de pointage : une case à cocher par tour.
    const ticks = Array.from({ length: Math.min(rounds, 8) }, () => '<span class="tick"></span>').join('')
    const rowsHtml = exos.map((e) => {
      let detail: string
      if (sport === 'hyrox' || e.category === 'hyrox') {
        const amt = e.distanceM ? `${e.distanceM} m` : `${e.reps} reps`
        detail = `${amt}${e.targetTimeSec ? ` · ${fmtSec(e.targetTimeSec)}` : ''}`
      } else {
        const w = e.weightKg ? ` · ${e.weightKg} kg` : ''
        const r = e.restSec ? ` · R ${e.restSec}s` : ''
        // Exercice au temps (gainage…) → « N × 45s » plutôt que « N × 1 rep ».
        const core = e.targetTimeSec && e.targetTimeSec > 0 && e.reps <= 1
          ? `${e.sets} × ${e.targetTimeSec}s`
          : `${e.sets} × ${e.reps}`
        detail = `${core}${w}${r}`
      }
      return `<div class="exo">
        <div class="exo-name">${esc(e.name)}</div>
        <div class="exo-detail">${esc(detail)}</div>
        <div class="exo-ticks">${ticks}</div>
      </div>`
    }).join('')
    return `<div class="circuit">
      <div class="circuit-head">
        <span class="circuit-title">${esc(c.name || `Circuit ${ci + 1}`)}</span>
        <span class="circuit-rounds">× ${rounds} tour${rounds > 1 ? 's' : ''}</span>
        ${meta ? `<span class="circuit-meta">${esc(meta)}</span>` : ''}
      </div>
      ${rowsHtml}
    </div>`
  }).join('')
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a0a0a;background:#fff;padding:0}
.sheet{max-width:190mm;margin:0 auto;padding:14mm 12mm}
.hd{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0a0a0a;padding-bottom:12px;margin-bottom:6px}
.hd h1{font-family:'Syne','DM Sans',sans-serif;font-size:30px;font-weight:800;letter-spacing:-0.03em;line-height:1.05}
.hd .sub{font-size:13px;color:#555;margin-top:3px;font-weight:600}
.hd .meta{text-align:right;font-size:12px;color:#333;white-space:nowrap;padding-top:4px}
.hd .meta b{font-size:22px;font-weight:800;display:block;font-variant-numeric:tabular-nums}
.legend{font-size:10px;color:#888;margin:8px 0 14px;letter-spacing:0.02em}
/* Endurance rows */
.row{display:flex;align-items:center;gap:12px;padding:11px 12px;background:#fafafa;border-radius:8px;margin-bottom:7px;page-break-inside:avoid}
.row-n{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:#bbb;width:22px;text-align:center;flex-shrink:0}
.row-main{flex:1;min-width:0}
.row-label{font-size:15px;font-weight:700;line-height:1.2}
.row-zone{font-size:11px;color:#666;font-weight:600;margin-top:1px}
.row-equip{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.chip{font-size:10px;font-weight:700;color:#0a0a0a;background:#eef2f6;border:1px solid #d5dbe2;border-radius:5px;padding:1px 6px}
.row-dur{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0}
.row-target{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;min-width:78px;text-align:right;flex-shrink:0}
.row-hr{font-size:13px;font-weight:700;color:#e11d48;min-width:56px;text-align:right;flex-shrink:0}
/* Case « terminé » (une par bloc) — interactive à l'écran, imprimable vide au stylo */
.done{flex-shrink:0;cursor:pointer;display:inline-flex;align-items:center}
.done input{position:absolute;opacity:0;width:0;height:0}
.done .box{width:20px;height:20px;border:2px solid #999;border-radius:5px;display:inline-block;position:relative}
.done input:checked + .box{background:#0a0a0a;border-color:#0a0a0a}
.done input:checked + .box::after{content:'';position:absolute;left:6px;top:2px;width:5px;height:10px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
/* Circuits */
.circuit{border:1.5px solid #111;border-radius:10px;margin-bottom:12px;overflow:hidden;page-break-inside:avoid}
.circuit-head{background:#111;color:#fff;padding:9px 13px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.circuit-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;letter-spacing:0.01em}
.circuit-rounds{font-size:14px;font-weight:800;color:#7dd3fc}
.circuit-meta{font-size:11px;color:#cbd5e1;font-weight:600}
.exo{display:flex;align-items:center;gap:12px;padding:9px 13px;border-top:1px solid #eee}
.exo:first-of-type{border-top:none}
.exo-name{flex:1;font-size:14.5px;font-weight:700}
.exo-detail{font-size:14px;font-weight:600;color:#333;font-variant-numeric:tabular-nums;white-space:nowrap}
.exo-ticks{display:flex;gap:5px;flex-shrink:0}
.tick{width:16px;height:16px;border:1.5px solid #999;border-radius:4px;display:inline-block}
/* Bike strip */
.strip-wrap{margin-top:20px;page-break-inside:avoid}
.strip-cut{font-size:9px;color:#999;letter-spacing:1px;margin:6px 0;font-family:monospace}
.strip{width:56mm;border:1.5px dashed #999;border-radius:8px;padding:8px 8px 10px}
.strip-head{font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-align:center;color:#888;margin-bottom:8px}
.strip-row{display:flex;align-items:baseline;gap:6px;padding:6px 6px;margin-bottom:4px;background:#f7f7f7;border-radius:5px}
.strip-dur{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}
.strip-target{flex:1;font-size:15px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.strip-z{font-size:10px;font-weight:800;color:#666;width:20px;text-align:right}
.ft{margin-top:26px;border-top:1px solid #ddd;padding-top:10px;font-size:10px;color:#aaa}
.empty{font-size:14px;color:#888;padding:24px 0}
@page{size:A4;margin:0}
@media print{.no-print{display:none}}
`

export function buildSessionMemoHtml(p: SessionMemoParams): string {
  const title = p.title || p.sportLabel
  const metaBits: string[] = [`<span><b>${fmtMin(p.totalMin)}</b>durée</span>`]
  if (p.tss != null && p.tss > 0)  metaBits.push(`<span><b>${Math.round(p.tss)}</b>TSS</span>`)
  if (p.rpe != null && p.rpe > 0)  metaBits.push(`<span><b>${p.rpe}/10</b>RPE</span>`)

  // Endurance : bandeau de synthèse PRÉVUE (km, D+, allure, VAP, watts).
  if (isEndurance(p.sport) && p.blocks.length) {
    for (const s of enduranceSummary(p.sport, p.blocks, p.runningSub)) {
      metaBits.push(`<span><b>${esc(s.value)}</b>${esc(s.label)}</span>`)
    }
  }

  let body = ''
  let legend = ''
  if (isStrength(p.sport)) {
    const c = circuitsBlocks(p.sport, p.exercises, p.circuits, p.circuitMap)
    body = c || '<div class="empty">Aucun exercice — ajoute des exercices à la séance.</div>'
    legend = 'Coche une case par tour réalisé.'
  } else if (isEndurance(p.sport)) {
    if (p.blocks.length) {
      body = enduranceRows(p.sport, p.blocks)
      legend = 'Une ligne = un bloc, dans l\'ordre. Bande de couleur = zone d\'intensité. Coche la case quand le bloc est terminé.'
      if (p.sport === 'bike') body += bikeStrip(p.blocks)
    } else {
      body = '<div class="empty">Aucun bloc — ajoute des blocs d\'intensité à la séance.</div>'
    }
  } else {
    // Hybrid / Boxe : repli sur les blocs s'il y en a.
    body = p.blocks.length
      ? enduranceRows(p.sport, p.blocks)
      : '<div class="empty">Séance sans structure imprimable.</div>'
  }

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Mémo</title><style>${CSS}</style></head>
<body><div class="sheet">
  <div class="hd">
    <div>
      <h1>${esc(title)}</h1>
      <div class="sub">${esc(p.sportLabel)}${p.subtitle ? ` · ${esc(p.subtitle)}` : ''}</div>
    </div>
    <div class="meta">${metaBits.join('')}</div>
  </div>
  ${legend ? `<div class="legend">${esc(legend)}</div>` : ''}
  ${body}
  <div class="ft">THW Coaching · Mémo de séance · ${esc(p.generatedOn)}</div>
</div></body></html>`
}
