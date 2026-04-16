'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { CountUp } from '@/components/ui/AnimatedBar'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Types ───────────────────────────────────────────────────────
type PerfTab    = 'profil' | 'datas' | 'tests'
type RecordSport = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox' | 'gym'
type ZoneTab    = 'power' | 'pace' | 'hr'
interface SelectedDatum { label: string; value: string }

const Z_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']

const INIT_PROFILE = {
  ftp: 301, weight: 75, age: 31, lthr: 172, hrMax: 192, hrRest: 44,
  thresholdPace: '4:08', vma: 18.5, css: '1:28', vo2max: 62,
}

// ── Zone helpers ─────────────────────────────────────────────────
function calcBikeZones(ftp: number) {
  return [
    { z:'Z1', label:'Recuperation', minW: 0,                        maxW: Math.round(ftp*0.55) },
    { z:'Z2', label:'Endurance',    minW: Math.round(ftp*0.56),     maxW: Math.round(ftp*0.75) },
    { z:'Z3', label:'Tempo',        minW: Math.round(ftp*0.76),     maxW: Math.round(ftp*0.87) },
    { z:'Z4', label:'Seuil',        minW: Math.round(ftp*0.88),     maxW: Math.round(ftp*1.05) },
    { z:'Z5', label:'VO2max',       minW: Math.round(ftp*1.06),     maxW: Math.round(ftp*1.20) },
  ]
}

function parseSec(pace: string): number {
  const p = pace.split(':')
  return parseInt(p[0]) * 60 + (parseInt(p[1]) || 0)
}

