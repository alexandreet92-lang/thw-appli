'use client'
import { RaceSport, parseTimeSec, fmtMinSec } from './types'
import { useI18n } from '@/lib/i18n'

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
const SWIM_STROKES  = ['Nage libre','Dos','Brasse','Papillon','Quatre nages']
const SWIM_DISTS: Record<string, string[]> = {
  'Nage libre': ['50 m','100 m','200 m','400 m','800 m','1500 m'],
  'Dos': ['50 m','100 m','200 m'], 'Brasse': ['50 m','100 m','200 m'],
  'Papillon': ['50 m','100 m','200 m'], 'Quatre nages': ['200 m','400 m'],
}
const RUN_DISTS   = ['5 km','10 km','Semi-marathon','Marathon','Autre']
const RUN_KM: Record<string, number> = { '5 km':5,'10 km':10,'Semi-marathon':21.1,'Marathon':42.195 }
const ROW_DISTS   = ['500 m','1000 m','2000 m','5000 m','Autre']

const INP = { width:'100%',boxSizing:'border-box' as const,padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13.5,outline:'none' }
const LBL = { fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',marginBottom:7 }
const MONO = { ...INP, fontFamily:'DM Mono,monospace', letterSpacing:'0.02em' }
const READONLY = { ...MONO, background:'var(--bg-card2)',color:'var(--text-dim)',cursor:'default',borderStyle:'dashed' as const,borderColor:'var(--border-mid)' }

interface SF { pd: Record<string,unknown>; setPd: (v: Record<string,unknown>) => void }
const set = (pd: Record<string,unknown>, key: string, val: unknown) => ({ ...pd, [key]: val })

// Pastille douce (sélection = teinte + texte coloré, sans bordure dure) — même
// langage visuel que les pastilles sport/objectif de la coquille éditeur.
function chip(on: boolean, color: string): React.CSSProperties {
  return { padding:'8px 13px',borderRadius:999,border:`1px solid ${on?'transparent':'var(--border)'}`,cursor:'pointer',fontSize:12,fontWeight:on?700:600,
    background:on?`color-mix(in srgb, ${color} 15%, transparent)`:'transparent',color:on?color:'var(--text-mid)',transition:'background .15s, color .15s' }
}

function Chips({ label, options, value, onChange, color }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; color: string
}) {
  return (
    <div>
      <p style={LBL}>{label}</p>
      <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
        {options.map(o => { const on = value === o; return (
          <button key={o} onClick={() => onChange(o)} style={chip(on, color)}>{o}</button>
        )})}
      </div>
    </div>
  )
}

