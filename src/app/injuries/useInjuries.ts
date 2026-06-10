'use client'
// Accès données Blessures. Aucun mock : si la table n'existe pas encore (migration
// non appliquée), `tableMissing` = true et la page affiche un état vide propre.
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Injury, InjuryLog, RehabExo, Impact } from './types'

type Row = Record<string, unknown>
const s = (v: unknown) => (v == null ? null : String(v))
const n = (v: unknown) => (v == null ? null : Number(v))

function mapInjury(x: Row): Injury {
  return {
    id: String(x.id), user_id: String(x.user_id),
    severity: x.severity as Injury['severity'], zone: String(x.zone),
    side: x.side as Injury['side'], structure: x.structure as Injury['structure'],
    precision: s(x.precision), intensity_rest: n(x.intensity_rest), intensity_effort: n(x.intensity_effort),
    onset_date: String(x.onset_date), mechanism: x.mechanism as Injury['mechanism'],
    activity: s(x.activity), evolution: x.evolution as Injury['evolution'],
    description: s(x.description), phase: (x.phase as Injury['phase']) ?? 'aigue',
    return_estimate_date: s(x.return_estimate_date), status: (x.status as Injury['status']) ?? 'active',
    resolved_date: s(x.resolved_date), practitioner: s(x.practitioner), next_appointment: s(x.next_appointment),
    rehab: (x.rehab as RehabExo[]) ?? [], impact: (x.impact as Impact) ?? { avoid: [], ok: [] },
    created_at: String(x.created_at ?? ''), updated_at: String(x.updated_at ?? ''),
  }
}
function mapLog(x: Row): InjuryLog {
  return {
    id: String(x.id), injury_id: String(x.injury_id), log_date: String(x.log_date),
    note: s(x.note), intensity_rest: n(x.intensity_rest), intensity_effort: n(x.intensity_effort),
  }
}

export type NewInjury = Omit<Injury, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export function useInjuries() {
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [logs, setLogs] = useState<InjuryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: inj, error } = await sb.from('injuries').select('*').eq('user_id', user.id).order('onset_date', { ascending: false })
    if (error) { setTableMissing(true); setInjuries([]); setLogs([]); setLoading(false); return }
    setTableMissing(false)
    const list = (inj ?? []) as Row[]
    setInjuries(list.map(mapInjury))
    const ids = list.map(i => String(i.id))
    if (ids.length) {
      const { data: lg } = await sb.from('injury_logs').select('*').in('injury_id', ids).order('log_date')
      setLogs(((lg ?? []) as Row[]).map(mapLog))
    } else setLogs([])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const add = useCallback(async (inj: NewInjury): Promise<string | null> => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data, error } = await sb.from('injuries').insert({ ...inj, user_id: user.id }).select('id').single()
    if (error || !data) return null
    await load()
    return String((data as Row).id)
  }, [load])

  const update = useCallback(async (id: string, patch: Partial<Injury>): Promise<void> => {
    const sb = createClient()
    await sb.from('injuries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }, [load])

  const resolve = useCallback((id: string) =>
    update(id, { status: 'resolved', phase: 'resolu', resolved_date: new Date().toISOString().slice(0, 10) }), [update])

  const addLog = useCallback(async (log: Omit<InjuryLog, 'id'>): Promise<void> => {
    const sb = createClient()
    await sb.from('injury_logs').insert(log)
    await load()
  }, [load])

  return { injuries, logs, loading, tableMissing, add, update, resolve, addLog, reload: load }
}
