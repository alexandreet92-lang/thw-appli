'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { User, Bell, Zap, Moon, Apple, TrendingUp, Sparkles, Coins, Plug, Trophy, Settings, Package, Bike, Footprints, Target, Globe, MapPin, Shield, Lock, CreditCard, BarChart3, Dumbbell, LogOut, ChevronLeft, Palette, Sun, Monitor, Check, Ruler } from 'lucide-react'
import SubscriptionEmailModal from '@/components/subscription/SubscriptionEmailModal'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SlideView } from '@/components/ui/SlideView'
import { useI18n } from '@/lib/i18n'
import { LanguageSelector } from '@/components/i18n/LanguageSelector'
import { currentLocale } from '@/lib/i18n'

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

type OAuthProvider = 'strava' | 'wahoo' | 'polar' | 'withings'
type THWModel      = 'hermes' | 'athena' | 'zeus'
type ChatFontId    = 'dm_sans' | 'inter' | 'system' | 'serif' | 'mono'
type TFunc         = (key: string, vars?: Record<string, string | number>) => string

// ── Système de règles IA ─────────────────────────────────────
interface AiRule {
  id: string
  category: string
  rule_text: string
  active: boolean
  created_at: string
}

const CHAT_FONTS: { id: ChatFontId; label: string; family: string; preview: string }[] = [
  { id: 'dm_sans', label: 'DM Sans',  family: 'var(--font-body)',                                        preview: 'Analyse ta semaine et optimise ta charge.' },
  { id: 'inter',   label: 'Inter',    family: 'Inter, sans-serif',                                           preview: 'Analyse ta semaine et optimise ta charge.' },
  { id: 'system',  label: 'Système',  family: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',     preview: 'Analyse ta semaine et optimise ta charge.' },
  { id: 'serif',   label: 'Serif',    family: 'Georgia, Times New Roman, serif',                             preview: 'Analyse ta semaine et optimise ta charge.' },
  { id: 'mono',    label: 'Mono',     family: 'ui-monospace, SFMono-Regular, Menlo, monospace',              preview: 'Analyse ta semaine et optimise ta charge.' },
]

const RULE_CATEGORIES = [
  { id: 'response_style', label: 'Style',          color: '#5b6fff', icon: '💬', placeholder: 'Ex : Réponds de manière concise et directe' },
  { id: 'training',       label: 'Entraînement',   color: '#22c55e', icon: '🏋️', placeholder: 'Ex : Pas de squats avec charge lourde' },
  { id: 'health',         label: 'Santé',           color: '#ef4444', icon: '🩺', placeholder: 'Ex : Tendinite rotulienne genou droit, éviter les impacts' },
  { id: 'nutrition',      label: 'Nutrition',       color: '#f97316', icon: '🥗', placeholder: 'Ex : Végétarien, intolérant au lactose' },
  { id: 'schedule',       label: 'Organisation',    color: '#8b5cf6', icon: '📅', placeholder: 'Ex : Disponible uniquement le matin avant 7h30' },
  { id: 'other',          label: 'Autre',            color: '#6b7280', icon: '📌', placeholder: 'Ex : Toujours proposer des alternatives quand tu suggères un exercice' },
] as const

function categoryIcon(id: string, color = 'currentColor', size = 14): React.ReactNode {
  const p = { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'response_style': return <svg {...p}><path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H8l-2 2-2-2H3a1 1 0 01-1-1V3z"/></svg>
    case 'training':       return <svg {...p}><path d="M1 7h2m8 0h2M3 5v4m8-4v4M5 6h4v2H5z"/></svg>
    case 'health':         return <svg {...p}><path d="M7 11C4 9 2 7 2 5a2.5 2.5 0 015-1 2.5 2.5 0 015 1c0 2-2 4-5 6z"/><path d="M7 7V5m-1 1h2"/></svg>
    case 'nutrition':      return <svg {...p}><path d="M5 2v4c0 1.1.9 2 2 2s2-.9 2-2V2M7 8v4M4 12h6"/></svg>
    case 'schedule':       return <svg {...p}><circle cx="7" cy="7" r="5"/><path d="M7 4v3l2 2"/></svg>
    default:               return <svg {...p}><path d="M7 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 6l3.5-.5z"/></svg>
  }
}

interface Connection {
  id: string; provider?: OAuthProvider; label: string
  connected: boolean; lastSync: string; loading: boolean; available: boolean
}

// ══════════════════════════════════════════════════
// HELPERS & CONSTANTS
// ══════════════════════════════════════════════════

function today() { return new Date().toISOString().split('T')[0] }
function sinceDate(d: string, t: TFunc): string {
  const now = new Date(), dt = new Date(d)
  const m = (now.getFullYear()-dt.getFullYear())*12+now.getMonth()-dt.getMonth()
  const y = Math.floor(m/12), mo = m%12
  if (y===0) return t('profile.durMonths', { n: mo, s: mo>1?'s':'' })
  if (mo===0) return t('profile.durYears', { n: y, s: y>1?'s':'' })
  return t('profile.durYearsMonths', { y, ys: y>1?'s':'', mo, ms: mo>1?'s':'' })
}

const SPORT_LABEL: Record<string,string> = {
  run:'Running', bike:'Cyclisme', swim:'Natation', rowing:'Aviron',
  hyrox:'Hyrox', triathlon:'Triathlon', trail:'Trail', gym:'Musculation'
}
const SPORT_COLOR: Record<string,string> = {
  run:'#22c55e', bike:'#3b82f6', swim:'#38bdf8', rowing:'#14b8a6',
  hyrox:'#ef4444', triathlon:'#a855f7', trail:'#f97316', gym:'#f97316'
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

// Bulles légèrement grisées sur un fond quasi blanc (façon Claude).
const GREY_CARD = 'color-mix(in srgb, var(--text) 6%, var(--bg))'
const GREY_PAGE = 'color-mix(in srgb, var(--text) 1.5%, var(--bg))'

function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:GREY_CARD, border:'1px solid var(--border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)', marginBottom:12, ...style }}>{children}</div>
}
function CardTitle({ children, icon }: { children:React.ReactNode; icon?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      {icon && <span style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-mid)', flexShrink:0 }}>{icon}</span>}
      <p style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, color:'var(--text)', margin:0 }}>{children}</p>
    </div>
  )
}
function SectionLabel({ children }: { children:React.ReactNode }) {
  return <p style={{ fontSize:10, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 10px' }}>{children}</p>
}

// ── Primitives « façon Claude » pour le contenu des bulles ───────────
// Un seul niveau de carte (pas de carte-dans-carte), posée sur le fond de la
// sur-page, avec séparateurs fins entre les lignes.
function Section({ label, children, style }: { label?:string; children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={{ marginBottom:22, ...style }}>
      {label && <p style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 8px 4px' }}>{label}</p>}
      {children}
    </div>
  )
}
function Group({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:GREY_CARD, border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', ...style }}>{children}</div>
}
// Ligne dans une Group. `first` retire le séparateur du haut.
function Line({ first, onClick, align='center', children }: { first?:boolean; onClick?:()=>void; align?:'center'|'flex-start'; children:React.ReactNode }) {
  const base: React.CSSProperties = { display:'flex', alignItems:align, gap:12, padding:'13px 16px', borderTop:first?'none':'1px solid var(--border)', width:'100%', boxSizing:'border-box', textAlign:'left' as const }
  if (onClick) return <button onClick={onClick} style={{ ...base, background:'transparent', cursor:'pointer' }}>{children}</button>
  return <div style={base}>{children}</div>
}
// Intro descriptive sous le titre d'une bulle.
function Intro({ children }: { children:React.ReactNode }) {
  return <p style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.6, margin:'0 0 18px 2px' }}>{children}</p>
}
function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return <button onClick={()=>onChange(!value)} style={{ width:50, height:30, borderRadius:15, background:value?'var(--primary)':'var(--border-mid)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s' }}><div style={{ width:26, height:26, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:value?22:2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.35)' }}/></button>
}
function InfoModal({ title, content, onClose }: { title:string; content:React.ReactNode; onClose:()=>void }) {
  return <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}><div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:24, maxWidth:420, width:'100%' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}><h3 style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, margin:0 }}>{title}</h3><button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button></div><div style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.7 }}>{content}</div></div></div>
}
function HelpBtn({ title, content }: { title:string; content:React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={()=>setOpen(true)} style={{ width:16, height:16, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:9, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>?</button>{open && <InfoModal title={title} content={content} onClose={()=>setOpen(false)}/>}</>
}
function Toast({ msg, ok }: { msg:string; ok:boolean }) {
  return <div style={{ position:'fixed', top:20, right:20, zIndex:999, padding:'12px 18px', borderRadius:12, background:ok?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', border:`1px solid ${ok?'rgba(34,197,94,0.4)':'rgba(239,68,68,0.4)'}`, color:ok?'#22c55e':'#ef4444', fontSize:13, fontWeight:600, backdropFilter:'blur(8px)' }}>{msg}</div>
}
function SaveBtn({ saving, onClick }: { saving:boolean; onClick:()=>void }) {
  return <button onClick={onClick} disabled={saving} style={{ padding:'8px 16px', borderRadius:10, background:saving?'var(--border)':'var(--primary)', border:'none', color:saving?'var(--text-dim)':'var(--on-primary)', fontSize:12.5, cursor:saving?'not-allowed':'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>{saving?'Enregistrement…':'Enregistrer'}</button>
}

// Bottom-sheet overlay
function Sheet({ open, onClose, title, subtitle, children }: { open:boolean; onClose:()=>void; title:string; subtitle?:string; children:React.ReactNode }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(14px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:'24px 24px 0 0', border:'1px solid var(--border-mid)', borderBottom:'none', width:'100%', maxWidth:600, maxHeight:'92vh', overflowY:'auto', paddingBottom:40 }}>
        <div style={{ position:'sticky', top:0, background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'16px 20px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:10 }}>
          <div>
            <p style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, margin:0, color:'var(--text)' }}>{title}</p>
            {subtitle && <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--text-dim)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'20px 20px 0' }}>{children}</div>
      </div>
    </div>
  )
}

// Nav row (clickable list item with chevron) — pensé pour vivre dans une Group.
function NavRow({ label, sub, icon, onClick, first }: { label:string; sub:string; icon:React.ReactNode; onClick:()=>void; first?:boolean }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:first?'none':'1px solid var(--border)', background:'transparent', cursor:'pointer', textAlign:'left' as const, width:'100%', boxSizing:'border-box' as const }}>
      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-mid)', flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:0 }}>{label}</p>
        <p style={{ fontSize:11.5, color:'var(--text-dim)', margin:'2px 0 0' }}>{sub}</p>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
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
  const [data, setData] = useState({ full_name:'', bio:'', height_cm:'', weight_kg:'', bike_weight_kg:'', email:'', avatar_url:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setData({
        full_name:      p?.full_name      ?? '',
        bio:            p?.bio            ?? '',
        height_cm:      p?.height_cm      ? String(p.height_cm) : '',
        weight_kg:      p?.weight_kg      ? String(p.weight_kg) : '',
        bike_weight_kg: p?.bike_weight_kg ? String(p.bike_weight_kg) : '',
        email:          user.email        ?? '',
        avatar_url:     p?.avatar_url     ?? '',
      })
    }
    load()
  }, [])

  async function save(): Promise<string | null> {
    setSaving(true)
    // getSession() rafraîchit le token si besoin (getUser seul peut renvoyer null
    // sur token expiré → sauvegarde silencieusement perdue).
    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id ?? null
    if (!uid) { setSaving(false); return 'not-auth' }
    const { error } = await supabase.from('profiles').upsert({
      id:             uid,
      full_name:      data.full_name || null,
      bio:            data.bio       || null,
      height_cm:      data.height_cm      ? parseFloat(data.height_cm) : null,
      weight_kg:      data.weight_kg      ? parseFloat(data.weight_kg) : null,
      avatar_url:     data.avatar_url || null,
      updated_at:     new Date().toISOString(),
    })
    setSaving(false)
    return error?.message ?? null
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
// MATÉRIEL BLOC — vélos + chaussures (dans l'onglet Profil)
// ══════════════════════════════════════════════════

interface GearStatsT { total_sessions: number; total_km: number; total_hours: number }
interface BikeT { id: string; name: string; brand: string | null; model: string | null; weight_kg: number | null; stats?: GearStatsT }
interface ShoeT { id: string; name: string; brand: string | null; stats?: GearStatsT }

const fmtFR = (n: number) => n.toLocaleString(currentLocale())
const ZERO_STATS: GearStatsT = { total_sessions: 0, total_km: 0, total_hours: 0 }

function GearBloc() {
  const { t } = useI18n()
  const statsLine = (s: GearStatsT) => t('profile.gearStats', {
    sessions: fmtFR(s.total_sessions), s: s.total_sessions > 1 ? 's' : '',
    km: fmtFR(s.total_km), hours: fmtFR(s.total_hours),
  })
  const [bikes, setBikes] = useState<BikeT[]>([])
  const [shoes, setShoes] = useState<ShoeT[]>([])
  const [modal, setModal] = useState<null | 'bike' | 'shoes'>(null)
  const [form, setForm] = useState({ name: '', brand: '', model: '', weight: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<null | { type: 'bike' | 'shoes'; id: string; label: string }>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/gear')
      if (!r.ok) return
      const j = await r.json() as { bikes?: BikeT[]; shoes?: ShoeT[] }
      setBikes(j.bikes ?? [])
      setShoes(j.shoes ?? [])
    } catch { /* silencieux */ }
  }, [])
  useEffect(() => { void load() }, [load])

  const openAdd = (type: 'bike' | 'shoes') => { setForm({ name: '', brand: '', model: '', weight: '' }); setModal(type) }

  const submit = async () => {
    if (!form.name.trim() || saving) return
    if (modal === 'bike' && form.weight) {
      const w = Number(form.weight.replace(',', '.'))
      if (!Number.isFinite(w) || w <= 0 || w > 30) return
    }
    setSaving(true)
    const data = modal === 'bike'
      ? { name: form.name, brand: form.brand, model: form.model, weight_kg: form.weight ? Number(form.weight.replace(',', '.')) : undefined }
      : { name: form.name, brand: form.brand }
    try {
      const r = await fetch('/api/gear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: modal, data }) })
      if (r.ok) { setModal(null); await load() }
    } finally { setSaving(false) }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    const c = confirmDel
    setConfirmDel(null)
    await fetch('/api/gear', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: c.type, id: c.id }) }).catch(() => {})
    await load()
  }

  const gearRow = (icon: React.ReactNode, title: string, sub: string, onDel: () => void, first: boolean) => (
    <Line first={first} align="flex-start">
      <span style={{ color: 'var(--text-mid)', display: 'flex', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>{sub}</p>
      </div>
      <button onClick={onDel} aria-label={t('profile.delete')} style={{ width: 24, height: 24, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}>✕</button>
    </Line>
  )

  const addBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick}
      style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 12, border: '1px dashed var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
    >{label}</button>
  )

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', marginBottom: 10 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.gearIntro')}</Intro>

      <Section label={t('profile.bikes')}>
        <Group>
          {bikes.length === 0
            ? <Line first><span style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>{t('profile.noBike')}</span></Line>
            : bikes.map((b, i) => gearRow(
                <Bike size={18} />,
                `${b.name}${b.weight_kg ? `  ·  ${String(b.weight_kg).replace('.', ',')} kg` : ''}`,
                statsLine(b.stats ?? ZERO_STATS),
                () => setConfirmDel({ type: 'bike', id: b.id, label: b.name }),
                i === 0,
              ))}
        </Group>
        {addBtn(t('profile.addBike'), () => openAdd('bike'))}
      </Section>

      <Section label={t('profile.runningShoes')}>
        <Group>
          {shoes.length === 0
            ? <Line first><span style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>{t('profile.noShoes')}</span></Line>
            : shoes.map((s, i) => gearRow(
                <Footprints size={18} />,
                `${s.name}${s.brand ? `  ·  ${s.brand}` : ''}`,
                statsLine(s.stats ?? ZERO_STATS),
                () => setConfirmDel({ type: 'shoes', id: s.id, label: s.name }),
                i === 0,
              ))}
        </Group>
        {addBtn(t('profile.addShoes'), () => openAdd('shoes'))}
      </Section>

      {/* Modal d'ajout */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-mid)', padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>
              {modal === 'bike' ? t('profile.addBikeTitle') : t('profile.addShoesTitle')}
            </h3>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('profile.namePh')} style={inputStyle} />
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder={t('profile.brandPh')} style={inputStyle} />
            {modal === 'bike' && <>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder={t('profile.modelPh')} style={inputStyle} />
              <input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder={t('profile.weightPh')} inputMode="decimal" style={inputStyle} />
            </>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('profile.cancel')}</button>
              <button onClick={() => void submit()} disabled={!form.name.trim() || saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: form.name.trim() && !saving ? 'var(--primary)' : 'var(--border)', color: form.name.trim() && !saving ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: form.name.trim() && !saving ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1 }}>
                {saving ? '…' : t('profile.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-mid)', padding: 22 }}>
            <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 6px', fontWeight: 600 }}>{t('profile.confirmDeleteGear', { label: confirmDel.label })}</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 16px', lineHeight: 1.5 }}>{t('profile.gearRemovedInfo')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('profile.cancel')}</button>
              <button onClick={() => void doDelete()} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('profile.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
// PROFIL — Identité (bulle « Profil »)
// ══════════════════════════════════════════════════

function ProfilIdentityBloc() {
  const { t } = useI18n()
  const { data: profileData, setData: setProfileData, save: saveProfile, uploadAvatar } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<() => Promise<void>>(async () => {})

  const [photo, setPhoto]       = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]       = useState<{msg:string;ok:boolean}|null>(null)

  // Init photo from persisted avatar_url once profile loads
  useEffect(() => {
    if (profileData.avatar_url && !photo) setPhoto(profileData.avatar_url)
  }, [profileData.avatar_url])

  // Le bouton ✓ flottant de l'en-tête déclenche l'enregistrement.
  // saveRef pointe TOUJOURS vers le dernier handleSave (données à jour) : sans
  // ça, le listener capturait une closure figée sur le `data` initial (vide) et
  // écrasait le profil avec des null à chaque enregistrement.
  saveRef.current = handleSave
  useEffect(() => {
    const onSave = () => { void saveRef.current() }
    window.addEventListener('thw:profile-save', onSave)
    return () => window.removeEventListener('thw:profile-save', onSave)
  }, [])

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
      setToast({ msg:t('profile.photoUploadError'), ok:false })
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function handleSave() {
    const err = await saveProfile()
    if (err) { setToast({ msg:t('profile.photoUploadError'), ok:false }); setTimeout(()=>setToast(null), 4000) }
    else { setToast({ msg:t('profile.profileSaved'), ok:true }); setTimeout(()=>setToast(null), 2500) }
  }

  const imc = profileData.height_cm && profileData.weight_kg
    ? (parseFloat(profileData.weight_kg)/((parseFloat(profileData.height_cm)/100)**2)).toFixed(1) : '—'

  const STATS: { label:string; val:string; key:string; unit:string; ph:string; readonly?:boolean }[] = [
    { label:t('profile.height'),     val:profileData.height_cm,      key:'height_cm',      unit:'cm', ph:'178' },
    { label:t('profile.weight'),     val:profileData.weight_kg,      key:'weight_kg',      unit:'kg', ph:'72' },
    { label:t('profile.imc'),        val:imc,                        key:'',               unit:'',   ph:'', readonly:true },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok}/>}

      {/* ── Identité ──────────────────────────────────── */}
      <Section>
        <Group>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div onClick={()=>fileRef.current?.click()} style={{ width:66, height:66, borderRadius:'50%', background:'linear-gradient(140deg,var(--bg-card2),var(--bg-card))', border:'2px solid var(--border)', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', position:'relative' }}>
                {photo
                  ? <img src={photo} alt={t('profile.profileAlt')} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ fontSize:22, opacity:0.45 }}>📷</span>
                }
                {uploading && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
              </div>
              <div onClick={()=>fileRef.current?.click()} aria-hidden style={{ position:'absolute', right:-2, bottom:-2, width:24, height:24, borderRadius:'50%', background:'var(--primary)', border:'2px solid var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.22)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary,#fff)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <input value={profileData.full_name} onChange={e=>setProfileData(p=>({...p,full_name:e.target.value}))} placeholder={t('profile.namePlaceholder')} style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, background:'transparent', border:'none', padding:0, color:'var(--text)', outline:'none', width:'100%', marginBottom:3, boxSizing:'border-box' as const }}/>
              <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profileData.email||'—'}</p>
            </div>
          </div>
        </Group>
        <p style={{ fontSize:12, color:'var(--text-dim)', margin:'8px 2px 0', lineHeight:1.5 }}>{t('profile.photoHint')}</p>
      </Section>

      {/* ── Mensurations ─────────────────────────────── */}
      <Section label={t('profile.measurements')}>
        <Group>
          {STATS.map((f, i) => (
            <Line key={f.label} first={i===0}>
              <span style={{ flex:1, fontSize:15, color:'var(--text)' }}>{f.label}</span>
              {f.readonly
                ? <span style={{ fontSize:15, fontWeight:600, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{f.val || '—'}</span>
                : <span style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <input type="number" value={f.val} onChange={e=>setProfileData(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{ width:64, fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', color:'var(--text)', outline:'none', textAlign:'right' as const }}/>
                    {f.unit && <span style={{ fontSize:12.5, color:'var(--text-dim)', width:18 }}>{f.unit}</span>}
                  </span>
              }
            </Line>
          ))}
        </Group>
      </Section>

      {/* ── Bio ──────────────────────────────────────── */}
      <Section label={t('profile.bio')}>
        <Group>
          <textarea
            value={profileData.bio}
            onChange={e=>setProfileData(p=>({...p,bio:e.target.value}))}
            placeholder={t('profile.bioPlaceholder')}
            rows={3}
            style={{ width:'100%', padding:'14px 16px', border:'none', background:'transparent', color:'var(--text)', fontSize:14, outline:'none', resize:'none' as const, fontFamily:'var(--font-body)', lineHeight:1.6, boxSizing:'border-box' as const, display:'block' }}
          />
        </Group>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════
// SPORTS PRATIQUÉS (bulle « Sports »)
// ══════════════════════════════════════════════════

function SportsBloc() {
  const { t } = useI18n()
  const { sports, add: addSport, remove: removeSport } = useAthleteSports()
  const [newSport, setNewSport] = useState('run')
  const [newSince, setNewSince] = useState('')

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <Intro>{t('profile.sportsIntro')}</Intro>

      <Section label={t('profile.mySports')}>
        <Group>
          {sports.length === 0 && (
            <Line first><span style={{ fontSize:13.5, color:'var(--text-dim)' }}>{t('profile.noSports')}</span></Line>
          )}
          {sports.map((s,i)=>(
            <Line key={s.id} first={i===0}>
              <span style={{ width:9, height:9, borderRadius:'50%', background:SPORT_COLOR[s.sport]||'var(--text-dim)', flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:0 }}>{SPORT_LABEL[s.sport] ? t('profile.sportName.'+s.sport) : s.sport}</p>
                {s.since_date && <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{t('profile.since')} {sinceDate(s.since_date, t)}</p>}
              </div>
              <button onClick={()=>removeSport(s.id)} aria-label={t('profile.remove')} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:15, padding:'2px 6px', flexShrink:0 }}>✕</button>
            </Line>
          ))}
        </Group>
      </Section>

      <Section label={t('profile.addSport')}>
        <Group>
          <Line first>
            <span style={{ flex:1, fontSize:15, color:'var(--text)' }}>{t('profile.discipline')}</span>
            <select value={newSport} onChange={e=>setNewSport(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13.5, outline:'none' }}>
              {Object.keys(SPORT_LABEL).map(k=><option key={k} value={k}>{t('profile.sportName.'+k)}</option>)}
            </select>
          </Line>
          <Line>
            <span style={{ flex:1, fontSize:15, color:'var(--text)' }}>{t('profile.since')}</span>
            <input type="date" value={newSince} onChange={e=>setNewSince(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13.5, outline:'none' }}/>
          </Line>
        </Group>
        <button onClick={()=>{ if(newSport) addSport(newSport, newSince) }} style={{ marginTop:12, width:'100%', padding:'12px', borderRadius:12, background:'var(--primary)', border:'none', color:'var(--on-primary)', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('profile.addThisSport')}</button>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════
// CONNEXIONS (bulle « Connexions »)
// ══════════════════════════════════════════════════

function ConnexionsBloc() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { connections, connect, disconnect, sync, reload: reloadConn } = useConnections()
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null)

  useEffect(() => {
    const status = searchParams.get('oauth'); const provider = searchParams.get('provider') ?? ''
    if (!status) return
    const MSGS: Record<string,{msg:string;ok:boolean}> = {
      connected: { msg:t('profile.connConnected', { provider }), ok:true }, denied: { msg:t('profile.connCancelled'), ok:false },
      error: { msg:t('profile.connError'), ok:false }, token_error: { msg:t('profile.connAuthError'), ok:false },
      invalid_state: { msg:t('profile.connSecurityError'), ok:false }, no_session: { msg:t('profile.connSessionExpired'), ok:false },
    }
    if (MSGS[status]) { setToast(MSGS[status]); setTimeout(()=>setToast(null),4000); reloadConn(); router.replace('/profile') }
  }, [searchParams, router, reloadConn, t])

  const availableConns = connections.filter(c=>c.available)

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok}/>}
      <Intro>{t('profile.connIntro')}</Intro>

      <Section label={t('profile.applications')}>
        <Group>
          {availableConns.map((c,i)=>(
            <Line key={c.id} first={i===0}>
              <span style={{ flexShrink:0, display:'flex' }}><AppLogo id={c.id} size={28}/></span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:0 }}>{c.label}</p>
                <p style={{ fontSize:11, color:c.connected?'#22c55e':'var(--text-dim)', margin:'2px 0 0' }}>
                  {c.loading?'…' : c.connected?(c.lastSync?t('profile.connectedSync', { date: c.lastSync }):t('profile.connected')):t('profile.notConnected')}
                </p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {c.connected && <button onClick={()=>sync(c)} disabled={c.loading} style={{ padding:'6px 10px', borderRadius:8, background:'var(--primary-dim)', border:'1px solid var(--primary)', color:'var(--primary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>↻</button>}
                <button onClick={()=>c.connected?disconnect(c):connect(c)} disabled={c.loading} style={{ padding:'6px 12px', borderRadius:8, background:'transparent', border:`1px solid ${c.connected?'rgba(239,68,68,0.4)':'var(--primary)'}`, color:c.connected?'#ef4444':'var(--primary)', fontSize:12, fontWeight:600, cursor:'pointer', opacity:c.loading?0.5:1 }}>
                  {c.loading?'…' : c.connected?t('profile.disconnect'):t('profile.connect')}
                </button>
              </div>
            </Line>
          ))}
        </Group>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════
// NOTIFICATIONS BLOC — Onglet 2
// ══════════════════════════════════════════════════

// Catalogue exhaustif des notifications. Clés STABLES "categorie.nom".
interface NotifItem { key: string; label: string; sub: string; def: boolean }
interface NotifCategory { id: string; label: string; color: string; Icon: typeof Zap; items: NotifItem[] }

const NOTIF_CATEGORIES: NotifCategory[] = [
  { id:'entrainement', label:'Entraînement', color:'#06B6D4', Icon: Zap, items:[
    { key:'entrainement.rappel_seance',        label:'Rappel séance',          sub:'Avant ta séance planifiée', def:true },
    { key:'entrainement.programme_matin',      label:'Programme du matin',     sub:'Ton briefing chaque matin', def:true },
    { key:'entrainement.seance_a_venir',       label:'Séance à venir',         sub:'Alerte ~1h avant une séance clé', def:false },
    { key:'entrainement.nouveau_plan',         label:'Nouveau plan',           sub:"Un plan d'entraînement est prêt", def:true },
    { key:'entrainement.rappel_enregistrement',label:"Rappel d'enregistrement",sub:'Pense à enregistrer ta séance manuelle', def:false },
    { key:'entrainement.test_suggere',         label:'Test suggéré',           sub:'Un test de performance est recommandé', def:false },
  ]},
  { id:'recuperation', label:'Récupération', color:'#22c55e', Icon: Moon, items:[
    { key:'recuperation.rappel_hrv',          label:'Rappel HRV',             sub:'Mesure HRV au réveil', def:true },
    { key:'recuperation.suivi_sommeil',       label:'Suivi sommeil',          sub:'Rappel pour lancer le suivi du sommeil', def:false },
    { key:'recuperation.alerte_fatigue',      label:'Alerte fatigue',         sub:'TSB trop bas / charge excessive', def:true },
    { key:'recuperation.recup_recommandee',   label:'Récupération recommandée',sub:'Repos conseillé détecté', def:true },
    { key:'recuperation.conseils_post_seance',label:'Conseils post-séance',   sub:'Recommandations après une séance dure', def:false },
  ]},
  { id:'nutrition', label:'Nutrition', color:'#f97316', Icon: Apple, items:[
    { key:'nutrition.rappel_repas',        label:'Rappel repas',         sub:'Alertes aux heures de repas', def:false },
    { key:'nutrition.hydratation',         label:'Hydratation',          sub:'Rappels pour boire dans la journée', def:false },
    { key:'nutrition.timing_nutritionnel', label:'Timing nutritionnel',  sub:'Conseils avant / après séance', def:false },
    { key:'nutrition.recharge_glucidique', label:'Recharge glucidique',  sub:'Avant une compétition', def:true },
    { key:'nutrition.plan_nutrition',      label:'Plan nutritionnel',    sub:'Un plan nutrition est prêt', def:true },
  ]},
  { id:'performance', label:'Performance', color:'#a855f7', Icon: TrendingUp, items:[
    { key:'performance.resume_hebdo',    label:'Résumé hebdomadaire', sub:'Bilan charge & progression', def:true },
    { key:'performance.resume_mensuel',  label:'Résumé mensuel',      sub:'Synthèse du mois', def:false },
    { key:'performance.progression',     label:'Progression détectée',sub:'Record / nouvelle perf', def:true },
    { key:'performance.evolution_charge',label:'Évolution de forme',  sub:'Changement notable CTL/ATL/TSB', def:false },
    { key:'performance.zones_maj',       label:'Zones à mettre à jour',sub:'Test FTP / seuil suggéré', def:false },
  ]},
  { id:'coach', label:'Coach IA', color:'#5b6fff', Icon: Sparkles, items:[
    { key:'coach.suggestions',      label:'Suggestions du coach', sub:'Actions proposées à la volée', def:true },
    { key:'coach.briefing',         label:'Nouveau briefing',     sub:'Briefing quotidien disponible', def:true },
    { key:'coach.analyse_terminee', label:'Analyse terminée',     sub:'Ton analyse de séance est prête', def:false },
    { key:'coach.competences',      label:'Compétences à activer',sub:'Des compétences pertinentes pour toi', def:false },
  ]},
  { id:'tokens', label:'Tokens & abonnement', color:'#06B6D4', Icon: Coins, items:[
    { key:'tokens.quota_80',        label:'Quota à 80%',        sub:'Tu approches de ta limite hebdo', def:true },
    { key:'tokens.quota_95',        label:'Quota à 95%',        sub:'Limite presque atteinte', def:true },
    { key:'tokens.quota_epuise',    label:'Quota épuisé',       sub:'Plus de tokens disponibles', def:true },
    { key:'tokens.pack_credite',    label:'Pack crédité',       sub:'Tes tokens ont été ajoutés', def:true },
    { key:'tokens.plan_expiration', label:'Plan en expiration', sub:'Ton abonnement arrive à échéance', def:true },
    { key:'tokens.paiement_echoue', label:'Paiement échoué',    sub:'Action requise sur ton paiement', def:true },
  ]},
  { id:'connexions', label:'Connexions', color:'#14b8a6', Icon: Plug, items:[
    { key:'connexions.activite_synchro', label:'Activité synchronisée',    sub:'Nouvelle activité importée', def:false },
    { key:'connexions.donnee_importee',  label:'Donnée importée',          sub:'Wahoo / Polar / Withings', def:false },
    { key:'connexions.reconnexion',      label:'Reconnexion nécessaire',   sub:'Une app doit être reconnectée', def:true },
    { key:'connexions.echec_sync',       label:'Échec de synchronisation', sub:'Une synchronisation a échoué', def:true },
  ]},
  { id:'competitions', label:'Compétitions', color:'#eab308', Icon: Trophy, items:[
    { key:'competitions.j7',             label:'Compétition J-7',     sub:'Ta course approche', def:true },
    { key:'competitions.j3',             label:'Compétition J-3',     sub:'Derniers préparatifs', def:true },
    { key:'competitions.j1',             label:'Compétition J-1',     sub:"C'est demain !", def:true },
    { key:'competitions.strategie_dispo',label:'Stratégie disponible',sub:'Ton plan de course est prêt', def:true },
  ]},
  { id:'systeme', label:'Système', color:'#94a3b8', Icon: Settings, items:[
    { key:'systeme.nouvelle_version', label:'Nouvelle version',       sub:'Une mise à jour est disponible', def:true },
    { key:'systeme.nouvelle_feature', label:'Nouvelle fonctionnalité',sub:'Découvre les nouveautés', def:true },
    { key:'systeme.maintenance',      label:'Maintenance prévue',     sub:'Interruption programmée', def:false },
    { key:'systeme.astuce',           label:'Astuce du jour',         sub:"Conseils d'utilisation", def:false },
  ]},
]

const NOTIF_DEFAULTS: Record<string, boolean> = (() => {
  const d: Record<string, boolean> = {}
  NOTIF_CATEGORIES.forEach(c => c.items.forEach(i => { d[i.key] = i.def }))
  return d
})()

function NotificationsBloc() {
  const { t } = useI18n()
  const [globalOn, setGlobalOn] = useState(true)
  const [prefs, setPrefs] = useState<Record<string, boolean>>(NOTIF_DEFAULTS)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetch('/api/notifications/preferences')
        if (!res.ok || !alive) return
        const j = await res.json() as { global_enabled?: boolean; preferences?: Record<string, boolean> }
        if (!alive) return
        setGlobalOn(j.global_enabled ?? true)
        setPrefs({ ...NOTIF_DEFAULTS, ...(j.preferences ?? {}) })
      } catch { /* garde les défauts */ }
    })()
    return () => { alive = false }
  }, [])

  const patch = (body: { global_enabled?: boolean; preferences?: Record<string, boolean> }, rollback: () => void) => {
    void fetch('/api/notifications/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then(r => { if (!r.ok) rollback() }).catch(rollback)
  }

  const toggleItem = (key: string) => {
    const next = !(prefs[key] ?? NOTIF_DEFAULTS[key])
    setPrefs(p => ({ ...p, [key]: next }))
    patch({ preferences: { [key]: next } }, () => setPrefs(p => ({ ...p, [key]: !next })))
  }

  const toggleGlobal = () => {
    const next = !globalOn
    setGlobalOn(next)
    patch({ global_enabled: next }, () => setGlobalOn(!next))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {/* Toggle global */}
      <Section>
        <Group>
          <Line first>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:0 }}>{t('profile.allNotifications')}</p>
              <p style={{ fontSize:11.5, color:'var(--text-dim)', margin:'2px 0 0' }}>{t('profile.allNotificationsSub')}</p>
            </div>
            <Toggle value={globalOn} onChange={toggleGlobal}/>
          </Line>
        </Group>
      </Section>

      {/* Sections par catégorie */}
      <div style={{ opacity:globalOn?1:0.4, pointerEvents:globalOn?'auto':'none', transition:'opacity 0.2s' }}>
        {NOTIF_CATEGORIES.map(sec=>(
          <Section key={sec.id} label={t('profile.notifCat.'+sec.id)}>
            <Group>
              {sec.items.map((item, idx)=>(
                <Line key={item.key} first={idx===0}>
                  <div style={{ flex:1, minWidth:0, paddingRight:4 }}>
                    <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:'0 0 2px' }}>{t('profile.notif.'+item.key+'.label')}</p>
                    <p style={{ fontSize:11.5, color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{t('profile.notif.'+item.key+'.sub')}</p>
                  </div>
                  <Toggle value={prefs[item.key] ?? NOTIF_DEFAULTS[item.key]} onChange={()=>toggleItem(item.key)}/>
                </Line>
              ))}
            </Group>
          </Section>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// APPARENCE BLOC — thème jour/nuit + localisation précise
// ══════════════════════════════════════════════════

// ── Bulle Apparence : thème Clair / Sombre / Système ──────────────
type ThemePref = 'light' | 'dark' | 'system'

function ApparenceBloc() {
  const { t } = useI18n()
  const [pref, setPref] = useState<ThemePref>('system')

  useEffect(() => {
    try {
      const manual = localStorage.getItem('thw-theme')
      if (manual === 'light' || manual === 'dark') setPref(manual)
      else setPref('system')
    } catch { /* ignore */ }
  }, [])

  function applyManual(mode: 'light' | 'dark') {
    const root = document.documentElement
    root.classList.remove('light', 'dark'); root.classList.add(mode)
  }

  function choose(next: ThemePref) {
    setPref(next)
    try {
      if (next === 'system') {
        localStorage.removeItem('thw-theme')
        void import('@/hooks/useTheme').then(m => m.refreshAutoTheme())
      } else {
        localStorage.setItem('thw-theme', next)
        applyManual(next)
      }
    } catch { /* ignore */ }
  }

  const OPTIONS: { id: ThemePref; label: string; sub: string; Icon: typeof Sun }[] = [
    { id: 'light',  label: t('profile.themeLight'),  sub: t('profile.themeLightSub'), Icon: Sun },
    { id: 'dark',   label: t('profile.themeDark'),  sub: t('profile.themeDarkSub'), Icon: Moon },
    { id: 'system', label: t('profile.themeSystem'), sub: t('profile.themeSystemSub'), Icon: Monitor },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.appearanceIntro')}</Intro>
      <Section label={t('profile.theme')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OPTIONS.map(o => {
            const active = pref === o.id
            return (
              <button key={o.id} onClick={() => choose(o.id)} style={{
                display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left' as const,
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                background: active ? 'var(--primary-dim)' : 'var(--bg-card)',
              }}>
                <o.Icon size={19} strokeWidth={1.8} style={{ flexShrink: 0, color: active ? 'var(--primary)' : 'var(--text-mid)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: active ? 'var(--primary)' : 'var(--text)', margin: 0 }}>{o.label}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{o.sub}</p>
                </div>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

// ── Bulle Langue : traduit toute l'application (FR / EN / ES) ──────
function LangueBloc() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.langDesc')}</Intro>
      <Section label={t('profile.langTitle')}>
        <LanguageSelector size="md" />
      </Section>
    </div>
  )
}

// ── Bulle Localisation : 3 choix d'autorisation (comme iOS/Android) ─
type GeoPref = '1h' | 'always' | 'while_using' | 'off'

const GEO_PREF_KEY = 'thw-geo-pref'      // choix d'autorisation utilisateur
const GEO_GRANTED_AT_KEY = 'thw-geo-at'  // horodatage de l'octroi (pour le mode 1h)

function LocalisationBloc() {
  const { t } = useI18n()
  const [pref, setPref] = useState<GeoPref>('off')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const p = localStorage.getItem(GEO_PREF_KEY) as GeoPref | null
      if (p === '1h' || p === 'always' || p === 'while_using') setPref(p)
      else setPref('off')
    } catch { /* ignore */ }
  }, [])

  // Récupère la position et met en cache (utilisé pour le thème jour/nuit précis).
  function capturePosition(): Promise<boolean> {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) { setMsg(t('profile.geoUnavailable')); resolve(false); return }
      navigator.geolocation.getCurrentPosition(
        pos => {
          try {
            localStorage.setItem('thw-geo', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }))
            localStorage.setItem(GEO_GRANTED_AT_KEY, String(Date.now()))
          } catch { /* ignore */ }
          void import('@/hooks/useTheme').then(m => m.refreshAutoTheme())
          resolve(true)
        },
        () => resolve(false),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 6 * 3600_000 },
      )
    })
  }

  async function choose(next: GeoPref) {
    setMsg(null)
    if (next === 'off') {
      try { localStorage.removeItem('thw-geo'); localStorage.removeItem(GEO_PREF_KEY); localStorage.removeItem(GEO_GRANTED_AT_KEY) } catch { /* ignore */ }
      void import('@/hooks/useTheme').then(m => m.refreshAutoTheme())
      setPref('off'); setMsg(t('profile.geoDisabled'))
      return
    }
    setBusy(true)
    const ok = await capturePosition()
    setBusy(false)
    if (!ok) { setMsg(t('profile.geoDenied')) ; return }
    try { localStorage.setItem(GEO_PREF_KEY, next) } catch { /* ignore */ }
    setPref(next)
    setMsg(next === '1h'
      ? t('profile.geoGranted1h')
      : next === 'always'
        ? t('profile.geoGrantedAlways')
        : t('profile.geoGrantedWhileUsing'))
  }

  const OPTIONS: { id: GeoPref; label: string; sub: string; Icon: typeof MapPin }[] = [
    { id: 'while_using', label: t('profile.geoWhileUsing'), sub: t('profile.geoWhileUsingSub'), Icon: MapPin },
    { id: '1h',          label: t('profile.geo1h'),        sub: t('profile.geo1hSub'), Icon: MapPin },
    { id: 'always',      label: t('profile.geoAlways'),    sub: t('profile.geoAlwaysSub'), Icon: MapPin },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.geoIntro')}</Intro>
      <Section label={t('profile.authorization')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OPTIONS.map(o => {
            const active = pref === o.id
            return (
              <button key={o.id} onClick={() => void choose(o.id)} disabled={busy} style={{
                display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left' as const,
                padding: '14px 16px', borderRadius: 14, cursor: busy ? 'wait' : 'pointer', transition: 'all 0.15s',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                background: active ? 'var(--primary-dim)' : 'var(--bg-card)', opacity: busy ? 0.7 : 1,
              }}>
                <o.Icon size={19} strokeWidth={1.8} style={{ flexShrink: 0, color: active ? 'var(--primary)' : 'var(--text-mid)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: active ? 'var(--primary)' : 'var(--text)', margin: 0 }}>{o.label}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0', lineHeight: 1.45 }}>{o.sub}</p>
                </div>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </button>
            )
          })}
        </div>
        {pref !== 'off' && (
          <button onClick={() => void choose('off')} style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {t('profile.geoDisable')}
          </button>
        )}
        {msg && <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '12px 2px 0', lineHeight: 1.5 }}>{msg}</p>}
      </Section>
    </div>
  )
}

