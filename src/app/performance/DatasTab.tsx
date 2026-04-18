'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import type { ZoneSport } from '@/hooks/useTrainingZones'

// ── Types ────────────────────────────────────────────────────────
type RecordSport = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox' | 'gym'

interface Props {
  onSelect: (label: string, value: string) => void
  selectedDatum: { label: string; value: string } | null
  profile: {
    ftp: number; weight: number; age: number; lthr: number
    hrMax: number; hrRest: number; thresholdPace: string
    vma: number; css: string; vo2max: number
  }
}

// ── Shared primitives ────────────────────────────────────────────
const Z_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

const YEAR_COLORS: Record<string, string> = {
  '2024': '#00c8e0',
  '2023': '#5b6fff',
  '2022': '#22c55e',
  '2021': '#f97316',
  '2020': '#a855f7',
}
const YEAR_DEFAULT_COLOR = '#9ca3af'

// ── Utility functions ────────────────────────────────────────────
function parseSec(pace: string): number {
  const p = pace.split(':')
  return parseInt(p[0]) * 60 + (parseInt(p[1]) || 0)
}

function secToStr(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}

function calcPacePerKm(distKm: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
  if (!s) return '—'
  const sPerKm = s / distKm
  return `${Math.floor(sPerKm / 60)}:${String(Math.round(sPerKm % 60)).padStart(2, '0')}/km`
}

function calcSplit500m(distM: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
  if (!s) return '—'
  const sp = (s / distM) * 500
  return `${Math.floor(sp / 60)}:${String(Math.round(sp % 60)).padStart(2, '0')}/500m`
}

// ── Zone calculators ─────────────────────────────────────────────
function calcBikeZones(ftp: number) {
  return [
    { z: 'Z1', label: 'Récup',   minW: 0,                       maxW: Math.round(ftp * 0.55) },
    { z: 'Z2', label: 'Aérobie', minW: Math.round(ftp * 0.56),  maxW: Math.round(ftp * 0.75) },
    { z: 'Z3', label: 'Tempo',   minW: Math.round(ftp * 0.76),  maxW: Math.round(ftp * 0.87) },
    { z: 'Z4', label: 'Seuil',   minW: Math.round(ftp * 0.88),  maxW: Math.round(ftp * 1.05) },
    { z: 'Z5', label: 'VO2max',  minW: Math.round(ftp * 1.06),  maxW: Math.round(ftp * 1.20) },
  ]
}

function calcRunZones(tSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(tSec * 1.25))}/km` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(tSec * 1.11))} - ${secToStr(Math.round(tSec * 1.25))}/km` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(tSec * 1.01))} - ${secToStr(Math.round(tSec * 1.10))}/km` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(tSec * 0.91))} - ${secToStr(Math.round(tSec * 1.00))}/km` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(tSec * 0.90))}/km` },
  ]
}

function calcSwimZones(cssSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(cssSec * 1.35))}/100m` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(cssSec * 1.16))} - ${secToStr(Math.round(cssSec * 1.34))}/100m` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(cssSec * 1.06))} - ${secToStr(Math.round(cssSec * 1.15))}/100m` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(cssSec * 0.98))} - ${secToStr(Math.round(cssSec * 1.05))}/100m` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(cssSec * 0.97))}/100m` },
  ]
}

function calcHRZones(hrMax: number, hrRest: number) {
  const r = hrMax - hrRest
  return [
    { z: 'Z1', label: 'Récup',   min: hrRest,                           max: Math.round(hrRest + r * 0.60) },
    { z: 'Z2', label: 'Aérobie', min: Math.round(hrRest + r * 0.60) + 1, max: Math.round(hrRest + r * 0.70) },
    { z: 'Z3', label: 'Tempo',   min: Math.round(hrRest + r * 0.70) + 1, max: Math.round(hrRest + r * 0.80) },
    { z: 'Z4', label: 'Seuil',   min: Math.round(hrRest + r * 0.80) + 1, max: Math.round(hrRest + r * 0.90) },
    { z: 'Z5', label: 'VO2max',  min: Math.round(hrRest + r * 0.90) + 1, max: hrMax },
  ]
}