function secToStr(sec: number): string {
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`
}

function calcRunZones(tSec: number) {
  return [
    { z:'Z1', label:'Recup',   range: `> ${secToStr(Math.round(tSec*1.25))}/km` },
    { z:'Z2', label:'Aerobie', range: `${secToStr(Math.round(tSec*1.11))} - ${secToStr(Math.round(tSec*1.25))}/km` },
    { z:'Z3', label:'Tempo',   range: `${secToStr(Math.round(tSec*1.01))} - ${secToStr(Math.round(tSec*1.10))}/km` },
    { z:'Z4', label:'Seuil',   range: `${secToStr(Math.round(tSec*0.91))} - ${secToStr(Math.round(tSec*1.00))}/km` },
    { z:'Z5', label:'VO2max',  range: `< ${secToStr(Math.round(tSec*0.90))}/km` },
  ]
}

function calcSwimZones(cssSec: number) {
  return [
    { z:'Z1', label:'Recup',   range: `> ${secToStr(Math.round(cssSec*1.35))}/100m` },
    { z:'Z2', label:'Aerobie', range: `${secToStr(Math.round(cssSec*1.16))} - ${secToStr(Math.round(cssSec*1.34))}/100m` },
    { z:'Z3', label:'Tempo',   range: `${secToStr(Math.round(cssSec*1.06))} - ${secToStr(Math.round(cssSec*1.15))}/100m` },
    { z:'Z4', label:'Seuil',   range: `${secToStr(Math.round(cssSec*0.98))} - ${secToStr(Math.round(cssSec*1.05))}/100m` },
    { z:'Z5', label:'VO2max',  range: `< ${secToStr(Math.round(cssSec*0.97))}/100m` },
  ]
}

function calcHRZones(hrMax: number, hrRest: number) {
  const r = hrMax - hrRest
  return [
    { z:'Z1', label:'Recup',   min: hrRest,                            max: Math.round(hrRest + r*0.60) },
    { z:'Z2', label:'Aerobie', min: Math.round(hrRest + r*0.60) + 1,  max: Math.round(hrRest + r*0.70) },
    { z:'Z3', label:'Tempo',   min: Math.round(hrRest + r*0.70) + 1,  max: Math.round(hrRest + r*0.80) },
    { z:'Z4', label:'Seuil',   min: Math.round(hrRest + r*0.80) + 1,  max: Math.round(hrRest + r*0.90) },
    { z:'Z5', label:'VO2max',  min: Math.round(hrRest + r*0.90) + 1,  max: hrMax },
  ]
}

function calcPacePerKm(distKm: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
  if (!s) return '—'
  const sPerKm = s / distKm
  return `${Math.floor(sPerKm/60)}:${String(Math.round(sPerKm%60)).padStart(2,'0')}/km`
}

function calcSplit500m(distM: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
  if (!s) return '—'
  const sp = (s / distM) * 500
  return `${Math.floor(sp/60)}:${String(Math.round(sp%60)).padStart(2,'0')}/500m`
}

function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
}

// ── Data ────────────────────────────────────────────────────────
const BIKE_DURS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','20min','30min','1h','2h','3h','4h','5h','6h']
const BIKE_REC: Record<string, {w:number;date:string}[]> = {
  'Pmax': [{w:1240,date:'2024-08-12'},{w:1180,date:'2023-06-20'}],
  '10s':  [{w:980, date:'2024-09-01'},{w:920, date:'2023-07-15'}],
  '30s':  [{w:740, date:'2024-07-22'},{w:710, date:'2023-05-10'}],
  '1min': [{w:560, date:'2024-06-14'},{w:530, date:'2023-08-03'}],
  '3min': [{w:430, date:'2024-05-28'},{w:410, date:'2023-09-18'}],
  '5min': [{w:390, date:'2024-04-10'},{w:375, date:'2023-04-22'}],
  '8min': [{w:360, date:'2024-03-15'},{w:348, date:'2023-03-30'}],
  '10min':[{w:345, date:'2024-02-28'},{w:332, date:'2023-02-14'}],
  '12min':[{w:335, date:'2024-01-20'},{w:320, date:'2023-01-08'}],
  '20min':[{w:320, date:'2024-10-05'},{w:308, date:'2023-10-12'}],
  '30min':[{w:310, date:'2024-11-02'},{w:298, date:'2023-11-20'}],
  '1h':   [{w:301, date:'2024-12-01'},{w:285, date:'2023-12-10'}],
  '2h':   [{w:275, date:'2024-08-30'},{w:262, date:'2023-08-25'}],
  '3h':   [{w:255, date:'2024-07-14'},{w:242, date:'2023-07-20'}],
  '4h':   [{w:238, date:'2024-06-22'},{w:225, date:'2023-06-18'}],
  '5h':   [{w:222, date:'2024-05-18'},{w:210, date:'2023-05-30'}],
  '6h':   [{w:208, date:'2024-04-28'},{w:196, date:'2023-04-15'}],
}

const RUN_DISTS = ['1500m','5km','10km','Semi','Marathon','50km','100km']
const RUN_KM: Record<string,number> = { '1500m':1.5,'5km':5,'10km':10,'Semi':21.1,'Marathon':42.195,'50km':50,'100km':100 }
const RUN_REC: Record<string, {time:string;date:string}[]> = {
  '1500m':   [{time:'4:22',    date:'2024-06-08'},{time:'4:35',    date:'2023-07-14'}],
  '5km':     [{time:'17:45',   date:'2024-04-21'},{time:'18:12',   date:'2023-05-10'}],
  '10km':    [{time:'37:20',   date:'2024-05-12'},{time:'38:45',   date:'2023-06-18'}],
  'Semi':    [{time:'1:24:30', date:'2024-04-06'},{time:'1:27:15', date:'2023-04-09'}],
  'Marathon':[{time:'3:05:00', date:'2024-10-20'},{time:'3:12:30', date:'2023-10-15'}],
  '50km':    [{time:'4:45:00', date:'2024-07-06'},{time:'—',       date:'—'}],
  '100km':   [{time:'—',       date:'—'},          {time:'—',      date:'—'}],
}

const SWIM_DISTS = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const SWIM_M: Record<string,number> = { '100m':100,'200m':200,'400m':400,'1000m':1000,'1500m':1500,'2000m':2000,'5000m':5000,'10000m':10000 }
const SWIM_REC: Record<string, {time:string;date:string}[]> = {
  '100m':  [{time:'1:10',  date:'2024-03-15'},{time:'1:14',  date:'2023-04-20'}],
  '200m':  [{time:'2:28',  date:'2024-04-10'},{time:'2:35',  date:'2023-05-12'}],
  '400m':  [{time:'5:10',  date:'2024-02-28'},{time:'5:22',  date:'2023-03-18'}],
  '1000m': [{time:'13:20', date:'2024-05-20'},{time:'13:55', date:'2023-06-10'}],
  '1500m': [{time:'20:30', date:'2024-01-15'},{time:'21:10', date:'2023-02-20'}],
  '2000m': [{time:'27:45', date:'2024-06-05'},{time:'28:40', date:'2023-07-15'}],
  '5000m': [{time:'—',     date:'—'},          {time:'—',    date:'—'}],
  '10000m':[{time:'—',     date:'—'},          {time:'—',    date:'—'}],
}

const ROW_DISTS = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const ROW_M: Record<string,number> = { '500m':500,'1000m':1000,'2000m':2000,'5000m':5000,'10000m':10000,'Semi':21097,'Marathon':42195 }
const ROW_REC: Record<string, {time:string;date:string}[]> = {
  '500m':   [{time:'1:32',  date:'2024-02-10'},{time:'1:36',  date:'2023-03-05'}],
  '1000m':  [{time:'3:18',  date:'2024-03-20'},{time:'3:25',  date:'2023-04-15'}],
  '2000m':  [{time:'6:52',  date:'2024-01-28'},{time:'7:08',  date:'2023-02-12'}],
  '5000m':  [{time:'18:30', date:'2024-04-05'},{time:'19:10', date:'2023-05-20'}],
  '10000m': [{time:'38:45', date:'2024-05-10'},{time:'40:20', date:'2023-06-08'}],
  'Semi':   [{time:'—',     date:'—'},          {time:'—',    date:'—'}],
  'Marathon':[{time:'—',   date:'—'},           {time:'—',   date:'—'}],
}

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
interface HyroxRecord {
  format: string; date: string; total: string; roxzone: string; penalties: string
  stations: Record<string, string>; runs: string[]
}
const HYROX_REC: HyroxRecord = {
  format: 'Solo Open Homme', date: '2024-05-10', total: '1:02:45', roxzone: '8:30', penalties: '0',
  stations: {
    'SkiErg': '3:42', 'Sled Push': '3:15', 'Sled Pull': '2:55',
    'Burpee Broad Jump': '5:10', 'Rowing': '3:28', 'Farmers Carry': '2:40',
    'Sandbag Lunges': '5:55', 'Wall Balls': '4:50',
  },
  runs: ['4:12','4:08','4:15','4:22','4:18','4:30','4:35','4:28'],
}

const GYM_MOVES = [
  { name:'Bench Press',    recs:[{l:'1RM',v:120},{l:'3RM',v:110},{l:'5RM',v:102},{l:'10RM',v:90},{l:'Max reps PDC',v:32}] },
  { name:'Squat',          recs:[{l:'1RM',v:150},{l:'3RM',v:138},{l:'5RM',v:128},{l:'10RM',v:112},{l:'Max reps PDC',v:0}] },
  { name:'Deadlift',       recs:[{l:'1RM',v:185},{l:'3RM',v:172},{l:'5RM',v:160},{l:'10RM',v:140},{l:'Max reps PDC',v:0}] },
  { name:'Tractions',      recs:[{l:'Max reps PDC',v:18},{l:'1RM+charge',v:40}] },
  { name:'Dips',           recs:[{l:'Max reps PDC',v:30},{l:'1RM+charge',v:50}] },
  { name:'Dev. militaire', recs:[{l:'Max charge',v:80}] },
  { name:'Pompes',         recs:[{l:'Max reps',v:65}] },
]

const PROG = {
  ftp:     [265, 285, 301],
  run5k:   ['19:45', '18:12', '17:45'],
  swim100: ['1:22', '1:16', '1:10'],
  row2k:   ['7:35', '7:08', '6:52'],
}

// ── Smart message builder ────────────────────────────────────────
function buildAIMessage(datum: SelectedDatum): string {
  const { label, value } = datum
  const l = label.toLowerCase()
  if (l === 'vo2max')                  return `Que signifie mon VO2max de ${value} ? Est-ce un bon niveau et comment l'améliorer ?`
  if (l === 'ftp')                     return `Mon FTP est de ${value}. Comment progresser en puissance au seuil ?`
  if (l === 'vma')                     return `Avec une VMA de ${value}, quels entraînements spécifiques me conseilles-tu ?`
  if (l === 'css')                     return `Ma CSS est de ${value}. Comment améliorer mon endurance en natation ?`
  if (l.includes('fc max'))            return `Ma FC max est de ${value}. Est-ce normal pour mon profil d'athlète ?`
  if (l.includes('fc repos'))          return `Ma FC au repos est de ${value}. Que m'indique cette valeur sur ma récupération ?`
  if (l.includes('lthr'))              return `Mon LTHR est de ${value}. Comment utiliser cette donnée pour calibrer mes zones d'intensité ?`
  if (l.includes('allure'))            return `Mon allure seuil est de ${value}. Quel programme pour l'améliorer ?`
  if (l.includes('w/kg'))              return `Mon ratio puissance/poids est de ${value}. Comment l'améliorer ?`
  if (l.startsWith('z') && l.includes('zone')) return `Explique-moi ${label} (${value}). Quels entraînements dois-je faire dans cette zone ?`
  if (l.includes('zone'))              return `Explique-moi ${label} : ${value}. Quels entraînements dois-je faire dans cette zone ?`
  if (l.includes('run') || l.includes('course') || l.includes('km') || l.includes('marathon') || l.includes('semi'))
                                       return `Mon record sur ${label} est de ${value}. Comment progresser sur cette distance ?`
  if (l.includes('natation') || l.includes('swim')) return `Mon record en ${label} est de ${value}. Comment améliorer ma vitesse en natation ?`
  if (l.includes('aviron') || l.includes('row'))    return `Mon record en ${label} est de ${value}. Comment améliorer mes temps en aviron ?`
  if (l.includes('hyrox'))             return `Mon temps Hyrox sur "${label}" est de ${value}. Comment améliorer cette station ?`
  if (l.includes('1rm') || l.includes('rm') || l.includes('reps')) return `Mon record de ${label} est de ${value}. Comment progresser en musculation sur ce mouvement ?`
  return `Analyse ma donnée de performance "${label}" : ${value}. Quel est ce niveau et comment puis-je progresser ?`
}

// ── UI primitives ────────────────────────────────────────────────
function Card({ children, style, delay }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <div
      className="card-enter"
      style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)', animationDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  )
}

