'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

type ProfileTab    = 'profil' | 'notifications' | 'ia'
type OAuthProvider = 'strava' | 'wahoo' | 'polar' | 'withings'
type THWModel      = 'hermes' | 'athena' | 'zeus'

// ── Système de règles IA ─────────────────────────────────────
interface AiRule {
  id: string
  category: string
  rule_text: string
  active: boolean
  created_at: string
}

const RULE_CATEGORIES = [
  { id: 'response_style', label: 'Style',          color: '#5b6fff', icon: '💬', placeholder: 'Ex : Réponds de manière concise et directe' },
  { id: 'training',       label: 'Entraînement',   color: '#22c55e', icon: '🏋️', placeholder: 'Ex : Pas de squats avec charge lourde' },
  { id: 'health',         label: 'Santé',           color: '#ef4444', icon: '🩺', placeholder: 'Ex : Tendinite rotulienne genou droit, éviter les impacts' },
  { id: 'nutrition',      label: 'Nutrition',       color: '#f97316', icon: '🥗', placeholder: 'Ex : Végétarien, intolérant au lactose' },
  { id: 'schedule',       label: 'Organisation',    color: '#8b5cf6', icon: '📅', placeholder: 'Ex : Disponible uniquement le matin avant 7h30' },
  { id: 'other',          label: 'Autre',            color: '#6b7280', icon: '📌', placeholder: 'Ex : Toujours proposer des alternatives quand tu suggères un exercice' },
] as const

interface Connection {
  id: string; provider?: OAuthProvider; label: string
  connected: boolean; lastSync: string; loading: boolean; available: boolean
}

// ══════════════════════════════════════════════════
// HELPERS & CONSTANTS
// ══════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════
// APP LOGOS
// ══════════════════════════════════════════════════

function AppLogo({ id, size=28 }: { id:string; size?:number }) {
  const logos: Record<string,React.ReactNode> = {
    strava:    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02"/><path d="M11.214 13.828l2.084-4.116 2.089 4.116h3.066L13.298 3.656l-5.15 10.172h3.066z" fill="#FC4C02"/></svg>,
    wahoo:     <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#E8002D"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">WAHOO</text></svg>,
    polar:     <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#C40000"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">P</text></svg>,
    withings:  <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#00B5D8"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">W</text></svg>,
    apple_health:<svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FF2D55"/><path d="M12 6c.5-1.5 2-2.5 3.5-2 1.5.5 2 2 1.5 3.5L12 18 7 7.5C6.5 6 7 4.5 8.5 4c1.5-.5 3 .5 3.5 2z" fill="white"/></svg>,
    google_fit:<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#4285F4"/><path d="M12 6l1.5 3h3l-2.5 2 1 3-3-2-3 2 1-3-2.5-2h3z" fill="white"/></svg>,
    fitbit:    <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#00B0B9"/><circle cx="12" cy="8" r="1.5" fill="white"/><circle cx="12" cy="12" r="2" fill="white"/><circle cx="12" cy="16.5" r="1.5" fill="white"/></svg>,
    hrv4training:<svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#E53E3E"/><path d="M3 12h3l2-6 4 12 2-6h7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>,
    elite_hrv: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#2D3748"/><path d="M4 12h3l2-5 4 10 2-5h5" stroke="#68D391" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>,
    oura:      <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1A1A2E"/><circle cx="12" cy="12" r="5" stroke="#C4A35A" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="2" fill="#C4A35A"/></svg>,
    myfitnesspal:<svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#00B3E6"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">MFP</text></svg>,
    cronometer:<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#F5A623"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">C</text></svg>,
  }
  return <>{logos[id] ?? <div style={{ width:size, height:size, borderRadius:6, background:'var(--border)' }}/>}</>
}

// ══════════════════════════════════════════════════
// SHARED UI
// ══════════════════════════════════════════════════

