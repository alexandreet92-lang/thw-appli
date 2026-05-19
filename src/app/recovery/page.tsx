'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localToday, sportColor, sportLabel } from '@/components/recovery/helpers'
import type { CheckInRow, TrainingLoadData } from '@/components/recovery/types'

import CheckInModal      from '@/components/recovery/CheckInModal'
import SectionToday      from '@/components/recovery/SectionToday'
import SectionSleep      from '@/components/recovery/SectionSleep'
import SectionTrends     from '@/components/recovery/SectionTrends'
import SectionTrainingLoad from '@/components/recovery/SectionTrainingLoad'
import SectionDataSources from '@/components/recovery/SectionDataSources'

// ── Helpers locaux ─────────────────────────────────────────────
function getWeekBounds(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + offsetWeeks * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  return { start: fmt(mon), end: fmt(sun) }
}

async function fetchTrainingLoad(userId: string): Promise<TrainingLoadData> {
  const sb = createClient()
  const { start: s0, end: e0 } = getWeekBounds(0)
  const { start: s1, end: e1 } = getWeekBounds(-1)

  const [thisW, prevW] = await Promise.all([
    sb.from('activities').select('sport_type,moving_time_s,elapsed_time_s')
      .eq('user_id', userId).gte('started_at', s0+'T00:00:00').lte('started_at', e0+'T23:59:59'),
    sb.from('activities').select('moving_time_s,elapsed_time_s')
      .eq('user_id', userId).gte('started_at', s1+'T00:00:00').lte('started_at', e1+'T23:59:59'),
  ])

  const toHours = (r: { moving_time_s?: number|null; elapsed_time_s?: number|null }): number =>
    ((r.moving_time_s ?? r.elapsed_time_s ?? 0) / 3600)

  const thisRows  = thisW.data ?? []
  const prevRows  = prevW.data ?? []
  const thisTotal = thisRows.reduce((a, r) => a + toHours(r), 0)
  const prevTotal = prevRows.reduce((a, r) => a + toHours(r), 0)

  // Répartition par sport
  const sportMap: Record<string, number> = {}
  for (const r of thisRows) {
    const k = (r.sport_type ?? 'autre').toLowerCase()
    sportMap[k] = (sportMap[k] ?? 0) + toHours(r)
  }
  const breakdown = Object.entries(sportMap)
    .sort((a, b) => b[1] - a[1])
    .map(([sport, hours]) => ({ sport, hours: Math.round(hours * 10) / 10, color: sportColor(sport) }))

  return {
    thisWeekCount: thisRows.length,
    thisWeekHours: Math.round(thisTotal * 10) / 10,
    prevWeekHours: Math.round(prevTotal * 10) / 10,
    breakdown,
  }
}

// ══════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════
export default function RecoveryPage() {
  const [checkin,  setCheckin]  = useState<CheckInRow | null>(null)
  const [history,  setHistory]  = useState<CheckInRow[]>([])
  const [load,     setLoad]     = useState<TrainingLoadData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeviceBanner, setShowDeviceBanner] = useState(true)
  const sourcesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = localToday()
      const [ci, hist, tl] = await Promise.all([
        // check-in du jour
        sb.from('daily_checkin').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
        // historique 30 jours
        sb.from('daily_checkin').select('*').eq('user_id', user.id)
          .order('date', { ascending: false }).limit(30),
        // charge strava
        fetchTrainingLoad(user.id),
      ])

      setCheckin((ci.data as CheckInRow | null) ?? null)
      setHistory((hist.data as CheckInRow[] | null) ?? [])
      setLoad(tl)
      setLoading(false)
    }
    void init()
  }, [])

  function handleSaved(row: CheckInRow) {
    setCheckin(row)
    setHistory(prev => {
      const filtered = prev.filter(r => r.date !== row.date)
      return [row, ...filtered]
    })
  }

  // Aucun device connecté (Strava ne compte pas comme "device santé")
  const noDevice = true // à remplacer quand Garmin/Oura/Whoop seront branchés

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Récupération</h1>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
      </div>

      {/* Section G2 — Bandeau device manquant */}
      {noDevice && showDeviceBanner && (
        <div style={{ display:'flex',alignItems:'center',padding:'12px 16px',borderRadius:12,background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.25)',marginBottom:16,flexWrap:'wrap' as const,gap:10 }}>
          <p style={{ fontSize:12,color:'var(--text-mid)',margin:0,flex:1 }}>
            Connecte un appareil de suivi <strong style={{ color:'#a855f7' }}>(Garmin, Whoop, Oura)</strong> pour débloquer HRV, sommeil détaillé et FC repos.
          </p>
          <div style={{ display:'flex',gap:8,flexShrink:0 }}>
            <button onClick={()=>{ sourcesRef.current?.scrollIntoView({behavior:'smooth',block:'start'}) }}
              style={{ padding:'6px 14px',borderRadius:8,background:'rgba(168,85,247,0.15)',border:'1px solid rgba(168,85,247,0.35)',color:'#a855f7',fontSize:11,fontWeight:600,cursor:'pointer' }}>
              Voir les sources
            </button>
            <button onClick={()=>setShowDeviceBanner(false)}
              style={{ padding:'5px 9px',borderRadius:8,background:'transparent',border:'none',color:'var(--text-dim)',fontSize:14,cursor:'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {loading
        ? <div style={{ padding:'60px',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13 }}>Chargement…</div>
        : <>
            <SectionToday  checkin={checkin} onCheckIn={()=>setShowModal(true)}/>
            <SectionSleep  checkin={checkin}/>
            <SectionTrainingLoad data={load}/>
            <SectionTrends history={history}/>
            <SectionDataSources sourcesRef={sourcesRef}/>
          </>
      }

      {showModal && (
        <CheckInModal
          existing={checkin}
          onClose={()=>setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