function StatBox({ label, value, unit, sub, color, onSelect, selected }: {
  label: string; value: string|number; unit?: string; sub?: string; color?: string;
  onSelect?: () => void; selected?: boolean;
}) {
  const isInt = typeof value === 'number' && value >= 0 && Number.isInteger(value)
  return (
    <div
      className="card-enter"
      onClick={onSelect}
      style={{
        background: selected ? 'rgba(0,200,224,0.08)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#00c8e0' : 'var(--border)'}`,
        borderRadius:12, padding:'11px 13px',
        cursor: onSelect ? 'pointer' : undefined,
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(0,200,224,0.15)' : undefined,
        userSelect: 'none' as const,
      }}
    >
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:selected?'#00c8e0':color||'var(--text)', margin:0, lineHeight:1 }}>
        {isInt ? <CountUp value={value as number} /> : value}
        {unit && <span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)', marginLeft:3 }}>{unit}</span>}
      </p>
      {sub && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  )
}

function ZBars({ zones, onSelect, selectedKey }: {
  zones: { z:string; label:string; range:string }[];
  onSelect?: (key: string, label: string, range: string) => void;
  selectedKey?: string;
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const raf = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(raf) }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {zones.map((z, i) => {
        const key = `${z.z}-${z.label}`
        const sel = selectedKey === key
        return (
          <div
            key={z.z}
            onClick={() => onSelect?.(key, `Zone ${z.z} ${z.label}`, z.range)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding: onSelect ? '4px 6px' : undefined,
              borderRadius: onSelect ? 8 : undefined,
              cursor: onSelect ? 'pointer' : undefined,
              background: sel ? `${Z_COLORS[i]}14` : undefined,
              border: sel ? `1px solid ${Z_COLORS[i]}55` : '1px solid transparent',
              transition:'background 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ width:26, height:26, borderRadius:6, background:`${Z_COLORS[i]}22`, border:`1px solid ${Z_COLORS[i]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:Z_COLORS[i], flexShrink:0 }}>{z.z}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontSize:11, color:'var(--text-mid)' }}>{z.label}</span>
                <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:Z_COLORS[i], fontWeight:600 }}>{z.range}</span>
              </div>
              <div style={{ height:5, borderRadius:999, background:`${Z_COLORS[i]}22`, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${20+i*16}%`, background:Z_COLORS[i], opacity:0.7, borderRadius:999,
                  transformOrigin:'left center',
                  transform: ready ? 'scaleX(1)' : 'scaleX(0)',
                  transition:`transform 1.1s cubic-bezier(0.25,1,0.5,1) ${i * 60}ms`,
                  willChange:'transform',
                }}/>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecordRow({ label, rec24, rec23, sub, onSelect, selected }: {
  label: string; rec24: string; rec23: string; sub?: string;
  onSelect?: () => void; selected?: boolean;
}) {
  const isPR = rec24 !== '—' && rec23 !== '—' && rec24 < rec23
  return (
    <div
      onClick={rec24 !== '—' ? onSelect : undefined}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9,
        background: selected ? 'rgba(0,200,224,0.06)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#00c8e0' : 'var(--border)'}`,
        marginBottom:5,
        cursor: (onSelect && rec24 !== '—') ? 'pointer' : undefined,
        transition:'border-color 0.15s, background 0.15s',
        userSelect: 'none' as const,
      }}
    >
      <span style={{ fontSize:11, fontWeight:500, color:'var(--text-mid)', minWidth:72, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color: selected ? '#00c8e0' : '#00c8e0' }}>{rec24}</span>
          {isPR && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'rgba(0,200,224,0.15)', color:'#00c8e0', fontWeight:700 }}>PR</span>}
          {sub && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{sub}</span>}
        </div>
        {rec23 && rec23 !== '—' && (
          <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>2023 : {rec23}</span>
        )}
      </div>
    </div>
  )
}

