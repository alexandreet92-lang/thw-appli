'use client'

// ══════════════════════════════════════════════════════════════
// Pills des compétences actives, affichées au-dessus du champ de
// saisie du Coach Training. Clic → page /competences.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

interface ActiveComp { id: string; nom: string }

interface Row {
  competence_id: string
  competences: { nom: string } | { nom: string }[] | null
}

export default function ActiveCompetencesBadge() {
  const router = useRouter()
  const [items, setItems] = useState<ActiveComp[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('user_competences')
          .select('competence_id, competences ( nom )')
          .eq('user_id', user.id)
          .eq('active', true)
        if (!alive || !data) return
        const mapped: ActiveComp[] = (data as Row[])
          .map(r => {
            const c = Array.isArray(r.competences) ? r.competences[0] : r.competences
            return c ? { id: r.competence_id, nom: c.nom } : null
          })
          .filter((x): x is ActiveComp => x !== null)
        setItems(mapped)
      } catch { /* silencieux : ne bloque rien */ }
    })()
    return () => { alive = false }
  }, [])

  if (items.length === 0) return null

  const shown = items.slice(0, 3)
  const extra = items.length - shown.length

  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: 'rgba(6,182,212,0.12)', color: '#06B6D4',
    border: '1px solid rgba(6,182,212,0.3)', cursor: 'pointer', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
      <Sparkles size={13} style={{ color: '#06B6D4', opacity: 0.8 }} />
      {shown.map(c => (
        <button key={c.id} type="button" style={pill} onClick={() => router.push('/competences')} title={`Compétence active : ${c.nom}`}>
          {c.nom}
        </button>
      ))}
      {extra > 0 && (
        <button type="button" style={{ ...pill, background: 'transparent', color: 'var(--text-dim)', borderColor: 'var(--border)' }} onClick={() => router.push('/competences')}>
          +{extra} autre{extra > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
