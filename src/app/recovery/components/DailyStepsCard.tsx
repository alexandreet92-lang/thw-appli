'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StepsData {
  date: string
  steps: number | null
  active_calories: number | null
  total_calories: number | null
  active_time_s: number | null
}

const GOAL = 10_000

function fmtTime(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export default function DailyStepsCard() {
  const [data, setData] = useState<StepsData | null>(null)
  const [history, setHistory] = useState<StepsData[]>([])
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('health_data')
        .select('date, steps, active_calories, total_calories, raw_data')
        .eq('user_id', user.id)
        .eq('data_type', 'daily_activity')
        .order('date', { ascending: false })
        .limit(14)
        .then(({ data: rows }) => {
          if (!rows?.length) return
          const mapped = rows.map(r => ({
            date:            r.date as string,
            steps:           r.steps as number | null,
            active_calories: r.active_calories as number | null,
            total_calories:  r.total_calories as number | null,
            active_time_s:   (r.raw_data as Record<string, number> | null)?.active_time_s ?? null,
          }))
          setData(mapped[0])
          setHistory(mapped)
        })
    })
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [])

  if (!data || data.steps == null) return null

  const steps   = data.steps
  const pct     = Math.min(steps / GOAL, 1)
  const reached = steps >= GOAL

  // Mini sparkline — 7 derniers jours de pas
  const spark = [...history].reverse().slice(-7)
  const maxSteps = Math.max(...spark.map(d => d.steps ?? 0), 1)
  const W = 200, H = 28

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 4px' }}>
        Activité quotidienne
      </p>
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
        Pas du jour
      </h2>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Compteur + barre */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 36, fontWeight: 800, color: reached ? '#10B981' : 'var(--text)', lineHeight: 1 }}>
              {steps.toLocaleString('fr-FR')}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>
              / {GOAL.toLocaleString('fr-FR')} pas
            </span>
          </div>

          {/* Barre de progression */}
          <div style={{ height: 8, borderRadius: 8, background: 'var(--bg-card2)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%',
              width: animated ? `${pct * 100}%` : '0%',
              borderRadius: 8,
              background: reached
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : steps > GOAL * 0.6
                  ? 'linear-gradient(90deg, #F59E0B, #F97316)'
                  : 'linear-gradient(90deg, #3B82F6, #5b6fff)',
              transition: 'width 1s ease-out',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: reached ? '#10B981' : 'var(--text-dim)', fontWeight: reached ? 700 : 400 }}>
              {reached ? '✓ Objectif atteint' : `${Math.round(pct * 100)}% de l'objectif`}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
              {data.date}
            </span>
          </div>

          {/* Stats secondaires */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {data.active_calories != null && (
              <div style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 1px' }}>Cal. actives</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'DM Mono,monospace' }}>
                  {data.active_calories} kcal
                </p>
              </div>
            )}
            {data.active_time_s != null && (
              <div style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 1px' }}>Temps actif</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'DM Mono,monospace' }}>
                  {fmtTime(data.active_time_s)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline 7j */}
        {spark.length >= 3 && (
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 4px', textAlign: 'center' }}>7 derniers jours</p>
            <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: W, height: H + 14, display: 'block' }}>
              {/* Ligne objectif */}
              <line
                x1={0} y1={H - (GOAL / maxSteps) * H}
                x2={W} y2={H - (GOAL / maxSteps) * H}
                stroke="rgba(16,185,129,0.3)" strokeWidth={1} strokeDasharray="3 3"
              />
              {/* Barres */}
              {spark.map((d, i) => {
                const s = d.steps ?? 0
                const bH = Math.max(2, (s / maxSteps) * H)
                const x = (i / (spark.length - 1)) * (W - 16)
                const isGoal = s >= GOAL
                return (
                  <rect
                    key={d.date}
                    x={x - 7} y={H - bH} width={14} height={bH}
                    rx={3}
                    fill={isGoal ? '#10B981' : '#3B82F6'}
                    opacity={animated ? 0.8 : 0}
                    style={{ transition: `opacity 0.4s ease ${i * 80}ms` }}
                  />
                )
              })}
              {/* Labels jours */}
              {spark.map((d, i) => {
                const x = (i / (spark.length - 1)) * (W - 16)
                return (
                  <text key={d.date} x={x} y={H + 12} textAnchor="middle"
                    fill="var(--text-dim)" fontSize={7}>
                    {d.date.slice(8)}
                  </text>
                )
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
