'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ZoneSport = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox_row' | 'hyrox_ski'

export interface ZoneData {
  id?:             string
  sport:           ZoneSport
  ftp_watts?:      number | null
  sl1:             string
  sl2:             string
  run_compromised?: string
  z1_value:        string
  z2_value:        string
  z3_value:        string
  z4_value:        string
  z5_value:        string
}

export function useTrainingZones() {
  const [zones,   setZones]   = useState<Record<ZoneSport, ZoneData>>({
    bike:      { sport:'bike',      sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'', ftp_watts: null },
    run:       { sport:'run',       sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'' },
    swim:      { sport:'swim',      sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'' },
    rowing:    { sport:'rowing',    sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'' },
    hyrox_row: { sport:'hyrox_row', sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'' },
    hyrox_ski: { sport:'hyrox_ski', sl1:'', sl2:'', z1_value:'', z2_value:'', z3_value:'', z4_value:'', z5_value:'', run_compromised:'' },
  })
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('training_zones')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)

    if (data && data.length > 0) {
      const updated = { ...zones }
      for (const row of data) {
        const sport = row.sport as ZoneSport
        updated[sport] = {
          id:              row.id,
          sport,
          ftp_watts:       row.ftp_watts,
          sl1:             row.sl1 ?? '',
          sl2:             row.sl2 ?? '',
          run_compromised: row.run_compromised ?? '',
          z1_value:        row.z1_value ?? '',
          z2_value:        row.z2_value ?? '',
          z3_value:        row.z3_value ?? '',
          z4_value:        row.z4_value ?? '',
          z5_value:        row.z5_value ?? '',
        }
      }
      setZones(updated)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (sport: ZoneSport, data: ZoneData) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('training_zones').upsert({
      user_id:         user.id,
      sport,
      ftp_watts:       data.ftp_watts ?? null,
      sl1:             data.sl1 || null,
      sl2:             data.sl2 || null,
      run_compromised: data.run_compromised || null,
      z1_value:        data.z1_value || null,
      z2_value:        data.z2_value || null,
      z3_value:        data.z3_value || null,
      z4_value:        data.z4_value || null,
      z5_value:        data.z5_value || null,
      is_current:      true,
      effective_from:  new Date().toISOString().split('T')[0],
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id,sport,effective_from' })

    setZones(prev => ({ ...prev, [sport]: data }))
    setSaving(false)
  }, [])

  return { zones, loading, saving, save, reload: load }
}
