'use client'
// Profil Spécifique — onglets sport (neutres + point couleur), sélecteur de type de
// zone (FC/Allure/Puissance selon sport), barres de zones animées, sous-métriques
// neutres, radar, lien « Modifier les benchmarks » (ouvre la feuille). Tokens uniquement.
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { ZoneBars } from './ZoneBars'
import { Radar } from './Radar'
import { fcZones, paceZones, powerZones } from './zones'
import type { BenchField } from './BenchmarkSheet'

const FB = 'var(--font-body)'
type Sport = 'running' | 'cycling' | 'swimming' | 'hyrox'
type ZType = 'fc' | 'pace' | 'power'
interface Prof { ftp: number; weight: number; hrMax: number; hrRest: number; lthr: number; vma: number; vo2max: number; css: string }

const SPORTS: { id: Sport; label: string; dot: string }[] = [
  { id: 'running', label: 'Running', dot: 'var(--sport-run)' },
  { id: 'cycling', label: 'Cyclisme', dot: 'var(--sport-bike)' },
  { id: 'swimming', label: 'Natation', dot: 'var(--sport-swim)' },
  { id: 'hyrox', label: 'Hyrox', dot: 'var(--sport-hyrox)' },
]
const ZTABS: Record<Sport, { id: ZType; label: string }[]> = {
  running: [{ id: 'fc', label: 'Zones FC' }, { id: 'pace', label: "Zones d'allure" }],
  cycling: [{ id: 'fc', label: 'Zones FC' }, { id: 'power', label: 'Zones de puissance' }],
  swimming: [{ id: 'fc', label: 'Zones FC' }, { id: 'pace', label: "Zones d'allure" }],
  hyrox: [{ id: 'fc', label: 'Zones FC' }],
}
const clamp = (x: number) => Math.max(0, Math.min(100, x))

