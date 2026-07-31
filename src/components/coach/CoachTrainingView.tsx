'use client'
// ══════════════════════════════════════════════════════════════
// Vue Training de l'athlète (drawer coach). La page « activités » athlète est un
// monolithe câblé sur RLS sans user_id → inembarquable en scope coach (fuite).
// On sert donc une vue Training dédiée, câblée sur l'athlète : charge (CTL/ATL/
// TSB via useTrainingLoad scoped) + journal des séances (getActivities).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useTrainingLoad } from '@/hooks/useTrainingLoad'
import { getActivities, type ActivityRow } from '@/lib/coach/athlete-data'

const SPORT_LABEL: Record<string, string> = { run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation', hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron', triathlon: 'Triathlon' }
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s
const sportLabel = (s: string | null) => s ? (SPORT_LABEL[s] ?? cap(s)) : 'Séance'
const fmtDate = (d: string | null) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '—' } }
const fmtDur = (s: number | null) => s ? `${Math.round(s / 60)} min` : ''
const fmtKm = (m: number | null) => m ? `${(m / 1000).toFixed(1)} km` : ''

const num: React.CSSProperties = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }
const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16 }
const secLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 12px' }

function tsbColor(v: number) { return v <= -20 ? '#ef4444' : v < -5 ? '#f59e0b' : v > 12 ? '#3b92d4' : 'var(--text)' }

export function CoachTrainingView({ athleteId }: { athleteId: string }) {
  // useTrainingLoad lit le scope planning (défini par le drawer avant le rendu).
  const load = useTrainingLoad(90)
  const [acts, setActs] = useState<ActivityRow[] | null>(null)

  useEffect(() => { let c = false; void getActivities(athleteId, 60).then(a => { if (!c) setActs(a) }); return () => { c = true } }, [athleteId])

  const tss7 = (acts ?? []).filter(a => a.started_at && (Date.now() - new Date(a.started_at).getTime()) < 7 * 86400000).reduce((s, a) => s + (a.tss ?? 0), 0)
  const tss28 = (acts ?? []).filter(a => a.started_at && (Date.now() - new Date(a.started_at).getTime()) < 28 * 86400000).reduce((s, a) => s + (a.tss ?? 0), 0)

  const tile = (value: React.ReactNode, label: string, accent = 'var(--text)') => (
    <div style={{ ...card, flex: 1, minWidth: 120, padding: 14 }}>
      <div style={{ ...num, fontSize: 24, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ padding: '20px clamp(16px,4vw,40px) 60px', fontFamily: 'var(--font-body)', maxWidth: 860, margin: '0 auto' }}>
      {/* Charge d'entraînement */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {tile(load.loading ? '…' : Math.round(load.CTL_SM), 'Forme (CTL)', 'var(--primary)')}
        {tile(load.loading ? '…' : Math.round(load.ATL_SM), 'Fatigue (ATL)', '#f59e0b')}
        {tile(load.loading ? '…' : Math.round(load.TSB_SM), 'Fraîcheur (TSB)', tsbColor(load.TSB_SM))}
        {tile(Math.round(tss7), 'TSS · 7 j')}
        {tile(Math.round(tss28), 'TSS · 28 j')}
      </div>

      {load.verdict && (
        <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: tsbColor(load.TSB_SM), flexShrink: 0 }} />
          <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{load.verdict.label}</div>
        </div>
      )}

      {/* Journal des séances */}
      <div style={card}>
        <div style={secLabel}>Séances récentes</div>
        {acts === null ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</div>
        ) : acts.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune activité sur 60 jours.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {acts.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ ...num, color: 'var(--text-dim)', width: 54, flexShrink: 0, fontSize: 12.5 }}>{fmtDate(a.started_at)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title || sportLabel(a.sport_type)}
                    {a.is_race && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: '#ef4444', border: '1px solid #ef4444', borderRadius: 5, padding: '1px 5px' }}>COURSE</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{sportLabel(a.sport_type)}</div>
                </div>
                <div style={{ ...num, textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{[fmtDur(a.moving_time_s), fmtKm(a.distance_m)].filter(Boolean).join(' · ') || '—'}</div>
                  {a.tss != null && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{Math.round(a.tss)} TSS</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
