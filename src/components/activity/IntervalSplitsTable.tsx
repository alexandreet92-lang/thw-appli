'use client'
// ══════════════════════════════════════════════════════════════════
// IntervalSplitsTable — comparatif par intervalles de temps (vélo 30 min/1 h,
// course 15/30 min). Objectif : voir si l'athlète s'affaiblit au fil de
// l'effort (dérive FC, découplage P/FC, allure), en gardant sous les yeux
// les facteurs externes (température, altitude).
//  • Vélo  : km, D+, D−, W moy, NP, roue libre, temp (moy+max), alt (moy+max),
//            FC (moy+max), découplage P/FC (% vs 1er intervalle, jamais négatif).
//  • Course: km, D+, D−, alt (moy+max), temp (moy+max), allure, VAP (allure
//            ajustée pente, facteur Minetti comme le GAP chart), FC (moy+max).
// Dérive colorée (stable/ambre/rouge), flèches de tendance, ligne de contexte,
// bouton « Faire analyser par l'IA » (+ historique EF des sorties comparables).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { AIBubble } from './AIBubble'
import type { AIStatus } from '@/hooks/useAIAnalysis'

interface SplitStreams {
  time?: number[]; distance?: number[]; altitude?: number[]; heartrate?: number[]
  velocity?: number[]; watts?: number[]; cadence?: number[]; temp?: number[]
}
export interface HistoryEF { date: string; ef: number }
interface AIHandle { status: AIStatus; text: string; run: (systemPrompt: string, userMessage?: string) => void; reset: () => void }

interface Props {
  streams: SplitStreams
  sport: 'bike' | 'run'
  activityLabel: string
  historyEF?: HistoryEF[]
  ai?: AIHandle
}

interface SplitRow {
  label: string            // « 0:00 – 0:30 »
  durS: number
  distKm: number | null
  dPlus: number
  dMinus: number
  avgW: number | null
  np: number | null
  coastS: number | null
  tempAvg: number | null
  tempMax: number | null
  altAvg: number | null
  altMax: number | null
  hrAvg: number | null
  hrMax: number | null
  paceS: number | null     // s/km (course)
  vapS: number | null      // s/km ajustée pente (course)
  ef: number | null        // vélo : (NP ?? W moy) / FC
  decoupPct: number | null // vs intervalle 1, jamais négatif
}

