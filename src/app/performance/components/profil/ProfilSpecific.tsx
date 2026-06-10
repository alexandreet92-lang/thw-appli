'use client'
// Profil Spécifique — onglets sport (neutres + point couleur), sélecteur de type de
// zone (FC/Allure/Puissance selon sport), barres de zones animées, sous-métriques
// neutres, radar, lien « Modifier les benchmarks » (ouvre la feuille). Tokens uniquement.
import { useEffect, useState } from 'react'
import { ZoneBars } from './ZoneBars'
import { Radar } from './Radar'
import { fcZones, paceZones, powerZones } from './zones'

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

export function ProfilSpecific({ p, wkg, specSport, onSport, params, onEditBenchmarks }: {
  p: Prof; wkg: string; specSport: Sport; onSport: (id: Sport) => void; params: Record<string, string>; onEditBenchmarks: () => void
}) {
  const [ztype, setZtype] = useState<ZType>('fc')
  useEffect(() => { setZtype('fc') }, [specSport])

  const zones = ztype === 'pace' ? paceZones(p.vma) : ztype === 'power' ? powerZones(p.ftp) : fcZones(p.hrMax, p.hrRest)
  const subs: { label: string; value: string; unit: string }[] =
    specSport === 'running' ? [{ label: 'VMA', value: `${p.vma}`, unit: 'km/h' }, { label: 'LTHR', value: `${p.lthr}`, unit: 'bpm' }, { label: 'VO2max', value: `${p.vo2max}`, unit: 'ml/kg/min' }]
      : specSport === 'cycling' ? [{ label: 'FTP', value: `${p.ftp}`, unit: 'W' }, { label: 'W/kg', value: wkg, unit: '' }, { label: 'LTHR', value: `${p.lthr}`, unit: 'bpm' }]
        : specSport === 'swimming' ? [{ label: 'CSS', value: p.css, unit: '/100m' }, { label: 'FC max', value: `${p.hrMax}`, unit: 'bpm' }, { label: 'VO2max', value: `${p.vo2max}`, unit: 'ml/kg/min' }]
          : [{ label: 'Wall Ball', value: params.wall_ball_max || '—', unit: 'reps' }, { label: 'Run comp.', value: params.run_compromised || '—', unit: '/km' }, { label: 'Farmer', value: params.farmer_max_m || '—', unit: 'm' }]
  const radar = specSport === 'running' ? { labels: ['VMA', 'Seuil', 'Endurance'], scores: [clamp((p.vma - 10) / 12 * 100), 75, clamp((p.vo2max - 30) / 40 * 100)] }
    : specSport === 'cycling' ? { labels: ['FTP', 'W/kg', 'Endurance'], scores: [clamp((p.ftp - 100) / 300 * 100), clamp((parseFloat(wkg) - 1) / 5 * 100), clamp((p.vo2max - 30) / 40 * 100)] }
      : specSport === 'swimming' ? { labels: ['CSS', 'Vitesse', 'Endurance'], scores: [60, clamp((p.vma - 10) / 10 * 100), clamp((p.vo2max - 30) / 40 * 100)] }
        : { labels: ['Force', 'Cardio', 'Run'], scores: [clamp(parseFloat(params.wall_ball_max ?? '0') / 50 * 100), clamp((p.hrMax - p.hrRest) / 80 * 100), clamp((p.vma - 10) / 12 * 100)] }

  const tabBtn = (active: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: FB, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-dim)' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {SPORTS.map(s => (
          <button key={s.id} onClick={() => onSport(s.id)} style={{ ...tabBtn(s.id === specSport), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />{s.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Radar scores={radar.scores} labels={radar.labels} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              {ZTABS[specSport].map(z => (
                <button key={z.id} onClick={() => setZtype(z.id)} style={tabBtn(z.id === ztype)}>{z.label}</button>
              ))}
            </div>
            <button onClick={onEditBenchmarks} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Modifier les benchmarks →</button>
          </div>
          <ZoneBars zones={zones} animKey={`${specSport}-${ztype}`} />
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
    </div>
  )
}