function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)', marginBottom:12, ...style }}>{children}</div>
}
function CardTitle({ children, icon }: { children:React.ReactNode; icon?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:18 }}>
      {icon && <div style={{ width:30, height:30, borderRadius:9, background:'rgba(91,111,255,0.1)', border:'1px solid rgba(91,111,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', color:'#5b6fff', flexShrink:0 }}>{icon}</div>}
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{children}</p>
    </div>
  )
}
function SectionLabel({ children }: { children:React.ReactNode }) {
  return <p style={{ fontSize:10, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 10px' }}>{children}</p>
}
function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return <button onClick={()=>onChange(!value)} style={{ width:38, height:21, borderRadius:11, background:value?'#00c8e0':'rgba(120,120,140,0.3)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s' }}><div style={{ width:15, height:15, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:value?20:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/></button>
}
function InfoModal({ title, content, onClose }: { title:string; content:React.ReactNode; onClose:()=>void }) {
  return <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}><div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:24, maxWidth:420, width:'100%' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}><h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{title}</h3><button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button></div><div style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.7 }}>{content}</div></div></div>
}
function HelpBtn({ title, content }: { title:string; content:React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={()=>setOpen(true)} style={{ width:16, height:16, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:9, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>?</button>{open && <InfoModal title={title} content={content} onClose={()=>setOpen(false)}/>}</>
}
function Toast({ msg, ok }: { msg:string; ok:boolean }) {
  return <div style={{ position:'fixed', top:20, right:20, zIndex:999, padding:'12px 18px', borderRadius:12, background:ok?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', border:`1px solid ${ok?'rgba(34,197,94,0.4)':'rgba(239,68,68,0.4)'}`, color:ok?'#22c55e':'#ef4444', fontSize:13, fontWeight:600, backdropFilter:'blur(8px)' }}>{msg}</div>
}
function SaveBtn({ saving, onClick }: { saving:boolean; onClick:()=>void }) {
  return <button onClick={onClick} disabled={saving} style={{ padding:'7px 16px', borderRadius:10, background:saving?'var(--border)':'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, cursor:saving?'not-allowed':'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>{saving?'Sauvegarde...':'Sauvegarder ✓'}</button>
}

// Bottom-sheet overlay
function Sheet({ open, onClose, title, subtitle, children }: { open:boolean; onClose:()=>void; title:string; subtitle?:string; children:React.ReactNode }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(14px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:'24px 24px 0 0', border:'1px solid var(--border-mid)', borderBottom:'none', width:'100%', maxWidth:600, maxHeight:'92vh', overflowY:'auto', paddingBottom:40 }}>
        <div style={{ position:'sticky', top:0, background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'16px 20px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:10 }}>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, margin:0, color:'var(--text)' }}>{title}</p>
            {subtitle && <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--text-dim)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'20px 20px 0' }}>{children}</div>
      </div>
    </div>
  )
}

// Nav row (clickable list item with chevron)
function NavRow({ label, sub, icon, onClick }: { label:string; sub:string; icon:React.ReactNode; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', textAlign:'left' as const, width:'100%', transition:'background 0.14s' }}
      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-card)'}
      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-card2)'}
    >
      <div style={{ width:34, height:34, borderRadius:9, background:'rgba(91,111,255,0.1)', border:'1px solid rgba(91,111,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', color:'#5b6fff', flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{label}</p>
        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{sub}</p>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
}

// ══════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════

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

  function setLoading(id:string, v:boolean)   { setConnections(p=>p.map(c=>c.id===id?{...c,loading:v}:c)) }
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

function useProfile() {
  const supabase = createClient()
  const [data, setData] = useState({ full_name:'', bio:'', height_cm:'', weight_kg:'', email:'', avatar_url:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setData({
        full_name:  p?.full_name  ?? '',
        bio:        p?.bio        ?? '',
        height_cm:  p?.height_cm  ? String(p.height_cm) : '',
        weight_kg:  p?.weight_kg  ? String(p.weight_kg) : '',
        email:      user.email    ?? '',
        avatar_url: p?.avatar_url ?? '',
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
      avatar_url: data.avatar_url || null,
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
    const url = urlData.publicUrl
    // Persist URL in profiles table
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() })
    setData(prev => ({ ...prev, avatar_url: url }))
    return url
  }

  return { data, setData, saving, save, uploadAvatar }
}

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

// ══════════════════════════════════════════════════
// PROFIL BLOC — Onglet 1
// ══════════════════════════════════════════════════

function ProfilBloc() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { connections, connect, disconnect, sync, reload: reloadConn } = useConnections()
  const { data: profileData, setData: setProfileData, saving: savingProfile, save: saveProfile, uploadAvatar } = useProfile()
  const { sports, add: addSport, remove: removeSport } = useAthleteSports()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto]       = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [newSport, setNewSport] = useState('run')
  const [newSince, setNewSince] = useState('')
  const [toast, setToast]       = useState<{msg:string;ok:boolean}|null>(null)

  // Init photo from persisted avatar_url once profile loads
  useEffect(() => {
    if (profileData.avatar_url && !photo) setPhoto(profileData.avatar_url)
  }, [profileData.avatar_url])

  useEffect(() => {
    const status = searchParams.get('oauth'); const provider = searchParams.get('provider') ?? ''
    if (!status) return
    const MSGS: Record<string,{msg:string;ok:boolean}> = {
      connected: { msg:`${provider} connecté !`, ok:true }, denied: { msg:'Connexion annulée.', ok:false },
      error: { msg:'Erreur de connexion.', ok:false }, token_error: { msg:"Erreur d'authentification.", ok:false },
      invalid_state: { msg:'Erreur sécurité.', ok:false }, no_session: { msg:'Session expirée.', ok:false },
    }
    if (MSGS[status]) { setToast(MSGS[status]); setTimeout(()=>setToast(null),4000); reloadConn(); router.replace('/profile') }
  }, [searchParams, router, reloadConn])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    // Show local preview immediately
    const r = new FileReader(); r.onload = ev => setPhoto(ev.target?.result as string); r.readAsDataURL(f)
    setUploading(true)
    const url = await uploadAvatar(f)
    setUploading(false)
    if (url) {
      setPhoto(url)
    } else {
      setToast({ msg:"Erreur lors de l'envoi de la photo.", ok:false })
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function handleSave() {
    await saveProfile(); setEditing(false)
    setToast({ msg:'Profil sauvegardé !', ok:true }); setTimeout(()=>setToast(null), 3000)
  }

  const imc = profileData.height_cm && profileData.weight_kg
    ? (parseFloat(profileData.weight_kg)/((parseFloat(profileData.height_cm)/100)**2)).toFixed(1) : '—'

  const availableConns = connections.filter(c=>c.available)
  const soonConns      = connections.filter(c=>!c.available)

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok}/>}

      {/* ── Identité ──────────────────────────────────── */}
      <Card>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:22 }}>
          {/* Avatar */}
          <div onClick={()=>fileRef.current?.click()} style={{ width:76, height:76, borderRadius:22, background:'var(--bg-card2)', border:'2px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, overflow:'hidden', flexDirection:'column' as const, position:'relative' }}>
            {photo
              ? <img src={photo} alt="profil" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <><div style={{ fontSize:24 }}>📷</div><p style={{ fontSize:8, color:'var(--text-dim)', margin:'3px 0 0' }}>Photo</p></>
            }
            {uploading && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
          </div>

          {/* Name / email */}
          <div style={{ flex:1, minWidth:0 }}>
            {editing
              ? <input value={profileData.full_name} onChange={e=>setProfileData(p=>({...p,full_name:e.target.value}))} placeholder="Nom / Prénom" style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 10px', color:'var(--text)', outline:'none', width:'100%', marginBottom:7 }}/>
              : <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, margin:'0 0 4px', letterSpacing:'-0.02em', color:'var(--text)' }}>{profileData.full_name||'—'}</p>
            }
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>{profileData.email||'—'}</p>
          </div>

          {/* Edit/Save */}
          {editing
            ? <SaveBtn saving={savingProfile} onClick={handleSave}/>
            : <button onClick={()=>setEditing(true)} style={{ padding:'7px 16px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Modifier
              </button>
          }
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Taille', val:profileData.height_cm, key:'height_cm', unit:'cm', ph:'178' },
            { label:'Poids',  val:profileData.weight_kg, key:'weight_kg', unit:'kg', ph:'72' },
            { label:'IMC',    val:imc, key:'', unit:'', ph:'', readonly:true },
          ].map(f=>(
            <div key={f.label} style={{ padding:'13px 14px', borderRadius:14, background:'var(--bg-card2)', border:'1px solid var(--border)', textAlign:'center' as const }}>
              <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.09em', color:'var(--text-dim)', margin:'0 0 7px' }}>{f.label}</p>
              {editing && !f.readonly
                ? <input type="number" value={f.val} onChange={e=>setProfileData(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, background:'transparent', border:'none', color:'#00c8e0', outline:'none', width:'100%', textAlign:'center' as const }}/>
                : <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'#00c8e0', margin:0 }}>{f.val||'—'}</p>
              }
              {f.unit && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'3px 0 0' }}>{f.unit}</p>}
            </div>
          ))}
        </div>

        {/* Bio */}
        <SectionLabel>Bio</SectionLabel>
        <textarea
          value={profileData.bio}
          onChange={e=>setProfileData(p=>({...p,bio:e.target.value}))}
          disabled={!editing}
          placeholder="Décris ton profil, tes objectifs, ta pratique..."
          rows={3}
          style={{ width:'100%', padding:'11px 13px', borderRadius:12, border:'1px solid var(--border)', background:editing?'var(--input-bg)':'var(--bg-card2)', color:'var(--text)', fontSize:12.5, outline:'none', resize:'none' as const, fontFamily:'DM Sans,sans-serif', lineHeight:1.65, opacity:editing?1:0.75, boxSizing:'border-box' as const }}
        />
      </Card>

      {/* ── Sports pratiqués ─────────────────────────── */}
      <Card>
        <CardTitle icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}>Sports pratiqués</CardTitle>

        {sports.length === 0 && (
          <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic', margin:'0 0 14px', textAlign:'center' as const }}>Aucun sport — ajoute tes disciplines</p>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {sports.map(s=>(
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:SPORT_COLOR[s.sport]||'#888', flexShrink:0, boxShadow:`0 0 6px ${SPORT_COLOR[s.sport]||'#888'}66` }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{SPORT_LABEL[s.sport]||s.sport}</p>
                {s.since_date && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Depuis {sinceDate(s.since_date)}</p>}
              </div>
              <button onClick={()=>removeSport(s.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14, opacity:0.7, padding:'2px 6px' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
          <select value={newSport} onChange={e=>setNewSport(e.target.value)} style={{ flex:1, minWidth:110, padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}>
            {Object.entries(SPORT_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={newSince} onChange={e=>setNewSince(e.target.value)} style={{ padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/>
          <button onClick={()=>{ if(newSport) addSport(newSport, newSince) }} style={{ padding:'9px 16px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const }}>+ Ajouter</button>
        </div>
      </Card>

      {/* ── Connexions ───────────────────────────────── */}
      <Card>
        <CardTitle icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}>Connexions</CardTitle>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {availableConns.map(c=>(
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <div style={{ flexShrink:0 }}><AppLogo id={c.id} size={28}/></div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{c.label}</p>
                  <span style={{ fontSize:9, padding:'1px 7px', borderRadius:20, background:c.connected?'rgba(34,197,94,0.1)':'rgba(120,120,140,0.1)', color:c.connected?'#22c55e':'#9ca3af', fontWeight:600 }}>
                    {c.loading?'...' : c.connected?'Connecté':'Non connecté'}
                  </span>
                </div>
                {c.connected && c.lastSync && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>Dernière sync : {c.lastSync}</p>}
              </div>
              <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                {c.connected && <button onClick={()=>sync(c)} disabled={c.loading} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:11, fontWeight:600, cursor:'pointer' }}>↻</button>}
                <button onClick={()=>c.connected?disconnect(c):connect(c)} disabled={c.loading} style={{ padding:'5px 12px', borderRadius:8, background:c.connected?'rgba(239,68,68,0.07)':'rgba(0,200,224,0.08)', border:`1px solid ${c.connected?'rgba(239,68,68,0.2)':'rgba(0,200,224,0.2)'}`, color:c.connected?'#ef4444':'#00c8e0', fontSize:11, fontWeight:600, cursor:'pointer', opacity:c.loading?0.5:1 }}>
                  {c.loading?'...' : c.connected?'Déconnecter':'Connecter'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>Bientôt disponible</SectionLabel>
        <div style={{ display:'flex', flexWrap:'wrap' as const, gap:7 }}>
          {soonConns.map(c=>(
            <span key={c.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:20, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <AppLogo id={c.id} size={16}/>
              <span style={{ fontSize:11, color:'var(--text-dim)' }}>{c.label}</span>
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════
// NOTIFICATIONS BLOC — Onglet 2
// ══════════════════════════════════════════════════

type NotifKey =
  | 'sessionRemind' | 'morningProg' | 'sessionUpcoming'
  | 'hrv' | 'sleep' | 'fatigue'
  | 'meals' | 'hydration' | 'nutritionTiming'
  | 'weekSummary' | 'monthSummary' | 'progressionDetected'
  | 'aiSuggestions' | 'aiAnalysis' | 'dataReminder'

function NotificationsBloc() {
  const [globalOn, setGlobalOn] = useState(true)
  const [settings, setSettings] = useState<Record<NotifKey,boolean>>({
    sessionRemind: true,  morningProg: true,   sessionUpcoming: false,
    hrv: true,            sleep: false,         fatigue: true,
    meals: true,          hydration: false,     nutritionTiming: false,
    weekSummary: true,    monthSummary: false,  progressionDetected: true,
    aiSuggestions: true,  aiAnalysis: false,    dataReminder: false,
  })

  const toggle = (key: NotifKey) => setSettings(p=>({...p,[key]:!p[key]}))

  const SECTIONS: {
    label: string; color: string;
    icon: React.ReactNode;
    items: { key: NotifKey; label: string; sub: string }[]
  }[] = [
    {
      label:'Entraînement', color:'#00c8e0',
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
      items:[
        { key:'sessionRemind',    label:'Rappel séance',     sub:'Notification avant ta séance planifiée' },
        { key:'morningProg',      label:'Programme du matin',sub:'Reçois ton programme chaque matin' },
        { key:'sessionUpcoming',  label:'Séance à venir',    sub:'Alerte 1h avant une séance clé' },
      ],
    },
    {
      label:'Récupération', color:'#22c55e',
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>,
      items:[
        { key:'hrv',    label:'Rappel HRV',    sub:'Mesure HRV chaque matin au réveil' },
        { key:'sleep',  label:'Suivi sommeil', sub:'Rappel pour démarrer le chrono sommeil' },
        { key:'fatigue',label:'Alerte fatigue',sub:'Notification si ta charge dépasse le seuil' },
      ],
    },
    {
      label:'Nutrition', color:'#f97316',
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
      items:[
        { key:'meals',           label:'Rappel repas',         sub:'Alertes aux heures de repas' },
        { key:'hydration',       label:'Hydratation',          sub:'Rappels pour boire tout au long de la journée' },
        { key:'nutritionTiming', label:'Timing nutritionnel',  sub:'Conseils avant / après séance' },
      ],
    },
    {
      label:'Performance', color:'#a855f7',
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      items:[
        { key:'weekSummary',          label:'Résumé semaine',      sub:'Bilan hebdo de ta charge et progression' },
        { key:'monthSummary',         label:'Résumé mois',         sub:'Synthèse mensuelle de tes entraînements' },
        { key:'progressionDetected',  label:'Progression détectée',sub:'Alerte quand une amélioration est constatée' },
      ],
    },
    {
      label:'IA', color:'#5b6fff',
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.7"/></svg>,
      items:[
        { key:'aiSuggestions', label:'Suggestions IA',           sub:'THW Coach propose des actions à la volée' },
        { key:'aiAnalysis',    label:'Analyse disponible',       sub:'L\'IA a généré une nouvelle analyse' },
        { key:'dataReminder',  label:'Rappel compléter données', sub:'Données manquantes pour une meilleure analyse' },
      ],
    },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {/* Toggle global */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>Notifications</p>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>Activer ou désactiver toutes les notifications</p>
          </div>
          <Toggle value={globalOn} onChange={setGlobalOn}/>
        </div>
      </Card>

      {/* Sections */}
      <div style={{ opacity:globalOn?1:0.4, pointerEvents:globalOn?'auto':'none', transition:'opacity 0.2s', display:'flex', flexDirection:'column' }}>
        {SECTIONS.map(sec=>(
          <Card key={sec.label}>
            {/* Section header */}
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${sec.color}15`, border:`1px solid ${sec.color}33`, display:'flex', alignItems:'center', justifyContent:'center', color:sec.color, flexShrink:0 }}>
                {sec.icon}
              </div>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{sec.label}</p>
            </div>

            {/* Items */}
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {sec.items.map((item, idx)=>(
                <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderTop:idx>0?'1px solid var(--border)':'none' }}>
                  <div style={{ flex:1, paddingRight:12 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'var(--text)', margin:'0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize:10, color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{item.sub}</p>
                  </div>
                  <Toggle value={settings[item.key]} onChange={()=>toggle(item.key)}/>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// RÉGLAGES IA BLOC — Onglet 3
// ══════════════════════════════════════════════════

const PLANS = [
  { id:'premium', label:'Premium', monthly:'15€/mois', annual:'129€/an', save:'28%', color:'#00c8e0', features:['Toutes les fonctionnalités','Connexions apps (5)','Export PDF','Historique 1 an'] },
  { id:'pro',     label:'Pro',     monthly:'29€/mois', annual:'199€/an', save:'43%', color:'#a855f7', features:['Tout Premium','Connexions illimitées','Coach IA','Historique illimité'] },
  { id:'expert',  label:'Expert',  monthly:'49€/mois', annual:'349€/an', save:'41%', color:'#f97316', features:['Tout Pro','Multi-athlètes','Dashboard coach','API accès'] },
]

const MODEL_META = {
  hermes:{ color:'#d4a017', tagline:'Le modèle le plus rapide.', cost:1,
    desc:"Conçu pour répondre immédiatement, de manière simple et efficace. Il va droit au but et évite toute complexité inutile.",
    uses:['Une question simple','Un besoin rapide','Une décision immédiate'],
    levels:['Rapide','Clair','Direct'],
    effigy:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M8.5 6.5 Q12 4 15.5 6.5"/><path d="M9.5 10 Q10.5 13.5 12 11.5 Q13.5 9.5 14.5 13 Q13 16 12 14 Q10.5 12 9.5 10"/></svg>,
  },
  athena:{ color:'#5b6fff', tagline:'Le modèle principal de coaching intelligent.', cost:3,
    desc:"Elle analyse en profondeur, comprend le contexte de l'athlète et croise les données disponibles. Elle ne se contente pas de répondre : elle explique, enseigne et propose des améliorations concrètes.",
    uses:['Analyser une situation','Comprendre un problème','Optimiser un entraînement','Obtenir des conseils précis'],
    levels:['Structuré','Pédagogique','Intelligent'],
    effigy:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.5"/><path d="M6.5 8.5 Q4.5 6 5.5 3.5 Q8.5 2 12 4.5"/><path d="M17.5 8.5 Q19.5 6 18.5 3.5 Q15.5 2 12 4.5"/><path d="M9 12.5 Q8.5 16.5 10.5 18.5 Q12 20 13.5 18.5 Q15.5 16.5 15 12.5"/></svg>,
  },
  zeus:{ color:'#8b5cf6', tagline:'Le modèle le plus avancé.', cost:8,
    desc:"Il produit les réponses les plus complètes, les plus précises et les plus stratégiques. Il ne fait pas qu'expliquer : il démontre, structure et approfondit au maximum.",
    uses:['Une analyse très poussée','Une réflexion stratégique','Une vision globale','Une réponse complète et détaillée'],
    levels:['Très approfondi','Stratégique','Structuré','Premium'],
    effigy:<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.9"/></svg>,
  },
} satisfies Record<THWModel, { color:string; tagline:string; cost:number; desc:string; uses:string[]; levels:string[]; effigy:React.ReactNode }>

// ── Hook useAiRules ───────────────────────────────────────────
function useAiRules() {
  const supabase = createClient()
  const [rules,   setRules]   = useState<AiRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('ai_rules')
        .select('id,category,rule_text,active,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setRules((data ?? []) as AiRule[])
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addRule(category: string, ruleText: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('ai_rules')
      .insert({ user_id: user.id, category, rule_text: ruleText, active: true })
      .select('id,category,rule_text,active,created_at')
      .single()
    if (!error && data) setRules(p => [...p, data as AiRule])
  }

  async function toggleRule(id: string, active: boolean) {
    await supabase.from('ai_rules').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
    setRules(p => p.map(r => r.id === id ? { ...r, active } : r))
  }

  async function deleteRule(id: string) {
    await supabase.from('ai_rules').delete().eq('id', id)
    setRules(p => p.filter(r => r.id !== id))
  }

  return { rules, loading, addRule, toggleRule, deleteRule }
}

// ── Composant RulesCard ───────────────────────────────────────
function RulesCard() {
  const { rules, loading, addRule, toggleRule, deleteRule } = useAiRules()
  const [activeTab,    setActiveTab]    = useState<string>('all')
  const [showModal,    setShowModal]    = useState(false)
  const [modalStep,    setModalStep]    = useState<1|2>(1)
  const [selCategory,  setSelCategory]  = useState('')
  const [ruleText,     setRuleText]     = useState('')
  const [saving,       setSaving]       = useState(false)
  const [confirmDel,   setConfirmDel]   = useState<string|null>(null)
  const [hoveredId,    setHoveredId]    = useState<string|null>(null)

  const catMeta = (id: string) => RULE_CATEGORIES.find(c => c.id === id) ?? { label: id, color: '#6b7280', icon: '📌', placeholder: '' }

  const filtered = activeTab === 'all' ? rules : rules.filter(r => r.category === activeTab)

  function openModal() { setShowModal(true); setModalStep(1); setSelCategory(''); setRuleText('') }
  function closeModal() { setShowModal(false); setModalStep(1); setSelCategory(''); setRuleText('') }

  async function handleSave() {
    if (!selCategory || !ruleText.trim()) return
    setSaving(true)
    await addRule(selCategory, ruleText.trim())
    setSaving(false)
    closeModal()
  }

  async function handleDelete(id: string) {
    await deleteRule(id)
    setConfirmDel(null)
  }

  const TABS = [
    { id: 'all', label: 'Toutes', color: 'var(--text-mid)' },
    ...RULE_CATEGORIES.map(c => ({ id: c.id, label: c.label, color: c.color })),
  ]

  return (
    <>
      <style>{`
        @keyframes ruleSlideIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        .rule-row { animation: ruleSlideIn 0.18s ease both }
        .rules-tabs::-webkit-scrollbar { display:none }
      `}</style>

      <Card>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <CardTitle icon="📋">Mes règles</CardTitle>
          <button
            onClick={openModal}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:8,
              background:'linear-gradient(135deg,#00c8e0,#5b6fff)',
              border:'none', color:'#fff', fontSize:12, fontWeight:700,
              cursor:'pointer', flexShrink:0,
            }}
          >
            <span style={{ fontSize:16, lineHeight:1 }}>+</span> Ajouter
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 14px', lineHeight:1.5 }}>
          L'IA prend en compte ces règles dans chacune de ses réponses.
        </p>

        {/* Tabs catégories */}
        <div className="rules-tabs" style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, paddingBottom:2 }}>
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding:'5px 12px', borderRadius:20, border:`1px solid ${active ? t.color+'66' : 'var(--border)'}`,
                background: active ? t.color+'18' : 'transparent',
                color: active ? t.color : 'var(--text-dim)',
                fontSize:11, fontWeight: active ? 700 : 400,
                cursor:'pointer', whiteSpace:'nowrap' as const, flexShrink:0, transition:'all 0.15s',
              }}>{t.label}</button>
            )
          })}
        </div>

        {/* Liste des règles */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2].map(i => <div key={i} style={{ height:44, borderRadius:10, background:'var(--bg-card2)', opacity:0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center' as const, padding:'28px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28, opacity:0.4 }}>📋</span>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.55 }}>
              {activeTab === 'all'
                ? 'Aucune règle configurée. Ajoute des règles pour personnaliser le comportement de ton Coach IA.'
                : `Aucune règle dans la catégorie "${catMeta(activeTab).label}".`}
            </p>
            {activeTab === 'all' && (
              <button onClick={openModal} style={{ marginTop:4, padding:'8px 18px', borderRadius:20, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Ajouter ma première règle
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.map(rule => {
              const meta = catMeta(rule.category)
              return (
                <div
                  key={rule.id}
                  className="rule-row"
                  onMouseEnter={() => setHoveredId(rule.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 12px', borderRadius:10,
                    border:`1px solid ${rule.active ? meta.color+'22' : 'var(--border)'}`,
                    background: rule.active ? meta.color+'0a' : 'var(--bg-card2)',
                    transition:'all 0.15s', opacity: rule.active ? 1 : 0.55,
                  }}
                >
                  {/* Pastille */}
                  <div style={{ width:8, height:8, borderRadius:'50%', background: meta.color, flexShrink:0 }} />

                  {/* Texte + badge */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:'var(--text)', margin:0, lineHeight:1.4, wordBreak:'break-word' as const }}>{rule.rule_text}</p>
                    <span style={{
                      display:'inline-block', marginTop:3,
                      fontSize:9, fontWeight:600, padding:'1px 6px', borderRadius:4,
                      background: meta.color+'18', color: meta.color,
                    }}>{meta.icon} {meta.label}</span>
                  </div>

                  {/* Toggle + suppression */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <Toggle value={rule.active} onChange={v => void toggleRule(rule.id, v)} />
                    {(hoveredId === rule.id || confirmDel === rule.id) && (
                      confirmDel === rule.id ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => void handleDelete(rule.id)} style={{ padding:'3px 8px', borderRadius:6, background:'#ef4444', border:'none', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>Oui</button>
                          <button onClick={() => setConfirmDel(null)} style={{ padding:'3px 8px', borderRadius:6, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDel(rule.id)} title="Supprimer" style={{ width:22, height:22, borderRadius:6, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', color:'#ef4444', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Modal ajout de règle ──────────────────────── */}
      {showModal && (
        <div onClick={closeModal} style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 }}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'100%', maxWidth:480,
            background:'var(--bg-card)', borderRadius:'18px 18px 0 0',
            padding:'24px 20px 32px', boxShadow:'0 -8px 40px rgba(0,0,0,0.35)',
          }}>
            {/* Barre drag */}
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 20px' }} />

            {modalStep === 1 ? (
              <>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Ajouter une règle</p>
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 18px' }}>Choisis la catégorie de ta règle.</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {RULE_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setSelCategory(cat.id); setModalStep(2) }}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4,
                        padding:'14px 14px', borderRadius:12,
                        border:`1.5px solid ${cat.color}33`,
                        background:`${cat.color}0d`,
                        cursor:'pointer', textAlign:'left' as const, transition:'all 0.15s',
                      }}>
                      <span style={{ fontSize:20 }}>{cat.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize:10, color:'var(--text-dim)', lineHeight:1.4 }}>{cat.placeholder}</span>
                    </button>
                  ))}
                </div>
                <button onClick={closeModal} style={{ marginTop:16, width:'100%', padding:'11px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:13, cursor:'pointer' }}>Annuler</button>
              </>
            ) : (
              <>
                {/* Étape 2 — Rédaction */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <button onClick={() => setModalStep(1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:18, padding:0, lineHeight:1 }}>←</button>
                  <span style={{ fontSize:20 }}>{catMeta(selCategory).icon}</span>
                  <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:catMeta(selCategory).color, margin:0 }}>{catMeta(selCategory).label}</p>
                </div>
                <textarea
                  autoFocus
                  value={ruleText}
                  onChange={e => setRuleText(e.target.value.slice(0, 300))}
                  placeholder={catMeta(selCategory).placeholder}
                  rows={4}
                  style={{
                    width:'100%', padding:'12px 14px', borderRadius:12,
                    border:`1.5px solid ${catMeta(selCategory).color}44`,
                    background:'var(--input-bg)', color:'var(--text)',
                    fontSize:13, outline:'none', resize:'none' as const,
                    fontFamily:'DM Sans,sans-serif', lineHeight:1.65,
                    boxSizing:'border-box' as const,
                  }}
                />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6, marginBottom:16 }}>
                  <span style={{ fontSize:10, color: ruleText.length >= 280 ? '#ef4444' : 'var(--text-dim)' }}>{ruleText.length} / 300</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button
                    onClick={() => void handleSave()}
                    disabled={!ruleText.trim() || saving}
                    style={{
                      padding:'12px', borderRadius:10,
                      background: !ruleText.trim() ? 'var(--bg-card2)' : 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                      border:'none', color: !ruleText.trim() ? 'var(--text-dim)' : '#fff',
                      fontSize:13, fontWeight:700, cursor: !ruleText.trim() ? 'not-allowed' : 'pointer', transition:'all 0.15s',
                    }}
                  >{saving ? 'Enregistrement…' : 'Enregistrer la règle'}</button>
                  <button onClick={closeModal} style={{ padding:'11px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:13, cursor:'pointer' }}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function IASettingsBloc() {
  const trialLeft = 9; const trialDays = 14
  const dailyUsed = 23; const dailyMax = 80
  const weekUsed  = 87; const weekMax  = 400

  // Overlays
  const [modelsOpen,  setModelsOpen]  = useState(false)
  const [subOpen,     setSubOpen]     = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // AI settings — localStorage
  const [defaultModel,    setDefaultModel]    = useState<THWModel>('athena')
  const [creditSaving,    setCreditSaving]    = useState(false)
  const [allowSuggestions,setAllowSuggestions]= useState(true)

  useEffect(() => {
    const m  = localStorage.getItem('thw_ai_default_model')
    const cs = localStorage.getItem('thw_ai_credit_saving')
    const as = localStorage.getItem('thw_ai_allow_suggestions')
    if (m === 'hermes' || m === 'athena' || m === 'zeus') setDefaultModel(m)
    if (cs) setCreditSaving(cs === 'true')
    if (as) setAllowSuggestions(as !== 'false')
  }, [])

  function save(key:string, val:string) { localStorage.setItem(key, val) }

  // Data connection status (static indicators for now)
  const DATA_CONNECTIONS = [
    { label:'Planning', connected:true,  sub:'Séances et calendrier disponibles' },
    { label:'Nutrition',connected:false, sub:'Aucun repas enregistré aujourd\'hui' },
    { label:'Récupération',connected:true, sub:'HRV et métriques disponibles' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>

      {/* ── Overlay Modèles ───────────────────────────── */}
      <Sheet open={modelsOpen} onClose={()=>setModelsOpen(false)} title="Les modèles IA" subtitle="Trois niveaux pour chaque besoin">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {(Object.entries(MODEL_META) as [THWModel, typeof MODEL_META[THWModel]][]).map(([id, m])=>(
            <div key={id} style={{ borderRadius:16, border:`1px solid ${m.color}33`, background:`${m.color}08`, padding:'18px 18px 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:`${m.color}18`, border:`1px solid ${m.color}44`, display:'flex', alignItems:'center', justifyContent:'center', color:m.color, flexShrink:0 }}>{m.effigy}</div>
                  <div>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:m.color, margin:0, textTransform:'capitalize' as const }}>{id === 'athena' ? 'Athéna' : id.charAt(0).toUpperCase()+id.slice(1)}</p>
                    <p style={{ fontSize:11, color:'var(--text-dim)', margin:'1px 0 0', fontStyle:'italic' }}>{m.tagline}</p>
                  </div>
                </div>
                <div style={{ textAlign:'right' as const, flexShrink:0, paddingTop:2 }}>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:700, color:m.color, margin:0 }}>{m.cost}</p>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'1px 0 0' }}>crédit{m.cost>1?'s':''}</p>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:'var(--text-mid)', lineHeight:1.7, margin:'0 0 14px' }}>{m.desc}</p>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 7px' }}>À utiliser pour</p>
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                {m.uses.map((u,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'var(--text-mid)' }}>{u}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
                {m.levels.map((l,i)=>(
                  <span key={i} style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:`${m.color}14`, border:`1px solid ${m.color}33`, color:m.color, fontWeight:600 }}>{l}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', textAlign:'center' as const }}>
            <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:0, lineHeight:1.7 }}>
              Tous les modèles sont accessibles à tous.<br/>
              <span style={{ color:'var(--text-dim)' }}>La différence se fait sur les crédits.</span>
            </p>
          </div>
        </div>
      </Sheet>

      {/* ── Overlay Abonnement ────────────────────────── */}
      <Sheet open={subOpen} onClose={()=>setSubOpen(false)} title="Abonnement" subtitle="Plan actuel et utilisation des crédits">
        {/* Plan */}
        <div style={{ padding:'16px 18px', borderRadius:14, background:'rgba(255,179,64,0.07)', border:'1px solid rgba(255,179,64,0.28)', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ padding:'3px 10px', borderRadius:20, background:'rgba(255,179,64,0.15)', border:'1px solid rgba(255,179,64,0.4)', color:'#ffb340', fontSize:11, fontWeight:700 }}>Essai gratuit</span>
              </div>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:0, color:'var(--text)' }}>Version Premium</p>
              <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>Accès complet pendant l'essai</p>
            </div>
            <button onClick={()=>{ setSubOpen(false); setUpgradeOpen(true) }} style={{ padding:'9px 16px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const }}>Upgrade</button>
          </div>
          <div style={{ height:6, borderRadius:999, background:'rgba(255,179,64,0.15)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(trialLeft/trialDays)*100}%`, background:'linear-gradient(90deg,#ffb340,#f97316)', borderRadius:999 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            <span style={{ fontSize:10, color:'var(--text-dim)' }}>Essai en cours</span>
            <span style={{ fontSize:10, color:'#ffb340', fontWeight:600 }}>{trialLeft} jours restants sur {trialDays}</span>
          </div>
        </div>

        {/* Jauges */}
        <SectionLabel>Utilisation des crédits IA</SectionLabel>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
          {([
            { label:'Journalière',    used:dailyUsed, max:dailyMax, color:'#00c8e0', period:'jour' },
            { label:'Hebdomadaire', used:weekUsed,  max:weekMax,  color:'#5b6fff', period:'semaine' },
          ] as const).map(g=>{
            const pct = Math.min(100, Math.round((g.used/g.max)*100))
            const remaining = g.max - g.used
            return (
              <div key={g.label} style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{g.label}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:16, fontWeight:700, color:g.color }}>{g.used}</span>
                    <span style={{ fontSize:11, color:'var(--text-dim)' }}>/ {g.max}</span>
                  </div>
                </div>
                <div style={{ height:8, borderRadius:999, background:'var(--border)', overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${g.color},${g.color}bb)`, borderRadius:999, transition:'width 0.4s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, color:'var(--text-dim)' }}>{pct}% utilisé</span>
                  <span style={{ fontSize:10, color:'var(--text-mid)', fontWeight:600 }}>{remaining} crédit{remaining>1?'s':''} restant{remaining>1?'s':''}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'11px 14px', borderRadius:11, background:'rgba(91,111,255,0.06)', border:'1px solid rgba(91,111,255,0.15)' }}>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:0, lineHeight:1.6 }}>
            Plan <strong style={{ color:'var(--text)' }}>Pro</strong> : 400 crédits/semaine — <strong style={{ color:'var(--text)' }}>Expert</strong> : 800 crédits/semaine
          </p>
        </div>
      </Sheet>

      {/* ── Modal Upgrade ─────────────────────────────── */}
      {upgradeOpen && (
        <div onClick={()=>setUpgradeOpen(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
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

      {/* ── Nav : Modèles + Abonnement ────────────────── */}
      <Card>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <NavRow label="Modèles" sub="Hermès · Athéna · Zeus — crédits et usages"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.75"/></svg>}
            onClick={()=>setModelsOpen(true)}
          />
          <NavRow label="Abonnement" sub="Plan actuel · crédits journaliers et hebdo"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h2"/></svg>}
            onClick={()=>setSubOpen(true)}
          />
        </div>
      </Card>

      {/* ── Comportement ──────────────────────────────── */}
      <Card>
        <CardTitle icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>}>Comportement</CardTitle>

        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {[
            { label:'Mode économie de crédits', sub:"L'IA sélectionne automatiquement le modèle le plus adapté pour économiser des crédits", val:creditSaving, onChange:(v:boolean)=>{ setCreditSaving(v); save('thw_ai_credit_saving',String(v)) } },
            { label:'Autoriser les suggestions', sub:"THW Coach peut proposer des actions ou analyses proactives en dehors du chat", val:allowSuggestions, onChange:(v:boolean)=>{ setAllowSuggestions(v); save('thw_ai_allow_suggestions',String(v)) } },
          ].map((item, idx)=>(
            <div key={item.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 0', borderTop:idx>0?'1px solid var(--border)':'none' }}>
              <div style={{ flex:1, paddingRight:14 }}>
                <p style={{ fontSize:13, fontWeight:500, color:'var(--text)', margin:'0 0 2px' }}>{item.label}</p>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{item.sub}</p>
              </div>
              <Toggle value={item.val} onChange={item.onChange}/>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Modèle par défaut ─────────────────────────── */}
      <Card>
        <CardTitle icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.6"/></svg>}>Modèle par défaut</CardTitle>
        <div style={{ display:'flex', gap:8 }}>
          {([['hermes','Hermès','#d4a017'],['athena','Athéna','#5b6fff'],['zeus','Zeus','#8b5cf6']] as const).map(([id,label,color])=>{
            const active = defaultModel===id
            return (
              <button key={id} onClick={()=>{ setDefaultModel(id); save('thw_ai_default_model',id) }}
                style={{ flex:1, padding:'10px 6px', borderRadius:11, border:`1.5px solid ${active?`${color}66`:'var(--border)'}`, background:active?`${color}18`:'transparent', color:active?color:'var(--text-dim)', fontSize:12, fontWeight:active?700:500, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit', textAlign:'center' as const }}>
                <div style={{ fontSize:9, fontWeight:600, color:active?`${color}99`:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:2 }}>
                  {id==='hermes'?'Rapide':id==='athena'?'Équilibré':'Avancé'}
                </div>
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── Mes règles IA ─────────────────────────────── */}
      <RulesCard />

      {/* ── Connexion aux données ─────────────────────── */}
      <Card>
        <CardTitle icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}>Connexion aux données</CardTitle>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 12px', lineHeight:1.55 }}>L'IA accède à ces données pour personnaliser ses réponses.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {DATA_CONNECTIONS.map((d,idx)=>(
            <div key={idx} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:12, background:'var(--bg-card2)', border:`1px solid ${d.connected?'rgba(34,197,94,0.18)':'var(--border)'}` }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:d.connected?'#22c55e':'rgba(120,120,140,0.4)', flexShrink:0, boxShadow:d.connected?'0 0 6px rgba(34,197,94,0.5)':'none' }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 1px' }}>{d.label}</p>
                <p style={{ fontSize:10, color:d.connected?'var(--text-dim)':'var(--text-dim)', margin:0 }}>{d.sub}</p>
              </div>
              <span style={{ fontSize:10, fontWeight:600, color:d.connected?'#22c55e':'#9ca3af', flexShrink:0 }}>
                {d.connected ? '✓ Connecté' : '✗ Absent'}
              </span>
            </div>
          ))}
        </div>
        {DATA_CONNECTIONS.some(d=>!d.connected) && (
          <div style={{ marginTop:10, padding:'10px 13px', borderRadius:11, background:'rgba(91,111,255,0.07)', border:'1px solid rgba(91,111,255,0.18)' }}>
            <p style={{ fontSize:11, color:'var(--text-mid)', margin:0, lineHeight:1.55 }}>
              Des données manquent — complète les sections concernées dans l'app pour améliorer la qualité des réponses.
            </p>
          </div>
        )}
      </Card>

    </div>
  )
}

// ══════════════════════════════════════════════════
// PAGE PRINCIPALE — Navigation entre onglets
// ══════════════════════════════════════════════════

function ProfileContent() {
  const [tab, setTab] = useState<ProfileTab>('profil')

  const TABS: { id:ProfileTab; label:string; icon:React.ReactNode }[] = [
    {
      id:'profil', label:'Profil',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
    {
      id:'notifications', label:'Notifications',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    },
    {
      id:'ia', label:'Réglages IA',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.55"/></svg>,
    },
  ]

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 0 80px' }}>

      {/* Header */}
      <div style={{ padding:'28px 20px 0' }}>
        <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, margin:'0 0 4px', letterSpacing:'-0.02em', color:'var(--text)' }}>Mon Profil</p>
        <p style={{ fontSize:13, color:'var(--text-dim)', margin:'0 0 24px' }}>Paramètres · Coaching · Connexions</p>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:4, padding:'4px', borderRadius:14, background:'var(--bg-card2)', border:'1px solid var(--border)', marginBottom:20 }}>
          {TABS.map(t=>{
            const active = tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px 8px', borderRadius:11, border:'none', background:active?'var(--bg-card)':'transparent', color:active?'var(--text)':'var(--text-dim)', fontSize:12, fontWeight:active?700:500, cursor:'pointer', transition:'all 0.16s', fontFamily:'DM Sans,sans-serif', boxShadow:active?'0 1px 6px rgba(0,0,0,0.1)':'none' }}>
                <span style={{ opacity:active?1:0.55, display:'flex', flexShrink:0 }}>{t.icon}</span>
                <span style={{ whiteSpace:'nowrap' as const }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'0 12px' }}>
        {tab === 'profil'        && <ProfilBloc/>}
        {tab === 'notifications' && <NotificationsBloc/>}
        {tab === 'ia'            && <IASettingsBloc/>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding:40, color:'var(--text-dim)', textAlign:'center' as const }}>Chargement…</div>}>
      <ProfileContent/>
    </Suspense>
  )
}
