'use client'
// Autour de la séance : l'ATHLÈTE renseigne ce qu'il a mangé autour de chaque
// séance (aliments + quantités), via l'IA (décrire le repas) ou manuellement.
// Les aliments + macros sont persistés dans planned_sessions.nutrition_data.fueling
// (donnée partagée avec le Planning).

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlannedSession } from '@/hooks/usePlanning'
import { AiMealSheet } from './AiMealSheet'
import type { EditableFood } from './FoodEditSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function SessionCard({ session }: { session: PlannedSession }) {
  const supabase = createClient()
  const [foods, setFoods] = useState<EditableFood[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let cancel = false
    supabase.from('planned_sessions').select('nutrition_data').eq('id', session.id).maybeSingle()
      .then(({ data }) => {
        if (cancel) return
        const nd = (data?.nutrition_data ?? null) as { fueling?: { foods?: EditableFood[] } } | null
        if (nd?.fueling?.foods) setFoods(nd.fueling.foods)
      })
    return () => { cancel = true }
  }, [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: EditableFood[]) {
    setFoods(next)
    const { data } = await supabase.from('planned_sessions').select('nutrition_data').eq('id', session.id).maybeSingle()
    const nd = (data?.nutrition_data ?? {}) as Record<string, unknown>
    await supabase.from('planned_sessions').update({ nutrition_data: { ...nd, fueling: { foods: next } } }).eq('id', session.id)
  }

  const t = foods.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, gluc: a.gluc + f.gluc, lip: a.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span title={session.title} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{session.title}</span>
        <span className="tnum" style={{ flexShrink: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>
          {session.duration_min} min{session.intensity ? ` · ${session.intensity}` : ''}
        </span>
      </div>

      {foods.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <style>{`@keyframes thwFoodIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {foods.map((f, i) => (
              <div key={i} style={{ animation: 'thwFoodIn 0.28s ease both', display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 13, color: 'var(--text)' }}>{f.name}</span>
                <span className="tnum" style={{ flexShrink: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{f.kcal} kcal</span>
                <button onClick={() => void persist(foods.filter((_, j) => j !== i))} aria-label="Retirer" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>Total autour de la séance</span>
            <span className="tnum" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {Math.round(t.kcal)} kcal · P {Math.round(t.prot)} · G {Math.round(t.gluc)} · L {Math.round(t.lip)} g
            </span>
          </div>
        </>
      ) : (
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Renseigne ce que tu as mangé autour de cette séance.</p>
      )}

      <button onClick={() => setAdding(true)}
        style={{ marginTop: 'var(--space-3)', width: '100%', height: 38, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        + Ajouter ce que tu as mangé
      </button>

      {adding && (
        <AiMealSheet
          slotLabel={`Autour de ${session.title}`}
          onClose={() => setAdding(false)}
          onConfirm={f => { setAdding(false); void persist([...foods, f]) }}
        />
      )}
    </div>
  )
}

export function SessionFueling({ sessions }: { sessions: PlannedSession[] }) {
  if (!sessions.length) {
    return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Jour de repos — pas de séance à caler aujourd&apos;hui.</p>
  }
  return (
    <>
      {sessions.map(s => <SessionCard key={s.id} session={s} />)}
      <a href="/planning" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Voir la séance dans le planning →</a>
    </>
  )
}