function NInput({ label, value, onChange, unit, step }: { label:string; value:number; onChange:(v:number)=>void; unit?:string; step?:number }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>
        {label}{unit && <span style={{ fontWeight:400, marginLeft:3, textTransform:'none' as const }}>({unit})</span>}
      </p>
      <input type="number" value={value} step={step||1} onChange={e => onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

function PowerCurve({ d24, d23 }: { d24:number[]; d23:number[] }) {
  const maxW = Math.max(...d24, ...d23) * 1.05
  const W = 400, H = 110
  const pts = (arr: number[]) => arr.map((v, i) => `${(i/(arr.length-1))*W},${H-((v/maxW)*H)}`).join(' ')
  const p24 = pts(d24), p23 = pts(d23)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H+4, overflow:'visible' }}>
      <defs>
        <linearGradient id="g24" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#00c8e0" stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="g23" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b6fff" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#5b6fff" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {[25,50,75].map(p => <line key={p} x1={0} y1={H-(p/100)*H} x2={W} y2={H-(p/100)*H} stroke="var(--border)" strokeWidth="0.5"/>)}
      <polygon points={`0,${H} ${p23} ${W},${H}`} fill="url(#g23)"/>
      <polyline points={p23} fill="none" stroke="#5b6fff" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"/>
      <polygon points={`0,${H} ${p24} ${W},${H}`} fill="url(#g24)"/>
      <polyline points={p24} fill="none" stroke="#00c8e0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function LineChart({ series, labels }: { series:{label:string;color:string;data:number[]}[]; labels:string[] }) {
  const all = series.flatMap(s => s.data)
  const min = Math.min(...all) * 0.95, max = Math.max(...all) * 1.05
  const W = 300, H = 80
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, overflow:'visible' }}>
        {series.map(s => {
          const p = s.data.map((v, i) => `${(i/(s.data.length-1))*W},${H-((v-min)/(max-min))*H}`).join(' ')
          return (
            <g key={s.label}>
              <polyline points={p} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              {s.data.map((v, i) => (
                <circle key={i} cx={(i/(s.data.length-1))*W} cy={H-((v-min)/(max-min))*H} r="3" fill={s.color}/>
              ))}
            </g>
          )
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {labels.map(l => <span key={l} style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Floating bubble ──────────────────────────────────────────────
function SelectedDatumBubble({ datum, onClear, onAsk }: {
  datum: SelectedDatum; onClear: () => void; onAsk: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div style={{
      position:'fixed', bottom:88, left:'50%', transform:'translateX(-50%)',
      zIndex:1100,
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 14px 10px 16px',
      borderRadius:14,
      background:'var(--bg-card)',
      border:'1px solid rgba(0,200,224,0.45)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,200,224,0.08)',
      animation:'cardEnter 0.22s cubic-bezier(0.4,0,0.2,1) both',
      maxWidth:'calc(100vw - 48px)',
      whiteSpace:'nowrap' as const,
    }}>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>{datum.label}</p>
        <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#00c8e0', margin:0 }}>{datum.value}</p>
      </div>
      <button
        onClick={onAsk}
        style={{
          padding:'7px 14px', borderRadius:10,
          background:'linear-gradient(135deg,#00c8e0,#5b6fff)',
          border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
          whiteSpace:'nowrap' as const, flexShrink:0,
        }}
      >
        Demander au Coach IA
      </button>
      <button
        onClick={onClear}
        style={{
          width:24, height:24, borderRadius:6, border:'1px solid var(--border)',
          background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
          fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, lineHeight:1,
        }}
      >×</button>
    </div>,
    document.body
  )
}

// ════════════════════════════════════════════════
// ONGLET PROFIL
// ════════════════════════════════════════════════
function ProfilTab({ onSelect, selectedDatum }: {
  onSelect: (label: string, value: string) => void
  selectedDatum: SelectedDatum | null
}) {
  const [p, setP] = useState({ ...INIT_PROFILE })
  const [editing, setEditing] = useState(false)
  const wkg = (p.ftp / p.weight).toFixed(2)

  function isSel(label: string, value: string | number, unit?: string) {
    const v = `${value}${unit ? ` ${unit}` : ''}`
    return selectedDatum?.label === label && selectedDatum?.value === v
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap' as const, gap:8 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Profil athlete</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>Parametres physiologiques</p>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'6px 14px', borderRadius:9, background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)', border:`1px solid ${editing?'transparent':'var(--border)'}`, color:editing?'#fff':'var(--text-mid)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            {editing ? 'Sauvegarder' : 'Modifier'}
          </button>
        </div>
        {editing ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-3">
            <NInput label="FTP" unit="W" value={p.ftp} onChange={v => setP({...p,ftp:v})}/>
            <NInput label="Poids" unit="kg" value={p.weight} onChange={v => setP({...p,weight:v})} step={0.5}/>
            <NInput label="Age" value={p.age} onChange={v => setP({...p,age:v})}/>
            <NInput label="FC max" unit="bpm" value={p.hrMax} onChange={v => setP({...p,hrMax:v})}/>
            <NInput label="FC repos" unit="bpm" value={p.hrRest} onChange={v => setP({...p,hrRest:v})}/>
            <NInput label="LTHR" unit="bpm" value={p.lthr} onChange={v => setP({...p,lthr:v})}/>
            <NInput label="VMA" unit="km/h" value={p.vma} onChange={v => setP({...p,vma:v})} step={0.5}/>
            <NInput label="VO2max" value={p.vo2max} onChange={v => setP({...p,vo2max:v})}/>
            <TInput label="Allure seuil" value={p.thresholdPace} onChange={v => setP({...p,thresholdPace:v})} placeholder="4:08"/>
            <TInput label="CSS" value={p.css} onChange={v => setP({...p,css:v})} placeholder="1:28"/>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-4">
            <StatBox label="FTP"          value={p.ftp}            unit="W"        sub={`${wkg} W/kg`} color="#00c8e0" onSelect={() => onSelect('FTP', `${p.ftp} W`)} selected={isSel('FTP', p.ftp, 'W')}/>
            <StatBox label="Allure seuil" value={p.thresholdPace}  unit="/km"      color="#22c55e"     onSelect={() => onSelect('Allure seuil', `${p.thresholdPace}/km`)} selected={selectedDatum?.label==='Allure seuil'}/>
            <StatBox label="VMA"          value={p.vma}            unit="km/h"     color="#22c55e"     onSelect={() => onSelect('VMA', `${p.vma} km/h`)} selected={isSel('VMA', p.vma, 'km/h')}/>
            <StatBox label="CSS"          value={p.css}            unit="/100m"    color="#38bdf8"     onSelect={() => onSelect('CSS', `${p.css}/100m`)} selected={selectedDatum?.label==='CSS'}/>
            <StatBox label="FC max"       value={p.hrMax}          unit="bpm"      color="#ef4444"     onSelect={() => onSelect('FC max', `${p.hrMax} bpm`)} selected={isSel('FC max', p.hrMax, 'bpm')}/>
            <StatBox label="FC repos"     value={p.hrRest}         unit="bpm"      color="#22c55e"     onSelect={() => onSelect('FC repos', `${p.hrRest} bpm`)} selected={isSel('FC repos', p.hrRest, 'bpm')}/>
            <StatBox label="LTHR"         value={p.lthr}           unit="bpm"      color="#f97316"     onSelect={() => onSelect('LTHR', `${p.lthr} bpm`)} selected={isSel('LTHR', p.lthr, 'bpm')}/>
            <StatBox label="VO2max"       value={p.vo2max}         unit="ml/kg/min" color="#a855f7"   onSelect={() => onSelect('VO2max', `${p.vo2max} ml/kg/min`)} selected={isSel('VO2max', p.vo2max, 'ml/kg/min')}/>
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>Niveau estime</h2>
        {[
          { label:'W/kg',    val:parseFloat(wkg), max:6,  display:`${wkg} W/kg`,           color:'#00c8e0', desc:parseFloat(wkg)>=4.5?'Expert':parseFloat(wkg)>=3.5?'Avance':'Intermediaire' },
          { label:'VO2max',  val:p.vo2max,        max:80, display:`${p.vo2max} ml/kg/min`,  color:'#a855f7', desc:p.vo2max>=65?'Elite':p.vo2max>=55?'Eleve':'Moyen' },
          { label:'FC repos',val:80-p.hrRest,     max:50, display:`${p.hrRest} bpm`,        color:'#22c55e', desc:p.hrRest<=40?'Elite':p.hrRest<=50?'Eleve':'Moyen' },
        ].map(item => {
          const sel = selectedDatum?.label === item.label
          return (
            <div
              key={item.label}
              onClick={() => onSelect(item.label, item.display)}
              style={{
                marginBottom:12, padding:'8px 10px', borderRadius:10, cursor:'pointer',
                background: sel ? `${item.color}10` : undefined,
                border: `1px solid ${sel ? item.color+'55' : 'transparent'}`,
                transition:'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'var(--text-mid)' }}>{item.label}</span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:`${item.color}22`, color:item.color, fontWeight:600 }}>{item.desc}</span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:item.color }}>{item.display}</span>
                </div>
              </div>
              <div style={{ height:7, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                <div style={{ height:'100%', width:`${Math.min(Math.abs(item.val)/item.max*100,100)}%`, background:`linear-gradient(90deg,${item.color}88,${item.color})`, borderRadius:999 }}/>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// ONGLET DATAS (Zones + Records)
// ════════════════════════════════════════════════
function DatasTab({ onSelect, selectedDatum }: {
  onSelect: (label: string, value: string) => void
  selectedDatum: SelectedDatum | null
}) {
  // ── Zones state ──
  const [p, setP]           = useState({ ...INIT_PROFILE })
  const [zoneTab, setZoneTab] = useState<ZoneTab>('power')
  const [editing, setEditing] = useState(false)

  const bikeZones = calcBikeZones(p.ftp)
  const runZones  = calcRunZones(parseSec(p.thresholdPace))
  const swimZones = calcSwimZones(parseSec(p.css))
  const hrZones   = calcHRZones(p.hrMax, p.hrRest)

  // ── Records state ──
  const [sport, setSport]       = useState<RecordSport>('bike')
  const [simMode, setSimMode]   = useState(false)
  const [simDeltas, setSimDeltas] = useState<Record<string,number>>({})

  const curve24 = BIKE_DURS.map(d => BIKE_REC[d]?.[0]?.w || 0)
  const curve23 = BIKE_DURS.map(d => BIKE_REC[d]?.[1]?.w || 0)

  function hyroxSimTotal(): string {
    let total = 0
    HYROX_STATIONS.forEach(s => { total += toSec(HYROX_REC.stations[s] || '0:00') - (simDeltas[s] || 0) })
    HYROX_REC.runs.forEach((r, i) => { total += toSec(r) - (simDeltas[`run${i}`] || 0) })
    total += toSec(HYROX_REC.roxzone)
    return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`
  }

  const SPORT_TABS: [RecordSport,string,string][] = [
    ['bike','Velo','#3b82f6'],['run','Course','#22c55e'],['swim','Natation','#38bdf8'],
    ['rowing','Aviron','#14b8a6'],['hyrox','Hyrox','#ef4444'],['gym','Muscu','#f97316'],
  ]

  const zoneSelKey = selectedDatum
    ? (() => {
        // Reverse-match: selectedDatum label is like "Zone Z1 Recup" → key "Z1-Recup"
        const m = selectedDatum.label.match(/^Zone (Z\d) (.+)$/)
        return m ? `${m[1]}-${m[2]}` : undefined
      })()
    : undefined

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── SECTION ZONES ─────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0' }}>
        <div style={{ width:3, height:20, borderRadius:2, background:'linear-gradient(180deg,#00c8e0,#5b6fff)' }}/>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color:'var(--text)' }}>Zones d'entraînement</h2>
      </div>

      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <p style={{ fontSize:12, color:'var(--text-mid)', margin:0 }}>Zones calculées depuis tes seuils physiologiques</p>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'5px 12px', borderRadius:8, background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)', border:`1px solid ${editing?'transparent':'var(--border)'}`, color:editing?'#fff':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            {editing ? 'Appliquer' : 'Modifier seuils'}
          </button>
        </div>
        {editing && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14, padding:'12px 14px', borderRadius:11, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.15)' }} className="md:grid-cols-4">
            <NInput label="FTP" unit="W" value={p.ftp} onChange={v => setP({...p,ftp:v})}/>
            <TInput label="Allure seuil" value={p.thresholdPace} onChange={v => setP({...p,thresholdPace:v})} placeholder="4:08"/>
            <TInput label="CSS" value={p.css} onChange={v => setP({...p,css:v})} placeholder="1:28"/>
            <NInput label="FC max" unit="bpm" value={p.hrMax} onChange={v => setP({...p,hrMax:v})}/>
            <NInput label="FC repos" unit="bpm" value={p.hrRest} onChange={v => setP({...p,hrRest:v})}/>
          </div>
        )}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
          {(['power','pace','hr'] as ZoneTab[]).map(t => (
            <button key={t} onClick={() => setZoneTab(t)}
              style={{ padding:'6px 13px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:zoneTab===t?'#00c8e0':'var(--border)', background:zoneTab===t?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:zoneTab===t?'#00c8e0':'var(--text-mid)', fontSize:12, fontWeight:zoneTab===t?600:400 }}>
              {t === 'power' ? 'Puissance' : t === 'pace' ? 'Allures' : 'Freq. cardiaque'}
            </button>
          ))}
        </div>
      </Card>

      {zoneTab === 'power' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>Velo — FTP {p.ftp}W</h3>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#00c8e0' }}>{(p.ftp/p.weight).toFixed(2)} W/kg</span>
            </div>
            <ZBars
              zones={bikeZones.map(z => ({ z:z.z, label:z.label, range:`${z.minW}–${z.maxW}W` }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
            />
          </Card>
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Aviron /500m</h3>
            <ZBars
              zones={[
                { z:'Z1', label:'Recup',   range:'> 2:15/500m' },
                { z:'Z2', label:'Aerobie', range:'2:00 - 2:14/500m' },
                { z:'Z3', label:'Tempo',   range:'1:52 - 1:59/500m' },
                { z:'Z4', label:'Seuil',   range:'1:44 - 1:51/500m' },
                { z:'Z5', label:'VO2max',  range:'< 1:43/500m' },
              ]}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
            />
          </Card>
        </div>
      )}

      {zoneTab === 'pace' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Course — seuil {p.thresholdPace}/km</h3>
            <ZBars
              zones={runZones}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
            />
          </Card>
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Natation — CSS {p.css}/100m</h3>
            <ZBars
              zones={swimZones}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
            />
          </Card>
        </div>
      )}

      {zoneTab === 'hr' && (
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>Frequence cardiaque</h3>
            <div style={{ display:'flex', gap:12, fontSize:11 }}>
              <span style={{ color:'var(--text-dim)' }}>Repos : <strong style={{ color:'#22c55e', fontFamily:'DM Mono,monospace' }}>{p.hrRest}bpm</strong></span>
              <span style={{ color:'var(--text-dim)' }}>LTHR : <strong style={{ color:'#f97316', fontFamily:'DM Mono,monospace' }}>{p.lthr}bpm</strong></span>
              <span style={{ color:'var(--text-dim)' }}>Max : <strong style={{ color:'#ef4444', fontFamily:'DM Mono,monospace' }}>{p.hrMax}bpm</strong></span>
            </div>
          </div>
          <ZBars
            zones={hrZones.map(z => ({ z:z.z, label:z.label, range:`${z.min} - ${z.max} bpm` }))}
            onSelect={(key, label, range) => onSelect(label, range)}
            selectedKey={zoneSelKey}
          />
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', height:14, borderRadius:7, overflow:'hidden' }}>
              {hrZones.map((z, i) => <div key={z.z} style={{ flex:z.max-z.min, background:Z_COLORS[i], opacity:0.8 }}/>)}
            </div>
            <div style={{ display:'flex', marginTop:3 }}>
              {hrZones.map((z, i) => (
                <div key={z.z} style={{ flex:z.max-z.min, textAlign:'center' as const }}>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:Z_COLORS[i] }}>{z.min}</span>
                </div>
              ))}
              <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:Z_COLORS[4] }}>{p.hrMax}</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── SÉPARATEUR ────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0 4px' }}>
        <div style={{ flex:1, height:1, background:'var(--border)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:3, height:20, borderRadius:2, background:'linear-gradient(180deg,#ffb340,#f97316)' }}/>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color:'var(--text)' }}>Records personnels</h2>
        </div>
        <div style={{ flex:1, height:1, background:'var(--border)' }}/>
      </div>

      {/* ── RECORDS ──────────────────────────── */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
        {SPORT_TABS.map(([s,l,c]) => (
          <button key={s} onClick={() => setSport(s)}
            style={{ padding:'7px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:sport===s?c:'var(--border)', background:sport===s?`${c}22`:'var(--bg-card)', color:sport===s?c:'var(--text-mid)', fontSize:12, fontWeight:sport===s?600:400 }}>
            {l}
          </button>
        ))}
      </div>

      {sport === 'bike' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Power Curve</h2>
              <div style={{ display:'flex', gap:12 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#00c8e0' }}>
                  <span style={{ width:12, height:2, background:'#00c8e0', display:'inline-block' }}/>2024
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#5b6fff' }}>
                  <span style={{ width:12, height:2, background:'#5b6fff', display:'inline-block', opacity:0.7 }}/>2023
                </span>
              </div>
            </div>
            <PowerCurve d24={curve24} d23={curve23}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              {['Pmax','1min','5min','20min','1h'].map(l => (
                <span key={l} style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{l}</span>
              ))}
            </div>
          </Card>
          <Card>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records de puissance</h2>
            {BIKE_DURS.map(d => {
              const r24 = BIKE_REC[d]?.[0]
              const r23 = BIKE_REC[d]?.[1]
              if (!r24) return null
              const sel = selectedDatum?.label === `Vélo ${d}` && selectedDatum?.value === `${r24.w}W`
              return (
                <RecordRow key={d} label={d}
                  rec24={`${r24.w}W`}
                  rec23={r23 ? `${r23.w}W` : '—'}
                  sub={`${(r24.w/INIT_PROFILE.weight).toFixed(2)} W/kg`}
                  onSelect={() => onSelect(`Vélo ${d}`, `${r24.w}W`)}
                  selected={sel}
                />
              )
            })}
          </Card>
        </div>
      )}

      {sport === 'run' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records course a pied</h2>
          {RUN_DISTS.map(d => {
            const r24 = RUN_REC[d]?.[0]
            const r23 = RUN_REC[d]?.[1]
            const pace = calcPacePerKm(RUN_KM[d], r24?.time || '')
            const sel = selectedDatum?.label === `Course ${d}` && selectedDatum?.value === (r24?.time || '—')
            return (
              <RecordRow key={d} label={d}
                rec24={r24?.time || '—'}
                rec23={r23?.time || '—'}
                sub={pace !== '—' ? pace : undefined}
                onSelect={() => r24?.time && r24.time !== '—' ? onSelect(`Course ${d}`, r24.time) : undefined}
                selected={sel}
              />
            )
          })}
        </Card>
      )}

      {sport === 'swim' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records natation</h2>
          {SWIM_DISTS.map(d => {
            const r24 = SWIM_REC[d]?.[0]
            const r23 = SWIM_REC[d]?.[1]
            const split = calcSplit500m(SWIM_M[d], r24?.time || '')
            const sel = selectedDatum?.label === `Natation ${d}` && selectedDatum?.value === (r24?.time || '—')
            return (
              <RecordRow key={d} label={d}
                rec24={r24?.time || '—'}
                rec23={r23?.time || '—'}
                sub={split !== '—' ? split.replace('/500m','/100m') : undefined}
                onSelect={() => r24?.time && r24.time !== '—' ? onSelect(`Natation ${d}`, r24.time) : undefined}
                selected={sel}
              />
            )
          })}
        </Card>
      )}

      {sport === 'rowing' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records aviron</h2>
          {ROW_DISTS.map(d => {
            const r24 = ROW_REC[d]?.[0]
            const r23 = ROW_REC[d]?.[1]
            const split = calcSplit500m(ROW_M[d], r24?.time || '')
            let watts = '—'
            if (split !== '—') {
              const pp = split.split('/')[0].split(':').map(Number)
              const ss = pp[0]*60+(pp[1]||0)
              if (ss > 0) watts = `~${Math.round(2.80/(ss/500)**3)}W`
            }
            const lbl = d === 'Semi' ? 'Semi (21km)' : d === 'Marathon' ? 'Marathon (42km)' : d
            const sel = selectedDatum?.label === `Aviron ${d}` && selectedDatum?.value === (r24?.time || '—')
            return (
              <RecordRow key={d} label={lbl}
                rec24={r24?.time || '—'}
                rec23={r23?.time || '—'}
                sub={split !== '—' ? `${split} · ${watts}` : undefined}
                onSelect={() => r24?.time && r24.time !== '—' ? onSelect(`Aviron ${d}`, r24.time) : undefined}
                selected={sel}
              />
            )
          })}
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'10px 0 0' }}>Puissance via formule Concept2 : P = 2.80 / (split/500)^3</p>
        </Card>
      )}

      {sport === 'hyrox' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
              <div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Meilleur resultat Hyrox</h2>
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{HYROX_REC.format} · {HYROX_REC.date}</p>
              </div>
              <div style={{ textAlign:'center' as const }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#ef4444', margin:0 }}>{HYROX_REC.total}</p>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:0 }}>Temps total</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div style={{ padding:'8px 12px', borderRadius:9, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 3px' }}>Roxzone</p>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#ef4444', margin:0 }}>{HYROX_REC.roxzone}</p>
              </div>
              <div style={{ padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 3px' }}>Total running</p>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#22c55e', margin:0 }}>
                  {(() => {
                    let s = 0
                    HYROX_REC.runs.forEach(r => { const pp = r.split(':').map(Number); s += pp[0]*60+(pp[1]||0) })
                    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
                  })()}
                </p>
              </div>
            </div>
            <h3 style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 8px' }}>Stations</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
              {HYROX_STATIONS.map((s, i) => {
                const sel = selectedDatum?.label === `Hyrox ${s}` && selectedDatum?.value === HYROX_REC.stations[s]
                return (
                  <div
                    key={s}
                    onClick={() => onSelect(`Hyrox ${s}`, HYROX_REC.stations[s])}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:8,
                      background: sel ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.05)',
                      border: `1px solid ${sel ? 'rgba(239,68,68,0.50)' : 'rgba(239,68,68,0.12)'}`,
                      cursor:'pointer', transition:'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize:9, fontWeight:700, color:'#ef4444', width:17, flexShrink:0 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:11 }}>{s}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, color:'#ef4444' }}>{HYROX_REC.stations[s]}</span>
                  </div>
                )
              })}
            </div>
            <h3 style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 8px' }}>Runs (8x1km)</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {HYROX_REC.runs.map((r, i) => {
                const sel = selectedDatum?.label === `Hyrox Run ${i+1}` && selectedDatum?.value === r
                return (
                  <div
                    key={i}
                    onClick={() => onSelect(`Hyrox Run ${i+1}`, r)}
                    style={{
                      padding:'6px 8px', borderRadius:7, textAlign:'center' as const, cursor:'pointer',
                      background: sel ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.07)',
                      border: `1px solid ${sel ? 'rgba(34,197,94,0.50)' : 'rgba(34,197,94,0.15)'}`,
                      transition:'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Run {i+1}</p>
                    <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, color:'#22c55e', margin:0 }}>{r}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Simulation de performance</h2>
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>Simuler des gains sur chaque station</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {simMode && (
                  <div style={{ padding:'8px 14px', borderRadius:9, background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)' }}>
                    <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 2px' }}>Temps simule</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#ef4444', margin:0 }}>{hyroxSimTotal()}</p>
                  </div>
                )}
                <button onClick={() => setSimMode(!simMode)}
                  style={{ padding:'6px 12px', borderRadius:9, background:simMode?'linear-gradient(135deg,#ef4444,#f97316)':'var(--bg-card2)', border:`1px solid ${simMode?'transparent':'var(--border)'}`, color:simMode?'#fff':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                  {simMode ? 'Simulation active' : 'Simuler'}
                </button>
              </div>
            </div>
            {simMode ? (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {HYROX_STATIONS.map(s => (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, flex:1, color:'var(--text-mid)' }}>{s}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#ef4444', width:40, textAlign:'right' as const }}>{HYROX_REC.stations[s]}</span>
                    <button onClick={() => setSimDeltas(prev => ({...prev,[s]:(prev[s]||0)+5}))}
                      style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'#22c55e', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                    <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#22c55e', minWidth:32, textAlign:'center' as const }}>
                      {simDeltas[s] ? `-${simDeltas[s]}s` : '0s'}
                    </span>
                    <button onClick={() => setSimDeltas(prev => ({...prev,[s]:Math.max((prev[s]||0)-5,0)}))}
                      style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'#ef4444', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                ))}
                <button onClick={() => setSimDeltas({})}
                  style={{ marginTop:6, padding:'5px', borderRadius:7, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>
                  Reinitialiser
                </button>
              </div>
            ) : (
              <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center' as const, padding:'10px 0' }}>
                Active la simulation pour identifier tes points faibles.
              </p>
            )}
          </Card>
        </div>
      )}

      {sport === 'gym' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          {GYM_MOVES.map(m => (
            <Card key={m.name} style={{ padding:16 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 10px', color:'#f97316' }}>{m.name}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {m.recs.map(r => {
                  const valStr = r.v ? `${r.v}${r.l.includes('reps') ? ' reps' : ' kg'}` : '—'
                  const sel = selectedDatum?.label === `${m.name} — ${r.l}` && selectedDatum?.value === valStr
                  return (
                    <div
                      key={r.l}
                      onClick={() => r.v ? onSelect(`${m.name} — ${r.l}`, valStr) : undefined}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'5px 9px', borderRadius:7,
                        background: sel ? 'rgba(249,115,22,0.14)' : 'rgba(249,115,22,0.07)',
                        border: `1px solid ${sel ? 'rgba(249,115,22,0.50)' : 'rgba(249,115,22,0.15)'}`,
                        cursor: r.v ? 'pointer' : undefined,
                        transition:'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <span style={{ fontSize:11, color:'var(--text-mid)' }}>{r.l}</span>
                      <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:r.v ? '#f97316' : 'var(--text-dim)' }}>
                        {valStr}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// ONGLET TESTS — types, données, composants
// ════════════════════════════════════════════════
type TestSport = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'
interface TestDef {
  id: string; name: string; desc: string; duration: string
  difficulty: 'Modéré' | 'Intense' | 'Maximal'
}
interface OpenTest { sport: TestSport; test: TestDef }

const DIFFICULTY_COLOR: Record<TestDef['difficulty'], string> = {
  'Modéré': '#22c55e', 'Intense': '#f59e0b', 'Maximal': '#ef4444',
}

const TEST_SPORT_TABS: { id: TestSport; label: string; short: string; color: string; bg: string; icon: React.ReactNode }[] = [
  {
    id: 'running', label: 'Running', short: 'Run', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 4a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none"/><path d="M7 20l3-6 3 3 3-7"/><path d="M15 4l-2 4-3 1-2 4"/></svg>,
  },
  {
    id: 'cycling', label: 'Cyclisme', short: 'Vélo', color: '#00c8e0', bg: 'rgba(0,200,224,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17l4-10h4l4 10M9 7h6"/></svg>,
  },
  {
    id: 'natation', label: 'Natation', short: 'Nata', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 18c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2 3.6-.6 5-2"/><path d="M2 12c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2"/><path d="M14 6l-2-4-3 4 2 1"/></svg>,
  },
  {
    id: 'aviron', label: 'Aviron', short: 'Row', color: '#14b8a6', bg: 'rgba(20,184,166,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 19l14-14M5 5l7 7M12 12l7 7"/></svg>,
  },
  {
    id: 'hyrox', label: 'Hyrox', short: 'HRX', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
]

const TESTS: Record<TestSport, TestDef[]> = {
  running: [
    { id:'vo2max-run',    name:'VO2max',       desc:'Test d\'effort gradué pour mesurer la consommation maximale d\'oxygène. Paliers progressifs jusqu\'à épuisement.',                                      duration:'20–35 min', difficulty:'Maximal' },
    { id:'vma',           name:'VMA',           desc:'Vitesse Maximale Aérobie sur piste. Détermine ton allure plafond pour calibrer toutes tes zones.',                                                      duration:'~6 min',    difficulty:'Maximal' },
    { id:'lactate-run',   name:'Test lactate',  desc:'Mesure de la lactatémie à différentes intensités. Zones précises, identification du seuil SL1 et SL2.',                                                duration:'60–90 min', difficulty:'Modéré'  },
    { id:'cooper',        name:'Cooper',         desc:'12 minutes d\'effort maximal en continu. Distance parcourue → estimation VO2max selon la formule Cooper.',                                              duration:'12 min',    difficulty:'Maximal' },
    { id:'tmi',           name:'TMI',            desc:'Test de Maintien d\'Intensité. Mesure la capacité à tenir une allure au seuil lactate sur durée prolongée.',                                          duration:'30 min',    difficulty:'Intense' },
  ],
  cycling: [
    { id:'cp20',             name:'CP20',           desc:'Critical Power sur 20 minutes — puissance moyenne × 0.95 = estimation FTP. Le test vélo de référence.',                                           duration:'~35 min',    difficulty:'Maximal' },
    { id:'critical-power',   name:'Critical Power', desc:'Modèle multi-durées (3–12–20 min) pour tracer la courbe puissance-durée et calculer W\' et CP.',                                                  duration:'2 × séances', difficulty:'Maximal' },
    { id:'lactate-cycling',  name:'Lactate',        desc:'Profil lactatémique sur ergocycle. Paliers de 5 min, prise de sang au doigt. Zones ultra-précises.',                                              duration:'60–90 min',  difficulty:'Modéré'  },
    { id:'endurance-cycling',name:'Endurance',      desc:'Test de 2h à puissance modérée (60–65% FTP). Calibration de la zone 2 et mesure de la dérive cardiaque.',                                        duration:'120 min',    difficulty:'Modéré'  },
    { id:'vo2max-cycling',   name:'VO2max / PMA',   desc:'Test rampe sur ergocycle. Paliers de 1 min, +20W à chaque étape. Détermine la Puissance Maximale Aérobie.',                                      duration:'15–25 min',  difficulty:'Maximal' },
    { id:'wingate',          name:'Wingate',        desc:'Sprint anaérobie de 30 secondes à résistance maximale. Mesure puissance de crête et capacité anaérobie.',                                         duration:'30 sec',     difficulty:'Maximal' },
  ],
  natation: [
    { id:'css',       name:'CSS',  desc:'Critical Swim Speed — allure au seuil lactate en natation. Calculée depuis le 400m et le 200m.',              duration:'~30 min', difficulty:'Intense' },
    { id:'vmax-swim', name:'VMax', desc:'Vitesse maximale sur 25 ou 50m. Mesure la puissance explosive en eau et le sprint nage.',                      duration:'~15 min', difficulty:'Maximal' },
  ],
  aviron: [
    { id:'2000m-row',  name:'2000m',           desc:'Test référence Concept2. Effort anaérobie lactique de ~7 min. Comparaison mondiale via le classement Concept2.',                                    duration:'~7 min',  difficulty:'Maximal' },
    { id:'10000m-row', name:'Endurance 10000m',desc:'Capacité aérobie et gestion de l\'allure sur longue durée. Mesure de la dérive technique et cardiaque.',                                            duration:'~40 min', difficulty:'Modéré'  },
    { id:'30min-row',  name:'30 minutes',      desc:'Distance maximale parcourue en 30 minutes. Estimateur direct du FTP aviron (split /500m de référence).',                                            duration:'30 min',  difficulty:'Intense' },
    { id:'power-row',  name:'Power',           desc:'Test de puissance explosive sur ergomètre. Sprint de 10 secondes à résistance maximale.',                                                           duration:'10 sec',  difficulty:'Maximal' },
    { id:'vo2max-row', name:'VO2max',          desc:'Test rampe sur ergomètre. Résistance croissante toutes les 60 secondes jusqu\'à épuisement. Détermine la PMA aviron.',                              duration:'15–20 min',difficulty:'Maximal' },
  ],
  hyrox: [
    { id:'pft',            name:'PFT',             desc:'Performance Fitness Test — circuit Hyrox complet chronométré. Référence globale pour évaluer ton niveau.',                                      duration:'50–90 min', difficulty:'Maximal' },
    { id:'station',        name:'Station isolée',  desc:'Test chronométré sur une station Hyrox spécifique au choix. Identifie tes points faibles station par station.',                                 duration:'3–8 min',   difficulty:'Intense' },
    { id:'bbj',            name:'BBJ',             desc:'Burpee Broad Jump — 20 répétitions chronométrées ou distance maximale sur série standardisée.',                                                  duration:'3–5 min',   difficulty:'Intense' },
    { id:'farmer-carry',   name:'Farmer Carry',    desc:'Charges standardisées Hyrox (24/32 kg). Distance maximale ou chrono sur 200m. Test de grip et gainage.',                                        duration:'2–4 min',   difficulty:'Intense' },
    { id:'wall-ball',      name:'Wall Ball',       desc:'Nombre maximal de répétitions en 5 min ou chrono sur 100 reps. Mesure puissance-endurance des membres inférieurs.',                             duration:'5 min',     difficulty:'Intense' },
    { id:'sled-push',      name:'Sled Push',       desc:'Poids maximal poussé sur 25m × 4 allers-retours. Test de force-vitesse sur sled Hyrox standardisé.',                                           duration:'2–4 min',   difficulty:'Maximal' },
    { id:'sled-pull',      name:'Sled Pull',       desc:'Poids maximal tiré sur 25m × 4 allers-retours avec corde. Test de force de traction et endurance musculaire.',                                  duration:'2–4 min',   difficulty:'Maximal' },
    { id:'run-compromised',name:'Run Compromised', desc:'Allure de course mesurée immédiatement après une station Hyrox. Quantifie l\'impact de la fatigue sur la foulée.',                              duration:'10–20 min', difficulty:'Intense' },
  ],
}

function TestProtocolPanel({ open: ot, onClose }: { open: OpenTest | null; onClose: () => void }) {
  if (!ot || typeof document === 'undefined') return null
  const cfg = TEST_SPORT_TABS.find(t => t.id === ot.sport)!
  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', animation:'cardEnter 0.2s ease both' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:'var(--bg-card)', borderRadius:'20px 20px 0 0', border:'1px solid var(--border)', borderBottom:'none', padding:'24px 24px 40px', boxShadow:'0 -8px 40px rgba(0,0,0,0.3)', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both', maxHeight:'85vh', overflowY:'auto' as const }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 20px' }}/>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${cfg.color}18`, border:`1px solid ${cfg.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:cfg.color, flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:0 }}>{ot.test.name}</h2>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${DIFFICULTY_COLOR[ot.test.difficulty]}22`, color:DIFFICULTY_COLOR[ot.test.difficulty], textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>{ot.test.difficulty}</span>
              </div>
              <p style={{ fontSize:11, color:cfg.color, margin:0, fontWeight:600 }}>{cfg.label} · {ot.test.duration}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>×</button>
        </div>
        <div style={{ minHeight:200, borderRadius:16, border:`1px dashed ${cfg.color}40`, background:`${cfg.color}06`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:32 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`${cfg.color}15`, border:`1px solid ${cfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:cfg.color, opacity:0.7 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>
          </div>
          <div style={{ textAlign:'center' as const }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 6px', color:'var(--text)' }}>Contenu à venir</p>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.6, maxWidth:280 }}>
              Le protocole du test <strong style={{ color:'var(--text-mid)' }}>{ot.test.name}</strong> sera disponible dans une prochaine mise à jour.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function TestCard({ test, accentColor, onOpen }: { test: TestDef; accentColor: string; onOpen: () => void }) {
  const diffColor = DIFFICULTY_COLOR[test.difficulty]
  return (
    <div className="card-enter" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px', boxShadow:'var(--shadow-card)', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const, marginBottom:6 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0, color:'var(--text)', letterSpacing:'-0.01em' }}>{test.name}</h3>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${diffColor}20`, color:diffColor, textTransform:'uppercase' as const, letterSpacing:'0.07em', flexShrink:0 }}>{test.difficulty}</span>
        </div>
        <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.6, display:'-webkit-box', WebkitBoxOrient:'vertical' as const, WebkitLineClamp:2, overflow:'hidden' }}>
          {test.desc}
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{test.duration}</span>
        </div>
        <button
          onClick={onOpen}
          style={{ padding:'7px 16px', borderRadius:9, background:`${accentColor}18`, border:`1px solid ${accentColor}40`, color:accentColor, fontSize:12, fontWeight:600, cursor:'pointer', transition:'background 0.15s, border-color 0.15s', whiteSpace:'nowrap' as const }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background=`${accentColor}28`; (e.currentTarget as HTMLButtonElement).style.borderColor=`${accentColor}70` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=`${accentColor}18`; (e.currentTarget as HTMLButtonElement).style.borderColor=`${accentColor}40` }}
        >
          Ouvrir
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// ONGLET TESTS
// ════════════════════════════════════════════════
function TestsTab() {
  const [testSport, setTestSport] = useState<TestSport>('running')
  const [openTest,  setOpenTest]  = useState<OpenTest | null>(null)

  const cfg   = TEST_SPORT_TABS.find(t => t.id === testSport)!
  const tests = TESTS[testSport]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Sport tabs desktop */}
      <div className="hidden md:flex" style={{ gap:8, flexWrap:'wrap' as const }}>
        {TEST_SPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setTestSport(t.id)}
            style={{ flex:1, minWidth:110, padding:'10px 14px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:testSport===t.id?t.color:'var(--border)', background:testSport===t.id?t.bg:'var(--bg-card)', color:testSport===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:testSport===t.id?700:400, boxShadow:testSport===t.id?`0 0 0 1px ${t.color}33`:'var(--shadow-card)', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <span style={{ opacity:testSport===t.id?1:0.6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Sport tabs mobile */}
      <div className="md:hidden" style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
        {TEST_SPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setTestSport(t.id)}
            style={{ flex:1, minWidth:58, padding:'7px 5px', borderRadius:10, border:'1px solid', cursor:'pointer', borderColor:testSport===t.id?t.color:'var(--border)', background:testSport===t.id?t.bg:'var(--bg-card)', color:testSport===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:testSport===t.id?700:400, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            <span style={{ opacity:testSport===t.id?1:0.6 }}>{t.icon}</span>{t.short}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:18, borderRadius:2, background:cfg.color }}/>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)' }}>{cfg.label}</span>
        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:`${cfg.color}15`, color:cfg.color, fontWeight:600 }}>
          {tests.length} test{tests.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(1,1fr)', gap:12 }} className="md:grid-cols-2">
        {tests.map(test => (
          <TestCard key={test.id} test={test} accentColor={cfg.color} onOpen={() => setOpenTest({ sport:testSport, test })}/>
        ))}
      </div>

      {/* Protocol panel */}
      {openTest && <TestProtocolPanel open={openTest} onClose={() => setOpenTest(null)}/>}
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function PerformancePage() {
  const [tab, setTab]                   = useState<PerfTab>('profil')
  const [selectedDatum, setSelectedDatum] = useState<SelectedDatum | null>(null)
  const [aiOpen, setAiOpen]             = useState(false)
  const [aiPrefill, setAiPrefill]       = useState('')

  function onSelectDatum(label: string, value: string) {
    setSelectedDatum(prev =>
      prev?.label === label && prev?.value === value ? null : { label, value }
    )
  }

  function handleAsk() {
    if (!selectedDatum) return
    setAiPrefill(buildAIMessage(selectedDatum))
    setAiOpen(true)
    setSelectedDatum(null)
  }

  const TABS: { id: PerfTab; label: string; short: string; color: string; bg: string }[] = [
    { id:'profil', label:'Profil', short:'Profil', color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
    { id:'datas',  label:'Datas',  short:'Datas',  color:'#f97316', bg:'rgba(249,115,22,0.10)' },
    { id:'tests',  label:'Tests',  short:'Tests',  color:'#22c55e', bg:'rgba(34,197,94,0.10)'  },
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Performance</h1>
          <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Profil · Zones · Records · Tests</p>
        </div>
        <AIAssistantButton agent="performance" context={{ page:'performance' }}/>
      </div>

      {/* ── Tab bar desktop ── */}
      <div className="hidden md:flex" style={{ gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, minWidth:120, padding:'11px 16px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:tab===t.id?t.color:'var(--border)', background:tab===t.id?t.bg:'var(--bg-card)', color:tab===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:tab===t.id?700:400, boxShadow:tab===t.id?`0 0 0 1px ${t.color}33`:'var(--shadow-card)', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab bar mobile ── */}
      <div className="md:hidden" style={{ display:'flex', gap:5, marginBottom:16, flexWrap:'wrap' as const }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, minWidth:70, padding:'8px 4px', borderRadius:10, border:'1px solid', cursor:'pointer', borderColor:tab===t.id?t.color:'var(--border)', background:tab===t.id?t.bg:'var(--bg-card)', color:tab===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:tab===t.id?700:400, transition:'all 0.15s' }}>
            {t.short}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      {tab === 'profil' && <ProfilTab onSelect={onSelectDatum} selectedDatum={selectedDatum}/>}
      {tab === 'datas'  && <DatasTab  onSelect={onSelectDatum} selectedDatum={selectedDatum}/>}
      {tab === 'tests'  && <TestsTab/>}

      {/* ── Bulle flottante de sélection ── */}
      {selectedDatum && (
        <SelectedDatumBubble
          datum={selectedDatum}
          onClear={() => setSelectedDatum(null)}
          onAsk={handleAsk}
        />
      )}

      {/* ── Panel Coach IA (pour les données sélectionnées) ── */}
      <AIPanel
        open={aiOpen}
        onClose={() => { setAiOpen(false); setAiPrefill('') }}
        initialAgent="performance"
        prefillMessage={aiPrefill}
        context={{ page:'performance' }}
      />
    </div>
  )
}
