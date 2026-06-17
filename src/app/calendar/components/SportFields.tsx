'use client'
import { RaceSport, parseTimeSec, fmtMinSec } from './types'

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

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }
const MONO = { ...INP, fontFamily:'DM Mono,monospace' }
const READONLY = { ...MONO, background:'var(--bg-card2)',color:'var(--text-dim)',cursor:'default' }

interface SF { pd: Record<string,unknown>; setPd: (v: Record<string,unknown>) => void }
const set = (pd: Record<string,unknown>, key: string, val: unknown) => ({ ...pd, [key]: val })

export default function SportFields({ sport, pd, setPd }: SF & { sport: RaceSport }) {
  if (sport === 'run') {
    const sec = parseTimeSec((pd.goalTime as string) ?? '')
    const km  = RUN_KM[(pd.runDist as string) ?? ''] ?? 0
    const pace = (sec > 0 && km > 0) ? fmtMinSec(sec / km) : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div>
          <p style={LBL}>Distance</p>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {RUN_DISTS.map(d => (
              <button key={d} onClick={() => setPd(set(pd,'runDist',d))}
                style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:11,
                  borderColor:pd.runDist===d?'#22c55e':'var(--border)',
                  background:pd.runDist===d?'rgba(34,197,94,0.12)':'var(--bg-card2)',
                  color:pd.runDist===d?'#22c55e':'var(--text-mid)' }}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Objectif temps (HH:MM:SS)</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="01:30:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>Allure (calc. auto)</p>
            <input style={READONLY} readOnly value={pace} /></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>FC cible (bpm)</p>
            <input style={INP} type="number" value={(pd.hrTarget as string)??''} placeholder="160"
              onChange={e => setPd(set(pd,'hrTarget',e.target.value))}/></div>
          <div><p style={LBL}>Classement cible</p>
            <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10%"
              onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'bike') {
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Distance (km)</p>
            <input style={INP} value={(pd.distance as string)??''} placeholder="180"
              onChange={e => setPd(set(pd,'distance',e.target.value))}/></div>
          <div><p style={LBL}>Objectif temps (HH:MM:SS)</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="05:20:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Watts moyen cible</p>
            <input style={INP} type="number" value={(pd.watts as string)??''} placeholder="220"
              onChange={e => setPd(set(pd,'watts',e.target.value))}/></div>
          <div><p style={LBL}>Classement cible</p>
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
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {step > 0 && (
          <button onClick={() => setPd(set(pd,'swimStep',step-1))}
            style={{ alignSelf:'flex-start',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:12 }}>
            ← Retour
          </button>
        )}
        {step === 0 && (
          <div>
            <p style={LBL}>Nage</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
              {SWIM_STROKES.map(s => (
                <button key={s} onClick={() => setPd({ ...pd, swimStroke:s, swimStep:1 })}
                  style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:11,
                    borderColor:stroke===s?'#38bdf8':'var(--border)',
                    background:stroke===s?'rgba(56,189,248,0.12)':'var(--bg-card2)',
                    color:stroke===s?'#38bdf8':'var(--text-mid)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && stroke && (
          <div>
            <p style={LBL}>Distance</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
              {(SWIM_DISTS[stroke]??[]).map(d => (
                <button key={d} onClick={() => setPd({ ...pd, swimDist:d, swimStep:2 })}
                  style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:11,
                    borderColor:dist===d?'#38bdf8':'var(--border)',
                    background:dist===d?'rgba(56,189,248,0.12)':'var(--bg-card2)',
                    color:dist===d?'#38bdf8':'var(--text-mid)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p style={LBL}>Objectif (sec | ms)</p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              <input style={MONO} type="number" value={(pd.swimSec as string)??''} placeholder="Secondes (ex: 58)"
                onChange={e => setPd(set(pd,'swimSec',e.target.value))}/>
              <input style={MONO} type="number" value={(pd.swimMs as string)??''} placeholder="Ms (ex: 40)"
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
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Distance (km)</p>
            <input style={INP} type="number" value={(pd.distance as string)??''} placeholder="42"
              onChange={e => setPd(set(pd,'distance',e.target.value))}/></div>
          <div><p style={LBL}>Dénivelé D+ (m)</p>
            <input style={INP} type="number" value={(pd.elevGain as string)??''} placeholder="2500"
              onChange={e => setPd(set(pd,'elevGain',e.target.value))}/></div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Objectif temps (HH:MM:SS)</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="06:00:00"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>Allure (calc. auto)</p>
            <input style={READONLY} readOnly value={pace} /></div>
        </div>
        <div><p style={LBL}>Classement cible</p>
          <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10%"
            onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
      </div>
    )
  }

  if (sport === 'hyrox') {
    const stations = (pd.stations as Record<string,string>) ?? {}
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div><p style={LBL}>Objectif temps total (HH:MM:SS)</p>
          <input style={MONO} value={(pd.goalTime as string)??''} placeholder="01:10:00"
            onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
        <p style={{ ...LBL, marginBottom:2 }}>Stations (MM:SS)</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
          {HYROX_STATIONS.map(st => (
            <div key={st}>
              <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:2 }}>{st}</p>
              <input style={MONO} value={stations[st]??''} placeholder="02:30"
                onChange={e => setPd(set(pd,'stations',{ ...stations,[st]:e.target.value }))}/>
            </div>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Roxzone cumulé (MM:SS)</p>
            <input style={MONO} value={(pd.roxzoneTime as string)??''} placeholder="28:00"
              onChange={e => setPd(set(pd,'roxzoneTime',e.target.value))}/></div>
          <div><p style={LBL}>Runs cumulés (MM:SS)</p>
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
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Temps natation</p>
            <input style={MONO} value={(pd.triSwimTime as string)??''} placeholder="00:30:00"
              onChange={e => setPd(set(pd,'triSwimTime',e.target.value))}/></div>
          <div><p style={LBL}>Allure /100m</p><input style={READONLY} readOnly value={swimPace}/></div>
        </div>
        <div><p style={LBL}>T1 (MM:SS)</p>
          <input style={MONO} value={(pd.t1 as string)??''} placeholder="02:00"
            onChange={e => setPd(set(pd,'t1',e.target.value))}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Temps vélo</p>
            <input style={MONO} value={(pd.triBikeTime as string)??''} placeholder="02:30:00"
              onChange={e => setPd(set(pd,'triBikeTime',e.target.value))}/></div>
          <div><p style={LBL}>Distance vélo (km)</p>
            <input style={INP} type="number" value={(pd.triBikeDist as string)??''} placeholder="90"
              onChange={e => setPd(set(pd,'triBikeDist',e.target.value))}/></div>
          <div><p style={LBL}>Vitesse calc.</p><input style={READONLY} readOnly value={bikeSpd}/></div>
        </div>
        <div><p style={LBL}>Watts vélo cible</p>
          <input style={INP} type="number" value={(pd.bikeWatts as string)??''} placeholder="180"
            onChange={e => setPd(set(pd,'bikeWatts',e.target.value))}/></div>
        <div><p style={LBL}>T2 (MM:SS)</p>
          <input style={MONO} value={(pd.t2 as string)??''} placeholder="01:30"
            onChange={e => setPd(set(pd,'t2',e.target.value))}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Temps run</p>
            <input style={MONO} value={(pd.triRunTime as string)??''} placeholder="01:30:00"
              onChange={e => setPd(set(pd,'triRunTime',e.target.value))}/></div>
          <div><p style={LBL}>Distance run (km)</p>
            <input style={INP} type="number" value={(pd.triRunDist as string)??''} placeholder="21.1"
              onChange={e => setPd(set(pd,'triRunDist',e.target.value))}/></div>
          <div><p style={LBL}>Allure calc.</p><input style={READONLY} readOnly value={runPace}/></div>
        </div>
      </div>
    )
  }

  if (sport === 'rowing') {
    const sec = parseTimeSec((pd.goalTime as string) ?? '')
    const meters = parseInt((pd.rowDist as string)?.replace(/\D/g,'') ?? '0') || 0
    const split = (sec > 0 && meters > 0) ? fmtMinSec((sec / meters) * 500) : '—'
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div>
          <p style={LBL}>Distance</p>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {ROW_DISTS.map(d => (
              <button key={d} onClick={() => setPd(set(pd,'rowDist',d))}
                style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:11,
                  borderColor:pd.rowDist===d?'#14b8a6':'var(--border)',
                  background:pd.rowDist===d?'rgba(20,184,166,0.12)':'var(--bg-card2)',
                  color:pd.rowDist===d?'#14b8a6':'var(--text-mid)' }}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          <div><p style={LBL}>Objectif temps (MM:SS)</p>
            <input style={MONO} value={(pd.goalTime as string)??''} placeholder="06:30"
              onChange={e => setPd(set(pd,'goalTime',e.target.value))}/></div>
          <div><p style={LBL}>Split /500m (calc.)</p><input style={READONLY} readOnly value={split}/></div>
        </div>
        <div><p style={LBL}>Classement cible</p>
          <input style={INP} value={(pd.ranking as string)??''} placeholder="Top 10"
            onChange={e => setPd(set(pd,'ranking',e.target.value))}/></div>
      </div>
    )
  }

  return null
}
