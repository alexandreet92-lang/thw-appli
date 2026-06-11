'use client'
// ══════════════════════════════════════════════════════════════
// SOMMEIL (Modèle Datas) — total + barre empilée des stades +
// interruptions. Durées NEUTRES, seuls les stades colorés.
// Données vides aujourd'hui (health_data sans stades) → ÉTAT VIDE,
// jamais de zéros. Cf. PROMPT_DASHBOARD_MODELES.md Étape 0.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseSleepNight, type SleepNight, type SleepRow } from '@/lib/health/sleep'
import { Card, SectionTitle, Skeleton, EmptyState, useReducedMotion } from './primitives'
import { FB, NUM } from './lib'

function fmtH(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function SleepCard() {
  const reduce = useReducedMotion()
  const [loading, setLoading] = useState(true)
  const [night, setNight] = useState<SleepNight | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data } = await supabase
        .from('health_data')
        .select('date, sleep_duration_min, deep_duration_min, rem_duration_min, light_duration_min, awake_duration_min')
        .eq('user_id', user.id)
        .eq('data_type', 'sleep')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setNight(parseSleepNight((data as SleepRow | null) ?? null))
      setLoading(false)
      requestAnimationFrame(() => setMounted(true))
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={130} />

  return (
    <Card>
      <SectionTitle>Sommeil</SectionTitle>

      {!night ? (
        <EmptyState title="Pas de données de sommeil" hint="Connecte une montre (Polar, Withings…) pour suivre tes nuits." href="/connections" cta="Connecter" />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <span style={{ ...NUM, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{fmtH(night.totalMin)}</span>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>de sommeil</span>
          </div>

          {night.stages.length > 0 && (
            <>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-hover)' }}>
                {night.stages.map(s => (
                  <div key={s.key} title={s.label} style={{
                    width: mounted || reduce ? `${(s.min / night.totalMin) * 100}%` : '0%',
                    background: s.color,
                    transition: reduce ? 'none' : 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {night.stages.map(s => (
                  <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>
                    <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                    {s.label} <span style={NUM}>{fmtH(s.min)}</span>
                  </span>
                ))}
              </div>
            </>
          )}

          {night.awakeMin > 0 && (
            <p style={{ margin: 'var(--space-3) 0 0', ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>
              Éveils · {fmtH(night.awakeMin)}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
