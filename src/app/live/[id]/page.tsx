'use client'
// ══════════════════════════════════════════════════════════════════════════
// Suivi en direct d'un proche : carte + position mise à jour en temps réel
// (Supabase Realtime). Accessible aux destinataires du partage (RLS). Le lien
// est envoyé en MP par l'athlète depuis l'écran Démarrer.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { LiveShareRow } from '@/lib/community/liveShare'

const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false })

export default function LiveTrackPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [row, setRow] = useState<LiveShareRow | null>(null)
  const [ownerName, setOwnerName] = useState<string>('')
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading')

  useEffect(() => {
    if (!id) return
    const sb = createClient()
    let alive = true
    void (async () => {
      const { data } = await sb.from('live_shares').select('*').eq('id', id).maybeSingle()
      if (!alive) return
      if (!data) { setState('denied'); return }
      const r = data as LiveShareRow
      setRow(r); setState('ok')
      try {
        const { data: p } = await sb.from('profiles').select('full_name, first_name').eq('id', r.owner_id).maybeSingle()
        const pr = p as { full_name?: string; first_name?: string } | null
        setOwnerName((pr?.full_name || pr?.first_name || 'Athlète').trim())
      } catch { /* ignore */ }
    })()
    // Temps réel : chaque update de la ligne rafraîchit la position.
    const ch = sb.channel(`live-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_shares', filter: `id=eq.${id}` },
        (payload) => { if (alive) setRow(payload.new as LiveShareRow) })
      .subscribe()
    return () => { alive = false; void sb.removeChannel(ch) }
  }, [id])

  const wrap: React.CSSProperties = { minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }

  if (state === 'loading') return <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>Chargement…</div>
  if (state === 'denied' || !row) return (
    <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Suivi indisponible</p>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5, maxWidth: 320 }}>Ce partage de position n&apos;existe pas ou ne t&apos;est pas destiné. Demande à ton proche de te renvoyer le lien.</p>
      </div>
    </div>
  )

  const fmtDur = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }

  return (
    <div style={wrap}>
      <div style={{ flexShrink: 0, padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.active ? '#22C55E' : 'var(--text-dim)', flexShrink: 0, boxShadow: row.active ? '0 0 0 4px rgba(34,197,94,0.2)' : 'none' }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display)' }}>{ownerName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 0' }}>{row.active ? 'En direct' : 'Sortie terminée'}</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {(row.distance_m ?? 0) > 0 && <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{((row.distance_m ?? 0) / 1000).toFixed(1)} km</p>}
          {(row.elapsed_s ?? 0) > 0 && <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 0' }}>{fmtDur(row.elapsed_s ?? 0)}</p>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {row.lat != null && row.lng != null
          ? <LiveMap lat={row.lat} lng={row.lng} active={row.active} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>En attente de la première position…</div>}
      </div>
    </div>
  )
}
