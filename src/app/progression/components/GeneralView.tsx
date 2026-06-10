'use client'

// ══════════════════════════════════════════════════════════════════
// GeneralView — vue « Général » d'un sport : héros + tendance + courbe
// d'évolution + stats secondaires + liste des séances (comparer).
// Données RÉELLES (activités de l'utilisateur, colonnes agrégées + EF).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { SPORT_CONFIGS, GENERAL_CONFIGS } from '@/lib/progression/sportConfig'
import { calculateTrend, fmtRelDate, type ProgSession } from '@/lib/progression/helpers'
import { EvolutionChart } from './EvolutionChart'

const COLS = 'id,started_at,title,distance_m,moving_time_s,avg_hr,avg_watts,avg_speed_ms,avg_pace_s_km,ef_value,power_hr_ratio,calories'

export function GeneralView({ sport }: { sport: string }) {
  const cfg = SPORT_CONFIGS[sport]
  const gen = GENERAL_CONFIGS[sport]
  const [sessions, setSessions] = useState<ProgSession[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [compare, setCompare] = useState<{ a: ProgSession; b: ProgSession } | null>(null)

  useEffect(() => {
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancel) setSessions([]); return }
      const { data } = await supabase.from('activities').select(COLS)
        .eq('user_id', user.id).in('sport_type', cfg.sportTypes)
        .order('started_at', { ascending: false }).limit(50)
      if (!cancel) setSessions((data ?? []) as ProgSession[])
    })()
    return () => { cancel = true }
  }, [sport, cfg.sportTypes])

  if (sessions === null) return <div style={{ height: 200, borderRadius: 14, background: 'var(--bg-card2)', animation: 'pulse 1.4s ease-in-out infinite' }} />
  if (sessions.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '24px 0' }}>Pas encore de séances enregistrées pour ce sport.</div>

  const hero = gen.hero(sessions)
  const trend = calculateTrend(sessions, gen.trendMetric, gen.trendInverse)
  const tColor = trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : 'var(--text-dim)'
  const tArrow = trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'
  const visible = showAll ? sessions : sessions.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero + tendance */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{hero.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: cfg.color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{hero.value}</div>
            {hero.sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{hero.sub}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: tColor, fontVariantNumeric: 'tabular-nums' }}>{tArrow} {trend.pct.toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{trend.period}</div>
          </div>
        </div>
        <EvolutionChart sessions={sessions} metric={gen.chartMetric} color={cfg.color} />
      </div>

      {/* Stats secondaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {gen.secondary.map(st => {
          const r = st.calc(sessions)
          const dc = r.delta.direction === 'up' ? '#22c55e' : r.delta.direction === 'down' ? '#ef4444' : 'var(--text-dim)'
          return (
            <div key={st.label} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{r.value}</div>
              <div style={{ fontSize: 10, color: dc, fontVariantNumeric: 'tabular-nums' }}>{r.delta.value}</div>
            </div>
          )
        })}
      </div>

      {/* Liste des séances */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
          Dernières séances · {sessions.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map((s, i) => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto auto', gap: 10, alignItems: 'center', padding: '8px 10px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtRelDate(s.started_at)}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, color: 'var(--text)' }}>{s.title || cfg.label}</span>
              <span style={{ display: 'flex', gap: 10 }}>
                {gen.columns.map(c => (
                  <span key={c.label} style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.color ?? 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{c.value(s)}</span>
                    <span style={{ display: 'block', fontSize: 8.5, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{c.label}</span>
                  </span>
                ))}
              </span>
              <button onClick={() => setCompare({ a: s, b: sessions[Math.min(i + 1, sessions.length - 1)] })}
                disabled={sessions.length < 2}
                style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px', cursor: sessions.length < 2 ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>Comparer</button>
            </div>
          ))}
        </div>
        {!showAll && sessions.length > 5 && (
          <button onClick={() => setShowAll(true)} style={{ marginTop: 10, fontSize: 12, color: cfg.color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Voir toutes les séances ({sessions.length})</button>
        )}
      </div>

      {compare && createPortal(
        <div onClick={() => setCompare(null)} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, margin: 0, color: 'var(--text)' }}>Comparaison</h3>
              <button onClick={() => setCompare(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([['Récente', compare.a, cfg.color], ['Ancienne', compare.b, 'var(--text-dim)']] as const).map(([lbl, s, col]) => (
                <div key={lbl} style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{lbl} · {fmtRelDate(s.started_at)}</div>
                  {gen.columns.map(c => (
                    <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '0.5px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>{c.label}</span>
                      <span style={{ fontWeight: 600, color: typeof col === 'string' && col.startsWith('#') ? col : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{c.value(s)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