function calcRowZones(splitSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(splitSec * 1.22))}/500m` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(splitSec * 1.11))} - ${secToStr(Math.round(splitSec * 1.22))}/500m` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(splitSec * 1.03))} - ${secToStr(Math.round(splitSec * 1.11))}/500m` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(splitSec * 0.97))} - ${secToStr(Math.round(splitSec * 1.03))}/500m` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(splitSec * 0.97))}/500m` },
  ]
}

// ── Data constants ───────────────────────────────────────────────
const BIKE_DURS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','15min','20min','30min','1h','90min','2h','3h','4h','5h','6h']

const DUR_SECS: Record<string, number> = {
  'Pmax':1, '10s':10, '30s':30, '1min':60, '3min':180, '5min':300,
  '8min':480, '10min':600, '12min':720, '15min':900, '20min':1200,
  '30min':1800, '1h':3600, '90min':5400, '2h':7200, '3h':10800,
  '4h':14400, '5h':18000, '6h':21600,
}

const BIKE_REC: Record<string, {w:number;date:string}[]> = {
  'Pmax':  [{w:1240,date:'2024-08-12'},{w:1180,date:'2023-06-20'}],
  '10s':   [{w:980, date:'2024-09-01'},{w:920, date:'2023-07-15'}],
  '30s':   [{w:740, date:'2024-07-22'},{w:710, date:'2023-05-10'}],
  '1min':  [{w:560, date:'2024-06-14'},{w:530, date:'2023-08-03'}],
  '3min':  [{w:430, date:'2024-05-28'},{w:410, date:'2023-09-18'}],
  '5min':  [{w:390, date:'2024-04-10'},{w:375, date:'2023-04-22'}],
  '8min':  [{w:360, date:'2024-03-15'},{w:348, date:'2023-03-30'}],
  '10min': [{w:345, date:'2024-02-28'},{w:332, date:'2023-02-14'}],
  '12min': [{w:335, date:'2024-01-20'},{w:320, date:'2023-01-08'}],
  '15min': [{w:328, date:'2024-03-10'},{w:314, date:'2023-03-05'}],
  '20min': [{w:320, date:'2024-10-05'},{w:308, date:'2023-10-12'}],
  '30min': [{w:310, date:'2024-11-02'},{w:298, date:'2023-11-20'}],
  '1h':    [{w:301, date:'2024-12-01'},{w:285, date:'2023-12-10'}],
  '90min': [{w:290, date:'2024-09-15'},{w:276, date:'2023-09-20'}],
  '2h':    [{w:275, date:'2024-08-30'},{w:262, date:'2023-08-25'}],
  '3h':    [{w:255, date:'2024-07-14'},{w:242, date:'2023-07-20'}],
  '4h':    [{w:238, date:'2024-06-22'},{w:225, date:'2023-06-18'}],
  '5h':    [{w:222, date:'2024-05-18'},{w:210, date:'2023-05-30'}],
  '6h':    [{w:208, date:'2024-04-28'},{w:196, date:'2023-04-15'}],
}

const RUN_DISTS = ['1500m','5km','10km','Semi','Marathon','50km','100km']
const RUN_KM: Record<string,number> = { '1500m':1.5,'5km':5,'10km':10,'Semi':21.1,'Marathon':42.195,'50km':50,'100km':100 }
const RUN_REC: Record<string, {time:string;date:string}[]> = {
  '1500m':    [{time:'4:22',    date:'2024-06-08'},{time:'4:35',    date:'2023-07-14'}],
  '5km':      [{time:'17:45',   date:'2024-04-21'},{time:'18:12',   date:'2023-05-10'}],
  '10km':     [{time:'37:20',   date:'2024-05-12'},{time:'38:45',   date:'2023-06-18'}],
  'Semi':     [{time:'1:24:30', date:'2024-04-06'},{time:'1:27:15', date:'2023-04-09'}],
  'Marathon': [{time:'3:05:00', date:'2024-10-20'},{time:'3:12:30', date:'2023-10-15'}],
  '50km':     [{time:'4:45:00', date:'2024-07-06'},{time:'—',       date:'—'}],
  '100km':    [{time:'—',       date:'—'},          {time:'—',      date:'—'}],
}

const SWIM_DISTS = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const SWIM_M: Record<string,number> = { '100m':100,'200m':200,'400m':400,'1000m':1000,'1500m':1500,'2000m':2000,'5000m':5000,'10000m':10000 }
const SWIM_REC: Record<string, {time:string;date:string}[]> = {
  '100m':   [{time:'1:10',  date:'2024-03-15'},{time:'1:14',  date:'2023-04-20'}],
  '200m':   [{time:'2:28',  date:'2024-04-10'},{time:'2:35',  date:'2023-05-12'}],
  '400m':   [{time:'5:10',  date:'2024-02-28'},{time:'5:22',  date:'2023-03-18'}],
  '1000m':  [{time:'13:20', date:'2024-05-20'},{time:'13:55', date:'2023-06-10'}],
  '1500m':  [{time:'20:30', date:'2024-01-15'},{time:'21:10', date:'2023-02-20'}],
  '2000m':  [{time:'27:45', date:'2024-06-05'},{time:'28:40', date:'2023-07-15'}],
  '5000m':  [{time:'—',     date:'—'},          {time:'—',    date:'—'}],
  '10000m': [{time:'—',     date:'—'},          {time:'—',    date:'—'}],
}

const ROW_DISTS = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const ROW_M: Record<string,number> = { '500m':500,'1000m':1000,'2000m':2000,'5000m':5000,'10000m':10000,'Semi':21097,'Marathon':42195 }
const ROW_REC: Record<string, {time:string;date:string}[]> = {
  '500m':    [{time:'1:32',  date:'2024-02-10'},{time:'1:36',  date:'2023-03-05'}],
  '1000m':   [{time:'3:18',  date:'2024-03-20'},{time:'3:25',  date:'2023-04-15'}],
  '2000m':   [{time:'6:52',  date:'2024-01-28'},{time:'7:08',  date:'2023-02-12'}],
  '5000m':   [{time:'18:30', date:'2024-04-05'},{time:'19:10', date:'2023-05-20'}],
  '10000m':  [{time:'38:45', date:'2024-05-10'},{time:'40:20', date:'2023-06-08'}],
  'Semi':    [{time:'—',     date:'—'},          {time:'—',    date:'—'}],
  'Marathon':[{time:'—',     date:'—'},          {time:'—',    date:'—'}],
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

// ── UI Primitives ────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)', ...style,
    }}>
      {children}
    </div>
  )
}

function NInput({ label, value, onChange, unit, step }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>
        {label}{unit && <span style={{ fontWeight: 400, marginLeft: 3, textTransform: 'none' }}>({unit})</span>}
      </p>
      <input type="number" value={value} step={step || 1} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }} />
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }} />
    </div>
  )
}

function ZBars({ zones, onSelect, selectedKey, editKey, editDraft, onEditStart, onEditChange, onEditConfirm, onEditCancel, editSaving }: {
  zones: { z: string; label: string; range: string }[]
  onSelect?: (key: string, label: string, range: string) => void
  selectedKey?: string
  // inline editing
  editKey?: string | null
  editDraft?: string
  onEditStart?: (key: string, currentRange: string) => void
  onEditChange?: (v: string) => void
  onEditConfirm?: () => void
  onEditCancel?: () => void
  editSaving?: boolean
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {zones.map((z, i) => {
        const key = `${z.z}-${z.label}`
        const sel = selectedKey === key
        const isEditing = editKey === key
        return (
          <div
            key={z.z}
            onClick={isEditing ? undefined : () => onSelect?.(key, `Zone ${z.z} ${z.label}`, z.range)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 6px',
              borderRadius: 8,
              cursor: (onSelect && !isEditing) ? 'pointer' : undefined,
              background: isEditing ? `${Z_COLORS[i]}10` : sel ? `${Z_COLORS[i]}14` : undefined,
              border: isEditing ? `1px solid ${Z_COLORS[i]}88` : sel ? `1px solid ${Z_COLORS[i]}55` : '1px solid transparent',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>{z.z}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? 0 : 2 }}>
                <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{z.label}</span>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}>
                    <input
                      value={editDraft ?? ''}
                      onChange={e => onEditChange?.(e.target.value)}
                      autoFocus
                      style={{ width: 160, padding: '3px 7px', borderRadius: 5, border: `1px solid ${Z_COLORS[i]}`, background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') onEditConfirm?.(); if (e.key === 'Escape') onEditCancel?.() }}
                    />
                    <button
                      onClick={onEditConfirm}
                      disabled={editSaving}
                      style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: Z_COLORS[i], color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}
                    >
                      {editSaving ? '…' : 'OK'}
                    </button>
                    <button
                      onClick={onEditCancel}
                      style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={e => { e.stopPropagation(); onEditStart?.(key, z.range) }}
                    title={onEditStart ? 'Cliquer pour modifier' : undefined}
                    style={{
                      fontSize: 11, fontFamily: 'DM Mono,monospace', color: Z_COLORS[i], fontWeight: 600,
                      cursor: onEditStart ? 'text' : undefined,
                      padding: onEditStart ? '2px 5px' : undefined,
                      borderRadius: onEditStart ? 4 : undefined,
                      border: onEditStart ? '1px dashed transparent' : undefined,
                      textDecoration: onEditStart ? 'underline dotted' : undefined,
                    }}
                  >
                    {z.range}
                  </span>
                )}
              </div>
              {!isEditing && (
                <div style={{ height: 5, borderRadius: 999, background: `${Z_COLORS[i]}22`, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${20 + i * 16}%`, background: Z_COLORS[i], opacity: 0.7, borderRadius: 999,
                    transformOrigin: 'left center',
                    transform: ready ? 'scaleX(1)' : 'scaleX(0)',
                    transition: `transform 1.1s cubic-bezier(0.25,1,0.5,1) ${i * 60}ms`,
                    willChange: 'transform',
                  }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecordRow({ label, rec24, rec23, sub, onSelect, selected, actions }: {
  label: string; rec24: string; rec23: string; sub?: string
  onSelect?: () => void; selected?: boolean
  actions?: React.ReactNode
}) {
  const isPR = rec24 !== '—' && rec23 !== '—' && rec24 < rec23
  return (
    <div
      onClick={rec24 !== '—' ? onSelect : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9,
        background: selected ? 'rgba(0,200,224,0.06)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#00c8e0' : 'var(--border)'}`,
        marginBottom: 5,
        cursor: (onSelect && rec24 !== '—') ? 'pointer' : undefined,
        transition: 'border-color 0.15s, background 0.15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: '#00c8e0' }}>{rec24}</span>
          {isPR && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,200,224,0.15)', color: '#00c8e0', fontWeight: 700 }}>PR</span>}
          {sub && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{sub}</span>}
        </div>
        {rec23 && rec23 !== '—' && (
          <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>2023 : {rec23}</span>
        )}
      </div>
      {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
    </div>
  )
}

// ── Section header ───────────────────────────────────────────────
function SectionHeader({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 3, height: 20, borderRadius: 2, background: gradient }} />
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{label}</h2>
    </div>
  )
}

// ── Mode toggle ──────────────────────────────────────────────────
function ModeToggle({ mode, onChange }: { mode: 'auto' | 'manual'; onChange: (m: 'auto' | 'manual') => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
      {(['auto', 'manual'] as const).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: mode === m ? 700 : 400,
          background: mode === m ? 'var(--bg-card)' : 'transparent',
          color: mode === m ? 'var(--text)' : 'var(--text-dim)',
          boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
          transition: 'all 0.15s',
        }}>
          {m === 'auto' ? 'Auto' : 'Manuel'}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════
// SUB-TAB 1: ZONES D'ENTRAÎNEMENT
// ════════════════════════════════════════════════
const ZONES_STORAGE_KEY = 'thw_zones_v1'

interface ZonesStorage {
  bikeManual: {minW: number; maxW: number}[]
  runManual: {min: string; max: string}[]
  swimManual: {min: string; max: string}[]
  rowManual: {min: string; max: string}[]
  hrManual: {min: number; max: number}[]
}

function ZonesSubTab({ profile, onSelect, selectedDatum }: {
  profile: Props['profile']
  onSelect: Props['onSelect']
  selectedDatum: Props['selectedDatum']
}) {
  type PowerSport = 'bike' | 'run' | 'swim' | 'rowing'

  const [powerSport, setPowerSport] = useState<PowerSport>('bike')
  const [rowThreshSplit, setRowThreshSplit] = useState('1:52')
  const [editRowThresh, setEditRowThresh] = useState(false)

  const [bikeMode, setBikeMode] = useState<'auto' | 'manual'>('auto')
  const [runMode, setRunMode]   = useState<'auto' | 'manual'>('auto')
  const [swimMode, setSwimMode] = useState<'auto' | 'manual'>('auto')
  const [rowMode, setRowMode]   = useState<'auto' | 'manual'>('auto')
  const [hrMode, setHrMode]     = useState<'auto' | 'manual'>('auto')

  // ── Supabase zones ──────────────────────────────────────────────
  const { zones: sbZones, save: sbSave, saving: sbSaving } = useTrainingZones()

  // ── Inline edit state (one field at a time) ─────────────────────
  // key format: "${sport}:${z.z}-${z.label}"  e.g. "bike:Z1-Récup" or "hr:Z2-Aérobie"
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function tryEdit(key: string, currentVal: string) {
    if (activeEdit && activeEdit !== key) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    setActiveEdit(key)
    setEditDraft(currentVal)
  }

  function cancelEdit() {
    setActiveEdit(null)
    setEditDraft('')
  }

  async function confirmZoneEdit() {
    if (!activeEdit) return
    const colonIdx = activeEdit.indexOf(':')
    const sport = activeEdit.slice(0, colonIdx)
    const zKey = activeEdit.slice(colonIdx + 1)          // e.g. "Z1-Récup"
    const zNum = parseInt(zKey.slice(1)) as 1 | 2 | 3 | 4 | 5  // 1-5

    if (sport !== 'hr') {
      const sp = sport as ZoneSport
      const existing = sbZones[sp]
      const updates = {
        ...existing,
        [`z${zNum}_value`]: editDraft,
      }
      await sbSave(sp, updates)
    } else {
      // HR zones — localStorage only (no dedicated sport in training_zones)
      // The manual state auto-saves via existing useEffect; we just update hrManual
      const idx = zNum - 1
      const newManual = [...hrManual]
      // Try to parse "min – max bpm" format, else keep existing
      const m = editDraft.match(/(\d+)\s*[–-]\s*(\d+)/)
      if (m) {
        newManual[idx] = { min: parseInt(m[1]), max: parseInt(m[2]) }
        setHrManual(newManual)
      }
    }

    setActiveEdit(null)
    setEditDraft('')
  }

  // Returns displayed zone range: Supabase override if present, else auto-calculated
  function getZoneDisplay(sport: string, zNum: number, autoRange: string): string {
    if (sport === 'hr') return autoRange
    const sp = sport as ZoneSport
    const val = sbZones[sp]?.[`z${zNum}_value` as `z${1|2|3|4|5}_value`]
    return (val && typeof val === 'string' && val.trim()) ? val : autoRange
  }

  const bikeZonesAuto = calcBikeZones(profile.ftp)
  const runZonesAuto  = calcRunZones(parseSec(profile.thresholdPace))
  const swimZonesAuto = calcSwimZones(parseSec(profile.css))
  const rowZonesAuto  = calcRowZones(parseSec(rowThreshSplit))
  const hrZonesAuto   = calcHRZones(profile.hrMax, profile.hrRest)

  const [bikeManual, setBikeManual] = useState<{minW: number; maxW: number}[]>(
    bikeZonesAuto.map(z => ({ minW: z.minW, maxW: z.maxW }))
  )
  const [runManual, setRunManual] = useState<{min: string; max: string}[]>(
    runZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [swimManual, setSwimManual] = useState<{min: string; max: string}[]>(
    swimZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [rowManual, setRowManual] = useState<{min: string; max: string}[]>(
    rowZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [hrManual, setHrManual] = useState<{min: number; max: number}[]>(
    hrZonesAuto.map(z => ({ min: z.min, max: z.max }))
  )

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ZONES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ZonesStorage
        if (parsed.bikeManual?.length === 5) setBikeManual(parsed.bikeManual)
        if (parsed.runManual?.length === 5) setRunManual(parsed.runManual)
        if (parsed.swimManual?.length === 5) setSwimManual(parsed.swimManual)
        if (parsed.rowManual?.length === 5) setRowManual(parsed.rowManual)
        if (parsed.hrManual?.length === 5) setHrManual(parsed.hrManual)
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      const data: ZonesStorage = { bikeManual, runManual, swimManual, rowManual, hrManual }
      localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }, [bikeManual, runManual, swimManual, rowManual, hrManual])

  const zoneSelKey = selectedDatum
    ? (() => {
        const m = selectedDatum.label.match(/^Zone (Z\d) (.+)$/)
        return m ? `${m[1]}-${m[2]}` : undefined
      })()
    : undefined

  const SPORT_TABS: { id: PowerSport; label: string }[] = [
    { id: 'bike',   label: 'Cyclisme' },
    { id: 'run',    label: 'Running' },
    { id: 'rowing', label: 'Aviron' },
    { id: 'swim',   label: 'Natation' },
  ]

  const ZONE_LABELS = ['Récup', 'Aérobie', 'Tempo', 'Seuil', 'VO2max']

  function resetBike() { setBikeManual(bikeZonesAuto.map(z => ({ minW: z.minW, maxW: z.maxW }))) }
  function resetRun()  { setRunManual(runZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetSwim() { setSwimManual(swimZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetRow()  { setRowManual(rowZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetHR()   { setHrManual(hrZonesAuto.map(z => ({ min: z.min, max: z.max }))) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader label="Puissance / Allure" gradient="linear-gradient(180deg,#00c8e0,#5b6fff)" />

      {/* Sport tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setPowerSport(t.id)} style={{
            padding: '7px 14px', borderRadius: 9, border: '1px solid', cursor: 'pointer',
            borderColor: powerSport === t.id ? '#00c8e0' : 'var(--border)',
            background: powerSport === t.id ? 'rgba(0,200,224,0.10)' : 'var(--bg-card)',
            color: powerSport === t.id ? '#00c8e0' : 'var(--text-mid)',
            fontSize: 12, fontWeight: powerSport === t.id ? 600 : 400,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Bike */}
      {powerSport === 'bike' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Cyclisme</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                FTP : {profile.ftp}W — {(profile.ftp / profile.weight).toFixed(2)} W/kg
              </p>
            </div>
            <ModeToggle mode={bikeMode} onChange={setBikeMode} />
          </div>
          {bikeMode === 'auto' ? (
            <ZBars
              zones={bikeZonesAuto.map((z, i) => ({
                z: z.z, label: z.label,
                range: getZoneDisplay('bike', i + 1, `${z.minW}–${z.maxW}W (${(z.minW / profile.weight).toFixed(1)}–${(z.maxW / profile.weight).toFixed(1)} W/kg)`),
              }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
              editKey={activeEdit?.startsWith('bike:') ? activeEdit.slice(5) : null}
              editDraft={editDraft}
              onEditStart={(key, cur) => tryEdit(`bike:${key}`, cur)}
              onEditChange={setEditDraft}
              onEditConfirm={() => { void confirmZoneEdit() }}
              onEditCancel={cancelEdit}
              editSaving={sbSaving}
            />
          ) : (
            <div>
              {bikeManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="number" value={z.minW} onChange={e => { const v = [...bikeManual]; v[i] = {...v[i], minW: parseInt(e.target.value)||0}; setBikeManual(v) }}
                    style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="number" value={z.maxW} onChange={e => { const v = [...bikeManual]; v[i] = {...v[i], maxW: parseInt(e.target.value)||0}; setBikeManual(v) }}
                    style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                </div>
              ))}
              <button onClick={resetBike} style={{ marginTop: 4, padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
            </div>
          )}
        </Card>
      )}

      {/* Run */}
      {powerSport === 'run' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Running</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>Allure seuil : {profile.thresholdPace}/km</p>
            </div>
            <ModeToggle mode={runMode} onChange={setRunMode} />
          </div>
          {runMode === 'auto' ? (
            <ZBars
              zones={runZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('run', i + 1, z.range) }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
              editKey={activeEdit?.startsWith('run:') ? activeEdit.slice(4) : null}
              editDraft={editDraft}
              onEditStart={(key, cur) => tryEdit(`run:${key}`, cur)}
              onEditChange={setEditDraft}
              onEditConfirm={() => { void confirmZoneEdit() }}
              onEditCancel={cancelEdit}
              editSaving={sbSaving}
            />
          ) : (
            <div>
              {runManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...runManual]; v[i] = {...v[i], min: e.target.value}; setRunManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...runManual]; v[i] = {...v[i], max: e.target.value}; setRunManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/km</span>
                </div>
              ))}
              <button onClick={resetRun} style={{ marginTop: 4, padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
            </div>
          )}
        </Card>
      )}

      {/* Rowing */}
      {powerSport === 'rowing' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Aviron</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>Split seuil : </p>
                {editRowThresh ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="text" value={rowThreshSplit} onChange={e => setRowThreshSplit(e.target.value)}
                      style={{ width: 56, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                    <button onClick={() => setEditRowThresh(false)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 10, cursor: 'pointer' }}>OK</button>
                  </div>
                ) : (
                  <button onClick={() => setEditRowThresh(true)} style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#00c8e0', fontFamily: 'DM Mono,monospace', fontSize: 11, cursor: 'pointer' }}>
                    {rowThreshSplit}/500m
                  </button>
                )}
              </div>
            </div>
            <ModeToggle mode={rowMode} onChange={setRowMode} />
          </div>
          {rowMode === 'auto' ? (
            <ZBars
              zones={rowZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('rowing', i + 1, z.range) }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
              editKey={activeEdit?.startsWith('rowing:') ? activeEdit.slice(7) : null}
              editDraft={editDraft}
              onEditStart={(key, cur) => tryEdit(`rowing:${key}`, cur)}
              onEditChange={setEditDraft}
              onEditConfirm={() => { void confirmZoneEdit() }}
              onEditCancel={cancelEdit}
              editSaving={sbSaving}
            />
          ) : (
            <div>
              {rowManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...rowManual]; v[i] = {...v[i], min: e.target.value}; setRowManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...rowManual]; v[i] = {...v[i], max: e.target.value}; setRowManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/500m</span>
                </div>
              ))}
              <button onClick={resetRow} style={{ marginTop: 4, padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
            </div>
          )}
        </Card>
      )}

      {/* Swim */}
      {powerSport === 'swim' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Natation</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>CSS : {profile.css}/100m</p>
            </div>
            <ModeToggle mode={swimMode} onChange={setSwimMode} />
          </div>
          {swimMode === 'auto' ? (
            <ZBars
              zones={swimZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('swim', i + 1, z.range) }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
              editKey={activeEdit?.startsWith('swim:') ? activeEdit.slice(5) : null}
              editDraft={editDraft}
              onEditStart={(key, cur) => tryEdit(`swim:${key}`, cur)}
              onEditChange={setEditDraft}
              onEditConfirm={() => { void confirmZoneEdit() }}
              onEditCancel={cancelEdit}
              editSaving={sbSaving}
            />
          ) : (
            <div>
              {swimManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...swimManual]; v[i] = {...v[i], min: e.target.value}; setSwimManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...swimManual]; v[i] = {...v[i], max: e.target.value}; setSwimManual(v) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/100m</span>
                </div>
              ))}
              <button onClick={resetSwim} style={{ marginTop: 4, padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
            </div>
          )}
        </Card>
      )}

      {/* HR Section */}
      <SectionHeader label="Fréquence Cardiaque" gradient="linear-gradient(180deg,#ef4444,#f97316)" />

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Fréquence cardiaque</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--text-dim)' }}>Repos : <strong style={{ color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>{profile.hrRest}bpm</strong></span>
              <span style={{ color: 'var(--text-dim)' }}>LTHR : <strong style={{ color: '#f97316', fontFamily: 'DM Mono,monospace' }}>{profile.lthr}bpm</strong></span>
              <span style={{ color: 'var(--text-dim)' }}>Max : <strong style={{ color: '#ef4444', fontFamily: 'DM Mono,monospace' }}>{profile.hrMax}bpm</strong></span>
            </div>
          </div>
          <ModeToggle mode={hrMode} onChange={setHrMode} />
        </div>

        {hrMode === 'auto' ? (
          <ZBars
            zones={hrZonesAuto.map(z => ({ z: z.z, label: z.label, range: `${z.min} – ${z.max} bpm` }))}
            onSelect={(key, label, range) => onSelect(label, range)}
            selectedKey={zoneSelKey}
            editKey={activeEdit?.startsWith('hr:') ? activeEdit.slice(3) : null}
            editDraft={editDraft}
            onEditStart={(key, cur) => tryEdit(`hr:${key}`, cur)}
            onEditChange={setEditDraft}
            onEditConfirm={() => { void confirmZoneEdit() }}
            onEditCancel={cancelEdit}
            editSaving={false}
          />
        ) : (
          <div>
            {hrManual.map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                <input type="number" value={z.min} onChange={e => { const v = [...hrManual]; v[i] = {...v[i], min: parseInt(e.target.value)||0}; setHrManual(v) }}
                  style={{ width: 60, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                <input type="number" value={z.max} onChange={e => { const v = [...hrManual]; v[i] = {...v[i], max: parseInt(e.target.value)||0}; setHrManual(v) }}
                  style={{ width: 60, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
              </div>
            ))}
            <button onClick={resetHR} style={{ marginTop: 4, padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
          </div>
        )}

        {/* HR gradient bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
            {hrZonesAuto.map((z, i) => (
              <div key={z.z} style={{ flex: z.max - z.min, background: Z_COLORS[i], opacity: 0.8 }} />
            ))}
          </div>
          <div style={{ display: 'flex', marginTop: 3 }}>
            {hrZonesAuto.map((z, i) => (
              <div key={z.z} style={{ flex: z.max - z.min, textAlign: 'center' }}>
                <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: Z_COLORS[i] }}>{z.min}</span>
              </div>
            ))}
            <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: Z_COLORS[4] }}>{profile.hrMax}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// POWER CURVE LOG SVG
// ════════════════════════════════════════════════
function PowerCurveLogSVG({ bikeByYear, hiddenYears, selectedYear, weight }: {
  bikeByYear: Record<string, Record<string, number>>
  hiddenYears: Set<string>
  selectedYear: string
  weight: number
}) {
  const W = 760, H = 380
  const leftMargin = 52, bottomMargin = 36

  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ svgX: number; pxX: number; dur: string | null } | null>(null)

  // compute visible watts
  const allYears = Object.keys(bikeByYear).sort()
  const visibleYears = allYears.filter(y => !hiddenYears.has(y))

  let maxW = 0
  for (const yr of visibleYears) {
    for (const dur of BIKE_DURS) {
      const w = bikeByYear[yr]?.[dur] ?? 0
      if (w > maxW) maxW = w
    }
  }
  if (maxW === 0) maxW = 1000

  const plotW = W - leftMargin
  const plotH = H - bottomMargin - 10

  function logX(secs: number): number {
    return (Math.log10(Math.max(secs, 1)) / Math.log10(21600)) * plotW + leftMargin
  }

  function polyY(w: number): number {
    return H - bottomMargin - (w / (maxW * 1.1)) * plotH
  }

  // Build "all time" best per duration
  function getBestForYear(year: string): Record<string, number> {
    if (year === 'All Time') {
      const best: Record<string, number> = {}
      for (const dur of BIKE_DURS) {
        let bw = 0
        for (const yr of allYears) {
          const w = bikeByYear[yr]?.[dur] ?? 0
          if (w > bw) bw = w
        }
        best[dur] = bw
      }
      return best
    }
    return bikeByYear[year] ?? {}
  }

  // Find the nearest BIKE_DURS duration to a given SVG x coordinate
  function nearestDur(svgX: number): string | null {
    let best: string | null = null
    let bestDist = Infinity
    for (const dur of BIKE_DURS) {
      const secs = DUR_SECS[dur]
      if (!secs) continue
      const dist = Math.abs(logX(secs) - svgX)
      if (dist < bestDist) { bestDist = dist; best = dur }
    }
    return bestDist < 28 ? best : null
  }

  function getSvgCoords(clientX: number): { svgX: number; pxX: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = W / rect.width
    return {
      svgX: (clientX - rect.left) * scale,
      pxX: clientX - rect.left,
    }
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const coords = getSvgCoords(e.clientX)
    if (!coords) return
    setCursor({ ...coords, dur: nearestDur(coords.svgX) })
  }

  function handleTouchMove(e: React.TouchEvent<SVGSVGElement>) {
    if (!e.touches[0]) return
    const coords = getSvgCoords(e.touches[0].clientX)
    if (!coords) return
    setCursor({ ...coords, dur: nearestDur(coords.svgX) })
  }

  function handleMouseLeave() { setCursor(null) }
  function handleTouchEnd() { setCursor(null) }

  const xAxisDurs = ['10s','1min','5min','20min','1h','3h','6h']

  // Y grid lines at every 100W
  const yGridVals: number[] = []
  for (let w = 0; w <= maxW * 1.1; w += 100) yGridVals.push(w)

  // Which years to render
  const yearsToRender = selectedYear === 'All Time'
    ? visibleYears
    : visibleYears.filter(y => y === selectedYear)

  // Tooltip rows for the hovered duration
  const tooltipRows: { yr: string; color: string; w: number; wkg: string }[] = []
  if (cursor?.dur) {
    for (const yr of yearsToRender) {
      const w = getBestForYear(yr)[cursor.dur] ?? 0
      if (w > 0) {
        const wkg = weight > 0 ? (w / weight).toFixed(2) : '—'
        tooltipRows.push({ yr, color: YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR, w, wkg })
      }
    }
    tooltipRows.sort((a, b) => b.w - a.w)
  }

  // gradient IDs must be unique per year
  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', minWidth: W, height: H + 4, display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          {yearsToRender.map(yr => {
            const color = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR
            return (
              <linearGradient key={yr} id={`pcg-${yr}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            )
          })}
          {selectedYear === 'All Time' && (
            <linearGradient id="pcg-alltime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#00c8e0" stopOpacity="0.02" />
            </linearGradient>
          )}
        </defs>

        {/* Grid */}
        {yGridVals.map(w => (
          <line key={w}
            x1={leftMargin} y1={polyY(w)} x2={W} y2={polyY(w)}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 4"
          />
        ))}

        {/* Y axis labels */}
        {yGridVals.filter(w => w % 100 === 0).map(w => (
          <text key={w} x={leftMargin - 6} y={polyY(w) + 4} textAnchor="end"
            style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
            {w}W
          </text>
        ))}

        {/* Year curves + dots */}
        {yearsToRender.map(yr => {
          const color = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR
          const bestForYear = getBestForYear(yr)
          const points = BIKE_DURS.map(dur => {
            const w = bestForYear[dur] ?? 0
            return { dur, w, x: logX(DUR_SECS[dur] ?? 1), y: polyY(w) }
          }).filter(p => p.w > 0)

          if (points.length === 0) return null

          const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ')
          const fillStr = `${leftMargin},${H - bottomMargin} ${polylineStr} ${points[points.length - 1].x},${H - bottomMargin}`

          return (
            <g key={yr}>
              <polygon points={fillStr} fill={`url(#pcg-${yr})`} />
              <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {points.map(p => {
                const isHovered = cursor?.dur === p.dur
                return (
                  <g key={p.dur} style={{ pointerEvents: 'none' }}>
                    {isHovered && (
                      <circle cx={p.x} cy={p.y} r={11} fill={color} opacity={0.18} />
                    )}
                    <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4.5} fill={color} stroke={isHovered ? '#fff' : 'none'} strokeWidth={isHovered ? 1.5 : 0}>
                      {!isHovered && <title>{yr} · {p.dur} · {p.w}W</title>}
                    </circle>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Vertical crosshair */}
        {cursor && (
          <line
            x1={cursor.svgX} y1={10}
            x2={cursor.svgX} y2={H - bottomMargin}
            stroke="rgba(255,255,255,0.30)" strokeWidth="1" strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* X axis labels */}
        {xAxisDurs.map(dur => {
          const secs = DUR_SECS[dur]
          if (!secs) return null
          return (
            <text key={dur} x={logX(secs)} y={H - 10} textAnchor="middle"
              style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
              {dur}
            </text>
          )
        })}

        {/* X axis line */}
        <line x1={leftMargin} y1={H - bottomMargin} x2={W} y2={H - bottomMargin} stroke="var(--border)" strokeWidth="1" />
      </svg>

      {/* Floating tooltip */}
      {cursor?.dur && tooltipRows.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: cursor.svgX < W * 0.55 ? cursor.pxX + 14 : cursor.pxX - 198,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 20,
          minWidth: 172,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {cursor.dur}
          </div>
          {tooltipRows.map(row => (
            <div key={row.yr} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: row.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)', width: 34 }}>{row.yr}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono,monospace', marginLeft: 'auto' }}>{row.w}W</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>{row.wkg} W/kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// SUB-TAB 2: RECORDS PERSONNELS
// ════════════════════════════════════════════════
function RecordsSubTab({ onSelect, selectedDatum, profile }: {
  onSelect: Props['onSelect']
  selectedDatum: Props['selectedDatum']
  profile: Props['profile']
}) {
  const [sport, setSport] = useState<RecordSport>('bike')
  const [selectedYear, setSelectedYear] = useState('All Time')
  const [hiddenYears, setHiddenYears] = useState<Set<string>>(new Set())
  const [simMode, setSimMode]     = useState(false)
  const [simDeltas, setSimDeltas] = useState<Record<string, number>>({})

  // ── Inline edit state (one record at a time) ─────────────────────
  // key format: "bike-record-${dur}"
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editDate, setEditDate] = useState('')
  const [recordSaving, setRecordSaving] = useState(false)

  // Supabase overrides: {dur -> {w, date}} — most recent record per duration
  const [bikeOverrides, setBikeOverrides] = useState<Record<string, {w: number; date: string}>>({})

  // Load latest bike records from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('personal_records')
        .select('distance_label, performance, achieved_at')
        .eq('user_id', user.id)
        .eq('sport', 'bike')
        .order('achieved_at', { ascending: false })
      if (!data) return
      const overrides: Record<string, {w: number; date: string}> = {}
      for (const rec of data) {
        if (!overrides[rec.distance_label as string]) {
          const w = parseInt(rec.performance as string) || 0
          if (w > 0) overrides[rec.distance_label as string] = { w, date: rec.achieved_at as string }
        }
      }
      setBikeOverrides(overrides)
    }
    void load()
  }, [])

  // Returns the best record to display for a duration (Supabase override takes priority)
  function getEffectiveRec(dur: string): {w: number; date: string} {
    return bikeOverrides[dur] ?? BIKE_REC[dur]?.[0] ?? { w: 0, date: '—' }
  }

  // Returns previous year's record for a duration
  function getPrevRec(dur: string): {w: number; date: string} | undefined {
    if (bikeOverrides[dur]) return BIKE_REC[dur]?.[0]
    return BIKE_REC[dur]?.[1]
  }

  function tryEdit(key: string, currentVal: string) {
    if (activeEdit && activeEdit !== key) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    setActiveEdit(key)
    setEditDraft(currentVal)
    setEditDate(new Date().toISOString().split('T')[0])
  }

  function cancelEdit() {
    setActiveEdit(null)
    setEditDraft('')
  }

  async function confirmBikeRecord(dur: string) {
    setRecordSaving(true)
    const watts = parseInt(editDraft) || 0
    if (watts > 0) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('personal_records').insert({
          user_id:          user.id,
          sport:            'bike',
          distance_label:   dur,
          performance:      String(watts),
          performance_unit: 'watts',
          event_type:       'training',
          achieved_at:      editDate || new Date().toISOString().split('T')[0],
          race_name:        null,
          pace_s_km:        null,
          elevation_gain_m: null,
          split_swim:       null,
          split_bike:       null,
          split_run:        null,
          station_times:    null,
          notes:            null,
        })
        setBikeOverrides(prev => ({ ...prev, [dur]: { w: watts, date: editDate } }))
      }
    }
    setRecordSaving(false)
    setActiveEdit(null)
    setEditDraft('')
  }

  // Build bikeByYear merging BIKE_REC + Supabase overrides
  const bikeByYear: Record<string, Record<string, number>> = {}
  for (const dur of BIKE_DURS) {
    const eff = getEffectiveRec(dur)
    if (eff.w > 0) {
      const year = eff.date.slice(0, 4)
      if (!bikeByYear[year]) bikeByYear[year] = {}
      bikeByYear[year][dur] = eff.w
    }
    // Also include previous year's record
    const prev = getPrevRec(dur)
    if (prev && prev.w > 0) {
      const yr = prev.date.slice(0, 4)
      if (!bikeByYear[yr]) bikeByYear[yr] = {}
      if (!bikeByYear[yr][dur]) bikeByYear[yr][dur] = prev.w
    }
  }
  const bikeYears = Object.keys(bikeByYear).sort((a, b) => b.localeCompare(a))

  function toggleHiddenYear(yr: string) {
    setHiddenYears(prev => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr)
      else next.add(yr)
      return next
    })
  }

  function hyroxSimTotal(): string {
    let total = 0
    HYROX_STATIONS.forEach(s => { total += toSec(HYROX_REC.stations[s] || '0:00') - (simDeltas[s] || 0) })
    HYROX_REC.runs.forEach((r, i) => { total += toSec(r) - (simDeltas[`run${i}`] || 0) })
    total += toSec(HYROX_REC.roxzone)
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  const SPORT_TABS: [RecordSport, string, string][] = [
    ['bike',   'Vélo',    '#3b82f6'],
    ['run',    'Course',  '#22c55e'],
    ['swim',   'Natation','#38bdf8'],
    ['rowing', 'Aviron',  '#14b8a6'],
    ['hyrox',  'Hyrox',   '#ef4444'],
    ['gym',    'Muscu',   '#f97316'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader label="Records personnels" gradient="linear-gradient(180deg,#ffb340,#f97316)" />

      {/* Sport tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {SPORT_TABS.map(([s, l, c]) => (
          <button key={s} onClick={() => setSport(s)} style={{
            padding: '7px 12px', borderRadius: 9, border: '1px solid', cursor: 'pointer',
            borderColor: sport === s ? c : 'var(--border)',
            background: sport === s ? `${c}22` : 'var(--bg-card)',
            color: sport === s ? c : 'var(--text-mid)',
            fontSize: 12, fontWeight: sport === s ? 600 : 400,
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* BIKE */}
      {sport === 'bike' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Power Curve</h2>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                <option value="All Time">All Time</option>
                {bikeYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Scroll horizontal sur mobile si l'axe X est trop dense */}
            <div style={{ overflowX: 'auto', overflowY: 'visible', margin: '0 -4px' }}>
              <PowerCurveLogSVG bikeByYear={bikeByYear} hiddenYears={hiddenYears} selectedYear={selectedYear} weight={profile.weight} />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {bikeYears.map(yr => {
                const color = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR
                const hidden = hiddenYears.has(yr)
                return (
                  <button key={yr} onClick={() => toggleHiddenYear(yr)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, border: '1px solid',
                    borderColor: hidden ? 'var(--border)' : color,
                    background: hidden ? 'var(--bg-card2)' : `${color}18`,
                    cursor: 'pointer', opacity: hidden ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: hidden ? 'var(--text-dim)' : color }}>{yr}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Records de puissance</h2>
            {BIKE_DURS.map(d => {
              const eff = getEffectiveRec(d)
              const prev = getPrevRec(d)
              if (eff.w === 0 && !BIKE_REC[d]) return null
              const editKey = `bike-record-${d}`
              const isEditing = activeEdit === editKey
              const sel = selectedDatum?.label === `Vélo ${d}` && selectedDatum?.value === `${eff.w}W`

              if (isEditing) {
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                    background: 'rgba(0,200,224,0.06)', border: '1px solid #00c8e0',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{d}</span>
                    <input
                      type="number"
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      autoFocus
                      placeholder="Watts"
                      style={{ width: 76, padding: '4px 8px', borderRadius: 6, border: '1px solid #00c8e0', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmBikeRecord(d); if (e.key === 'Escape') cancelEdit() }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>W</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }}
                    />
                    <button
                      onClick={() => void confirmBikeRecord(d)}
                      disabled={recordSaving}
                      style={{ padding: '4px 11px', borderRadius: 6, border: 'none', background: '#00c8e0', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Annuler
                    </button>
                  </div>
                )
              }

              return (
                <RecordRow key={d} label={d}
                  rec24={eff.w > 0 ? `${eff.w}W` : '—'}
                  rec23={prev && prev.w > 0 ? `${prev.w}W` : '—'}
                  sub={eff.w > 0 ? `${(eff.w / profile.weight).toFixed(2)} W/kg` : undefined}
                  onSelect={() => eff.w > 0 ? onSelect(`Vélo ${d}`, `${eff.w}W`) : undefined}
                  selected={sel}
                  actions={
                    <button
                      onClick={() => tryEdit(editKey, eff.w > 0 ? String(eff.w) : '')}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Modifier
                    </button>
                  }
                />
              )
            })}
          </Card>
        </div>
      )}

      {/* RUN */}
      {sport === 'run' && (
        <Card>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Records course à pied</h2>
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

      {/* SWIM */}
      {sport === 'swim' && (
        <Card>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Records natation</h2>
          {SWIM_DISTS.map(d => {
            const r24 = SWIM_REC[d]?.[0]
            const r23 = SWIM_REC[d]?.[1]
            const split = calcSplit500m(SWIM_M[d], r24?.time || '')
            const sel = selectedDatum?.label === `Natation ${d}` && selectedDatum?.value === (r24?.time || '—')
            return (
              <RecordRow key={d} label={d}
                rec24={r24?.time || '—'}
                rec23={r23?.time || '—'}
                sub={split !== '—' ? split.replace('/500m', '/100m') : undefined}
                onSelect={() => r24?.time && r24.time !== '—' ? onSelect(`Natation ${d}`, r24.time) : undefined}
                selected={sel}
              />
            )
          })}
        </Card>
      )}

      {/* ROWING */}
      {sport === 'rowing' && (
        <Card>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Records aviron</h2>
          {ROW_DISTS.map(d => {
            const r24 = ROW_REC[d]?.[0]
            const r23 = ROW_REC[d]?.[1]
            const split = calcSplit500m(ROW_M[d], r24?.time || '')
            let watts = '—'
            if (split !== '—') {
              const pp = split.split('/')[0].split(':').map(Number)
              const ss = pp[0] * 60 + (pp[1] || 0)
              if (ss > 0) watts = `~${Math.round(2.80 / (ss / 500) ** 3)}W`
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
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '10px 0 0' }}>Puissance via formule Concept2 : P = 2.80 / (split/500)^3</p>
        </Card>
      )}

      {/* HYROX */}
      {sport === 'hyrox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Meilleur résultat Hyrox</h2>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{HYROX_REC.format} · {HYROX_REC.date}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: '#ef4444', margin: 0 }}>{HYROX_REC.total}</p>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: 0 }}>Temps total</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>Roxzone</p>
                <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>{HYROX_REC.roxzone}</p>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>Total running</p>
                <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, color: '#22c55e', margin: 0 }}>
                  {(() => {
                    let s = 0
                    HYROX_REC.runs.forEach(r => { const pp = r.split(':').map(Number); s += pp[0] * 60 + (pp[1] || 0) })
                    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
                  })()}
                </p>
              </div>
            </div>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Stations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {HYROX_STATIONS.map((s, i) => {
                const sel = selectedDatum?.label === `Hyrox ${s}` && selectedDatum?.value === HYROX_REC.stations[s]
                return (
                  <div key={s} onClick={() => onSelect(`Hyrox ${s}`, HYROX_REC.stations[s])} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8,
                    background: sel ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${sel ? 'rgba(239,68,68,0.50)' : 'rgba(239,68,68,0.12)'}`,
                    cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', width: 17, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 11 }}>{s}</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{HYROX_REC.stations[s]}</span>
                  </div>
                )
              })}
            </div>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Runs (8×1km)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {HYROX_REC.runs.map((r, i) => {
                const sel = selectedDatum?.label === `Hyrox Run ${i + 1}` && selectedDatum?.value === r
                return (
                  <div key={i} onClick={() => onSelect(`Hyrox Run ${i + 1}`, r)} style={{
                    padding: '6px 8px', borderRadius: 7, textAlign: 'center', cursor: 'pointer',
                    background: sel ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.07)',
                    border: `1px solid ${sel ? 'rgba(34,197,94,0.50)' : 'rgba(34,197,94,0.15)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 2px' }}>Run {i + 1}</p>
                    <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 600, color: '#22c55e', margin: 0 }}>{r}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Simulation */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Simulation de performance</h2>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>Simuler des gains sur chaque station</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {simMode && (
                  <div style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 2px' }}>Temps simulé</p>
                    <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, color: '#ef4444', margin: 0 }}>{hyroxSimTotal()}</p>
                  </div>
                )}
                <button onClick={() => setSimMode(!simMode)} style={{
                  padding: '6px 12px', borderRadius: 9,
                  background: simMode ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'var(--bg-card2)',
                  border: `1px solid ${simMode ? 'transparent' : 'var(--border)'}`,
                  color: simMode ? '#fff' : 'var(--text-mid)',
                  fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>
                  {simMode ? 'Simulation active' : 'Simuler'}
                </button>
              </div>
            </div>
            {simMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {HYROX_STATIONS.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, flex: 1, color: 'var(--text-mid)' }}>{s}</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: '#ef4444', width: 40, textAlign: 'right' }}>{HYROX_REC.stations[s]}</span>
                    <button onClick={() => setSimDeltas(prev => ({...prev, [s]: (prev[s] || 0) + 5}))}
                      style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#22c55e', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: '#22c55e', minWidth: 32, textAlign: 'center' }}>
                      {simDeltas[s] ? `-${simDeltas[s]}s` : '0s'}
                    </span>
                    <button onClick={() => setSimDeltas(prev => ({...prev, [s]: Math.max((prev[s] || 0) - 5, 0)}))}
                      style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#ef4444', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ))}
                <button onClick={() => setSimDeltas({})} style={{ marginTop: 6, padding: '5px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>
                  Réinitialiser
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0' }}>
                Active la simulation pour identifier tes points faibles.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* GYM */}
      {sport === 'gym' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="md:grid-cols-2">
          {GYM_MOVES.map(m => (
            <Card key={m.name} style={{ padding: 16 }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#f97316' }}>{m.name}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {m.recs.map(r => {
                  const valStr = r.v ? `${r.v}${r.l.includes('reps') ? ' reps' : ' kg'}` : '—'
                  const sel = selectedDatum?.label === `${m.name} — ${r.l}` && selectedDatum?.value === valStr
                  return (
                    <div key={r.l} onClick={() => r.v ? onSelect(`${m.name} — ${r.l}`, valStr) : undefined} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '5px 9px', borderRadius: 7,
                      background: sel ? 'rgba(249,115,22,0.14)' : 'rgba(249,115,22,0.07)',
                      border: `1px solid ${sel ? 'rgba(249,115,22,0.50)' : 'rgba(249,115,22,0.15)'}`,
                      cursor: r.v ? 'pointer' : undefined,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{r.l}</span>
                      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: r.v ? '#f97316' : 'var(--text-dim)' }}>
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
// SUB-TAB 3: YEAR DATAS — refonte complète
// ════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────
type YDSportId = 'running' | 'trail' | 'cycling' | 'swimming' | 'rowing' | 'hyrox' | 'gym' | 'ski'

interface YDAutoStat {
  nb_sorties: number; km: number; heures: number
  denivele: number; longest_km: number; longest_h: number; tss: number
}

interface YDManual {
  id?: string; user_id?: string; sport: string; year: number
  km: number | null; heures: number | null; denivele: number | null
  nb_sorties: number | null
  sortie_plus_longue_km: number | null; sortie_plus_longue_heures: number | null
  tss: number | null; volume_tonnes: number | null
  specifique: Record<string, unknown>; updated_at?: string
}

interface YDRawAct {
  sport: string | null; date: string | null
  duration: number | null; distance: number | null; load: number | null
  raw_data: unknown
}

// ── Sport definitions ──────────────────────────────────────────
const YD_SPORTS: { id: YDSportId; label: string; icon: string; color: string; keys: string[] }[] = [
  { id: 'running',  label: 'Running',  icon: '🏃', color: '#22c55e', keys: ['running', 'run'] },
  { id: 'trail',    label: 'Trail',    icon: '⛰️',  color: '#84cc16', keys: ['trail_run', 'trail', 'trail_running'] },
  { id: 'cycling',  label: 'Cyclisme', icon: '🚴', color: '#00c8e0', keys: ['cycling', 'ride', 'virtual_ride', 'road_cycling'] },
  { id: 'swimming', label: 'Natation', icon: '🏊', color: '#38bdf8', keys: ['swimming', 'swim', 'open_water_swimming'] },
  { id: 'rowing',   label: 'Aviron',   icon: '🚣', color: '#14b8a6', keys: ['rowing'] },
  { id: 'hyrox',    label: 'Hyrox',    icon: '⚡', color: '#ef4444', keys: ['hyrox'] },
  { id: 'gym',      label: 'Muscu',    icon: '💪', color: '#f97316', keys: ['gym', 'weight_training', 'crosstraining', 'workout'] },
  { id: 'ski',      label: 'Ski',      icon: '⛷️', color: '#a78bfa', keys: ['skiing', 'alpine_ski', 'backcountry_ski', 'nordic_ski', 'snowboard'] },
]

// ── Metric definitions ─────────────────────────────────────────
interface YDMetric {
  key: string; label: string
  fmt: (v: number) => string
  fromAuto: (s: YDAutoStat) => number
  fromManual: (e: YDManual) => number | null
  manualKey: 'km' | 'heures' | 'denivele' | 'nb_sorties' | 'tss' | 'volume_tonnes'
  step: string
}

const YD_METRICS: Record<string, YDMetric> = {
  km:            { key: 'km',            label: 'Distance',   fmt: v => `${v.toFixed(0)} km`, fromAuto: s => s.km,          fromManual: e => e.km,            manualKey: 'km',            step: '0.1' },
  heures:        { key: 'heures',        label: 'Heures',     fmt: v => `${v.toFixed(1)} h`,  fromAuto: s => s.heures,      fromManual: e => e.heures,        manualKey: 'heures',        step: '0.1' },
  denivele:      { key: 'denivele',      label: 'D+',         fmt: v => `${Math.round(v)} m`, fromAuto: s => s.denivele,    fromManual: e => e.denivele,      manualKey: 'denivele',      step: '1'   },
  nb_sorties:    { key: 'nb_sorties',    label: 'Sorties',    fmt: v => `${Math.round(v)}`,   fromAuto: s => s.nb_sorties,  fromManual: e => e.nb_sorties,    manualKey: 'nb_sorties',    step: '1'   },
  tss:           { key: 'tss',           label: 'TSS',        fmt: v => `${Math.round(v)}`,   fromAuto: s => s.tss,         fromManual: e => e.tss,           manualKey: 'tss',           step: '1'   },
  volume_tonnes: { key: 'volume_tonnes', label: 'Volume (t)', fmt: v => `${v.toFixed(1)} t`,  fromAuto: _ => 0,             fromManual: e => e.volume_tonnes, manualKey: 'volume_tonnes', step: '0.1' },
}

const YD_SPORT_METRICS: Record<YDSportId, string[]> = {
  running:  ['km', 'heures', 'denivele', 'nb_sorties'],
  trail:    ['km', 'heures', 'denivele', 'nb_sorties'],
  cycling:  ['km', 'heures', 'denivele', 'tss', 'nb_sorties'],
  swimming: ['km', 'heures', 'nb_sorties'],
  rowing:   ['km', 'heures', 'nb_sorties'],
  hyrox:    ['nb_sorties', 'km', 'heures'],
  gym:      ['nb_sorties', 'heures', 'volume_tonnes'],
  ski:      ['heures', 'denivele', 'nb_sorties'],
}

// ── Component ─────────────────────────────────────────────────
function YearDatasSubTab() {
  const [loading, setLoading]       = useState(true)
  // year → sportId → aggregated stat (from Strava activities)
  const [autoStats, setAutoStats]   = useState<Record<string, Record<string, YDAutoStat>>>({})
  // sportId → year → manual entry (from year_data_manual table)
  const [manualMap, setManualMap]   = useState<Record<string, Record<string, YDManual>>>({})
  const [allYears, setAllYears]     = useState<string[]>([])

  const [activeSport, setActiveSport] = useState<YDSportId>('running')
  const [mode, setMode]             = useState<'auto' | 'manual'>('auto')
  const [selectedYear, setSelectedYear] = useState('all')
  const [chartMetric, setChartMetric]   = useState('km')

  // Edit state (manual mode)
  const [editYear, setEditYear]     = useState<string | null>(null)
  const [editDraft, setEditDraft]   = useState<Partial<YDManual>>({})
  const [saving, setSaving]         = useState(false)

  // Chart tooltip
  const [hoveredBar, setHoveredBar] = useState<{ year: string; val: number; svgX: number } | null>(null)

  // ── Fetch ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    // 1. Auto: Strava activities
    const { data: acts } = await sb
      .from('activities')
      .select('sport, date, duration, distance, load, raw_data')

    const auto: Record<string, Record<string, YDAutoStat>> = {}
    for (const act of (acts ?? []) as YDRawAct[]) {
      if (!act.date || !act.sport) continue
      const year  = act.date.slice(0, 4)
      const lower = act.sport.toLowerCase()
      for (const sp of YD_SPORTS) {
        if (!sp.keys.includes(lower)) continue
        if (!auto[year]) auto[year] = {}
        if (!auto[year][sp.id]) auto[year][sp.id] = { nb_sorties: 0, km: 0, heures: 0, denivele: 0, longest_km: 0, longest_h: 0, tss: 0 }
        const s   = auto[year][sp.id]
        const km  = (act.distance ?? 0) / 1000
        const h   = (act.duration ?? 0) / 3600
        const rd  = act.raw_data as Record<string, unknown> | null
        s.nb_sorties += 1
        s.km         += km
        s.heures     += h
        s.tss        += act.load ?? 0
        s.denivele   += typeof rd?.total_elevation_gain === 'number' ? rd.total_elevation_gain : 0
        if (km > s.longest_km) s.longest_km = km
        if (h  > s.longest_h)  s.longest_h  = h
        break
      }
    }

    // 2. Manual: year_data_manual (may not exist yet — ignore error)
    const manual: Record<string, Record<string, YDManual>> = {}
    const { data: manualRows, error: manualErr } = await sb
      .from('year_data_manual')
      .select('*')
      .order('year', { ascending: false })
    if (!manualErr && manualRows) {
      for (const row of manualRows as YDManual[]) {
        if (!manual[row.sport]) manual[row.sport] = {}
        manual[row.sport][String(row.year)] = row
      }
    }

    // 3. Collect all years
    const yearsSet = new Set<string>()
    Object.keys(auto).forEach(y => yearsSet.add(y))
    Object.values(manual).forEach(m => Object.keys(m).forEach(y => yearsSet.add(y)))
    const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a))

    setAutoStats(auto)
    setManualMap(manual)
    setAllYears(years)
    setLoading(false)
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  // ── Derived helpers ──────────────────────────────────────────
  const sportDef     = YD_SPORTS.find(s => s.id === activeSport)!
  const sportMetrics = YD_SPORT_METRICS[activeSport]
  const validMetric  = sportMetrics.includes(chartMetric) ? chartMetric : sportMetrics[0]
  const metricDef    = YD_METRICS[validMetric]!

  const chartYears = [...allYears].sort()

  function autoStat(year: string): YDAutoStat | null {
    return autoStats[year]?.[activeSport] ?? null
  }
  function manualEntry(year: string): YDManual | null {
    return manualMap[activeSport]?.[year] ?? null
  }
  function getDisplayVal(m: YDMetric, year: string): number {
    if (mode === 'auto') {
      const s = autoStat(year)
      return s ? m.fromAuto(s) : 0
    }
    const e = manualEntry(year)
    return e ? (m.fromManual(e) ?? 0) : 0
  }

  // Aggregate (auto mode + all years)
  const aggStat: YDAutoStat | null = (() => {
    if (mode !== 'auto') return null
    const agg: YDAutoStat = { nb_sorties: 0, km: 0, heures: 0, denivele: 0, longest_km: 0, longest_h: 0, tss: 0 }
    let found = false
    for (const yr of allYears) {
      const s = autoStat(yr)
      if (!s) continue
      found = true
      agg.nb_sorties += s.nb_sorties
      agg.km         += s.km
      agg.heures     += s.heures
      agg.denivele   += s.denivele
      agg.tss        += s.tss
      if (s.longest_km > agg.longest_km) agg.longest_km = s.longest_km
      if (s.longest_h  > agg.longest_h)  agg.longest_h  = s.longest_h
    }
    return found ? agg : null
  })()

  const displayAuto:   YDAutoStat | null = selectedYear === 'all' ? aggStat : autoStat(selectedYear)
  const displayManual: YDManual   | null = selectedYear === 'all' ? null    : manualEntry(selectedYear)
  const hasDisplay = mode === 'auto' ? displayAuto !== null : displayManual !== null

  // Chart
  const chartVals   = chartYears.map(yr => getDisplayVal(metricDef, yr))
  const maxChartVal = Math.max(...chartVals, 1)

  // ── Save manual entry ────────────────────────────────────────
  async function saveManual(year: string) {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const existing = manualEntry(year)
      const payload = {
        user_id:                   user.id,
        sport:                     activeSport,
        year:                      parseInt(year),
        km:                        editDraft.km                        ?? null,
        heures:                    editDraft.heures                    ?? null,
        denivele:                  editDraft.denivele                  ?? null,
        nb_sorties:                editDraft.nb_sorties                ?? null,
        sortie_plus_longue_km:     editDraft.sortie_plus_longue_km     ?? null,
        sortie_plus_longue_heures: editDraft.sortie_plus_longue_heures ?? null,
        tss:                       editDraft.tss                       ?? null,
        volume_tonnes:             editDraft.volume_tonnes             ?? null,
        specifique:                editDraft.specifique                ?? {},
        updated_at:                new Date().toISOString(),
      }
      let saved: YDManual | null = null
      if (existing?.id) {
        const { data } = await sb.from('year_data_manual').update(payload).eq('id', existing.id).select().single()
        saved = data as YDManual | null
      } else {
        const { data } = await sb.from('year_data_manual').insert(payload).select().single()
        saved = data as YDManual | null
      }
      if (saved) {
        setManualMap(prev => ({ ...prev, [activeSport]: { ...(prev[activeSport] ?? {}), [year]: saved! } }))
        if (!allYears.includes(year)) setAllYears(prev => [...prev, year].sort((a, b) => b.localeCompare(a)))
      }
      setEditYear(null)
      setEditDraft({})
    } finally {
      setSaving(false)
    }
  }

  function startEdit(year: string) {
    if (editYear && editYear !== year) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    const existing = manualEntry(year)
    setEditDraft(existing ? { ...existing } : { sport: activeSport, year: parseInt(year), specifique: {} })
    setEditYear(year)
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Chargement des données…</p>
        </div>
      </div>
    )
  }

  const currentYear    = String(new Date().getFullYear())
  const manualListYrs  = allYears.includes(currentYear) ? allYears : [currentYear, ...allYears]
  const SVG_W          = 500

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <SectionHeader label="Données annuelles" gradient="linear-gradient(180deg,#a855f7,#5b6fff)" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['auto', 'manual'] as const).map(m => (
              <button key={m} onClick={() => {
                setMode(m)
                setSelectedYear(m === 'auto' ? 'all' : (allYears[0] ?? currentYear))
                setEditYear(null)
              }}
                style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: mode === m ? '#5b6fff' : 'var(--bg-card2)',
                  color:      mode === m ? '#fff'    : 'var(--text-dim)' }}>
                {m === 'auto' ? '⚡ Auto' : '✏️ Manuel'}
              </button>
            ))}
          </div>
          {/* Year selector */}
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            {mode === 'auto' && <option value="all">Toutes années</option>}
            {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        </div>
      </div>

      {/* ── Sport tabs ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {YD_SPORTS.map(sp => (
          <button key={sp.id} onClick={() => {
            setActiveSport(sp.id)
            setEditYear(null)
            setChartMetric(YD_SPORT_METRICS[sp.id][0] ?? 'km')
          }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: activeSport === sp.id ? sp.color : 'var(--bg-card2)',
              color:      activeSport === sp.id ? '#fff'   : 'var(--text-dim)' }}>
            <span>{sp.icon}</span>
            <span>{sp.label}</span>
          </button>
        ))}
      </div>

      {/* ── Stat cards ── */}
      {hasDisplay ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {sportMetrics.map(mk => {
            const m = YD_METRICS[mk]
            if (!m) return null
            const val = mode === 'auto'
              ? (displayAuto   ? m.fromAuto(displayAuto)              : 0)
              : (displayManual ? (m.fromManual(displayManual) ?? 0)   : 0)
            return (
              <div key={mk} style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>{m.label}</p>
                <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 15, fontWeight: 700, color: sportDef.color, margin: 0 }}>
                  {val > 0
                    ? m.fmt(val)
                    : <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}>—</span>}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', margin: 0, padding: '10px 0' }}>
            {mode === 'manual'
              ? 'Aucune donnée. Passe en mode Manuel et clique sur "+ Saisir".'
              : 'Aucune activité Strava pour ce sport / cette période.'}
          </p>
        </Card>
      )}

      {/* ── Bar chart ── */}
      {(chartVals.some(v => v > 0) || allYears.length > 0) && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Évolution par année</h3>
            <select value={validMetric} onChange={e => setChartMetric(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
              {sportMetrics.map(mk => <option key={mk} value={mk}>{YD_METRICS[mk]?.label}</option>)}
            </select>
          </div>

          {(() => {
            const svgH  = 150
            const bPad  = 22, tPad = 8, lPad = 42
            const plotW = SVG_W - lPad - 8
            const plotH = svgH - bPad - tPad
            const n     = Math.max(chartYears.length, 1)
            const gap   = 5
            const barW  = Math.max(12, plotW / n - gap)
            const yMax  = maxChartVal * 1.15

            const yStep = Math.pow(10, Math.floor(Math.log10(maxChartVal || 1)))
            const yLabels: number[] = []
            for (let v = 0; v <= yMax && yLabels.length < 5; v += yStep) yLabels.push(v)

            return (
              <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${SVG_W} ${svgH}`} style={{ width: '100%', height: svgH, overflow: 'visible' }}
                  onMouseLeave={() => setHoveredBar(null)}>
                  {/* Grid + Y labels */}
                  {yLabels.map(v => {
                    const y = tPad + plotH - (v / yMax) * plotH
                    return (
                      <g key={v}>
                        <line x1={lPad} y1={y} x2={SVG_W - 8} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={lPad - 3} y={y + 4} textAnchor="end"
                          style={{ fontSize: 8, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
                          {metricDef.fmt(v)}
                        </text>
                      </g>
                    )
                  })}
                  {/* Baseline */}
                  <line x1={lPad} y1={tPad + plotH} x2={SVG_W - 8} y2={tPad + plotH} stroke="var(--border)" strokeWidth="1" />
                  {/* Bars */}
                  {chartYears.map((yr, i) => {
                    const val  = chartVals[i]
                    const bh   = Math.max(0, (val / yMax) * plotH)
                    const bx   = lPad + i * (barW + gap) + gap / 2
                    const by   = tPad + plotH - bh
                    const cx   = bx + barW / 2
                    const col  = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR
                    const sel  = selectedYear === yr
                    const hov  = hoveredBar?.year === yr
                    return (
                      <g key={yr} style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredBar({ year: yr, val, svgX: cx })}
                        onClick={() => setSelectedYear(yr)}>
                        <rect x={bx} y={by} width={barW} height={bh} rx={3} fill={col} opacity={hov ? 1 : 0.72} />
                        {sel && <rect x={bx - 1} y={by - 1} width={barW + 2} height={bh + 1} rx={3} fill="none" stroke={col} strokeWidth="1.5" />}
                        <text x={cx} y={svgH - 5} textAnchor="middle"
                          style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', fill: sel ? col : 'var(--text-dim)', fontWeight: sel ? '700' : '400' }}>
                          {yr.slice(2)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
                {/* Tooltip */}
                {hoveredBar && (
                  <div style={{
                    position: 'absolute', top: 4, pointerEvents: 'none', zIndex: 10,
                    left:  hoveredBar.svgX < SVG_W / 2 ? `calc(${(hoveredBar.svgX / SVG_W * 100).toFixed(1)}% + 10px)` : undefined,
                    right: hoveredBar.svgX >= SVG_W / 2 ? `calc(${((SVG_W - hoveredBar.svgX) / SVG_W * 100).toFixed(1)}% + 10px)` : undefined,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 2px', color: YEAR_COLORS[hoveredBar.year] ?? YEAR_DEFAULT_COLOR }}>{hoveredBar.year}</p>
                    <p style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', margin: 0 }}>
                      {metricDef.label}: <strong>{metricDef.fmt(hoveredBar.val)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )
          })()}
        </Card>
      )}

      {/* ── Manual entry list ── */}
      {mode === 'manual' && (
        <Card>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>
            {sportDef.icon} {sportDef.label} — Saisie manuelle
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {manualListYrs.map(yr => {
              const entry     = manualEntry(yr)
              const isEditing = editYear === yr
              const col       = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR

              if (isEditing) {
                return (
                  <div key={yr} style={{ border: `1.5px solid ${col}50`, borderRadius: 10, padding: 14, background: 'var(--bg-card2)' }}>
                    <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, color: col, margin: '0 0 10px' }}>{yr}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {sportMetrics.map(mk => {
                        const m = YD_METRICS[mk]
                        if (!m) return null
                        const rawVal = editDraft[m.manualKey]
                        const strVal = typeof rawVal === 'number' ? String(rawVal) : ''
                        return (
                          <div key={mk}>
                            <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>{m.label}</label>
                            <input type="number" step={m.step} min="0" value={strVal}
                              onChange={e => setEditDraft(p => ({
                                ...p,
                                [m.manualKey]: e.target.value === '' ? null : parseFloat(e.target.value),
                              }))}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { void saveManual(yr) }} disabled={saving}
                        style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? '…' : 'Confirmer'}
                      </button>
                      <button onClick={() => { setEditYear(null); setEditDraft({}) }}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-card2)' }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: col, minWidth: 36 }}>{yr}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {entry
                      ? sportMetrics.slice(0, 3).map(mk => {
                          const m = YD_METRICS[mk]!
                          const v = m.fromManual(entry)
                          return v != null && v > 0 ? (
                            <span key={mk} style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>{m.label} </span>
                              <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{m.fmt(v)}</span>
                            </span>
                          ) : null
                        })
                      : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Aucune donnée</span>}
                  </div>
                  <button onClick={() => startEdit(yr)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                    {entry ? 'Modifier' : '+ Saisir'}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Auto empty state ── */}
      {mode === 'auto' && allYears.length === 0 && (
        <Card>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: 0, padding: '16px 0' }}>
            Aucune activité trouvée. Synchronise Strava pour voir tes données annuelles.
          </p>
        </Card>
      )}

    </div>
  )
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function DatasTab({ onSelect, selectedDatum, profile }: Props) {
  type SubTab = 'zones' | 'records' | 'yeardata'
  const [subTab, setSubTab] = useState<SubTab>('zones')

  const SUB_TABS: { id: SubTab; label: string; color: string; bg: string }[] = [
    { id: 'zones',    label: 'Zones',      color: '#00c8e0', bg: 'rgba(0,200,224,0.10)' },
    { id: 'records',  label: 'Records',    color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
    { id: 'yeardata', label: 'Year Datas', color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12, border: '1px solid', cursor: 'pointer',
            borderColor: subTab === t.id ? t.color : 'var(--border)',
            background: subTab === t.id ? t.bg : 'var(--bg-card)',
            color: subTab === t.id ? t.color : 'var(--text-mid)',
            fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: subTab === t.id ? 700 : 400,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'zones'    && <ZonesSubTab profile={profile} onSelect={onSelect} selectedDatum={selectedDatum} />}
      {subTab === 'records'  && <RecordsSubTab onSelect={onSelect} selectedDatum={selectedDatum} profile={profile} />}
      {subTab === 'yeardata' && <YearDatasSubTab />}
    </div>
  )
}
