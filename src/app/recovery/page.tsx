'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localToday } from './components/types'
import type { CheckInRow, ActivityRow } from './components/types'

import CheckInModal   from '@/components/recovery/CheckInModal'
import RecoveryBanner from './components/RecoveryBanner'
import DailyScore     from './components/DailyScore'
import WeeklySummary  from './components/WeeklySummary'
import TrainingLoad   from './components/TrainingLoad'
import SleepSection   from './components/SleepSection'
import RecoveryTrends from './components/RecoveryTrends'

import PhysioSection  from './components/PhysioSection'
import DataSources    from './components/DataSources'

// ── Helpers ────────────────────────────────────────────────────
function computeStreak(history: CheckInRow[]): number {
  const sorted = [...history].sort((a,b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = localToday()
  let cursor = new Date(today)
  for (const c of sorted) {
    const expected = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
    if (c.date === expected) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

function dateNDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ══════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════
export default function RecoveryPage() {
  const [checkin,      setCheckin]      = useState<CheckInRow | null>(null)
  const [history,      setHistory]      = useState<CheckInRow[]>([])
  const [prevHistory,  setPrevHistory]  = useState<CheckInRow[]>([])
  const [activities,   setActivities]   = useState<ActivityRow[]>([])
  const [prevActs,     setPrevActs]     = useState<ActivityRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const sourcesRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }

    const today   = localToday()
    const d90     = dateNDaysAgo(90)
    const d180    = dateNDaysAgo(180)
    const d60     = dateNDaysAgo(60)
    const d30     = dateNDaysAgo(30)

    const [ci, hist, hist2, acts, pActs] = await Promise.all([
      sb.from('daily_checkin').select('*').eq('user_id',user.id).eq('date',today).maybeSingle(),
      sb.from('daily_checkin').select('*').eq('user_id',user.id).gte('date',d90).order('date',{ascending:false}),
      sb.from('daily_checkin').select('*').eq('user_id',user.id).gte('date',d60).lt('date',d30).order('date',{ascending:false}),
      sb.from('activities').select('id,sport_type,started_at,moving_time_s,elapsed_time_s,tss').eq('user_id',user.id).gte('started_at',d180+'T00:00:00').order('started_at',{ascending:true}),
      sb.from('activities').select('id,sport_type,started_at,moving_time_s,elapsed_time_s,tss').eq('user_id',user.id).gte('started_at',d60+'T00:00:00').lt('started_at',d30+'T00:00:00'),
    ])

    setCheckin((ci.data as CheckInRow | null) ?? null)
    setHistory((hist.data as CheckInRow[] | null) ?? [])
    setPrevHistory((hist2.data as CheckInRow[] | null) ?? [])
    setActivities((acts.data as ActivityRow[] | null) ?? [])
    setPrevActs((pActs.data as ActivityRow[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function handleSaved(row: CheckInRow) {
    setCheckin(row)
    setHistory(prev => {
      const filtered = prev.filter(r => r.date !== row.date)
      return [row, ...filtered]
    })
  }

  const streak = computeStreak(history)

  if (loading) {
    return (
      <div style={{ padding:'60px 28px',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom:12 }}>
          <circle cx={12} cy={12} r={10} />
          <path d="M12 6v6l4 2" />
        </svg>
        Chargement de tes données…
      </div>
    )
  }

  return (
    <div style={{ padding:'24px 28px',maxWidth:'100%',display:'flex',flexDirection:'column' as const,gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Récupération</h1>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{ padding:'9px 18px',borderRadius:11,background:'linear-gradient(135deg,#3B8FD4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>
          {checkin ? 'Modifier' : '✦ Check-in'}
        </button>
      </div>

      {/* 1. Banner */}
      <RecoveryBanner sourcesRef={sourcesRef} />

      {/* 2+3. Score + Weekly — desktop side by side */}
      <div style={{ display:'grid',gridTemplateColumns:'minmax(0,3fr) minmax(0,2fr)',gap:16,alignItems:'start' }} className="rc-2col">
        <DailyScore checkin={checkin} history={history} streak={streak} onCheckIn={()=>setShowModal(true)} />
        <WeeklySummary history={history} prevHistory={prevHistory} activities={activities} prevActivities={prevActs} />
      </div>

      {/* 4. Training load */}
      <section>
        <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 10px' }}>Charge d'entraînement</p>
        <TrainingLoad activities={activities} />
      </section>

      {/* 5. Sleep */}
      <SleepSection checkin={checkin} history={history} />

      {/* 6. Trends */}
      <RecoveryTrends history={history} activities={activities} />

      {/* 8. Physio */}
      <PhysioSection />

      {/* 9. Sources */}
      <DataSources sourcesRef={sourcesRef} />

      {/* Modal */}
      {showModal && (
        <CheckInModal
          existing={checkin}
          onClose={()=>setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .rc-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
