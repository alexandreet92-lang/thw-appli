'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise } from '@/types/workout'
import { DEFAULT_GYM_EXERCISES, DEFAULT_HYROX_EXERCISES } from '@/types/workout'
import type { Block } from '@/app/planning/page'
import { blocksToWorkoutExercises } from '@/components/planning/mobile/strength'

const DAY = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getMondayStr() {
  const now = new Date()
  const d = new Date(now)
  d.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return d.toISOString().split('T')[0]
}

interface PlannedSession {
  id: string
  title: string
  sport: string
  blocks: WorkoutExercise[]
  week_start?: string
  day_index?: number
}

interface Props {
  sport: 'gym' | 'hyrox'
  open: boolean
  onClose: () => void
  onStart: (exercises: WorkoutExercise[], title?: string) => void
  onFreeMode?: (sport: 'gym' | 'hyrox') => void
  isDark: boolean
}

export default function WorkoutLauncher({ sport, open, onClose, onStart, onFreeMode, isDark }: Props) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [thisWeek, setThisWeek] = useState<PlannedSession[]>([])
  const [allSessions, setAllSessions] = useState<PlannedSession[]>([])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accent = sport === 'gym' ? '#06B6D4' : '#EF4444'
  const label = sport === 'gym' ? 'Muscu' : 'Hyrox'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) } }, [])

  useEffect(() => {
    if (!open) return
    const monday = getMondayStr()
    const supabase = createClient()
    supabase.from('planned_sessions')
      .select('id, title, sport, blocks, week_start, day_index')
      .eq('sport', sport)
      .order('day_index', { ascending: true })
      .then(({ data }) => {
        const all = (data ?? []).map(d => ({ ...d, blocks: blocksToWorkoutExercises((d.blocks ?? []) as Block[], sport) }))
        setAllSessions(all)
        setThisWeek(all.filter(s => s.week_start === monday))
      })
  }, [open, sport])

  if (!mounted || !open) return null

  const handleClose = () => { setClosing(true); closeTimerRef.current = setTimeout(onClose, 230) }

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }}>{text}</p>
  )

  const SessionRow = ({ s }: { s: PlannedSession }) => (
    <button onClick={() => { handleClose(); onStart(s.blocks, s.title) }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{s.title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '3px 0 0' }}>
          {s.day_index != null ? DAY[s.day_index] : ''}
          {s.blocks.length > 0 ? ` · ${s.blocks.length} exercice${s.blocks.length !== 1 ? 's' : ''}` : ''}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3l4 4-4 4" stroke="var(--text-mid)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', animation: closing ? 'fade-out 200ms ease-in forwards' : 'fade-in 200ms ease-out forwards' }} />
      <div className={closing ? 'sheet-close' : 'sheet-open'} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '82vh', background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 -8px 32px rgba(0,0,0,0.20)' }}>

        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'Syne, sans-serif' }}>{label}</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontSize: 22, lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* SECTION 1 — TRAINING PLANNING */}
          <div style={{ marginBottom: 20 }}>
            {sectionLabel('Training Planning')}
            {thisWeek.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, padding: '8px 0' }}>Aucune séance planifiée cette semaine</p>
            ) : (
              thisWeek.map(s => <SessionRow key={s.id} s={s} />)
            )}
          </div>

          {/* SECTION 2 — TRAINING SESSION */}
          {allSessions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {sectionLabel('Training Session')}
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {allSessions.map(s => <SessionRow key={s.id} s={s} />)}
              </div>
            </div>
          )}

          {/* SECTION 3 — NO TRAINING */}
          <div>
            {sectionLabel('No Training')}
            <div style={{ display: 'flex', gap: 10 }}>

              {/* Créer une séance */}
              <button onClick={() => { handleClose(); onStart([], undefined) }}
                style={{ flex: 1, padding: '14px 12px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2v14M2 9h14" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Créer une séance</p>
                <p style={{ fontSize: 11, color: 'var(--text-mid)', margin: '3px 0 0' }}>Définir les exercices</p>
              </button>

              {/* Lancer sans programme */}
              <button onClick={() => { handleClose(); onFreeMode ? onFreeMode(sport) : onStart(sport === 'gym' ? DEFAULT_GYM_EXERCISES : DEFAULT_HYROX_EXERCISES) }}
                style={{ flex: 1, padding: '14px 12px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="#06B6D4" strokeWidth="1.4"/>
                    <path d="M9 5v4l3 2" stroke="#06B6D4" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Lancer</p>
                <p style={{ fontSize: 11, color: 'var(--text-mid)', margin: '3px 0 0' }}>Sans programme</p>
              </button>

            </div>
          </div>

        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
