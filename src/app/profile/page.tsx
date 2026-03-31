import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────
type ProfileTab = 'profil' | 'zones' | 'records'
type SportType  = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox' | 'triathlon' | 'trail'
type ZoneSport  = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox_row' | 'hyrox_ski'
type OAuthProvider = 'strava' | 'wahoo' | 'polar' | 'withings'

interface Connection {
  id: string; provider?: OAuthProvider; label: string
  connected: boolean; lastSync: string; loading: boolean; available: boolean
}

interface ZoneData {
  zones: string[]; sl1: string; sl2: string; ftp?: string; runCompromised?: string
}

interface RecordEntry {
  id: string; distance: string; perf: string; date: string; year: string; race: string
  type: 'entrainement'|'competition'; pace?: string; elevation?: string
  splits?: {swim?:string;bike?:string;run?:string}; stationTimes?: Record<string,string>
}

interface PalmEntry {
  id: string; race: string; year: string; rank: string; time: string; category: string
  stationTimes?: Record<string,string>
}

// ── Helpers ───────────────────────────────────────
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function today() { return new Date().toISOString().split('T')[0] }
function sinceDate(d: string): string {
  const now = new Date(), dt = new Date(d)
  const m = (now.getFullYear()-dt.getFullYear())*12+now.getMonth()-dt.getMonth()
  const y = Math.floor(m/12), mo = m%12
  if (y===0) return `${mo} mois`
  if (mo===0) return `${y} an${y>1?'s':''}`
  return `${y} an${y>1?'s':''} ${mo} mois`
}

const SPORT_LABEL: Record<string,string> = {
  run:'Running', bike:'Cyclisme', swim:'Natation', rowing:'Aviron',
  hyrox:'Hyrox', triathlon:'Triathlon', trail:'Trail', gym:'Musculation'
}
const SPORT_COLOR: Record<string,string> = {
  run:'#22c55e', bike:'#3b82f6', swim:'#38bdf8', rowing:'#14b8a6',
  hyrox:'#ef4444', triathlon:'#a855f7', trail:'#f97316', gym:'#ffb340'
}
const Z_COLORS = ['#60a5fa','#34d399','#fbbf24','#f97316','#ef4444']
const Z_LABELS = ['Récup','Aérobie','Tempo','Seuil','VO2max']
const BIKE_DISTS  = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','20min','30min','1h','2h','3h','4h','5h','6h']
const RUN_DISTS   = ['1500m','5km','10km','Semi-marathon','Marathon','50km','100km']
const TRAIL_DISTS = ['20km','30km','50km','80km','100km','Ultra (100km+)']
const TRI_DISTS   = ['XS','S (Sprint)','M (Standard)','70.3 / L','Ironman / XL']
const SWIM_DISTS  = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const ROW_DISTS   = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const HYROX_CATS  = ['Open Solo','Pro Solo']
const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmer Carry','Sandbag Lunges','Wall Balls']
const RUN_KM: Record<string,number> = {'1500m':1.5,'5km':5,'10km':10,'Semi-marathon':21.1,'Marathon':42.195,'50km':50,'100km':100}

function calcPace(distKm:number, t:string):string {
  const p=t.split(':').map(Number)
  const s=p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:parseFloat(t)||0
  if(!s||!distKm) return ''
  const spk=s/distKm
  return `${Math.floor(spk/60)}:${String(Math.round(spk%60)).padStart(2,'0')}/km`
}

// ── App logos ─────────────────────────────────────
function AppLogo({ id, size=28 }: { id:string; size?:number }) {
  const logos: Record<string,React.ReactNode> = {
    strava: <svg width={size} height={size} viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02"/><path d="M11.214 13.828l2.084-4.116 2.089 4.116h3.066L13.298 3.656l-5.15 10.172h3.066z" fill="#FC4C02"/></svg>,
    wahoo: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#E8002D"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">WAHOO</text></svg>,
    polar: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#C40000"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">P</text></svg>,
    withings: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#00B5D8"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">W</text></svg>,
    apple_health: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FF2D55"/><path d="M12 6c.5-1.5 2-2.5 3.5-2 1.5.5 2 2 1.5 3.5L12 18 7 7.5C6.5 6 7 4.5 8.5 4c1.5-.5 3 .5 3.5 2z" fill="white"/></svg>,
    google_fit: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#4285F4"/><path d="M12 6l1.5 3h3l-2.5 2 1 3-3-2-3 2 1-3-2.5-2h3z" fill="white"/></svg>,
    fitbit: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#00B0B9"/><circle cx="12" cy="8" r="1.5" fill="white"/><circle cx="12" cy="12" r="2" fill="white"/><circle cx="12" cy="16.5" r="1.5" fill="white"/></svg>,
    hrv4training: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#E53E3E"/><path d="M3 12h3l2-6 4 12 2-6h7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>,
    elite_hrv: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2D3748"/><path d="M4 12h3l2-5 4 10 2-5h5" stroke="#68D391" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>,
    oura: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1A1A2E"/><circle cx="12" cy="12" r="5" stroke="#C4A35A" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="2" fill="#C4A35A"/></svg>,
    myfitnesspal: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#00B3E6"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">MFP</text></svg>,
    cronometer: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#F5A623"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">C</text></svg>,
  }
  return <>{logos[id] ?? <div style={{ width:size, height:size, borderRadius:6, background:'var(--border)' }}/>}</>
}

