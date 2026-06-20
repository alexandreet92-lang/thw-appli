'use client'
// Fueling autour de la séance : reco AUTO (avant / pendant / après) calculée depuis
// la durée + l'intensité + le poids, et LOG de ce qui a été réellement pris pendant
// (glucides g + hydratation L), persisté dans planned_sessions.nutrition_data.
// Données partagées avec le Planning (même colonne) → les deux vues sont reliées.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlannedSession } from '@/hooks/usePlanning'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

interface FuelLog { carbsG: number; hydrationL: number }
interface Reco {
  avant: string
  pendantPerH: string
  pendantTotalG: number | null
  hydrationL: number
  apres: string
}

// Reco basée sur les repères de nutrition sportive (durée → glucides/h).
function computeReco(s: PlannedSession, weightKg: number | null): Reco {
  const h = (s.duration_min ?? 0) / 60
  const hard = /hard|compet|vo2|seuil|intense/i.test(s.intensity ?? '')
  // Glucides/h pendant l'effort
  let lo = 0, hi = 0
  if (h >= 2.5) { lo = 60; hi = 90 }
  else if (h >= 1) { lo = 30; hi = 60 }
  else if (hard) { lo = 0; hi = 30 }
  const pendantPerH = hi === 0 ? 'Eau — glucides non nécessaires (< 1 h)' : `${lo}–${hi} g de glucides / h`
  const pendantTotalG = hi === 0 ? null : Math.round(((lo + hi) / 2) * h)
  const hydrationL = Math.round(0.5 * h * 10) / 10
  // Avant / après calés sur le poids si dispo
  const avant = weightKg
    ? `${Math.round(1 * weightKg)}–${Math.round(2 * weightKg)} g de glucides, 1–3 h avant`
    : 'Repas riche en glucides 1–3 h avant'
  const apres = weightKg
    ? `${Math.round(1 * weightKg)} g glucides + ${Math.round(0.3 * weightKg)} g protéines dans l'heure`
    : 'Glucides + protéines dans l\'heure qui suit'
  return { avant, pendantPerH, pendantTotalG, hydrationL, apres }
}

function Phase({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', width: 64, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function FuelingCard({ session, weightKg }: { session: PlannedSession; weightKg: number | null }) {
  const supabase = createClient()
  const reco = computeReco(session, weightKg)
  const [log, setLog] = useState<FuelLog>({ carbsG: 0, hydrationL: 0 })

  useEffect(() => {
    let cancel = false
    supabase.from('planned_sessions').select('nutrition_data').eq('id', session.id).maybeSingle()
      .then(({ data }) => {
        if (cancel) return
        const nd = (data?.nutrition_data ?? null) as { fueling?: FuelLog } | null
        if (nd?.fueling) setLog({ carbsG: nd.fueling.carbsG ?? 0, hydrationL: nd.fueling.hydrationL ?? 0 })
      })
    return () => { cancel = true }
  }, [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: FuelLog) {
    setLog(next)
    const { data } = await supabase.from('planned_sessions').select('nutrition_data').eq('id', session.id).maybeSingle()
    const nd = (data?.nutrition_data ?? {}) as Record<string, unknown>
    await supabase.from('planned_sessions').update({ nutrition_data: { ...nd, fueling: next } }).eq('id', session.id)
  }

  const fmtL = (n: number) => n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
  const carbPct = reco.pendantTotalG && reco.pendantTotalG > 0 ? Math.min(log.carbsG / reco.pendantTotalG, 1) : 0

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span title={session.title} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{session.title}</span>
        <span className="tnum" style={{ flexShrink: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>
          {session.duration_min} min{session.intensity ? ` · ${session.intensity}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Phase label="Avant">{reco.avant}</Phase>
        <Phase label="Pendant">
          {reco.pendantPerH}{reco.pendantTotalG ? <> · <strong style={{ color: 'var(--text)' }}>~{reco.pendantTotalG} g</strong> au total</> : null}
          {reco.hydrationL > 0 && <> · hydratation ~{fmtL(reco.hydrationL)} L</>}
        </Phase>
        <Phase label="Après">{reco.apres}</Phase>
      </div>

      {/* Log de ce qui a été réellement pris pendant */}
      <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>Pris pendant</span>
          <span className="tnum" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {log.carbsG} g{reco.pendantTotalG ? ` / ${reco.pendantTotalG} g` : ''} · {fmtL(log.hydrationL)} L
          </span>
        </div>
        {reco.pendantTotalG ? (
          <svg width="100%" height={6} style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            <rect x={0} y={0} width="100%" height={6} rx={3} fill="var(--border)" />
            <rect x={0} y={0} width={`${carbPct * 100}%`} height={6} rx={3} fill="var(--macro-gluc)" style={{ transition: 'width 0.4s ease' }} />
          </svg>
        ) : null}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button onClick={() => void persist({ ...log, carbsG: log.carbsG + 15 })} style={chip}>+15 g glucides</button>
          <button onClick={() => void persist({ ...log, carbsG: log.carbsG + 30 })} style={chip}>+30 g glucides</button>
          <button onClick={() => void persist({ ...log, hydrationL: Math.round((log.hydrationL + 0.25) * 100) / 100 })} style={chip}>+25 cl</button>
          {(log.carbsG > 0 || log.hydrationL > 0) && (
            <button onClick={() => void persist({ carbsG: 0, hydrationL: 0 })} style={{ ...chip, color: 'var(--text-dim)', marginLeft: 'auto' }}>Réinitialiser</button>
          )}
        </div>
      </div>
    </div>
  )
}

const chip: React.CSSProperties = {
  height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border)',
  background: 'var(--bg-elev)', color: 'var(--text)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

export function SessionFueling({ sessions, weightKg }: { sessions: PlannedSession[]; weightKg: number | null }) {
  if (!sessions.length) {
    return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Jour de repos — pas de séance à caler aujourd&apos;hui.</p>
  }
  return (
    <>
      {sessions.map(s => <FuelingCard key={s.id} session={s} weightKg={weightKg} />)}
      <a href="/planning" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Voir la séance dans le planning →</a>
    </>
  )
}
