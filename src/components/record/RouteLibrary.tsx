'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SnappedPoint } from '@/lib/openrouteservice'

interface Route {
  id: string; name: string; sport: string; is_public: boolean
  distance_m: number | null; elevation_gain_m: number | null
  surfaces: { type: string; percent: number }[] | null
  snapped_points: SnappedPoint[] | null; waypoints: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[] | null
  created_at: string
}

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: { lat: number; lng: number }[]
  sport?: string
}

interface Props {
  onClose: () => void
  onUseRoute: (route: ActiveRoute) => void
  onCreate: () => void
  isDark: boolean
}

const SPORT_LABELS: Record<string, string> = { cycling: 'Vélo', mtb: 'VTT', trail: 'Trail', hiking: 'Randonnée' }

// Vignette du parcours en SVG raw (aucune clé/API externe) : tracé normalisé
// dans une box 100×70, ratio géographique respecté (longitude corrigée par
// cos(lat)), nord en haut. Façon Strava — chaque carte montre son tracé.
function RouteThumbnail({ route, accent, fallbackBg, fallbackStroke }: {
  route: Route; accent: string; fallbackBg: string; fallbackStroke: string
}) {
  const W = 100, H = 70, PAD = 9
  const pts = route.snapped_points ?? route.waypoints ?? []

  if (pts.length < 2) {
    return (
      <div style={{ width: W, height: H, borderRadius: 10, background: fallbackBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 20l5-12 5 8 3-4 5 8H3z" stroke={fallbackStroke} strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
    )
  }

  const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos(midLat * Math.PI / 180) || 1
  const geoW = (maxLng - minLng) * kx || 1e-6
  const geoH = (maxLat - minLat) || 1e-6
  const scale = Math.min((W - 2 * PAD) / geoW, (H - 2 * PAD) / geoH)
  const drawW = geoW * scale, drawH = geoH * scale
  const offX = (W - drawW) / 2, offY = (H - drawH) / 2
  const path = pts.map(p => {
    const x = offX + (p.lng - minLng) * kx * scale
    const y = offY + (maxLat - p.lat) * scale
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 10, flexShrink: 0, background: fallbackBg, display: 'block' }}>
      <polyline points={path} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function RouteLibrary({ onClose, onUseRoute, onCreate, isDark }: Props) {
  const [routes, setRoutes] = useState<Route[]>([])
  const [showPublic, setShowPublic] = useState(false)
  const [search, setSearch] = useState('')
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

  const filtered = routes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* En-tête : Annuler · titre centré · crayon (créer) */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${separator}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#06B6D4', fontSize: 16, fontWeight: 500, cursor: 'pointer', padding: 0, zIndex: 1 }}>Annuler</button>
        <p style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'var(--font-display)', pointerEvents: 'none' }}>Itinéraires</p>
        <button onClick={onCreate} aria-label="Créer un parcours" style={{ background: 'none', border: 'none', color: text, cursor: 'pointer', padding: 0, zIndex: 1, display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
      </div>

      {/* Recherche + bascule Mes / Publics */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dim} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher par mot-clé" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }} />
        </div>
        <div style={{ display: 'flex', background: surface, borderRadius: 10, padding: 3, gap: 2, alignSelf: 'flex-start' }}>
          {['Mes parcours', 'Publics'].map((label, i) => (
            <button key={i} onClick={() => setShowPublic(i === 1)}
              style={{ padding: '6px 14px', borderRadius: 8, background: showPublic === (i === 1) ? '#06B6D4' : 'transparent', border: 'none', color: showPublic === (i === 1) ? '#fff' : dim, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: dim }}>
            <p style={{ fontSize: 14 }}>Aucun parcours{showPublic ? ' public' : ''}{search ? ' trouvé' : ''}</p>
          </div>
        )}
        {filtered.map(route => (
          <div key={route.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: 12 }}>
              <RouteThumbnail route={route} accent="#06B6D4" fallbackBg={separator} fallbackStroke={dim} />
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
              <button onClick={() => onUseRoute({ snapped_points: (route.snapped_points ?? route.waypoints).map(p => ({ lat: p.lat, lng: p.lng })), elevation_profile: route.elevation_profile ?? [], waypoints: route.waypoints?.map(p => ({ lat: p.lat, lng: p.lng })), sport: route.sport })}
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