// ── Shared UI ─────────────────────────────────────
function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)', marginBottom:12, ...style }}>{children}</div>
}
function SectionTitle({ children }: { children:React.ReactNode }) {
  return <p style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 14px' }}>{children}</p>
}
function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return <button onClick={()=>onChange(!value)} style={{ width:38, height:21, borderRadius:11, background:value?'#00c8e0':'rgba(120,120,140,0.3)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s' }}><div style={{ width:15, height:15, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:value?20:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/></button>
}
function InfoModal({ title, content, onClose }: { title:string; content:React.ReactNode; onClose:()=>void }) {
  return <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}><div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:24, maxWidth:420, width:'100%' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}><h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{title}</h3><button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button></div><div style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.7 }}>{content}</div></div></div>
}
function HelpBtn({ title, content }: { title:string; content:React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={()=>setOpen(true)} style={{ width:16, height:16, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:9, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, verticalAlign:'middle' }}>?</button>{open && <InfoModal title={title} content={content} onClose={()=>setOpen(false)}/>}</>
}
function Toast({ msg, ok }: { msg:string; ok:boolean }) {
  return <div style={{ position:'fixed', top:20, right:20, zIndex:999, padding:'12px 18px', borderRadius:12, background:ok?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', border:`1px solid ${ok?'rgba(34,197,94,0.4)':'rgba(239,68,68,0.4)'}`, color:ok?'#22c55e':'#ef4444', fontSize:13, fontWeight:600, backdropFilter:'blur(8px)' }}>{msg}</div>
}
function SaveBtn({ saving, onClick }: { saving:boolean; onClick:()=>void }) {
  return <button onClick={onClick} disabled={saving} style={{ padding:'5px 14px', borderRadius:8, background:saving?'var(--border)':'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:11, cursor:saving?'not-allowed':'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>{saving?'Sauvegarde...':'Sauvegarder ✓'}</button>
}

// ── Connexions hook ────────────────────────────────
function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([
    { id:'strava',       provider:'strava',   label:'Strava',       connected:false, lastSync:'', loading:false, available:true },
    { id:'wahoo',        provider:'wahoo',    label:'Wahoo',        connected:false, lastSync:'', loading:false, available:true },
    { id:'polar',        provider:'polar',    label:'Polar',        connected:false, lastSync:'', loading:false, available:true },
    { id:'withings',     provider:'withings', label:'Withings',     connected:false, lastSync:'', loading:false, available:true },
    { id:'apple_health', label:'Apple Health', connected:false, lastSync:'', loading:false, available:false },
    { id:'google_fit',   label:'Google Fit',   connected:false, lastSync:'', loading:false, available:false },
    { id:'fitbit',       label:'Fitbit',       connected:false, lastSync:'', loading:false, available:false },
    { id:'hrv4training', label:'HRV4Training', connected:false, lastSync:'', loading:false, available:false },
    { id:'elite_hrv',    label:'Elite HRV',    connected:false, lastSync:'', loading:false, available:false },
    { id:'oura',         label:'Oura',         connected:false, lastSync:'', loading:false, available:false },
    { id:'myfitnesspal', label:'MyFitnessPal', connected:false, lastSync:'', loading:false, available:false },
    { id:'cronometer',   label:'Cronometer',   connected:false, lastSync:'', loading:false, available:false },
  ])

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/oauth/status')
      if (!res.ok) return
      const { connected: cp } = await res.json() as { connected: string[] }
      setConnections(p => p.map(c => ({ ...c, connected: c.provider ? cp.includes(c.provider) : false })))
    } catch {}
  }, [])

  useEffect(() => { reload() }, [reload])

  function setLoading(id:string, v:boolean) { setConnections(p=>p.map(c=>c.id===id?{...c,loading:v}:c)) }
  function setConnected(id:string, v:boolean) { setConnections(p=>p.map(c=>c.id===id?{...c,connected:v,lastSync:v?today():''}:c)) }

  async function connect(c:Connection) {
    if (!c.provider||!c.available) return
    setLoading(c.id, true)
    window.location.href = `/api/oauth/connect?provider=${c.provider}`
  }

  async function disconnect(c:Connection) {
    if (!c.provider) return
    setLoading(c.id, true)
    try {
      const res = await fetch(`/api/oauth/disconnect?provider=${c.provider}`, { method:'POST' })
      if (res.ok) setConnected(c.id, false)
    } catch {}
    setLoading(c.id, false)
  }

  async function sync(c:Connection) {
    if (!c.provider||!c.connected) return
    setLoading(c.id, true)
    try {
      await fetch(`/api/sync/${c.provider}`, { method:'POST' })
      setConnections(p=>p.map(x=>x.id===c.id?{...x,lastSync:today()}:x))
    } catch {}
    setLoading(c.id, false)
  }

  return { connections, connect, disconnect, sync, reload }
}

// ── Profile hook ──────────────────────────────────
function useProfile() {
  const supabase = createClient()
  const [data, setData] = useState({ full_name:'', bio:'', height_cm:'', weight_kg:'', email:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setData({
        full_name:  p?.full_name  ?? '',
        bio:        p?.bio        ?? '',
        height_cm:  p?.height_cm  ? String(p.height_cm)  : '',
        weight_kg:  p?.weight_kg  ? String(p.weight_kg)  : '',
        email:      user.email    ?? '',
      })
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').upsert({
      id:        user.id,
      full_name: data.full_name || null,
      bio:       data.bio       || null,
      height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  async function uploadAvatar(file: File): Promise<string|null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert:true })
    if (error) return null
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    return urlData.publicUrl
  }

  return { data, setData, saving, save, uploadAvatar }
}