// ── Bulle Confidentialité : données & vie privée ──────────────────
function ConfidentialiteBloc() {
  const { t } = useI18n()
  const PRIVACY_LINKS: { label: string; sub: string; href: string }[] = [
    { label: t('profile.privacyPolicy'), sub: t('profile.privacyPolicySub'), href: '/decouvrir/theme.html#confidentialite' },
    { label: t('profile.terms'),     sub: t('profile.termsSub'), href: '/decouvrir/theme.html#cgu' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.privacyIntro')}</Intro>

      <Section label={t('profile.documents')}>
        <Group>
          {PRIVACY_LINKS.map((l, i) => (
            <a key={l.label} href={l.href} style={{ textDecoration: 'none', display: 'block' }}>
              <Line first={i===0}>
                <Shield size={19} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--text-mid)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{l.label}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{l.sub}</p>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
              </Line>
            </a>
          ))}
        </Group>
      </Section>

      <Section label={t('profile.myData')}>
        <Group>
          <a href="/api/export/data" style={{ textDecoration: 'none', display: 'block', color: 'var(--text)' }}>
            <Line first>
              <BarChart3 size={19} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--text-mid)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{t('profile.exportData')}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{t('profile.exportDataSub')}</p>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
            </Line>
          </a>
          <a href="mailto:contact@thehybridway.app?subject=Suppression%20de%20compte" style={{ textDecoration: 'none', display: 'block', color: '#ef4444' }}>
            <Line>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{t('profile.deleteAccount')}</p>
                <p style={{ fontSize: 11.5, color: 'rgba(239,68,68,0.7)', margin: '2px 0 0' }}>{t('profile.deleteAccountSub')}</p>
              </div>
            </Line>
          </a>
        </Group>
      </Section>
    </div>
  )
}