export default function SportFields({ sport, pd, setPd }: SF & { sport: RaceSport }) {
  const { t } = useI18n()
  if (sport === 'run') {
    const sec = parseTimeSec((pd.goalTime as string) ?? '')
    const km  = RUN_KM[(pd.runDist as string) ?? ''] ?? 0
    const pace = (sec > 0 && km > 0) ? fmtMinSec(sec / km) : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div>
          <p style={LBL}>{t('calendar.distance')}</p>
          <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
            {RUN_DISTS.map(d => (
              <button key={d} onClick={() => setPd(set(pd,'runDist',d))} style={chip(pd.runDist===d, '#22c55e')}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.goalTimeHms')}</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="01:30:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.paceAuto')}</p>
            <input style={READONLY} readOnly value={pace} /></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.targetHr')}</p>
            <input style={INP} type="number" value={(pd.hrTarget as string)??''} placeholder="160"
              onChange={e => setPd(set(pd,'hrTarget',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.targetRanking')}</p>
            <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10%"
              onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'bike') {
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <Chips label={t('calendar.eventType')} options={['Cyclo','Course par étapes','Course de fédération']} value={(pd.bikeType as string)??''} onChange={v => setPd(set(pd,'bikeType',v))} color="#3b82f6" />
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.distanceKm')}</p>
            <input style={INP} value={(pd.distance as string)??''} placeholder="180"
              onChange={e => setPd(set(pd,'distance',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.goalTimeHms')}</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="05:20:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.targetAvgWatts')}</p>
            <input style={INP} type="number" value={(pd.watts as string)??''} placeholder="220"
              onChange={e => setPd(set(pd,'watts',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.targetRanking')}</p>
            <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 20%"
              onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'swim') {
    const step = (pd.swimStep as number) ?? 0
    const stroke = (pd.swimStroke as string) ?? ''
    const dist   = (pd.swimDist as string) ?? ''
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {step > 0 && (
          <button onClick={() => setPd(set(pd,'swimStep',step-1))}
            style={{ alignSelf:'flex-start',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:12 }}>
            {t('calendar.back')}
          </button>
        )}
        {step === 0 && (
          <div>
            <p style={LBL}>{t('calendar.stroke')}</p>
            <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
              {SWIM_STROKES.map(s => (
                <button key={s} onClick={() => setPd({ ...pd, swimStroke:s, swimStep:1 })} style={chip(stroke===s, '#38bdf8')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && stroke && (
          <div>
            <p style={LBL}>{t('calendar.distance')}</p>
            <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
              {(SWIM_DISTS[stroke]??[]).map(d => (
                <button key={d} onClick={() => setPd({ ...pd, swimDist:d, swimStep:2 })} style={chip(dist===d, '#38bdf8')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p style={LBL}>{t('calendar.goalSecMs')}</p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
              <input style={MONO} type="number" value={(pd.swimSec as string)??''} placeholder={t('calendar.secondsPlaceholder')}
                onChange={e => setPd(set(pd,'swimSec',e.target.value))}/>
              <input style={MONO} type="number" value={(pd.swimMs as string)??''} placeholder={t('calendar.msPlaceholder')}
                onChange={e => setPd(set(pd,'swimMs',e.target.value))}/>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (sport === 'trail') {
    const sec = parseTimeSec((pd.goalTime as string) ?? '')
    const km  = parseFloat((pd.distance as string) ?? '0') || 0
    const pace = (sec > 0 && km > 0) ? fmtMinSec(sec / km) + '/km' : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.distanceKm')}</p>
            <input style={INP} type="number" value={(pd.distance as string)??''} placeholder="42"
              onChange={e => setPd(set(pd,'distance',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.elevationGain')}</p>
            <input style={INP} type="number" value={(pd.elevGain as string)??''} placeholder="2500"
              onChange={e => setPd(set(pd,'elevGain',e.target.value))}/></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.goalTimeHms')}</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="06:00:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.paceAuto')}</p>
            <input style={READONLY} readOnly value={pace} /></div>
        </div>
        <div><p style={LBL}>{t('calendar.targetRanking')}</p>
          <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10%"
            onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
      </div>
    )
  }

  if (sport === 'hyrox') {
    const stations = (pd.stations as Record<string,string>) ?? {}
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <Chips label={t('calendar.format')} options={['Single','Doubles','Relais']} value={(pd.hyroxFormat as string)??''} onChange={v => setPd(set(pd,'hyroxFormat',v))} color="#ef4444" />
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <Chips label={t('calendar.level')} options={['Open','Pro']} value={(pd.hyroxLevel as string)??''} onChange={v => setPd(set(pd,'hyroxLevel',v))} color="#ef4444" />
          <Chips label={t('calendar.gender')} options={['Homme','Femme','Mixte']} value={(pd.hyroxGender as string)??''} onChange={v => setPd(set(pd,'hyroxGender',v))} color="#ef4444" />
        </div>
        <div><p style={LBL}>{t('calendar.goalTotalTimeHms')}</p>
          <input style={MONO} value={(pd.goalTime as string)??''} placeholder="01:10:00"
            onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
        <p style={{ ...LBL, marginBottom:2 }}>{t('calendar.stations')}</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
          {HYROX_STATIONS.map(st => (
            <div key={st}>
              <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:2 }}>{st}</p>
              <input style={MONO} value={stations[st]??''} placeholder="02:30"
                onChange={e => setPd(set(pd,'stations',{ ...stations,[st]:e.target.value }))}/>
            </div>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.roxzoneCumulative')}</p>
            <input style={MONO} value={(pd.roxzoneTime as string)??''} placeholder="28:00"
              onChange={e => setPd(set(pd,'roxzoneTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.runsCumulative')}</p>
            <input style={MONO} value={(pd.runTime as string)??''} placeholder="42:00"
              onChange={e => setPd(set(pd,'runTime',e.target.value))}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'triathlon') {
    const swimSec  = parseTimeSec((pd.triSwimTime as string) ?? '')
    const bikeSec  = parseTimeSec((pd.triBikeTime as string) ?? '')
    const runSec   = parseTimeSec((pd.triRunTime as string) ?? '')
    const bikeKm   = parseFloat((pd.triBikeDist as string) ?? '0') || 0
    const runKm    = parseFloat((pd.triRunDist as string) ?? '0') || 0
    const swimPace = swimSec > 0 ? fmtMinSec(swimSec / 10) + '/100m' : '—'
    const bikeSpd  = (bikeSec > 0 && bikeKm > 0) ? (bikeKm / (bikeSec / 3600)).toFixed(1) + ' km/h' : '—'
    const runPace  = (runSec > 0 && runKm > 0) ? fmtMinSec(runSec / runKm) + '/km' : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.swimTime')}</p>
            <input style={MONO} value={(pd.triSwimTime as string)??''} placeholder="00:30:00"
              onChange={e => setPd(set(pd,'triSwimTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.pace100m')}</p><input style={READONLY} readOnly value={swimPace}/></div>
        </div>
        <div><p style={LBL}>{t('calendar.t1Mmss')}</p>
          <input style={MONO} value={(pd.t1 as string)??''} placeholder="02:00"
            onChange={e => setPd(set(pd,'t1',e.target.value))}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.bikeTime')}</p>
            <input style={MONO} value={(pd.triBikeTime as string)??''} placeholder="02:30:00"
              onChange={e => setPd(set(pd,'triBikeTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.bikeDistanceKm')}</p>
            <input style={INP} type="number" value={(pd.triBikeDist as string)??''} placeholder="90"
              onChange={e => setPd(set(pd,'triBikeDist',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.speedCalc')}</p><input style={READONLY} readOnly value={bikeSpd}/></div>
        </div>
        <div><p style={LBL}>{t('calendar.targetBikeWatts')}</p>
          <input style={INP} type="number" value={(pd.bikeWatts as string)??''} placeholder="180"
            onChange={e => setPd(set(pd,'bikeWatts',e.target.value))}/></div>
        <div><p style={LBL}>{t('calendar.t2Mmss')}</p>
          <input style={MONO} value={(pd.t2 as string)??''} placeholder="01:30"
            onChange={e => setPd(set(pd,'t2',e.target.value))}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.runTime')}</p>
            <input style={MONO} value={(pd.triRunTime as string)??''} placeholder="01:30:00"
              onChange={e => setPd(set(pd,'triRunTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.runDistanceKm')}</p>
            <input style={INP} type="number" value={(pd.triRunDist as string)??''} placeholder="21.1"
              onChange={e => setPd(set(pd,'triRunDist',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.paceCalc')}</p><input style={READONLY} readOnly value={runPace}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'rowing') {
    const sec = parseTimeSec((pd.goalTime as string) ?? '')
    const meters = parseInt((pd.rowDist as string)?.replace(/\D/g,'') ?? '0') || 0
    const split = (sec > 0 && meters > 0) ? fmtMinSec((sec / meters) * 500) : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <Chips label={t('calendar.type')} options={['Ergomètre','Bateau']} value={(pd.rowType as string)??''} onChange={v => setPd(set(pd,'rowType',v))} color="#14b8a6" />
        <div>
          <p style={LBL}>{t('calendar.distance')}</p>
          <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
            {ROW_DISTS.map(d => (
              <button key={d} onClick={() => setPd(set(pd,'rowDist',d))} style={chip(pd.rowDist===d, '#14b8a6')}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><p style={LBL}>{t('calendar.goalTimeMmss')}</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="06:30"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>{t('calendar.split500m')}</p><input style={READONLY} readOnly value={split}/></div>
        </div>
        <div><p style={LBL}>{t('calendar.targetRanking')}</p>
          <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10"
            onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
      </div>
    )
  }

  return null
}