// ── Athlete sports hook ───────────────────────────
function useAthleteSports() {
  const supabase = createClient()
  const [sports, setSports] = useState<{id:string;sport:string;since_date:string|null}[]>([])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('athlete_sports').select('*').eq('user_id', user.id).order('since_date', { ascending:true })
    setSports(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function add(sport:string, sinceDate:string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('athlete_sports').upsert({ user_id:user.id, sport, since_date:sinceDate||null }, { onConflict:'user_id,sport' })
    await load()
  }

  async function remove(id:string) {
    await supabase.from('athlete_sports').delete().eq('id', id)
    await load()
  }

  return { sports, add, remove }
}

// ── Training zones hook ───────────────────────────
function useTrainingZones() {
  const supabase = createClient()
  const empty = (sport: ZoneSport): ZoneData => ({ zones:['','','','',''], sl1:'', sl2:'', ftp:'', runCompromised:'' })
  const [zoneData, setZoneData] = useState<Record<ZoneSport, ZoneData>>({
    bike:'bike' as any, run:'run' as any, swim:'swim' as any,
    rowing:'rowing' as any, hyrox_row:'hyrox_row' as any, hyrox_ski:'hyrox_ski' as any,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init: Record<ZoneSport, ZoneData> = {
      bike: empty('bike'), run: empty('run'), swim: empty('swim'),
      rowing: empty('rowing'), hyrox_row: empty('hyrox_row'), hyrox_ski: empty('hyrox_ski'),
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setZoneData(init); return }
      const { data } = await supabase.from('training_zones').select('*').eq('user_id', user.id).eq('is_current', true)
      if (!data?.length) { setZoneData(init); return }
      const updated = { ...init }
      for (const row of data) {
        const s = row.sport as ZoneSport
        updated[s] = {
          zones: [row.z1_value??'', row.z2_value??'', row.z3_value??'', row.z4_value??'', row.z5_value??''],
          sl1:  row.sl1 ?? '', sl2: row.sl2 ?? '',
          ftp:  row.ftp_watts ? String(row.ftp_watts) : '',
          runCompromised: row.run_compromised ?? '',
        }
      }
      setZoneData(updated)
    }
    load()
  }, [])

  async function saveZone(sport: ZoneSport, d: ZoneData) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('training_zones').upsert({
      user_id: user.id, sport,
      ftp_watts:       d.ftp ? parseFloat(d.ftp) : null,
      sl1: d.sl1||null, sl2: d.sl2||null,
      run_compromised: d.runCompromised||null,
      z1_value: d.zones[0]||null, z2_value: d.zones[1]||null,
      z3_value: d.zones[2]||null, z4_value: d.zones[3]||null,
      z5_value: d.zones[4]||null,
      is_current: true,
      effective_from: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,sport,effective_from' })
    setZoneData(p => ({ ...p, [sport]: d }))
    setSaving(false)
  }

  return { zoneData, setZoneData, saving, saveZone }
}

// ── Records hook ──────────────────────────────────
function useRecords() {
  const supabase = createClient()
  const [records,  setRecords]  = useState<any[]>([])
  const [palmares, setPalmares] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [r, p] = await Promise.all([
      supabase.from('personal_records').select('*').eq('user_id', user.id).order('achieved_at', { ascending:false }),
      supabase.from('race_results').select('*').eq('user_id', user.id).order('race_date', { ascending:false }),
    ])
    setRecords(r.data ?? [])
    setPalmares(p.data ?? [])
  }

  useEffect(() => { load() }, [])

  async function addRecord(sport: string, entry: RecordEntry) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const distKm = RUN_KM[entry.distance]
    const pace_s = (sport==='run'||sport==='trail') && distKm && entry.perf
      ? (() => { const p=entry.perf.split(':').map(Number); const s=p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:0; return s ? Math.round(s/distKm) : null })()
      : null
    await supabase.from('personal_records').insert({
      user_id: user.id, sport,
      distance_label: entry.distance,
      distance_m: distKm ? distKm*1000 : null,
      performance: entry.perf,
      performance_unit: sport==='bike' ? 'watts' : 'time',
      event_type: entry.type==='competition' ? 'competition' : 'training',
      race_name: entry.race || null,
      achieved_at: entry.date,
      pace_s_km: pace_s,
      elevation_gain_m: entry.elevation ? parseInt(entry.elevation) : null,
      split_swim: entry.splits?.swim || null,
      split_bike: entry.splits?.bike || null,
      split_run:  entry.splits?.run  || null,
      station_times: entry.stationTimes || null,
    })
    await load()
    setSaving(false)
  }

  async function addPalmares(sport: string, entry: PalmEntry) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('race_results').insert({
      user_id: user.id, sport,
      race_name: entry.race,
      race_date: entry.year + '-01-01',
      finish_time: entry.time || null,
      overall_rank: entry.rank ? parseInt(entry.rank.split('/')[0]) : null,
      overall_total: entry.rank?.includes('/') ? parseInt(entry.rank.split('/')[1]) : null,
      category: entry.category || null,
      station_times: entry.stationTimes || null,
    })
    await load()
    setSaving(false)
  }

  function getRecordsBySport(sport: string) { return records.filter(r => r.sport === sport) }
  function getPalmaresBySport(sport: string) { return palmares.filter(r => r.sport === sport) }

  return { records, palmares, saving, addRecord, addPalmares, getRecordsBySport, getPalmaresBySport }
}

