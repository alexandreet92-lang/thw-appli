'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SnappedPoint } from '@/lib/openrouteservice'

interface Route {
  id: string; name: string; sport: string; is_public: boolean
  distance_m: number | null; elevation_gain_m: number | null
  surfaces: { type: string; percent: number }[] | null
  snapped_points: SnappedPoint[] | null; waypoints: { lat: number; lng: number }[]
  created_at: string
}

interface Props {
  onClose: () => void
  onUseRoute: (pts: { lat: number; lng: number }[]) => void
  isDark: boolean
}

const SPORT_LABELS: Record<string, string> = { cycling: 'Vélo', mtb: 'VTT', trail: 'Trail', hiking: 'Randonnée' }
const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''

function staticMapUrl(route: Route): string {
  const pts = route.snapped_points ?? route.waypoints
  if (!pts.length) return ''
  const mid = pts[Math.floor(pts.length / 2)]
  return `https://api.maptiler.com/maps/outdoor-v2/static/${mid.lng.toFixed(4)},${mid.lat.toFixed(4)},12/100x70.png?key=${KEY}`
}

export default function RouteLibrary({ onClose, onUseRoute, isDark }: Props) {
  const [routes, setRoutes] = useState<Route[]>([])
  const [showPublic, setShowPublic] = useState(false)
  const bg = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const q = supabase.from('routes').select('*').order('created_at', { ascending: false })
      const { data } = await (showPublic ? q.eq('is_public', true) : q.eq('user_id', user.id))
      setRoutes((data ?? []) as Route[])
    }
    load()
  }, [showPublic])

  const handleDelete = async (id: string) => {
    await createClient().from('routes').delete().eq('id', id)
    setRoutes(r => r.filter(x => x.id !== id))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${separator}`, gap: 12 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: surface, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <p style={{ flex: 1, fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'Syne, sans-serif' }}>Parcours</p>
        <div style={{ display: 'flex', background: surface, borderRadius: 10, padding: 3, gap: 2 }}>
          {['Mes parcours', 'Publics'].map((label, i) => (
            <button key={i} onClick={() => setShowPublic(i === 1)}
              style={{ padding: '5px 12px', borderRadius: 8, background: showPublic === (i === 1) ? '#06B6D4' : 'transparent', border: 'none', color: showPublic === (i === 1) ? '#fff' : dim, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {routes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: dim }}>
            <p style={{ fontSize: 14 }}>Aucun parcours{showPublic ? ' public' : ''}</p>
          </div>
        )}
        {routes.map(route => (
          <div key={route.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: 12 }}>
              {staticMapUrl(route) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={staticMapUrl(route)} alt="" width={100} height={70} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 100, height: 70, borderRadius: 10, background: separator, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 20l5-12 5 8 3-4 5 8H3z" stroke={dim} strokeWidth="1.5" strokeLinejoin="round"/></svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name}</p>
                <p style={{ fontSize: 12, color: dim, margin: '0 0 6px' }}>{SPORT_LABELS[route.sport] ?? route.sport} · {new Date(route.created_at).toLocaleDateString('fr-FR')}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {route.distance_m != null && <span style={{ fontSize: 12, color: dim }}>{(route.distance_m / 1000).toFixed(1)}km</span>}
                  {route.elevation_gain_m != null && <span style={{ fontSize: 12, color: dim }}>D+ {Math.round(route.elevation_gain_m)}m</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${separator}` }}>
              <button onClick={() => onUseRoute((route.snapped_points ?? route.waypoints).map(p => ({ lat: p.lat, lng: p.lng })))}
                style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: '#06B6D4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Utiliser</button>
              <button onClick={() => handleDelete(route.id)}
                style={{ padding: '10px 16px', background: 'none', border: 'none', borderLeft: `1px solid ${separator}`, color: dim, fontSize: 13, cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