export function ProfilSpecific({ p, wkg, specSport, onSport, params, fields, onEditBenchmarks, snapshot, year, years, onYear, onAnalyze, analyzing, notEnough }: {
  p: Prof; wkg: string; specSport: Sport; onSport: (id: Sport) => void; params: Record<string, string>; fields: BenchField[]; onEditBenchmarks: () => void
  snapshot?: Record<string, number>           // scores IA par axe-id pour ce sport + année
  year?: number; years?: number[]; onYear?: (y: number) => void
  onAnalyze?: () => void; analyzing?: boolean; notEnough?: boolean
}) {
  const { t } = useI18n()
  const [ztype, setZtype] = useState<ZType>('fc')
  useEffect(() => { setZtype('fc') }, [specSport])
  const sportLabel = (id: Sport) => id === 'cycling' ? t('performance.sportCycling') : id === 'swimming' ? t('performance.sportSwimming') : SPORTS.find(s => s.id === id)!.label
  const zTabLabel = (id: ZType) => id === 'pace' ? t('performance.zonesPace') : id === 'power' ? t('performance.zonesPower') : t('performance.zonesHR')

  // « — » tant que la donnée source n'est pas renseignée par l'athlète.
  const dN = (n: number, unit: string) => n > 0 ? { value: `${n}`, unit } : { value: '—', unit: '' }
  const zonesAvailable = ztype === 'pace' ? p.vma > 0 : ztype === 'power' ? p.ftp > 0 : (p.hrMax > 0 && p.hrRest > 0)
  const zones = ztype === 'pace' ? paceZones(p.vma) : ztype === 'power' ? powerZones(p.ftp) : fcZones(p.hrMax, p.hrRest)
  const subs: { label: string; value: string; unit: string }[] =
    specSport === 'running' ? [{ label: 'VMA', ...dN(p.vma, 'km/h') }, { label: 'LTHR', ...dN(p.lthr, 'bpm') }, { label: 'VO2max', ...dN(p.vo2max, 'ml/kg/min') }]
      : specSport === 'cycling' ? [{ label: 'FTP', ...dN(p.ftp, 'W') }, { label: 'W/kg', value: wkg, unit: '' }, { label: 'LTHR', ...dN(p.lthr, 'bpm') }]
        : specSport === 'swimming' ? [{ label: 'CSS', value: p.css || '—', unit: p.css ? '/100m' : '' }, { label: t('performance.hrMax'), ...dN(p.hrMax, 'bpm') }, { label: 'VO2max', ...dN(p.vo2max, 'ml/kg/min') }]
          : [{ label: 'Wall Ball', value: params.wall_ball_max || '—', unit: 'reps' }, { label: 'Run comp.', value: params.run_compromised || '—', unit: '/km' }, { label: 'Farmer', value: params.farmer_max_m || '—', unit: 'm' }]
  // Lecture des benchmarks saisis (params). numP = valeur numérique, secP = temps
  // « m:ss » → secondes. Les axes sans source de donnée restent à 0 (polygone au
  // centre) : la STRUCTURE des axes est posée, la saisie des tests viendra ensuite.
  const numP = (k: string) => { const v = parseFloat((params[k] ?? '').replace(',', '.')); return isNaN(v) ? 0 : v }
  const secP = (k: string) => { const m = (params[k] ?? '').split(':').map(x => parseInt(x, 10)); return m.length === 2 && !m.some(isNaN) ? m[0] * 60 + m[1] : 0 }
  // Allure (s/km) → score : 6:00/km = 0, 3:00/km = 100.
  const paceScore = (secPerKm: number) => secPerKm > 0 ? clamp((360 - secPerKm) / 180 * 100) : 0

  // Axes par sport, avec id stable. Le score IA (snapshot[id], issu de l'analyse
  // des activités) prime ; sinon on retombe sur le calcul depuis les benchmarks.
  const axesDef: { id: string; label: string; base: number }[] =
    specSport === 'running' ? [
      { id: 'vma',    label: 'VMA',        base: clamp((p.vma - 10) / 12 * 100) },
      { id: 'sprint', label: 'Sprint',     base: 0 },   // 100/200/400 m — test
      { id: 'explo',  label: 'Explo.',     base: 0 },   // 20/40 m + navette — test
      { id: 'seuil',  label: 'Seuil',      base: 0 },   // 5/10 km / semi — test
      { id: 'eco',    label: 'Éco.',       base: 0 },   // %VMA sur 10 km — test
      { id: 'endur',  label: 'Endur.',     base: 0 },   // %VMA sur semi — test
    ]
    : specSport === 'cycling' ? [
      { id: 'puissance', label: 'Puiss.',     base: clamp((parseFloat(wkg || '0') - 1) / 5 * 100) },
      { id: 'sprintpma', label: 'Sprint/PMA', base: clamp(((numP('watts_pma') || numP('max_power')) - 200) / 500 * 100) },
      { id: 'endurance', label: 'Endur.',     base: 0 },   // sortie 4 h + — test
      { id: 'resistance',label: 'Résist.',    base: 0 },   // P60min ÷ FTP — test
      { id: 'grimpeur',  label: 'Grimp.',     base: 0 },   // régularité col — test
    ]
    : specSport === 'swimming' ? [
      { id: 'css',   label: 'CSS',                    base: p.css ? 60 : 0 },
      { id: 'speed', label: t('performance.speed'),   base: clamp((p.vma - 10) / 10 * 100) },
      { id: 'endur', label: t('performance.endurance'), base: clamp((p.vo2max - 30) / 40 * 100) },
    ]
    : [
      { id: 'runcomp', label: 'Run comp.', base: paceScore(secP('run_compromised')) },
      { id: 'force',   label: 'Force',     base: 0 },   // squat/DL/tractions — test
      { id: 'explo',   label: 'Explo.',    base: 0 },   // jumps — test
      { id: 'endur',   label: 'Endur.',    base: 0 },   // endurance fonctionnelle — test
    ]
  const radar = {
    labels: axesDef.map(a => a.label),
    scores: axesDef.map(a => snapshot && snapshot[a.id] != null ? snapshot[a.id] : a.base),
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: FB, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-dim)' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {SPORTS.map(s => (
          <button key={s.id} data-guide="perf-profil-sport" onClick={() => onSport(s.id)} style={{ ...tabBtn(s.id === specSport), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />{sportLabel(s.id)}
          </button>
        ))}
      </div>

      {/* Sélecteur d'année (profil qui change chaque année) + bouton Analyser */}
      {(years || onAnalyze) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(years && years.length ? years : (year ? [year] : [])).map(y => (
              <button key={y} onClick={() => onYear?.(y)} style={{
                padding: '4px 11px', borderRadius: 999, border: `1px solid ${y === year ? 'var(--primary)' : 'var(--border)'}`,
                background: y === year ? 'var(--primary-dim)' : 'transparent', color: y === year ? 'var(--primary)' : 'var(--text-dim)',
                fontFamily: FB, fontSize: 12, fontWeight: y === year ? 600 : 500, cursor: 'pointer',
              }}>{y}</button>
            ))}
          </div>
          {onAnalyze && (
            <button onClick={onAnalyze} disabled={analyzing} style={{
              border: 'none', background: 'transparent', cursor: analyzing ? 'default' : 'pointer',
              fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)', opacity: analyzing ? 0.6 : 1,
            }}>{analyzing ? t('performance.analyzing') : `${t('performance.analyze')} ↻`}</button>
          )}
        </div>
      )}
      {notEnough && (
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0, padding: '8px 12px', background: 'var(--bg-card2)', borderRadius: 10 }}>
          {t('performance.notEnoughData')}
        </p>
      )}

      <div data-guide="perf-profil-radar" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Radar scores={radar.scores} labels={radar.labels} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              {ZTABS[specSport].map(z => (
                <button key={z.id} data-guide="perf-profil-zones" onClick={() => setZtype(z.id)} style={tabBtn(z.id === ztype)}>{zTabLabel(z.id)}</button>
              ))}
            </div>
            <button onClick={onEditBenchmarks} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{t('performance.editBenchmarks')} →</button>
          </div>
          {zonesAvailable
            ? <ZoneBars zones={zones} animKey={`${specSport}-${ztype}`} />
            : <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{t('performance.zonesNeedData')}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {subs.map((m, i) => (
              <div key={m.label} style={{ paddingRight: 'var(--space-5)', marginRight: i < subs.length - 1 ? 'var(--space-5)' : 0, borderRight: i < subs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>{m.label}</p>
                <p className="tnum" style={{ fontFamily: FB, fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 'var(--space-1) 0 0' }}>{m.value}<span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 3 }}>{m.unit}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmarks renseignés — parité avec la feuille de saisie : tout ce qui
          est rentré s'affiche ici. */}
      {fields.some(f => (params[f.key] ?? '').trim() !== '') && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }}>{t('performance.filledBenchmarks')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
            {fields.filter(f => (params[f.key] ?? '').trim() !== '').map(f => (
              <div key={f.key}>
                <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>{f.label}</p>
                <p className="tnum" style={{ fontFamily: FB, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 'var(--space-1) 0 0' }}>
                  {params[f.key]}{f.unit ? <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 3 }}>{f.unit}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