// ── Bulle Autorisations : états des permissions du navigateur ─────
type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported'

function AutorisationsBloc() {
  const { t } = useI18n()
  const [geo, setGeo] = useState<PermState>('prompt')
  const [notif, setNotif] = useState<PermState>('prompt')

  useEffect(() => {
    // Notifications (API synchrone)
    try {
      if (typeof Notification === 'undefined') setNotif('unsupported')
      else setNotif(Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt')
    } catch { setNotif('unsupported') }
    // Géolocalisation (Permissions API)
    try {
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then(r => setGeo(r.state as PermState))
          .catch(() => setGeo('unsupported'))
      } else setGeo('unsupported')
    } catch { setGeo('unsupported') }
  }, [])

  async function askNotif() {
    try {
      if (typeof Notification === 'undefined') return
      const r = await Notification.requestPermission()
      setNotif(r === 'granted' ? 'granted' : r === 'denied' ? 'denied' : 'prompt')
    } catch { /* ignore */ }
  }

  function askGeo() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(() => setGeo('granted'), () => setGeo('denied'))
  }

  const STATE_META: Record<PermState, { label: string; color: string }> = {
    granted:     { label: t('profile.permGranted'),     color: '#22c55e' },
    denied:      { label: t('profile.permDenied'),       color: '#ef4444' },
    prompt:      { label: t('profile.permPrompt'),  color: 'var(--text-dim)' },
    unsupported: { label: t('profile.permUnsupported'), color: 'var(--text-dim)' },
  }

  const rows: { label: string; sub: string; Icon: typeof MapPin; state: PermState; ask?: () => void }[] = [
    { label: t('profile.permLocation'), sub: t('profile.permLocationSub'), Icon: MapPin, state: geo, ask: geo === 'prompt' ? askGeo : undefined },
    { label: t('profile.permNotifications'), sub: t('profile.permNotificationsSub'), Icon: Bell, state: notif, ask: notif === 'prompt' ? () => void askNotif() : undefined },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.permIntro')}</Intro>
      <Section label={t('profile.access')}>
        <Group>
          {rows.map((r, i) => {
            const meta = STATE_META[r.state]
            return (
              <Line key={r.label} first={i===0}>
                <r.Icon size={19} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--text-mid)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{r.label}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{r.sub}</p>
                </div>
                {r.ask ? (
                  <button onClick={r.ask} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('profile.authorize')}</button>
                ) : (
                  <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                )}
              </Line>
            )
          })}
        </Group>
      </Section>
    </div>
  )
}