// ════════════════════════════════════════════════
// BLOC 1 — PROFIL
// ════════════════════════════════════════════════
function ProfilBloc() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { connections, connect, disconnect, sync, reload: reloadConn } = useConnections()
  const { data: profileData, setData: setProfileData, saving: savingProfile, save: saveProfile, uploadAvatar } = useProfile()
  const { sports, add: addSport, remove: removeSport } = useAthleteSports()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string|null>(null)
  const [editing, setEditing] = useState(false)
  const [newSport, setNewSport] = useState('run')
  const [newSince, setNewSince] = useState('')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [planExpanded, setPlanExpanded] = useState(false)
  const [notifs, setNotifs] = useState({ globalOn:true, morningProg:true, sessionRemind:true, hrv:true, fatigue:true, sleep:false, meals:true, weekSummary:true, monthSummary:false })
  const [sleepActive, setSleepActive] = useState(false)
  const [sleepStart, setSleepStart] = useState<Date|null>(null)
  const [sleepDur, setSleepDur] = useState<string|null>(null)
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null)
  const trialLeft = 9; const trialDays = 14

  useEffect(() => {
    const status = searchParams.get('oauth'); const provider = searchParams.get('provider') ?? ''
    if (!status) return
    const MSGS: Record<string,{msg:string;ok:boolean}> = {
      connected:     { msg:`${provider} connecté !`,          ok:true  },
      denied:        { msg:'Connexion annulée.',               ok:false },
      error:         { msg:'Erreur de connexion.',             ok:false },
      token_error:   { msg:'Erreur d\'authentification.',      ok:false },
      invalid_state: { msg:'Erreur sécurité. Réessayez.',      ok:false },
      no_session:    { msg:'Session expirée.',                 ok:false },
    }
    if (MSGS[status]) { setToast(MSGS[status]); setTimeout(()=>setToast(null),4000); reloadConn(); router.replace('/profile') }
  }, [searchParams, router, reloadConn])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setPhoto(ev.target?.result as string); r.readAsDataURL(f)
    const url = await uploadAvatar(f)
    if (url) setPhoto(url)
  }

  async function handleSave() {
    await saveProfile()
    setEditing(false)
    setToast({ msg:'Profil sauvegardé !', ok:true })
    setTimeout(()=>setToast(null), 3000)
  }

  function toggleSleep() {
    if (!sleepActive) { setSleepActive(true); setSleepStart(new Date()); setSleepDur(null) }
    else {
      const dur = sleepStart ? Math.round((Date.now()-sleepStart.getTime())/60000) : 0
      setSleepDur(`${Math.floor(dur/60)}h${String(dur%60).padStart(2,'0')}`)
      setSleepActive(false)
    }
  }

  const imc = profileData.height_cm && profileData.weight_kg
    ? (parseFloat(profileData.weight_kg)/((parseFloat(profileData.height_cm)/100)**2)).toFixed(1) : '—'

  const PLANS = [
    { id:'premium', label:'Premium', monthly:'15€/mois', annual:'129€/an', save:'28%', color:'#00c8e0', features:['Toutes les fonctionnalites','Connexions apps (5)','Export PDF','Historique 1 an'] },
    { id:'pro',     label:'Pro',     monthly:'29€/mois', annual:'199€/an', save:'43%', color:'#a855f7', features:['Tout Premium','Connexions illimitées','Coach IA','Historique illimité'] },
    { id:'expert',  label:'Expert',  monthly:'49€/mois', annual:'349€/an', save:'41%', color:'#f97316', features:['Tout Pro','Multi-athlètes','Dashboard coach','API accès'] },
  ]

  const NOTIF_SECTIONS = [
    { label:'Entrainement', items:[{ key:'morningProg', label:'Programme du matin', help:'Programme envoyé chaque matin.' }, { key:'sessionRemind', label:'Rappel séance', help:'Notification avant votre séance.' }]},
    { label:'Recuperation', items:[{ key:'hrv', label:'Rappel HRV', help:'Mesure HRV au réveil.' }, { key:'fatigue', label:'Alerte fatigue', help:'Niveau de fatigue cumulé.' }, { key:'sleep', label:'Suivi sommeil', help:'Rappel chronomètre sommeil.' }]},
    { label:'Nutrition', items:[{ key:'meals', label:'Rappels repas', help:'Heures de repas personnalisées.' }]},
    { label:'Resumes', items:[{ key:'weekSummary', label:'Résumé semaine', help:'Bilan hebdomadaire.' }, { key:'monthSummary', label:'Résumé mois', help:'Synthèse mensuelle.' }]},
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok}/>}

      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <SectionTitle>Profil</SectionTitle>
          {editing
            ? <SaveBtn saving={savingProfile} onClick={handleSave}/>
            : <button onClick={()=>setEditing(true)} style={{ padding:'5px 12px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>Modifier</button>
          }
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:18 }}>
          <div onClick={()=>fileRef.current?.click()} style={{ width:68, height:68, borderRadius:16, background:'var(--bg-card2)', border:'2px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, overflow:'hidden' }}>
            {photo ? <img src={photo} alt="profil" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ textAlign:'center' as const }}><div style={{ fontSize:22 }}>📷</div><p style={{ fontSize:8, color:'var(--text-dim)', margin:0 }}>Photo</p></div>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
          </div>
          <div style={{ flex:1 }}>
            {editing ? (
              <><input value={profileData.full_name} onChange={e=>setProfileData(p=>({...p,full_name:e.target.value}))} placeholder="Nom / Prénom" style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', color:'var(--text)', outline:'none', width:'100%', marginBottom:6 }}/>
              <input value={profileData.email} disabled placeholder="Email" style={{ fontSize:12, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', color:'var(--text-dim)', outline:'none', width:'100%' }}/></>
            ) : (
              <><p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:'0 0 3px' }}>{profileData.full_name||'—'}</p><p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>{profileData.email||'—'}</p></>
            )}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          {[
            { label:'Taille', val:profileData.height_cm, key:'height_cm', unit:'cm', ph:'ex: 178' },
            { label:'Poids',  val:profileData.weight_kg, key:'weight_kg', unit:'kg', ph:'ex: 72' },
            { label:'IMC',    val:imc, key:'', unit:'', ph:'', readonly:true },
          ].map(f=>(
            <div key={f.label} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:11, padding:'10px 12px' }}>
              <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{f.label}</p>
              {editing && !f.readonly
                ? <input type="number" value={f.val} onChange={e=>setProfileData(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, background:'transparent', border:'none', color:'#00c8e0', outline:'none', width:'100%' }}/>
                : <p style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, color:'#00c8e0', margin:0 }}>{f.val||'—'} <span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)' }}>{f.unit}</span></p>
              }
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Bio</p>
          <textarea value={profileData.bio} onChange={e=>setProfileData(p=>({...p,bio:e.target.value}))} disabled={!editing} placeholder="Décris ton profil, tes objectifs..." rows={3} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none' as const, fontFamily:'DM Sans,sans-serif', lineHeight:1.6, opacity:editing?1:0.7 }}/>
        </div>
      </Card>

      <Card>
        <SectionTitle>Sports pratiqués</SectionTitle>
        {sports.length === 0 && <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic', margin:'0 0 12px', textAlign:'center' as const }}>Aucun sport — ajoutez vos disciplines</p>}
        {sports.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
            {sports.map(s=>(
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:SPORT_COLOR[s.sport]||'#888', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{SPORT_LABEL[s.sport]||s.sport}</p>
                  {s.since_date && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Depuis {sinceDate(s.since_date)}</p>}
                </div>
                <button onClick={()=>removeSport(s.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:13 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' as const }}>
          <select value={newSport} onChange={e=>setNewSport(e.target.value)} style={{ flex:1, minWidth:100, padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}>
            {Object.entries(SPORT_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={newSince} onChange={e=>setNewSince(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/>
          <button onClick={()=>{ if(newSport) addSport(newSport, newSince) }} style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const }}>+ Ajouter</button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Abonnement</SectionTitle>
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,179,64,0.08)', border:'1px solid rgba(255,179,64,0.25)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ padding:'2px 9px', borderRadius:20, background:'rgba(255,179,64,0.15)', border:'1px solid rgba(255,179,64,0.4)', color:'#ffb340', fontSize:11, fontWeight:700 }}>Essai gratuit</span>
                <span style={{ fontSize:11, color:'var(--text-dim)' }}>{trialLeft}/{trialDays} jours</span>
              </div>
              <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>Version Premium — accès complet</p>
            </div>
            <div style={{ display:'flex', gap:7, alignItems:'center' }}>
              <button onClick={()=>setPlanExpanded(!planExpanded)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:16, transform:planExpanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</button>
              <button onClick={()=>setUpgradeOpen(true)} style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>Upgrade</button>
            </div>
          </div>
          {planExpanded && <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,179,64,0.2)' }}>
            {['Suivi entrainements complet','Zones personnalisées','Analyse récupération','Blessures & historique'].map((f,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}><span style={{ color:'#22c55e', fontSize:11 }}>✓</span><span style={{ fontSize:12, color:'var(--text-mid)' }}>{f}</span></div>)}
          </div>}
        </div>
        <div style={{ height:5, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(trialLeft/trialDays)*100}%`, background:'linear-gradient(90deg,#ffb340,#f97316)', borderRadius:999 }}/>
        </div>
        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'5px 0 0', textAlign:'right' as const }}>{trialLeft} jours restants</p>

        {upgradeOpen && (
          <div onClick={()=>setUpgradeOpen(false)} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:560, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:0 }}>Choisir un abonnement</h3>
                <button onClick={()=>setUpgradeOpen(false)} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {PLANS.map(p=>(
                  <div key={p.id} style={{ padding:'16px', borderRadius:14, background:'var(--bg-card2)', border:`1px solid ${p.color}44` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:p.color }}>{p.label}</span>
                      <div style={{ textAlign:'right' as const }}>
                        <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{p.annual}</p>
                        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{p.monthly} · <span style={{ color:'#22c55e', fontWeight:600 }}>-{p.save}</span></p>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                      {p.features.map((f,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:p.color, fontSize:11 }}>✓</span><span style={{ fontSize:12, color:'var(--text-mid)' }}>{f}</span></div>)}
                    </div>
                    <button style={{ width:'100%', padding:'10px', borderRadius:10, background:`linear-gradient(135deg,${p.color},${p.color}bb)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>Choisir {p.label}</button>
                    <p style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' as const, margin:'6px 0 0' }}>Paiement sécurisé via Stripe</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Connexions externes</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {connections.map(c=>(
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 13px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', opacity:c.available?1:0.55 }}>
              <div style={{ flexShrink:0 }}><AppLogo id={c.id} size={28}/></div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{c.label}</p>
                  {!c.available
                    ? <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:'rgba(120,120,140,0.12)', color:'#9ca3af', fontWeight:600 }}>Bientôt</span>
                    : <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:c.connected?'rgba(34,197,94,0.12)':'rgba(120,120,140,0.12)', color:c.connected?'#22c55e':'#9ca3af', fontWeight:600 }}>{c.loading?'...':c.connected?'Connecté':'Non connecté'}</span>
                  }
                </div>
                {c.connected && c.lastSync && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Sync : {c.lastSync}</p>}
              </div>
              {c.available && (
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  {c.connected && <button onClick={()=>sync(c)} disabled={c.loading} style={{ padding:'4px 9px', borderRadius:7, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:10, fontWeight:600, cursor:'pointer' }}>↻</button>}
                  <button onClick={()=>c.connected?disconnect(c):connect(c)} disabled={c.loading} style={{ padding:'5px 11px', borderRadius:7, background:c.connected?'rgba(239,68,68,0.08)':'rgba(0,200,224,0.08)', border:`1px solid ${c.connected?'rgba(239,68,68,0.2)':'rgba(0,200,224,0.2)'}`, color:c.connected?'#ef4444':'#00c8e0', fontSize:10, fontWeight:600, cursor:'pointer', opacity:c.loading?0.5:1 }}>
                    {c.loading?'...':c.connected?'Déconnecter':'Connecter'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <SectionTitle>Notifications</SectionTitle>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>Tout</span>
            <Toggle value={notifs.globalOn} onChange={v=>setNotifs(p=>({...p,globalOn:v}))}/>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:notifs.globalOn?1:0.4, pointerEvents:notifs.globalOn?'auto':'none' }}>
          {NOTIF_SECTIONS.map(section=>(
            <div key={section.label} style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 10px' }}>{section.label}</p>
              {section.items.map(item=>(
                <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--text)' }}>{item.label}</span>
                    <HelpBtn title={item.label} content={<p style={{ margin:0 }}>{item.help}</p>}/>
                  </div>
                  <Toggle value={(notifs as any)[item.key]} onChange={v=>setNotifs(p=>({...p,[item.key]:v}))}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <SectionTitle>Suivi sommeil</SectionTitle>
          <HelpBtn title="Suivi sommeil" content={<p>Appuyez sur <strong>Lancer</strong> au coucher et <strong>Arrêter</strong> au réveil pour enregistrer la durée.</p>}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' as const }}>
          <button onClick={toggleSleep} style={{ padding:'11px 22px', borderRadius:11, background:sleepActive?'linear-gradient(135deg,#a855f7,#5b6fff)':'linear-gradient(135deg,#1e293b,#334155)', border:`1px solid ${sleepActive?'rgba(168,85,247,0.4)':'var(--border)'}`, color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            {sleepActive ? '⏹ Arrêter' : '🌙 Lancer le sommeil'}
          </button>
          {sleepActive && sleepStart && <div style={{ padding:'9px 13px', borderRadius:10, background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)' }}><p style={{ fontSize:11, color:'#a855f7', margin:'0 0 1px', fontWeight:600 }}>En cours</p><p style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text)', margin:0 }}>{sleepStart.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p></div>}
          {sleepDur && <div style={{ padding:'9px 13px', borderRadius:10, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}><p style={{ fontSize:11, color:'#22c55e', margin:'0 0 1px', fontWeight:600 }}>Dernière nuit</p><p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#22c55e', margin:0 }}>{sleepDur}</p></div>}
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// BLOC 2 — ZONES (avec sauvegarde Supabase)
// ════════════════════════════════════════════════
function ZonesBloc() {
  const { zoneData, setZoneData, saving, saveZone } = useTrainingZones()
  const [sport, setSport] = useState<ZoneSport>('bike')
  const [calcMode, setCalcMode] = useState(false)
  const [testVal, setTestVal] = useState('')
  const [saved, setSaved] = useState(false)

  const SPORT_TABS: {id:ZoneSport;label:string}[] = [
    {id:'bike',label:'Cyclisme'},{id:'run',label:'Running'},
    {id:'swim',label:'Natation'},{id:'rowing',label:'Aviron'},
    {id:'hyrox_row',label:'Hyrox — Rowing'},{id:'hyrox_ski',label:'Hyrox — SkiErg'},
  ]

  const UNIT: Record<ZoneSport,string> = { bike:'W', run:'/km', swim:'/100m', rowing:'/500m', hyrox_row:'/500m', hyrox_ski:'/500m' }
  const TEST_LABEL: Record<ZoneSport,string> = {
    bike:'Test 20 min — puissance moyenne (W)', run:'Record 10km (min:sec)',
    swim:'Record 400m (min:sec)', rowing:'Record 2000m (min:sec)',
    hyrox_row:'2000m Rowing — split /500m', hyrox_ski:'2000m SkiErg — split /500m'
  }

  const current = zoneData[sport]

  function update(patch: Partial<ZoneData>) {
    setZoneData(p => ({ ...p, [sport]: { ...p[sport], ...patch } }))
  }

  function updateZone(i: number, val: string) {
    const z = [...current.zones]; z[i] = val; update({ zones: z })
  }

  function parseTime(val: string): number {
    const p = val.split(':').map(Number)
    return p.length === 2 ? p[0]*60+p[1] : parseFloat(val)||0
  }

  function calculate() {
    const v = parseTime(testVal); if (!v) return
    let zones: string[] = [], sl1='', sl2='', ftp=''
    if (sport === 'bike') {
      const f = Math.round(v*0.95); ftp=`${f}`
      sl1=`${Math.round(f*0.75)}W`; sl2=`${Math.round(f*0.87)}W`
      zones=[`<${Math.round(f*0.55)}W`,`${Math.round(f*0.56)}-${Math.round(f*0.75)}W`,`${Math.round(f*0.76)}-${Math.round(f*0.87)}W`,`${Math.round(f*0.88)}-${Math.round(f*1.05)}W`,`>${Math.round(f*1.06)}W`]
    } else {
      const base = sport==='run' ? v/10 : v/4
      const s = (x:number) => `${Math.floor(x/60)}:${String(Math.round(x%60)).padStart(2,'0')}`
      sl1=s(base*1.10)+UNIT[sport]; sl2=s(base*1.01)+UNIT[sport]
      zones=[`>${s(base*1.25)}${UNIT[sport]}`,`${s(base*1.11)}-${s(base*1.25)}${UNIT[sport]}`,`${s(base*1.02)}-${s(base*1.10)}${UNIT[sport]}`,`${s(base*0.92)}-${s(base*1.01)}${UNIT[sport]}`,`<${s(base*0.91)}${UNIT[sport]}`]
    }
    update({ zones, sl1, sl2, ...(sport==='bike'?{ftp}:{}) })
  }

  async function handleSave() {
    await saveZone(sport, current)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <SectionTitle>Zones d'entraînement</SectionTitle>
            <HelpBtn title="SL1, SL2 et FTP" content={<><p><strong>SL1</strong> — Seuil Lactate 1. Fin Z2 / début Z3.</p><p><strong>SL2</strong> — Seuil Lactate 2. Fin Z3 / début Z4.</p><p><strong>FTP</strong> — Puissance seuil 60 min. Vélo uniquement.</p></>}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setCalcMode(false)} style={{ padding:'5px 11px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:!calcMode?'#00c8e0':'var(--border)', background:!calcMode?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:!calcMode?'#00c8e0':'var(--text-mid)', fontWeight:!calcMode?600:400 }}>Manuel</button>
            <button onClick={()=>setCalcMode(true)} style={{ padding:'5px 11px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:calcMode?'#00c8e0':'var(--border)', background:calcMode?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:calcMode?'#00c8e0':'var(--text-mid)', fontWeight:calcMode?600:400 }}>Calculateur</button>
            <SaveBtn saving={saving} onClick={handleSave}/>
          </div>
        </div>
        {saved && <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.25)', color:'#22c55e', fontSize:11, fontWeight:600, marginBottom:12 }}>Zones sauvegardées ✓</div>}

        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:18 }}>
          {SPORT_TABS.map(t=><button key={t.id} onClick={()=>setSport(t.id)} style={{ padding:'5px 11px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:sport===t.id?'#00c8e0':'var(--border)', background:sport===t.id?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:sport===t.id?'#00c8e0':'var(--text-mid)', fontWeight:sport===t.id?600:400 }}>{t.label}</button>)}
        </div>

        {calcMode && (
          <div style={{ padding:'13px 15px', borderRadius:11, background:'rgba(0,200,224,0.05)', border:'1px solid rgba(0,200,224,0.15)', marginBottom:18 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#00c8e0', margin:'0 0 9px' }}>{TEST_LABEL[sport]}</p>
            <div style={{ display:'flex', gap:8 }}>
              <input value={testVal} onChange={e=>setTestVal(e.target.value)} placeholder={sport==='bike'?'ex: 320':'ex: 37:20'} style={{ flex:1, padding:'7px 11px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}/>
              <button onClick={calculate} style={{ padding:'7px 16px', borderRadius:8, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Calculer</button>
            </div>
          </div>
        )}

        <div style={{ position:'relative', marginBottom:32 }}>
          <div style={{ display:'flex', gap:3, marginBottom:8 }}>
            {Z_COLORS.map((c,i)=><div key={i} style={{ flex:1, height:44, borderRadius:8, background:`${c}22`, border:`1px solid ${c}55`, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, fontWeight:700, color:c }}>Z{i+1}</span></div>)}
          </div>
          <div style={{ position:'absolute', top:-14, left:'calc(40% - 24px)', zIndex:10 }}>
            <div style={{ background:'var(--bg-card)', border:'2px solid #34d399', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#34d399', whiteSpace:'nowrap', position:'relative' }}>SL1<div style={{ position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'7px solid #34d399' }}/></div>
          </div>
          <div style={{ position:'absolute', top:-14, left:'calc(60% - 24px)', zIndex:10 }}>
            <div style={{ background:'var(--bg-card)', border:'2px solid #f97316', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#f97316', whiteSpace:'nowrap', position:'relative' }}>SL2<div style={{ position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'7px solid #f97316' }}/></div>
          </div>
          <div style={{ display:'flex', gap:3 }}>
            {Z_COLORS.map((c,i)=>(
              <div key={i} style={{ flex:1 }}>
                <p style={{ fontSize:8, fontWeight:600, color:'var(--text-dim)', textAlign:'center', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{Z_LABELS[i]}</p>
                <input value={current.zones[i]||''} onChange={e=>updateZone(i,e.target.value)} placeholder={UNIT[sport]} style={{ width:'100%', padding:'5px 4px', borderRadius:7, border:`1px solid ${c}44`, background:'var(--input-bg)', color:c, fontFamily:'DM Mono,monospace', fontSize:10, fontWeight:600, outline:'none', textAlign:'center' }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sport==='bike' && <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}><span style={{ fontSize:11, color:'var(--text-dim)', minWidth:40 }}>FTP</span><input value={current.ftp||''} onChange={e=>update({ftp:e.target.value})} placeholder="ex: 280" style={{ flex:1, padding:'5px 9px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600, outline:'none' }}/><span style={{ fontSize:11, color:'var(--text-dim)' }}>W</span></div>}
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'9px 13px', borderRadius:10, background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.2)' }}>
              <span style={{ fontSize:11, color:'#34d399', fontWeight:600, minWidth:30 }}>SL1</span>
              <input value={current.sl1||''} onChange={e=>update({sl1:e.target.value})} placeholder={`ex: 230${UNIT[sport]}`} style={{ flex:1, padding:'4px 8px', borderRadius:7, border:'1px solid rgba(52,211,153,0.25)', background:'var(--input-bg)', color:'#34d399', fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, outline:'none' }}/>
            </div>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'9px 13px', borderRadius:10, background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.2)' }}>
              <span style={{ fontSize:11, color:'#f97316', fontWeight:600, minWidth:30 }}>SL2</span>
              <input value={current.sl2||''} onChange={e=>update({sl2:e.target.value})} placeholder={`ex: 265${UNIT[sport]}`} style={{ flex:1, padding:'4px 8px', borderRadius:7, border:'1px solid rgba(249,115,22,0.25)', background:'var(--input-bg)', color:'#f97316', fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, outline:'none' }}/>
            </div>
          </div>
          {(sport==='hyrox_ski'||sport==='hyrox_row') && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:140 }}>
                <span style={{ fontSize:11, color:'var(--text-dim)' }}>Run Compromised</span>
                <HelpBtn title="Run Compromised" content={<p>Allure de course entre les stations Hyrox. Plus lente en raison de la fatigue accumulée.</p>}/>
              </div>
              <input value={current.runCompromised||''} onChange={e=>update({runCompromised:e.target.value})} placeholder="ex: 4:30/km" style={{ flex:1, padding:'5px 9px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, outline:'none' }}/>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// BLOC 3 — RECORDS (avec sauvegarde Supabase)
// ════════════════════════════════════════════════
function RecordsBloc() {
  const { records, palmares, saving, addRecord, addPalmares, getRecordsBySport, getPalmaresBySport } = useRecords()
  const [sport,      setSport]      = useState<SportType>('bike')
  const [addModal,   setAddModal]   = useState<{dist:string}|null>(null)
  const [addPalm,    setAddPalm]    = useState(false)
  const [yearFilter, setYearFilter] = useState('all')

  const SPORT_TABS: {id:SportType;label:string}[] = [
    {id:'bike',label:'Cyclisme'},{id:'run',label:'Running'},{id:'trail',label:'Trail'},
    {id:'triathlon',label:'Triathlon'},{id:'swim',label:'Natation'},{id:'rowing',label:'Aviron'},{id:'hyrox',label:'Hyrox'},
  ]
  const SPORT_DISTS: Record<string,string[]> = {
    bike:BIKE_DISTS, run:RUN_DISTS, trail:TRAIL_DISTS, triathlon:TRI_DISTS, swim:SWIM_DISTS, rowing:ROW_DISTS, hyrox:HYROX_CATS
  }
  const dists = SPORT_DISTS[sport]||[]
  const isBike = sport==='bike'
  const YEARS = ['all','2025','2024','2023','2022','2021','2020']

  function getSupabaseRecords(dist: string) {
    return getRecordsBySport(sport)
      .filter(r => r.distance_label===dist && (yearFilter==='all'||String(r.year)===yearFilter))
      .sort((a,b) => isBike ? (parseInt(b.performance)||0)-(parseInt(a.performance)||0) : a.performance.localeCompare(b.performance))
  }

  function getSupabasePalmares() {
    return getPalmaresBySport(sport)
      .filter(r => yearFilter==='all'||String(r.year)===yearFilter)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
        {SPORT_TABS.map(t=><button key={t.id} onClick={()=>setSport(t.id)} style={{ padding:'7px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:sport===t.id?SPORT_COLOR[t.id]:'var(--border)', background:sport===t.id?`${SPORT_COLOR[t.id]}18`:'var(--bg-card)', color:sport===t.id?SPORT_COLOR[t.id]:'var(--text-mid)', fontWeight:sport===t.id?700:400 }}>{t.label}</button>)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600 }}>Année :</span>
        <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:11, outline:'none', cursor:'pointer' }}>
          {YEARS.map(y=><option key={y} value={y}>{y==='all'?'Toutes':y}</option>)}
        </select>
        <button onClick={()=>setAddPalm(true)} style={{ marginLeft:'auto', padding:'6px 12px', borderRadius:8, background:'rgba(168,85,247,0.10)', border:'1px solid rgba(168,85,247,0.25)', color:'#a855f7', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Palmarès</button>
      </div>

      <Card>
        <SectionTitle>Records — {SPORT_LABEL[sport]||sport}</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {dists.map(dist=>{
            const recs = getSupabaseRecords(dist)
            const best = recs[0]
            return (
              <div key={dist} style={{ padding:'10px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-mid)', minWidth:76, flexShrink:0 }}>{dist}</span>
                  {best ? (
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#00c8e0' }}>{best.performance}{isBike?'W':''}</span>
                        {best.pace_s_km && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{Math.floor(best.pace_s_km/60)}:{String(best.pace_s_km%60).padStart(2,'0')}/km</span>}
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:best.event_type==='competition'?'rgba(0,200,224,0.12)':'rgba(34,197,94,0.12)', color:best.event_type==='competition'?'#00c8e0':'#22c55e', fontWeight:700 }}>{best.event_type}</span>
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{best.race_name||''}{best.race_name&&best.achieved_at?' · ':''}{best.achieved_at}</p>
                    </div>
                  ) : <span style={{ flex:1, fontSize:11, color:'var(--text-dim)', fontStyle:'italic' }}>Aucun record</span>}
                  <button onClick={()=>setAddModal({dist})} style={{ padding:'4px 9px', borderRadius:7, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>+</button>
                </div>
                {recs.length>1 && <div style={{ marginTop:7, paddingTop:7, borderTop:'1px solid var(--border)' }}>{recs.slice(1).map(r=><div key={r.id} style={{ display:'flex', gap:10, padding:'2px 0' }}><span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text-mid)' }}>{r.performance}{isBike?'W':''}</span><span style={{ fontSize:10, color:'var(--text-dim)' }}>{r.race_name||''}{r.race_name&&r.achieved_at?' · ':''}{r.achieved_at}</span></div>)}</div>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <SectionTitle>Palmarès — {SPORT_LABEL[sport]||sport}</SectionTitle>
          <button onClick={()=>setAddPalm(true)} style={{ padding:'5px 11px', borderRadius:8, background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', color:'#a855f7', fontSize:11, cursor:'pointer', fontWeight:600 }}>+ Ajouter</button>
        </div>
        {getSupabasePalmares().length===0 ? <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic', textAlign:'center', padding:'10px 0', margin:0 }}>Aucune entrée</p> : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {getSupabasePalmares().map(p=>(
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:800, color:'#a855f7' }}>#{p.overall_rank||'?'}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.race_name}</p>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{p.year} · {p.category} · {p.finish_time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {addModal && <AddRecordModal dist={addModal.dist} sport={sport} saving={saving} onClose={()=>setAddModal(null)} onSave={async e=>{await addRecord(sport,e);setAddModal(null)}}/>}
      {addPalm  && <AddPalmaresModal sport={sport} saving={saving} onClose={()=>setAddPalm(false)} onSave={async e=>{await addPalmares(sport,e);setAddPalm(false)}}/>}
    </div>
  )
}

function AddRecordModal({ dist, sport, saving, onClose, onSave }: { dist:string; sport:SportType; saving:boolean; onClose:()=>void; onSave:(e:RecordEntry)=>Promise<void> }) {
  const [perf,setPerf]=useState(''); const [date,setDate]=useState(today()); const [year,setYear]=useState('2025'); const [race,setRace]=useState(''); const [type,setType]=useState<'entrainement'|'competition'>('competition'); const [elev,setElev]=useState(''); const [swimT,setSwimT]=useState(''); const [bikeT,setBikeT]=useState(''); const [runT,setRunT]=useState('')
  const isBike=sport==='bike'; const distKm=RUN_KM[dist]; const pace=(sport==='run'||sport==='trail')&&distKm&&perf?calcPace(distKm,perf):''
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:440, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Record — {dist}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:15 }}>×</button>
        </div>
        <div style={{ display:'flex', gap:7, marginBottom:12 }}>
          {(['competition','entrainement'] as const).map(t=><button key={t} onClick={()=>setType(t)} style={{ flex:1, padding:'7px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:type===t?600:400, borderColor:type===t?'#00c8e0':'var(--border)', background:type===t?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:type===t?'#00c8e0':'var(--text-mid)' }}>{t}</button>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
          {[{label:isBike?'Puissance (W)':'Performance',value:perf,set:setPerf,ph:isBike?'ex: 380':'ex: 1:24:30',mono:true},{label:'Date',value:date,set:setDate,type:'date'},{label:'Année',value:year,set:setYear,ph:'2025'},{label:'Course / lieu',value:race,set:setRace,ph:`ex: ${dist}`}].map(f=>(
            <div key={f.label}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.label}</p><input type={f.type||'text'} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:f.mono?'DM Mono,monospace':'inherit', fontSize:12, outline:'none' }}/></div>
          ))}
        </div>
        {pace && <div style={{ padding:'7px 11px', borderRadius:8, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:10 }}><p style={{ fontSize:12, color:'#22c55e', margin:0, fontFamily:'DM Mono,monospace', fontWeight:600 }}>Allure : {pace}</p></div>}
        {sport==='trail' && <div style={{ marginBottom:10 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Dénivelé (D+)</p><input value={elev} onChange={e=>setElev(e.target.value)} placeholder="ex: 2400m" style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>}
        {sport==='triathlon' && <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>{[{l:'Natation',v:swimT,s:setSwimT},{l:'Vélo',v:bikeT,s:setBikeT},{l:'Course',v:runT,s:setRunT}].map(f=><div key={f.l}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.l}</p><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder="0:00:00" style={{ width:'100%', padding:'6px 7px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>)}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({id:uid(),distance:dist,perf,date,year,race:race||dist,type,pace:pace||undefined,elevation:elev||undefined,splits:(sport==='triathlon'&&(swimT||bikeT||runT))?{swim:swimT,bike:bikeT,run:runT}:undefined})} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Sauvegarde...':'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

function AddPalmaresModal({ sport, saving, onClose, onSave }: { sport:SportType; saving:boolean; onClose:()=>void; onSave:(e:PalmEntry)=>Promise<void> }) {
  const [race,setRace]=useState(''); const [year,setYear]=useState('2025'); const [rank,setRank]=useState(''); const [time,setTime]=useState(''); const [category,setCategory]=useState('Open'); const [showStations,setShowStations]=useState(false); const [stationTimes,setStationTimes]=useState<Record<string,string>>({}); const [runTime,setRunTime]=useState('')
  const isHyrox=sport==='hyrox'
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:420, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Palmarès — {SPORT_LABEL[sport]||sport}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:15 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:14 }}>
          {[{label:'Nom de la course',value:race,set:setRace,ph:'ex: Ironman Nice'},{label:'Année',value:year,set:setYear,ph:'2025'},{label:'Classement',value:rank,set:setRank,ph:'ex: 12 ou 12/450'},{label:'Temps total',value:time,set:setTime,ph:'ex: 9:45:00',mono:true},{label:'Catégorie',value:category,set:setCategory,ph:'Open / Pro / AG...'}].map(f=>(
            <div key={f.label}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.label}</p><input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:(f as any).mono?'DM Mono,monospace':'inherit', fontSize:12, outline:'none' }}/></div>
          ))}
        </div>
        {isHyrox && (
          <div style={{ marginBottom:14 }}>
            <button onClick={()=>setShowStations(!showStations)} style={{ padding:'7px 13px', borderRadius:9, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:11, fontWeight:600, cursor:'pointer', marginBottom:showStations?10:0, display:'flex', alignItems:'center', gap:6 }}>{showStations?'▾':'▸'} Temps stations</button>
            {showStations && (
              <div style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {HYROX_STATIONS.map((s,i)=><div key={s}><p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:3 }}>Station {i+1} — {s}</p><input value={stationTimes[s]||''} onChange={e=>setStationTimes(p=>({...p,[s]:e.target.value}))} placeholder="ex: 1:45" style={{ width:'100%', padding:'5px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>)}
                </div>
                <div style={{ marginTop:9 }}><p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:3 }}>Run compromised</p><input value={runTime} onChange={e=>setRunTime(e.target.value)} placeholder="ex: 32:10" style={{ width:'100%', padding:'5px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
              </div>
            )}
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({id:uid(),race,year,rank,time,category,stationTimes:isHyrox&&showStations?{...stationTimes,run:runTime}:undefined})} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#a855f7,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Sauvegarde...':'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
function ProfileContent() {
  const [tab, setTab] = useState<ProfileTab>('profil')
  const TABS = [
    { id:'profil'  as ProfileTab, label:'Profil',             color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
    { id:'zones'   as ProfileTab, label:'Zones',              color:'#f97316', bg:'rgba(249,115,22,0.10)' },
    { id:'records' as ProfileTab, label:'Records & Palmarès', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
  ]
  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Mon Profil</h1>
        <p style={{ fontSize:12, color:'var(--text-dim)', margin:'5px 0 0' }}>Profil · Zones · Records</p>
      </div>
      <div style={{ display:'flex', gap:7, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, minWidth:100, padding:'11px 14px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:tab===t.id?t.color:'var(--border)', background:tab===t.id?t.bg:'var(--bg-card)', color:tab===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:tab===t.id?700:400, boxShadow:'var(--shadow-card)', transition:'all 0.15s' }}>{t.label}</button>)}
      </div>
      {tab==='profil'  && <ProfilBloc/>}
      {tab==='zones'   && <ZonesBloc/>}
      {tab==='records' && <RecordsBloc/>}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding:'24px 28px' }}><div style={{ height:40, borderRadius:8, background:'var(--border)', marginBottom:12 }}/></div>}>
      <ProfileContent/>
    </Suspense>
  )
}