const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `0:${String(m).padStart(2, '0')}`
}
const fmtPace = (s: number | null) => {
  if (s == null || !isFinite(s) || s <= 0) return '—'
  const m = Math.floor(s / 60), sec = Math.round(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
const fmtDurShort = (s: number) => {
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`
}

function smoothArr(a: number[], half: number): number[] {
  return a.map((_, i) => {
    let s = 0, n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(a.length - 1, i + half); j++) { s += a[j]; n++ }
    return s / n
  })
}

function computeSplits(streams: SplitStreams, intervalS: number, sport: 'bike' | 'run'): SplitRow[] {
  const time = streams.time
  const n = Math.max(
    streams.watts?.length ?? 0, streams.heartrate?.length ?? 0, streams.distance?.length ?? 0,
    streams.altitude?.length ?? 0, streams.velocity?.length ?? 0, time?.length ?? 0,
  )
  if (n < 60) return []
  const tAt = (i: number) => time?.[i] ?? i          // sans stream time : 1 échantillon = 1 s
  const total = tAt(n - 1)
  if (total < intervalS * 0.5) return []

  const altSm = streams.altitude?.length ? smoothArr(streams.altitude, 5) : null

  const nb = Math.max(1, Math.ceil(total / intervalS))
  interface Acc {
    i0: number; i1: number
    sw: number; cw: number; whs: number[]
    shr: number; chr: number; mhr: number
    st: number; ct: number; mt: number
    sa: number; ca: number; ma: number
    dPlus: number; dMinus: number; coast: number; adjDist: number
  }
  const acc: Acc[] = Array.from({ length: nb }, () => ({
    i0: -1, i1: -1, sw: 0, cw: 0, whs: [], shr: 0, chr: 0, mhr: 0,
    st: 0, ct: 0, mt: -Infinity, sa: 0, ca: 0, ma: -Infinity,
    dPlus: 0, dMinus: 0, coast: 0, adjDist: 0,
  }))

  for (let i = 0; i < n; i++) {
    const b = Math.min(nb - 1, Math.floor(tAt(i) / intervalS))
    const A = acc[b]
    if (A.i0 === -1) A.i0 = i
    A.i1 = i
    const w = streams.watts?.[i]
    if (w != null && isFinite(w)) { A.sw += w; A.cw++; A.whs.push(w) }
    const hr = streams.heartrate?.[i]
    if (hr != null && hr > 40) { A.shr += hr; A.chr++; if (hr > A.mhr) A.mhr = hr }
    const tp = streams.temp?.[i]
    if (tp != null && isFinite(tp)) { A.st += tp; A.ct++; if (tp > A.mt) A.mt = tp }
    const al = altSm?.[i]
    if (al != null && isFinite(al)) { A.sa += al; A.ca++; if (al > A.ma) A.ma = al }
    if (i > 0) {
      const dt = Math.min(10, Math.max(0, tAt(i) - tAt(i - 1)))
      // D+ / D− (altitude lissée)
      if (altSm && altSm[i] != null && altSm[i - 1] != null) {
        const dA = altSm[i] - altSm[i - 1]
        if (dA > 0) A.dPlus += dA; else A.dMinus += -dA
      }
      // Roue libre : cadence 0 (plus de puissance) en mouvement — même règle que la fiche.
      const cad = streams.cadence?.[i], vel = streams.velocity?.[i]
      if (cad != null && vel != null && vel > 0.5 && cad === 0) A.coast += dt
      // Distance équivalente plat (VAP) : facteur Minetti (identique au GAP chart)
      const d0 = streams.distance?.[i - 1], d1 = streams.distance?.[i]
      if (d0 != null && d1 != null && d1 > d0) {
        const dDist = d1 - d0
        let g = 0
        if (altSm && dDist > 0.5) g = Math.max(-0.45, Math.min(0.45, (altSm[i] - altSm[i - 1]) / dDist))
        const factor = 1 + g * (0.033 * Math.abs(g) * 1000 + 0.133)
        A.adjDist += dDist * Math.max(0.5, factor)
      }
    }
  }

  const rows: SplitRow[] = []
  for (let b = 0; b < nb; b++) {
    const A = acc[b]
    if (A.i0 === -1) continue
    const t0 = b * intervalS
    const t1 = Math.min(total, (b + 1) * intervalS)
    const durS = t1 - t0
    if (durS < 30) continue
    const d0 = streams.distance?.[A.i0], d1 = streams.distance?.[A.i1]
    const distM = d0 != null && d1 != null ? Math.max(0, d1 - d0) : null
    const avgW = A.cw > 0 ? A.sw / A.cw : null
    // NP du segment : moyennes glissantes 30 s ^4 (échantillons ~1 Hz)
    let np: number | null = null
    if (A.whs.length >= 60) {
      const roll: number[] = []
      let s = 0
      for (let i = 0; i < A.whs.length; i++) {
        s += A.whs[i]
        if (i >= 30) s -= A.whs[i - 30]
        if (i >= 29) roll.push(s / 30)
      }
      if (roll.length) np = Math.round(Math.pow(roll.reduce((x, y) => x + Math.pow(y, 4), 0) / roll.length, 0.25))
    }
    const hrAvg = A.chr > 0 ? A.shr / A.chr : null
    const ef = sport === 'bike' && hrAvg && hrAvg > 0 && (np ?? avgW) != null ? ((np ?? avgW)! / hrAvg) : null
    const distKm = distM != null ? distM / 1000 : null
    rows.push({
      label: `${fmtClock(t0)} – ${fmtClock(t1)}`,
      durS,
      distKm,
      dPlus: Math.round(A.dPlus),
      dMinus: Math.round(A.dMinus),
      avgW: avgW != null ? Math.round(avgW) : null,
      np,
      coastS: streams.cadence && streams.velocity ? Math.round(A.coast) : null,
      tempAvg: A.ct > 0 ? A.st / A.ct : null,
      tempMax: A.ct > 0 && isFinite(A.mt) ? A.mt : null,
      altAvg: A.ca > 0 ? A.sa / A.ca : null,
      altMax: A.ca > 0 && isFinite(A.ma) ? A.ma : null,
      hrAvg: hrAvg != null ? Math.round(hrAvg) : null,
      hrMax: A.mhr > 0 ? A.mhr : null,
      paceS: distKm && distKm > 0.05 ? durS / distKm : null,
      vapS: A.adjDist > 50 ? durS / (A.adjDist / 1000) : null,
      ef,
      decoupPct: null,
    })
  }

  // Découplage P/FC : dérive vs 1er intervalle — ((EF1 − EFi) / EF1) × 100,
  // borné à 0 (le calcul de l'app ne produit jamais de valeur négative affichée).
  const ef1 = rows[0]?.ef ?? null
  if (sport === 'bike' && ef1 && ef1 > 0) {
    rows.forEach((r, i) => {
      if (i === 0) { r.decoupPct = 0; return }
      if (r.ef != null) r.decoupPct = Math.max(0, ((ef1 - r.ef) / ef1) * 100)
    })
  }
  return rows
}

// Couleur de dérive : vert stable, ambre > seuil doux, rouge > seuil fort.
function driftColor(pct: number | null, soft: number, hard: number): { color?: string; background?: string } {
  if (pct == null) return {}
  if (pct > hard) return { color: '#EF4444', background: 'rgba(239,68,68,0.08)' }
  if (pct > soft) return { color: '#F59E0B', background: 'rgba(245,158,11,0.10)' }
  return { color: '#10B981' }
}
// Flèche de tendance vs intervalle précédent (±2 %) — glyphes texte, pas d'emoji.
function trendArrow(cur: number | null, prev: number | null, higherIsBetter: boolean): { ch: string; color: string } | null {
  if (cur == null || prev == null || prev === 0) return null
  const d = (cur - prev) / prev
  if (Math.abs(d) < 0.02) return { ch: '→', color: 'var(--text-dim)' }
  const better = higherIsBetter ? d > 0 : d < 0
  return { ch: d > 0 ? '↑' : '↓', color: better ? '#10B981' : '#F59E0B' }
}

export function IntervalSplitsTable({ streams, sport, activityLabel, historyEF, ai }: Props) {
  const { t } = useI18n()
  const options = sport === 'bike'
    ? [{ label: '30 min', s: 1800 }, { label: '1 h', s: 3600 }]
    : [{ label: '15 min', s: 900 }, { label: '30 min', s: 1800 }]
  const [intervalS, setIntervalS] = useState(options[0].s)

  const rows = useMemo(() => computeSplits(streams, intervalS, sport), [streams, intervalS, sport])

  if (rows.length < 2) return null

  const first = rows[0]
  const last = rows[rows.length - 1]

  // Ligne de contexte : facteurs externes entre début et fin.
  const ctxParts: string[] = []
  if (first.tempAvg != null && last.tempAvg != null) {
    const d = last.tempAvg - first.tempAvg
    ctxParts.push(Math.abs(d) < 1.5 ? t('w3f.temp_stable') : t('w3f.temp_delta', { d: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}` }))
  }
  if (first.altAvg != null && last.altAvg != null) {
    const d = last.altAvg - first.altAvg
    ctxParts.push(Math.abs(d) < 40 ? t('w3f.alt_stable') : t('w3f.alt_delta', { d: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}` }))
  }

  // ── Prompt IA : le tableau + le contexte + l'historique comparable ──
  const buildPrompt = (): string => {
    const head = sport === 'bike'
      ? 'Intervalle | Km | D+ | D- | W moy | NP | Roue libre | Temp moy/max | Alt moy/max | FC moy/max | Découplage P/FC'
      : 'Intervalle | Km | D+ | D- | Alt moy/max | Temp moy/max | Allure | VAP | FC moy/max'
    const lines = rows.map(r => {
      const base = `${r.label} (${fmtDurShort(r.durS)})`
      if (sport === 'bike') {
        return `${base} | ${r.distKm?.toFixed(1) ?? '—'} | +${r.dPlus} | -${r.dMinus} | ${r.avgW ?? '—'} W | ${r.np ?? '—'} W | ${r.coastS != null ? fmtDurShort(r.coastS) : '—'} | ${r.tempAvg?.toFixed(0) ?? '—'}/${r.tempMax?.toFixed(0) ?? '—'} °C | ${r.altAvg?.toFixed(0) ?? '—'}/${r.altMax?.toFixed(0) ?? '—'} m | ${r.hrAvg ?? '—'}/${r.hrMax ?? '—'} bpm | ${r.decoupPct != null ? r.decoupPct.toFixed(1) + ' %' : '—'}`
      }
      return `${base} | ${r.distKm?.toFixed(1) ?? '—'} | +${r.dPlus} | -${r.dMinus} | ${r.altAvg?.toFixed(0) ?? '—'}/${r.altMax?.toFixed(0) ?? '—'} m | ${r.tempAvg?.toFixed(0) ?? '—'}/${r.tempMax?.toFixed(0) ?? '—'} °C | ${fmtPace(r.paceS)}/km | ${fmtPace(r.vapS)}/km | ${r.hrAvg ?? '—'}/${r.hrMax ?? '—'} bpm`
    })
    const hist = historyEF && historyEF.length >= 3
      ? `\n\nHistorique des sorties COMPARABLES (90 derniers jours, même sport et durée proche) — efficacité (${sport === 'bike' ? 'puissance/FC' : 'vitesse/FC'}) :\n` +
        historyEF.map(h => `- ${h.date} : EF ${h.ef.toFixed(3)}`).join('\n') +
        '\nCompare la tenue de cet effort à ces références : est-ce mieux ou moins bien que d\'habitude ?'
      : ''
    return `Tu es un coach d'endurance expert. Voici le comparatif par intervalles de ${fmtDurShort(intervalS)} de la sortie « ${activityLabel} » (${sport === 'bike' ? 'cyclisme' : 'course à pied'}) :\n\n${head}\n${lines.map(l => `- ${l}`).join('\n')}\n\nContexte : ${ctxParts.join(' · ') || 'aucun facteur externe notable'}.${hist}\n\nAnalyse la TENUE DE L'EFFORT dans le temps : l'athlète s'affaiblit-il au fil de la sortie ? Distingue ce qui vient des facteurs externes (chaleur, altitude, relief) de ce qui traduit un vrai manque d'endurance. Termine par un verdict clair (bonne caisse / dérive normale / manque d'endurance) et 1-2 conseils concrets. Réponds en français, 6-10 phrases, sans jargon inutile.`
  }

  // ── Styles ──────────────────────────────────────────────────
  const th: React.CSSProperties = { padding: '7px 10px', fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--border-mid)', fontFamily: 'var(--font-display)' }
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12, color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }
  const sub: React.CSSProperties = { fontSize: 9.5, color: 'var(--text-dim)', marginLeft: 4 }
  const sticky: React.CSSProperties = { position: 'sticky', left: 0, background: 'var(--bg-card)', textAlign: 'left', zIndex: 1 }

  const dualCell = (avg: number | null, max: number | null, unit: string, dec = 0) => (
    avg == null ? <span style={{ color: 'var(--text-dim)' }}>—</span> : (
      <>
        {avg.toFixed(dec)}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}> {unit}</span>
        {max != null && <span style={sub}>max {max.toFixed(dec)}</span>}
      </>
    )
  )

  return (
    <div style={{ marginBottom: 32, paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', fontFamily: 'var(--font-display)', flex: 1 }}>
          {t('w3f.intervals_comparison')}
        </div>
        {/* Toggle 30 min / 1 h (vélo) · 15 / 30 min (course) */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-alt)', borderRadius: 9, padding: 2 }}>
          {options.map(o => (
            <button key={o.s} onClick={() => setIntervalS(o.s)}
              style={{ padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)',
                background: intervalS === o.s ? 'var(--bg-card)' : 'transparent', color: intervalS === o.s ? 'var(--text)' : 'var(--text-dim)',
                boxShadow: intervalS === o.s ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border)', borderRadius: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: sport === 'bike' ? 860 : 700, background: 'var(--bg-card)' }}>
          <thead>
            <tr>
              <th style={{ ...th, ...sticky }}>{t('w3f.col_interval')}</th>
              <th style={th}>Km</th>
              <th style={th}>D+</th>
              <th style={th}>D−</th>
              {sport === 'bike' ? (<>
                <th style={th}>{t('w3f.col_wavg')}</th>
                <th style={th}>NP</th>
                <th style={th}>{t('w3f.col_coasting')}</th>
                <th style={th}>Temp</th>
                <th style={th}>{t('w3f.col_altitude')}</th>
                <th style={th}>{t('w3f.col_hr')}</th>
                <th style={th}>{t('w3f.col_decoupling')}</th>
              </>) : (<>
                <th style={th}>{t('w3f.col_altitude')}</th>
                <th style={th}>Temp</th>
                <th style={th}>{t('w3f.col_pace')}</th>
                <th style={th}>VAP</th>
                <th style={th}>{t('w3f.col_hr')}</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const prev = i > 0 ? rows[i - 1] : null
              const hrDrift = r.hrAvg != null && first.hrAvg ? ((r.hrAvg - first.hrAvg) / first.hrAvg) * 100 : null
              const hrStyle = i === 0 ? {} : driftColor(hrDrift, 5, 10)
              const decStyle = i === 0 ? {} : driftColor(r.decoupPct, 5, 10)
              const vapDrift = r.vapS != null && first.vapS ? ((r.vapS - first.vapS) / first.vapS) * 100 : null
              const vapStyle = i === 0 ? {} : driftColor(vapDrift, 5, 10)
              const wTrend = trendArrow(r.np ?? r.avgW, prev ? (prev.np ?? prev.avgW) : null, true)
              const paceTrend = trendArrow(r.vapS, prev?.vapS ?? null, false)
              const partial = r.durS < intervalS - 30
              return (
                <tr key={i}>
                  <td style={{ ...td, ...sticky, fontWeight: 700 }}>
                    {r.label}
                    {partial && <span style={sub}>({fmtDurShort(r.durS)})</span>}
                  </td>
                  <td style={td}>{r.distKm != null ? r.distKm.toFixed(1) : '—'}</td>
                  <td style={td}>{r.dPlus > 0 ? `+${r.dPlus} m` : '—'}</td>
                  <td style={td}>{r.dMinus > 0 ? `−${r.dMinus} m` : '—'}</td>
                  {sport === 'bike' ? (<>
                    <td style={td}>
                      {r.avgW != null ? <>{r.avgW}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}> W</span></> : '—'}
                      {wTrend && <span style={{ ...sub, color: wTrend.color, fontWeight: 700 }}>{wTrend.ch}</span>}
                    </td>
                    <td style={td}>{r.np != null ? <>{r.np}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}> W</span></> : '—'}</td>
                    <td style={td}>{r.coastS != null ? fmtDurShort(r.coastS) : '—'}</td>
                    <td style={td}>{dualCell(r.tempAvg, r.tempMax, '°C')}</td>
                    <td style={td}>{dualCell(r.altAvg, r.altMax, 'm')}</td>
                    <td style={{ ...td, ...hrStyle }}>
                      {r.hrAvg != null ? <>{r.hrAvg}<span style={{ fontSize: 10, opacity: 0.6 }}> bpm</span>{r.hrMax != null && <span style={sub}>max {r.hrMax}</span>}</> : '—'}
                    </td>
                    <td style={{ ...td, ...decStyle, fontWeight: 700 }}>
                      {i === 0 ? <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 600 }}>{t('w3f.ref')}</span>
                        : r.decoupPct != null ? `${r.decoupPct.toFixed(1)} %` : '—'}
                    </td>
                  </>) : (<>
                    <td style={td}>{dualCell(r.altAvg, r.altMax, 'm')}</td>
                    <td style={td}>{dualCell(r.tempAvg, r.tempMax, '°C')}</td>
                    <td style={td}>{fmtPace(r.paceS)}{r.paceS != null && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}> /km</span>}</td>
                    <td style={{ ...td, ...vapStyle }}>
                      {fmtPace(r.vapS)}{r.vapS != null && <span style={{ fontSize: 10, opacity: 0.6 }}> /km</span>}
                      {paceTrend && <span style={{ ...sub, color: paceTrend.color, fontWeight: 700 }}>{paceTrend.ch}</span>}
                    </td>
                    <td style={{ ...td, ...hrStyle }}>
                      {r.hrAvg != null ? <>{r.hrAvg}<span style={{ fontSize: 10, opacity: 0.6 }}> bpm</span>{r.hrMax != null && <span style={sub}>max {r.hrMax}</span>}</> : '—'}
                    </td>
                  </>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Contexte externe — ce que l'IA (et l'œil) doit garder en tête */}
      {ctxParts.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'var(--font-body)' }}>
          {t('w3f.context_label')}{ctxParts.join(' · ')}
        </div>
      )}

      {/* Analyse IA — masquée si aucune poignée IA (consultation lecture seule) */}
      {ai && (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => (ai.status === 'idle' || ai.status === 'done' || ai.status === 'error') ? ai.run(buildPrompt()) : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 15px', borderRadius: 20,
            border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--primary)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
          {ai.status === 'loading' || ai.status === 'streaming' ? t('w3f.analyzing') : t('w3f.analyze_ai')}
        </button>
        {ai.status !== 'idle' && (
          <div style={{ marginTop: 10 }}>
            <AIBubble text={ai.text} status={ai.status} onRetry={() => { ai.reset(); ai.run(buildPrompt()) }} />
          </div>
        )}
      </div>
      )}
    </div>
  )
}