// ── Bulle Utilisation : consommation IA (tokens) ──────────────────
function UtilisationBloc() {
  const { t } = useI18n()
  const [details, setDetails] = useState<SubDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription/details')
      .then(r => r.json())
      .then((d: SubDetails) => setDetails(d))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false))
  }, [])

  const gauges = ([
    details?.monthly    && { label: t('profile.weekly'),            gauge: details.monthly,   color: 'var(--primary)' },
    details?.rolling_6h && { label: t('profile.rolling6h'), gauge: details.rolling_6h, color: 'var(--primary)' },
  ].filter(Boolean) as { label: string; gauge: { used: number; limit: number; resets_at: string }; color: string }[])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>{t('profile.usageIntro')}</Intro>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '24px 0', margin: 0 }}>{t('profile.loading')}</p>
      ) : gauges.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '24px 0', margin: 0 }}>{t('profile.noUsageData')}</p>
      ) : (
        <Section label={t('profile.limits')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gauges.map(g => {
              const pct = Math.min(100, Math.round((g.gauge.used / g.gauge.limit) * 100))
              const remaining = g.gauge.limit - g.gauge.used
              return (
                <div key={g.label} style={{ padding: '16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{g.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 700, color: g.color }}>{fmtTokens(g.gauge.used)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ {fmtTokens(g.gauge.limit)}</span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width 0.4s' }}/>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t('profile.pctUsed', { pct })}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600 }}>{t('profile.remaining', { n: fmtTokens(remaining), s: remaining > 1 ? 's' : '' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
// RÉGLAGES IA BLOC — Onglet 3
// ══════════════════════════════════════════════════

const PLANS = [
  { id:'premium', label:'Premium', monthly:'15€/mois', annual:'129€/an', save:'28%', color:'#06B6D4', features:['Toutes les fonctionnalités','Connexions apps (5)','Export PDF','Historique 1 an'] },
  { id:'pro',     label:'Pro',     monthly:'29€/mois', annual:'199€/an', save:'43%', color:'#a855f7', features:['Tout Premium','Connexions illimitées','Coach IA','Historique illimité'] },
  { id:'expert',  label:'Expert',  monthly:'49€/mois', annual:'349€/an', save:'41%', color:'#f97316', features:['Tout Pro','Multi-athlètes','Dashboard coach','API accès'] },
]

const MODEL_META = {
  hermes:{ color:'#d4a017', tagline:'Le modèle le plus rapide.', cost:1,
    desc:"Conçu pour répondre immédiatement, de manière simple et efficace. Il va droit au but et évite toute complexité inutile.",
    uses:['Une question simple','Un besoin rapide','Une décision immédiate'],
    levels:['Rapide','Clair','Direct'],
    // eslint-disable-next-line @next/next/no-img-element
    effigy:<img src="/logos/logo_3bras.png" width={22} height={22} alt="Hermès" style={{objectFit:'contain',flexShrink:0}} />,
  },
  athena:{ color:'#5b6fff', tagline:'Le modèle principal de coaching intelligent.', cost:3,
    desc:"Elle analyse en profondeur, comprend le contexte de l'athlète et croise les données disponibles. Elle ne se contente pas de répondre : elle explique, enseigne et propose des améliorations concrètes.",
    uses:['Analyser une situation','Comprendre un problème','Optimiser un entraînement','Obtenir des conseils précis'],
    levels:['Structuré','Pédagogique','Intelligent'],
    // eslint-disable-next-line @next/next/no-img-element
    effigy:<img src="/logos/logo_4bras.png" width={22} height={22} alt="Athéna" style={{objectFit:'contain',flexShrink:0}} />,
  },
  zeus:{ color:'#8b5cf6', tagline:'Le modèle le plus avancé.', cost:8,
    desc:"Il produit les réponses les plus complètes, les plus précises et les plus stratégiques. Il ne fait pas qu'expliquer : il démontre, structure et approfondit au maximum.",
    uses:['Une analyse très poussée','Une réflexion stratégique','Une vision globale','Une réponse complète et détaillée'],
    levels:['Très approfondi','Stratégique','Structuré','Premium'],
    // eslint-disable-next-line @next/next/no-img-element
    effigy:<img src="/logos/logo_6bras.png" width={22} height={22} alt="Zeus" style={{objectFit:'contain',flexShrink:0}} />,
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

// ── Composant RuleCreator — modal IA de formulation de règle ──
function RuleCreator({ addRule, onClose }: {
  addRule: (category: string, text: string) => Promise<void>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [step,       setStep]       = useState<'input' | 'review'>('input')
  const [category,   setCategory]   = useState('training')
  const [userInput,  setUserInput]  = useState('')
  const [aiResult,   setAiResult]   = useState<{ rule: string; suggestions: string[] } | null>(null)
  const [modifyText, setModifyText] = useState('')
  const [showModify, setShowModify] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  const ready = userInput.trim().length >= 5

  async function callRuleHelper(input: string, previousRule?: string, modification?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/rule-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          previousRule
            ? { previousRule, modification: modification ?? input, category }
            : { userInput: input, category }
        ),
      })
      const data = await res.json() as { rule: string; suggestions: string[] }
      setAiResult(data)
      setStep('review')
      setShowModify(false)
      setModifyText('')
    } catch {
      setAiResult({ rule: input, suggestions: [] })
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  async function handleValidate() {
    if (!aiResult?.rule) return
    setSaving(true)
    await addRule(category, aiResult.rule)
    setSaving(false)
    onClose()
  }

  async function handleSaveDirect() {
    if (!userInput.trim()) return
    setSaving(true)
    await addRule(category, userInput.trim())
    setSaving(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:480, background:'var(--bg-card)', borderRadius:18, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', border:'1px solid var(--border)', position:'relative' as const }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--text)', margin:0 }}>{t('profile.newRule')}</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:18, lineHeight:1, padding:'2px 4px' }}>✕</button>
        </div>

        {step === 'input' ? (
          <>
            {/* Category */}
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-dim)', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.05em' }}>{t('profile.category')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, marginBottom:14, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-body)', outline:'none' }}
            >
              {RULE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{t('profile.ruleCat.'+c.id)}</option>)}
            </select>

            {/* Textarea */}
            <textarea
              autoFocus
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder={t('profile.ruleCatPh.'+category)}
              rows={4}
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, marginBottom:14, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', resize:'none' as const, fontFamily:'var(--font-body)', lineHeight:1.6, boxSizing:'border-box' as const }}
            />

            {/* Send to AI */}
            <button
              onClick={() => void callRuleHelper(userInput)}
              disabled={!ready || loading}
              style={{ width:'100%', padding:12, borderRadius:10, border:'none', marginBottom:10, background: ready ? 'linear-gradient(135deg,#06B6D4,#5b6fff)' : 'var(--bg-card2)', color: ready ? '#fff' : 'var(--text-dim)', fontWeight:700, fontSize:13, fontFamily:'var(--font-display)', cursor: ready && !loading ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}
            >{loading ? t('profile.aiThinking') : t('profile.sendToAi')}</button>

            {/* Direct save */}
            <p
              onClick={() => ready && void handleSaveDirect()}
              style={{ textAlign:'center' as const, fontSize:11, color:'var(--text-dim)', cursor: ready ? 'pointer' : 'default', margin:0, opacity: ready ? 1 : 0.4, userSelect:'none' as const }}
            >{t('profile.saveDirectly')}</p>
          </>
        ) : (
          <>
            {/* Proposed rule */}
            <div style={{ padding:'16px 18px', borderRadius:12, background:'rgba(91,111,255,0.06)', border:'1px solid rgba(91,111,255,0.18)', marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#5b6fff', textTransform:'uppercase' as const, letterSpacing:'0.06em', margin:'0 0 8px' }}>{t('profile.proposedRule')}</p>
              <p style={{ fontSize:13, fontWeight:500, color:'var(--text)', lineHeight:1.65, fontStyle:'italic' as const, margin:0 }}>&quot;{aiResult?.rule}&quot;</p>
            </div>

            {/* Suggestions */}
            {(aiResult?.suggestions?.length ?? 0) > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.05em', margin:'0 0 8px' }}>{t('profile.improvementSuggestions')}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                  {aiResult!.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => void callRuleHelper(userInput, aiResult!.rule, s)}
                      disabled={loading}
                      style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card2)', fontSize:12, color:'var(--text-mid)', lineHeight:1.4, cursor: loading ? 'wait' : 'pointer', textAlign:'left' as const, width:'100%', display:'flex', gap:8, alignItems:'flex-start' as const }}
                    >
                      <span style={{ color:'#22c55e', fontWeight:700, flexShrink:0 }}>+</span>{s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Validate */}
            <button
              onClick={() => void handleValidate()}
              disabled={saving}
              style={{ width:'100%', padding:12, borderRadius:10, border:'none', marginBottom:8, background:'linear-gradient(135deg,#06B6D4,#5b6fff)', color:'#fff', fontWeight:700, fontSize:13, fontFamily:'var(--font-display)', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >{saving ? t('profile.saving') : t('profile.validateRule')}</button>

            {/* Modify */}
            {showModify ? (
              <div style={{ marginTop:4 }}>
                <textarea
                  autoFocus
                  value={modifyText}
                  onChange={e => setModifyText(e.target.value)}
                  placeholder={t('profile.describeModif')}
                  rows={2}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, marginBottom:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none' as const, fontFamily:'var(--font-body)', lineHeight:1.5, boxSizing:'border-box' as const }}
                />
                <button
                  onClick={() => void callRuleHelper(userInput, aiResult?.rule, modifyText)}
                  disabled={modifyText.trim().length < 3 || loading}
                  style={{ width:'100%', padding:10, borderRadius:10, border:'1px solid rgba(91,111,255,0.3)', background:'rgba(91,111,255,0.08)', color:'#5b6fff', fontSize:12, fontWeight:600, fontFamily:'var(--font-body)', cursor: modifyText.trim().length >= 3 && !loading ? 'pointer' : 'not-allowed', opacity: loading ? 0.6 : 1 }}
                >{loading ? t('profile.reformulating') : t('profile.resend')}</button>
              </div>
            ) : (
              <button
                onClick={() => setShowModify(true)}
                style={{ width:'100%', padding:11, borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'var(--font-body)' }}
              >{t('profile.modify')}</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Composant RulesCard ───────────────────────────────────────
function RulesCard() {
  const { t } = useI18n()
  const { rules, loading, addRule, toggleRule, deleteRule } = useAiRules()
  const [activeTab,  setActiveTab]  = useState<string>('all')
  const [showModal,  setShowModal]  = useState(false)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [hoveredId,  setHoveredId]  = useState<string|null>(null)

  const catMeta = (id: string) => RULE_CATEGORIES.find(c => c.id === id) ?? { label: id, color: '#6b7280', icon: '📌', placeholder: '' }
  const filtered = activeTab === 'all' ? rules : rules.filter(r => r.category === activeTab)

  async function handleDelete(id: string) {
    await deleteRule(id)
    setConfirmDel(null)
  }

  const TABS = [
    { id: 'all', label: t('profile.allRules'), color: 'var(--text-mid)' },
    ...RULE_CATEGORIES.map(c => ({ id: c.id, label: t('profile.ruleCat.'+c.id), color: c.color })),
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
          <CardTitle icon={<svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="1" width="10" height="14" rx="2"/><path d="M6 1v1a2 2 0 004 0V1M6 7h4M6 10h3"/></svg>}>{t('profile.myRules')}</CardTitle>
          <button
            onClick={() => setShowModal(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'linear-gradient(135deg,#06B6D4,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}
          >
            <span style={{ fontSize:16, lineHeight:1 }}>+</span> {t('profile.add')}
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 14px', lineHeight:1.5 }}>
          {t('profile.rulesInfo')}
        </p>

        {/* Tabs catégories */}
        <div className="rules-tabs" style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, paddingBottom:2 }}>
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${active ? t.color+'66' : 'var(--border)'}`, background: active ? t.color+'18' : 'transparent', color: active ? t.color : 'var(--text-dim)', fontSize:11, fontWeight: active ? 700 : 400, cursor:'pointer', whiteSpace:'nowrap' as const, flexShrink:0, transition:'all 0.15s' }}>{t.label}</button>
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
            <svg width={40} height={40} viewBox="0 0 40 40" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4 }}><rect x="8" y="4" width="24" height="32" rx="4"/><path d="M15 4v2a5 5 0 0010 0V4M15 18h10M15 24h8"/></svg>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.55 }}>
              {activeTab === 'all' ? t('profile.noRules') : t('profile.noRulesCategory')}
            </p>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:0, opacity:0.7 }}>{t('profile.rulesEmptyHint')}</p>
            {activeTab === 'all' && (
              <button onClick={() => setShowModal(true)} style={{ marginTop:4, padding:'7px 18px', borderRadius:20, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {t('profile.addRule')}
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
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1px solid ${rule.active ? meta.color+'22' : 'var(--border)'}`, background: rule.active ? meta.color+'0a' : 'var(--bg-card2)', transition:'all 0.15s', opacity: rule.active ? 1 : 0.55 }}
                >
                  <div style={{ width:8, height:8, borderRadius:'50%', background: meta.color, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:'var(--text)', margin:0, lineHeight:1.4, wordBreak:'break-word' as const }}>{rule.rule_text}</p>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, marginTop:3, fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:10, background: meta.color+'18', color: meta.color }}>
                      {categoryIcon(rule.category, meta.color, 9)} {RULE_CATEGORIES.some(c => c.id === rule.category) ? t('profile.ruleCat.'+rule.category) : meta.label}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <Toggle value={rule.active} onChange={v => void toggleRule(rule.id, v)} />
                    {(hoveredId === rule.id || confirmDel === rule.id) && (
                      confirmDel === rule.id ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => void handleDelete(rule.id)} style={{ padding:'3px 8px', borderRadius:6, background:'#ef4444', border:'none', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('profile.yes')}</button>
                          <button onClick={() => setConfirmDel(null)} style={{ padding:'3px 8px', borderRadius:6, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>{t('profile.no')}</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDel(rule.id)} title={t('profile.delete')} style={{ width:22, height:22, borderRadius:6, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', color:'#ef4444', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {showModal && <RuleCreator addRule={addRule} onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// ABONNEMENT SUB-PAGE
// ══════════════════════════════════════════════════════════════

interface SubDetails {
  tier:                string
  status:              string
  cancel_at_period_end: boolean
  current_period_end?: string | null
  monthly?:            { used: number; limit: number; resets_at: string }
  rolling_6h?:         { used: number; limit: number; resets_at: string }
  stripe?: {
    nextBillingDate?:  string | null
    amount?:           number | null
    currency?:         string | null
    cancelAtPeriodEnd?: boolean | null
  } | null
  invoices?:       { amount: number; currency: string; date: string; status: string; url?: string | null }[]
  paymentMethod?:  { brand: string; last4: string; exp_month: number; exp_year: number } | null
}

// Libellé affiché à l'utilisateur, détecté depuis le tier réel de l'abonnement.
// premium→Premium · pro→Pro · expert→Expert · trial→« Essai Premium ».
function tierBadgeLabel(tier: string): string {
  if (tier === 'trial')  return 'Essai Premium'
  if (tier === 'pro')    return 'Pro'
  if (tier === 'expert') return 'Expert'
  return 'Premium'
}
// Nom du plan sous-jacent (l'essai donne un accès de niveau Premium).
function tierPlanName(tier: string): string {
  return tier === 'trial' ? 'Premium' : tierBadgeLabel(tier)
}

function fmtTokens(v: number): string {
  return v.toLocaleString(currentLocale())
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amount / 100)
}

function AbonnementContent() {
  const { t } = useI18n()
  const [details,  setDetails]  = useState<SubDetails | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [subEmail, setSubEmail] = useState<'change' | 'cancel' | null>(null)

  useEffect(() => {
    fetch('/api/subscription/details')
      .then(r => r.json())
      .then((d: SubDetails) => setDetails(d))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false))
  }, [])

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } catch { /* ignore */ } finally {
      setPortalLoading(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await fetch('/api/subscription/cancel', { method: 'POST' })
      // Reload details
      const res = await fetch('/api/subscription/details')
      const d = await res.json() as SubDetails
      setDetails(d)
      setCancelConfirm(false)
    } catch { /* ignore */ } finally {
      setCancelling(false)
    }
  }

  const tier = details?.tier ?? 'trial'
  const planName  = tierPlanName(tier)
  const hasStripe = !!(details?.stripe?.nextBillingDate)
  const isCancelling = details?.cancel_at_period_end || details?.stripe?.cancelAtPeriodEnd

  return (
    <>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 4px' }}>{t('profile.planCreditsBilling')}</p>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>{t('profile.loading')}</div>
      ) : (
        <div style={{ padding: '8px 0 24px', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── 1. Carte plan (bulle neutre, façon Claude) ── */}
          <div style={{ padding: '18px 20px', borderRadius: 16, background: GREY_CARD, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: tier === 'trial' ? 14 : 0 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: '0 0 3px', color: 'var(--text)' }}>
                  THW {planName}
                </p>
                {isCancelling ? (
                  <p style={{ fontSize: 11, color: '#ef4444', margin: 0, fontWeight: 600 }}>
                    {t('profile.cancellingExpires', { date: details?.current_period_end ? fmtDate(details.current_period_end) : '—' })}
                  </p>
                ) : hasStripe && details?.stripe?.nextBillingDate ? (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>
                    {t('profile.nextPayment')} · {fmtDate(details.stripe.nextBillingDate)}
                    {details.stripe.amount != null && details.stripe.currency
                      ? ` · ${fmtAmount(details.stripe.amount, details.stripe.currency)}`
                      : ''}
                  </p>
                ) : tier === 'trial' && details?.current_period_end ? (
                  <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: 0, fontWeight: 500 }}>
                    {t('profile.expiresOn')} {fmtDate(details.current_period_end)}
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>{t('profile.fullAccess')}</p>
                )}
              </div>
              {!isCancelling && (hasStripe || tier !== 'expert') && (
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  {hasStripe ? (
                    <button
                      onClick={handlePortal}
                      disabled={portalLoading}
                      style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--text)', border: 'none', color: 'var(--bg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: portalLoading ? 0.6 : 1 }}
                    >
                      {portalLoading ? '…' : t('profile.manage')}
                    </button>
                  ) : (
                    <button
                      onClick={() => { window.location.href = '/profile?tab=ia' }}
                      style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--text)', border: 'none', color: 'var(--bg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {t('profile.upgrade')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Barre trial */}
            {tier === 'trial' && details?.current_period_end && (
              (() => {
                const now       = Date.now()
                const end       = new Date(details.current_period_end).getTime()
                const totalDays = 14 * 24 * 3600 * 1000
                const leftMs    = Math.max(0, end - now)
                const pct       = Math.min(100, Math.round((leftMs / totalDays) * 100))
                return (
                  <>
                    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,179,64,0.15)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#ffb340,#f97316)', borderRadius: 999 }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t('profile.trialInProgress')}</span>
                      <span style={{ fontSize: 10, color: '#ffb340', fontWeight: 600 }}>{t('profile.daysRemaining', { n: Math.ceil(leftMs / (24 * 3600 * 1000)) })}</span>
                    </div>
                  </>
                )
              })()
            )}
          </div>

          {/* Jauges d'utilisation IA retirées ici — visibles dans « Utilisation ». */}

          {/* ── 3. Derniers paiements ───────────────────── */}
          {details?.invoices && details.invoices.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', margin: '0 0 12px', borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
                {t('profile.lastPayments')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {details.invoices.map((inv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{fmtDate(inv.date)}</p>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: inv.status === 'paid' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', color: inv.status === 'paid' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                        {inv.status === 'paid' ? t('profile.paid') : t('profile.pending')}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{fmtAmount(inv.amount, inv.currency)}</p>
                      {inv.url && (
                        <a href={inv.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#5b6fff', textDecoration: 'none' }}>
                          {t('profile.viewInvoice')}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Moyen de paiement ────────────────────── */}
          {details?.paymentMethod && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', margin: '0 0 12px', borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
                {t('profile.paymentMethod')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 24, borderRadius: 5, background: 'rgba(91,111,255,0.12)', border: '1px solid var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#5b6fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {details.paymentMethod.brand.slice(0, 4)}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 1px' }}>
                      •••• {details.paymentMethod.last4}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: 0 }}>
                      {t('profile.expiresShort')} {details.paymentMethod.exp_month.toString().padStart(2, '0')}/{details.paymentMethod.exp_year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  style={{ fontSize: 12, fontWeight: 600, color: '#5b6fff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  {t('profile.modify')}
                </button>
              </div>
            </div>
          )}

          {/* ── Actions abonnement (liste groupée, façon Claude) ── */}
          {!isCancelling && (
            <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <button onClick={() => setSubEmail('change')} style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '15px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Changer d&apos;abonnement</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button onClick={() => void handlePortal()} disabled={portalLoading} style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '15px 16px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#ef4444' }}>Résilier l&apos;abonnement</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}

          {/* En savoir plus */}
          <a
            href="/decouvrir/theme.html#abonnements"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            {t('profile.learnMoreSubscriptions')}
          </a>

          {isCancelling && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0, fontWeight: 600 }}>{t('profile.cancellationScheduled')}</p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 0' }}>
                {t('profile.accessActiveUntil', { date: details?.current_period_end ? fmtDate(details.current_period_end) : '—' })}
              </p>
            </div>
          )}

          {subEmail && <SubscriptionEmailModal action={subEmail} onClose={() => setSubEmail(null)} />}
        </div>
      )}

      {/* ── Modal confirmation résiliation ──────────── */}
      {cancelConfirm && (
        <div
          onClick={() => setCancelConfirm(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-mid)', padding: '24px 24px 20px', maxWidth: 400, width: 'calc(100% - 32px)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textAlign: 'center', margin: '0 0 8px', color: 'var(--text)' }}>{t('profile.cancelSubscriptionConfirm')}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              {t('profile.cancelSubscriptionInfo')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCancelConfirm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 11, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{ flex: 1, padding: '11px', borderRadius: 11, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelling ? 0.6 : 1 }}
              >
                {cancelling ? '…' : t('profile.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// MODÈLES SUB-PAGE
// ══════════════════════════════════════════════════════════════

interface ModeleCard {
  id:          'hermes' | 'athena' | 'zeus'
  name:        string
  subtitle:    string
  multiplier:  number
  color:       string
  description: string
  recommended?: boolean
}

const MODELES: ModeleCard[] = [
  {
    id:          'hermes',
    name:        'Hermès',
    subtitle:    'Rapide et direct',
    multiplier:  1,
    color:       '#B8860B',
    description: 'Pour les questions simples, conseils rapides ou besoins immédiats.',
  },
  {
    id:          'athena',
    name:        'Athéna',
    subtitle:    'Coaching intelligent',
    multiplier:  3,
    color:       '#06B6D4',
    description: 'Le modèle principal. Analyse, contextualise et propose des améliorations concrètes.',
    recommended: true,
  },
  {
    id:          'zeus',
    name:        'Zeus',
    subtitle:    'Le plus avancé',
    multiplier:  8,
    color:       '#7C3AED',
    description: 'Pour les analyses très poussées, plans complexes et stratégies sur le long terme.',
  },
]

function ModelesContent() {
  const { t } = useI18n()
  return (
    <>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 16px' }}>{t('profile.threeLevels')}</p>

      {/* Body */}
      <div
        className="modeles-sub-page-body"
        style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {MODELES.map(m => (
          <div
            key={m.id}
            style={{
              position:     'relative',
              background:   'var(--bg-card)',
              border:       m.recommended ? `2px solid ${m.color}` : '0.5px solid var(--border)',
              borderRadius: 14,
              padding:      20,
            }}
          >
            {m.recommended && (
              <span style={{
                position:      'absolute',
                top:           -10,
                left:          16,
                background:    m.color,
                color:         '#fff',
                fontSize:      10,
                fontWeight:    500,
                padding:       '3px 10px',
                borderRadius:  10,
                letterSpacing: '0.5px',
              }}>
                {t('profile.recommended')}
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 500, color: m.color, margin: '0 0 2px' }}>{m.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('profile.modelSub.'+m.id)}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 500, color: m.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>× {m.multiplier}</p>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.5px', margin: '2px 0 0' }}>{t('profile.multiplier')}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mid)', margin: 0 }}>
              {t('profile.modelDesc.'+m.id)}
            </p>
          </div>
        ))}

        {/* Note explicative */}
        <div style={{
          background:    'var(--bg-card2)',
          borderRadius:  10,
          padding:       '12px 14px',
          fontSize:      12,
          color:         'var(--text-mid)',
          lineHeight:    1.55,
          border:        '1px solid var(--border)',
        }}>
          {t('profile.modelsNote')}
        </div>

        {/* Bouton En savoir plus */}
        <a
          href="/decouvrir/theme.html#tokens"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            8,
            padding:        14,
            background:     'transparent',
            border:         '0.5px solid var(--border)',
            color:          'var(--text)',
            borderRadius:   10,
            fontSize:       14,
            fontWeight:     500,
            cursor:         'pointer',
            textDecoration: 'none',
            marginTop:      4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          {t('profile.learnMoreModels')}
        </a>
      </div>

      <style>{`
        .modeles-sub-page-body { padding: 4px 0 24px; }
      `}</style>
    </>
  )
}

function IASettingsBloc() {
  const { t } = useI18n()
  // Overlays
  const [modelsPageOpen, setModelsPageOpen] = useState(false)
  const [subPageOpen,    setSubPageOpen]    = useState(false)
  const [upgradeOpen,  setUpgradeOpen]  = useState(false)

  const router = useRouter()

  // AI settings — localStorage
  const [defaultModel,    setDefaultModel]    = useState<THWModel>('athena')
  const [creditSaving,    setCreditSaving]    = useState(false)
  const [allowSuggestions,setAllowSuggestions]= useState(true)
  const [chatFont,        setChatFont]        = useState<ChatFontId>('dm_sans')
  const [webSearchDefault,setWebSearchDefault]= useState(false)

  // Compétences actives (sur 70)
  const [activeComp,      setActiveComp]      = useState<number | null>(null)

  useEffect(() => {
    const m  = localStorage.getItem('thw_ai_default_model')
    const cs = localStorage.getItem('thw_ai_credit_saving')
    const as = localStorage.getItem('thw_ai_allow_suggestions')
    const cf = localStorage.getItem('thw_ai_chat_font')
    const ws = localStorage.getItem('thw_ai_web_search_default')
    if (m === 'hermes' || m === 'athena' || m === 'zeus') setDefaultModel(m)
    if (cs) setCreditSaving(cs === 'true')
    if (as) setAllowSuggestions(as !== 'false')
    if (cf === 'dm_sans' || cf === 'inter' || cf === 'system' || cf === 'serif' || cf === 'mono') setChatFont(cf)
    if (ws) setWebSearchDefault(ws === 'true')
    // Source de vérité = base (fallback localStorage déjà appliqué ci-dessus)
    fetch('/api/user/ai-settings')
      .then(r => r.json())
      .then((d: { ai_web_search_default?: boolean }) => {
        if (typeof d.ai_web_search_default === 'boolean') {
          setWebSearchDefault(d.ai_web_search_default)
          localStorage.setItem('thw_ai_web_search_default', String(d.ai_web_search_default))
        }
      })
      .catch(() => { /* garde la valeur localStorage */ })
  }, [])

  // Nombre de compétences actives de l'utilisateur
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (alive) setActiveComp(0); return }
        const { count } = await sb
          .from('user_competences')
          .select('competence_id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('active', true)
        if (alive) setActiveComp(count ?? 0)
      } catch { if (alive) setActiveComp(0) }
    })()
    return () => { alive = false }
  }, [])

  function save(key:string, val:string) { localStorage.setItem(key, val) }

  // Toggle « Recherche web par défaut » — optimistic + persistance localStorage & DB
  async function handleWebSearchToggle(next: boolean) {
    setWebSearchDefault(next)
    localStorage.setItem('thw_ai_web_search_default', String(next))
    try {
      const res = await fetch('/api/user/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_web_search_default: next }),
      })
      if (!res.ok) throw new Error('patch failed')
    } catch (err) {
      setWebSearchDefault(!next)
      localStorage.setItem('thw_ai_web_search_default', String(!next))
      console.error('[ai-settings] web search default toggle', err)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>

      {/* ── Bottom sheet Modèles ──────────────────────── */}
      <BottomSheet
        isOpen={modelsPageOpen}
        onClose={() => setModelsPageOpen(false)}
        title={t('profile.aiModels')}
      >
        <ModelesContent />
      </BottomSheet>

      {/* ── Bottom sheet Abonnement ───────────────────── */}
      <BottomSheet
        isOpen={subPageOpen}
        onClose={() => setSubPageOpen(false)}
        title={t('profile.subscription')}
      >
        <AbonnementContent />
      </BottomSheet>

      {/* ── Modal Upgrade ─────────────────────────────── */}
      {upgradeOpen && (
        <div onClick={()=>setUpgradeOpen(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:560, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, margin:0 }}>{t('profile.chooseSubscription')}</h3>
              <button onClick={()=>setUpgradeOpen(false)} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {PLANS.map(p=>(
                <div key={p.id} style={{ padding:'16px', borderRadius:14, background:'var(--bg-card2)', border:`1px solid ${p.color}44` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:p.color }}>{p.label}</span>
                    <div style={{ textAlign:'right' as const }}>
                      <p style={{ fontFamily:'var(--font-body)', fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{p.annual}</p>
                      <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{p.monthly} · <span style={{ color:'#22c55e', fontWeight:600 }}>-{p.save}</span></p>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                    {p.features.map((f,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:p.color, fontSize:11 }}>✓</span><span style={{ fontSize:12, color:'var(--text-mid)' }}>{t('profile.plan.'+p.id+'.feat'+i)}</span></div>)}
                  </div>
                  <button style={{ width:'100%', padding:'10px', borderRadius:10, background:`linear-gradient(135deg,${p.color},${p.color}bb)`, border:'none', color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, cursor:'pointer' }}>{t('profile.choose', { plan: p.label })}</button>
                  <p style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' as const, margin:'6px 0 0' }}>{t('profile.securePaymentStripe')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Nav : Modèles + Abonnement ────────────────── */}
      <Section label={t('profile.coachingAi')}>
        <Group>
          <NavRow first label={t('profile.models')} sub={t('profile.modelsSub')}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="13,2 7,13 12,13 10,22 17,11 12,11" fill="currentColor" opacity="0.75"/></svg>}
            onClick={()=>setModelsPageOpen(true)}
          />
          <NavRow label={t('profile.subscription')} sub={t('profile.subscriptionSub')}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h2"/></svg>}
            onClick={()=>setSubPageOpen(true)}
          />
          <NavRow label={t('profile.myCompetences')}
            sub={t('profile.competencesActive', { n: activeComp ?? 0, s: (activeComp ?? 0) > 1 ? 's' : '' })}
            icon={<Target size={18} />}
            onClick={()=>router.push('/competences')}
          />
        </Group>
      </Section>

      {/* ── Comportement ──────────────────────────────── */}
      <Section label={t('profile.behavior')}>
        <Group>
          {[
            { label:t('profile.creditSaving'), sub:t('profile.creditSavingSub'), val:creditSaving, onChange:(v:boolean)=>{ setCreditSaving(v); save('thw_ai_credit_saving',String(v)) } },
            { label:t('profile.allowSuggestions'), sub:t('profile.allowSuggestionsSub'), val:allowSuggestions, onChange:(v:boolean)=>{ setAllowSuggestions(v); save('thw_ai_allow_suggestions',String(v)) } },
            { label:t('profile.webSearchDefault'), sub:t('profile.webSearchDefaultSub'), val:webSearchDefault, onChange:(v:boolean)=>{ void handleWebSearchToggle(v) } },
          ].map((item, idx)=>(
            <Line key={item.label} first={idx===0}>
              <div style={{ flex:1, minWidth:0, paddingRight:4 }}>
                <p style={{ fontSize:15, fontWeight:500, color:'var(--text)', margin:'0 0 2px' }}>{item.label}</p>
                <p style={{ fontSize:11.5, color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{item.sub}</p>
              </div>
              <Toggle value={item.val} onChange={item.onChange}/>
            </Line>
          ))}
        </Group>
      </Section>

      {/* ── Modèle par défaut ─────────────────────────── */}
      <Section label={t('profile.defaultModel')}>
        <div style={{ display:'flex', gap:8 }}>
          {([['hermes','Hermès','#d4a017'],['athena','Athéna','#5b6fff'],['zeus','Zeus','#8b5cf6']] as const).map(([id,label,color])=>{
            const active = defaultModel===id
            return (
              <button key={id} onClick={()=>{ setDefaultModel(id); save('thw_ai_default_model',id) }}
                style={{ flex:1, padding:'10px 6px', borderRadius:11, border:`1.5px solid ${active?`${color}66`:'var(--border)'}`, background:active?`${color}18`:'transparent', color:active?color:'var(--text-dim)', fontSize:12, fontWeight:active?700:500, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit', textAlign:'center' as const }}>
                <div style={{ fontSize:9, fontWeight:600, color:active?`${color}99`:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:2 }}>
                  {id==='hermes'?t('profile.speedFast'):id==='athena'?t('profile.speedBalanced'):t('profile.speedAdvanced')}
                </div>
                {label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Police du chat ────────────────────────────── */}
      <Section label={t('profile.chatFont')}>
        <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:'-2px 2px 12px', lineHeight:1.5 }}>
          {t('profile.chatFontSub')}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {CHAT_FONTS.map(f => {
            const active = chatFont === f.id
            return (
              <button key={f.id} onClick={() => { setChatFont(f.id); save('thw_ai_chat_font', f.id); window.dispatchEvent(new Event('thw:chat-font-changed')) }}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 16px', borderRadius:12,
                  border:`1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'var(--primary-dim)' : 'var(--bg-card)',
                  cursor:'pointer', transition:'all 0.15s', width:'100%', textAlign:'left' as const,
                }}>
                <div>
                  <p style={{ fontFamily:f.family, fontSize:14.5, fontWeight:500, color: active ? 'var(--primary)' : 'var(--text)', margin:'0 0 2px' }}>{f.id === 'system' ? t('profile.fontSystem') : f.label}</p>
                  <p style={{ fontFamily:f.family, fontSize:12, color:'var(--text-dim)', margin:0 }}>{t('profile.fontPreview')}</p>
                </div>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Mes règles IA ─────────────────────────────── */}
      <RulesCard />

    </div>
  )
}

// ══════════════════════════════════════════════════
// PAGE PRINCIPALE — Navigation entre onglets
// ══════════════════════════════════════════════════

// ── Ligne « bulle » de la liste (icône + libellé + valeur + chevron) ──
// Ligne de réglage façon Claude : icône fine monochrome (sans tuile),
// libellé sobre, séparateur encarté (commence après l'icône).
function ListRow({ Icon, label, value, danger, last, onClick }: {
  Icon: typeof User; label: string; value?: string; danger?: boolean; last?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left' as const,
      padding: '0 16px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.14s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? '#ef4444' : 'var(--text-mid)' }}>
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: danger ? '#ef4444' : 'var(--text)' }}>{label}</span>
        {value && <span style={{ fontSize: 13, color: 'var(--text-dim)', flexShrink: 0 }}>{value}</span>}
        {!danger && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>}
      </span>
    </button>
  )
}

// ══════════════════════════════════════════════════
// UNITÉS DE MESURE (bulle « Unités »)
// ══════════════════════════════════════════════════

function UnitSegmented({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => {
        const on = value === o.v
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            flex: 1, padding: '11px 6px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
            background: on ? 'var(--primary)' : 'var(--bg-card2)',
            color: on ? 'var(--on-primary,#fff)' : 'var(--text-mid)',
            fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, transition: 'all .15s' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function UnitesBloc() {
  const supabase = createClient()
  const [prefs, setPrefs] = useState<{ distance: string; temperature: string; weight: string }>({ distance: 'km', temperature: 'c', weight: 'kg' })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cached = localStorage.getItem('thw-unit-prefs')
        if (cached && alive) setPrefs(p => ({ ...p, ...JSON.parse(cached) }))
      } catch { /* ignore */ }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('unit_prefs').eq('id', user.id).single()
      const up = (data?.unit_prefs ?? {}) as Partial<{ distance: string; temperature: string; weight: string }>
      if (alive && up) setPrefs(p => ({ ...p, ...up }))
    })()
    return () => { alive = false }
  }, [])

  async function update(key: 'distance' | 'temperature' | 'weight', val: string) {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    try { localStorage.setItem('thw-unit-prefs', JSON.stringify(next)) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('thw:unit-prefs', { detail: next }))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ unit_prefs: next, updated_at: new Date().toISOString() }).eq('id', user.id)
  }

  const ROWS: { key: 'distance' | 'temperature' | 'weight'; label: string; opts: { v: string; label: string }[] }[] = [
    { key: 'distance',    label: 'Distance',    opts: [{ v: 'km', label: 'Kilomètres' }, { v: 'mi', label: 'Miles' }] },
    { key: 'temperature', label: 'Température',  opts: [{ v: 'c',  label: 'Celsius °C' }, { v: 'f',  label: 'Fahrenheit °F' }] },
    { key: 'weight',      label: 'Poids',       opts: [{ v: 'kg', label: 'Kilogrammes' }, { v: 'lb', label: 'Livres (lb)' }] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Intro>Choisis les unités de mesure affichées dans l&apos;application.</Intro>
      {ROWS.map(r => (
        <Section key={r.key} label={r.label}>
          <UnitSegmented value={prefs[r.key]} options={r.opts} onChange={v => void update(r.key, v)} />
        </Section>
      ))}
    </div>
  )
}

export function ProfileContent() {
  const { t } = useI18n()
  const router = useRouter()
  const { data: profile } = useProfile()
  const [active, setActive] = useState<string | null>(null)
  const [dir, setDir] = useState(1)
  const [signingOut, setSigningOut] = useState(false)
  const [planLabel, setPlanLabel] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Libellé d'abonnement affiché dans le menu : détecté depuis le tier réel.
  useEffect(() => {
    let alive = true
    fetch('/api/subscription/details')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d?.tier) setPlanLabel(tierBadgeLabel(d.tier)) })
      .catch(() => { /* silencieux */ })
    return () => { alive = false }
  }, [])

  function open(id: string) { setDir(1); setActive(id); window.scrollTo({ top: 0 }) }
  function back() { setDir(-1); setActive(null); window.scrollTo({ top: 0 }) }

  async function handleSignOut() {
    setSigningOut(true)
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    router.push('/login')
  }

  // Registre des bulles : libellé affiché dans le drill-down + contenu rapatrié.
  const CONTENT: Record<string, { label: string; node: React.ReactNode }> = {
    profil:          { label: t('profile.navProfil'),          node: <ProfilIdentityBloc /> },
    abonnement:      { label: t('profile.subscription'),      node: <AbonnementContent /> },
    utilisation:     { label: t('profile.navUtilisation'),     node: <UtilisationBloc /> },
    notifications:   { label: t('profile.navNotifications'),   node: <NotificationsBloc /> },
    confidentialite: { label: t('profile.navConfidentialite'), node: <ConfidentialiteBloc /> },
    autorisations:   { label: t('profile.navAutorisations'),   node: <AutorisationsBloc /> },
    sports:          { label: t('profile.navSports'),          node: <SportsBloc /> },
    materiel:        { label: t('profile.navMateriel'),        node: <GearBloc /> },
    connexions:      { label: t('profile.navConnexions'),      node: <ConnexionsBloc /> },
    ia:              { label: t('profile.navIa'),     node: <IASettingsBloc /> },
    langue:          { label: t('profile.navLangue'),          node: <LangueBloc /> },
    unites:          { label: 'Unités',                        node: <UnitesBloc /> },
    localisation:    { label: t('profile.navLocalisation'),    node: <LocalisationBloc /> },
    apparence:       { label: t('profile.navApparence'),       node: <ApparenceBloc /> },
  }

  const GROUPS: { title: string; rows: { id: string; label: string; Icon: typeof User; value?: string }[] }[] = [
    { title: t('profile.groupAccount'), rows: [
      { id: 'profil',          label: t('profile.navProfil'),          Icon: User },
      { id: 'abonnement',      label: t('profile.subscription'),      Icon: CreditCard, value: planLabel ?? undefined },
      { id: 'utilisation',     label: t('profile.navUtilisation'),     Icon: BarChart3 },
      { id: 'notifications',   label: t('profile.navNotifications'),   Icon: Bell },
      { id: 'confidentialite', label: t('profile.navConfidentialite'), Icon: Shield },
      { id: 'autorisations',   label: t('profile.navAutorisations'),   Icon: Lock },
    ]},
    { title: t('profile.groupSport'), rows: [
      { id: 'sports',    label: t('profile.navSports'),    Icon: Dumbbell },
      { id: 'materiel',  label: t('profile.navMateriel'),  Icon: Package },
      { id: 'connexions',label: t('profile.navConnexions'),Icon: Plug },
    ]},
    { title: t('profile.groupApp'), rows: [
      { id: 'ia',          label: t('profile.navIa'), Icon: Sparkles },
      { id: 'langue',      label: t('profile.navLangue'),      Icon: Globe },
      { id: 'unites',      label: 'Unités',                    Icon: Ruler },
      { id: 'localisation',label: t('profile.navLocalisation'),Icon: MapPin },
      { id: 'apparence',   label: t('profile.navApparence'),   Icon: Palette },
    ]},
  ]

  const initial = (profile.full_name || profile.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: GREY_PAGE, boxSizing: 'border-box' }}>
    <div style={{ width: '100%', maxWidth: 620, margin: '0 auto', padding: '20px 16px 40px', boxSizing: 'border-box' }}>
      <style>{`
        .profile-notif-grid { display: flex; flex-direction: column; }
      `}</style>

      <SlideView screenKey={active ?? '__list__'} direction={dir}>
        {active ? (
          // ── Drill-down : titre centré + boutons ronds flottants (façon Claude) ──
          <div>
            <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, margin: '0 -16px 16px', padding: '2px 16px 12px' }}>
              <button onClick={back} aria-label={t('profile.back')} style={{ position: 'absolute', left: 16, top: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                <ChevronLeft size={20} />
              </button>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{CONTENT[active]?.label}</p>
              {active === 'profil' && (
                <button onClick={() => window.dispatchEvent(new Event('thw:profile-save'))} aria-label={t('profile.save')} style={{ position: 'absolute', right: 16, top: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                  <Check size={20} />
                </button>
              )}
            </div>
            {CONTENT[active]?.node}
          </div>
        ) : (
          // ── Liste façon Claude ─────────────────────────────────────
          <div>
            {/* En-tête : avatar + nom + email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px 22px' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--primary-dim)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={t('profile.profileAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{initial}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name || t('profile.myProfile')}</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email || '—'}</p>
              </div>
            </div>

            {/* Groupes de bulles */}
            {GROUPS.map(g => (
              <div key={g.title} style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px 4px' }}>{g.title}</p>
                <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                  {g.rows.map((r, i) => (
                    <ListRow key={r.id} Icon={r.Icon} label={r.label} value={r.value} last={i === g.rows.length - 1} onClick={() => open(r.id)} />
                  ))}
                </div>
              </div>
            ))}

            {/* Se déconnecter */}
            <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <ListRow Icon={LogOut} label={signingOut ? t('profile.signingOut') : t('profile.signOut')} danger last onClick={() => { if (!signingOut) setConfirmLogout(true) }} />
            </div>
          </div>
        )}
      </SlideView>

      {/* Confirmation de déconnexion */}
      {confirmLogout && (
        <div onClick={() => { if (!signingOut) setConfirmLogout(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: 'var(--bg-card)', borderRadius: 18, padding: '22px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Se déconnecter ?</p>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>Tu devras te reconnecter pour accéder à ton compte.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmLogout(false)} disabled={signingOut} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => { if (!signingOut) void handleSignOut() }} disabled={signingOut} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: signingOut ? 'default' : 'pointer', opacity: signingOut ? 0.6 : 1 }}>{signingOut ? t('profile.signingOut') : t('profile.signOut')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════

function ProfileFallback() {
  const { t } = useI18n()
  return <div style={{ padding:40, color:'var(--text-dim)', textAlign:'center' as const }}>{t('profile.loading')}</div>
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback/>}>
      <ProfileContent/>
    </Suspense>
  )
}
