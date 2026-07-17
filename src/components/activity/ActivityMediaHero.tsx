'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityMediaHero — média d'une activité façon Strava.
//  • variant "overlay" (activité avec carte GPS) : la carte occupe le héros ;
//    la 1re photo est une vignette encadrée en bas à gauche. Au clic, la PHOTO
//    passe en grand (galerie défilable) et la CARTE devient la vignette (mini
//    tracé SVG). Re-clic → on revient à la carte.
//  • variant "inline" (activité sans carte) : galerie défilable directement.
// Upload → bucket activity-media, persistance dans activities.media (jsonb).
// ══════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import { IconPlus, IconTrash, IconPlayerPlayFilled, IconLoader2 } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import type { MediaItem } from './ActivityMedia'

interface LatLng { lat: number; lng: number }
interface Props {
  activityId: string
  initialMedia?: MediaItem[] | null
  points?: LatLng[] | null
  bottomInset?: number
  variant: 'overlay' | 'inline'
}

// Tracé GPS normalisé dans une boîte w×h (y inversé : nord en haut).
function routePath(points: LatLng[], w: number, h: number, pad = 6): string {
  const lats = points.map(p => p.lat), lngs = points.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const spanLat = (maxLat - minLat) || 1, spanLng = (maxLng - minLng) || 1
  const iw = w - 2 * pad, ih = h - 2 * pad
  return points.map((p, i) => {
    const x = pad + ((p.lng - minLng) / spanLng) * iw
    const y = pad + (1 - (p.lat - minLat) / spanLat) * ih
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function MiniMap({ points, size }: { points: LatLng[]; size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', background: 'var(--bg-card2)' }}>
      <path d={routePath(points, size, size)} fill="none" stroke="#f97316" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ActivityMediaHero({ activityId, initialMedia, points, bottomInset = 0, variant }: Props) {
  const [media, setMedia] = useState<MediaItem[]>(Array.isArray(initialMedia) ? initialMedia : [])
  const [mode, setMode] = useState<'map' | 'photo'>('map')   // overlay : quel média occupe le héros
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasMap = !!(points && points.length >= 2)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non connecté')
      const added: MediaItem[] = []
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video')
        const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase()
        const rand = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e6)}`
        const path = `${user.id}/${activityId}/${rand}.${ext}`
        const { error: upErr } = await sb.storage.from('activity-media').upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw upErr
        const { data: pub } = sb.storage.from('activity-media').getPublicUrl(path)
        added.push({ url: pub.publicUrl, type: isVideo ? 'video' : 'image', path })
      }
      const next = [...media, ...added]
      await sb.from('activities').update({ media: next }).eq('id', activityId)
      setMedia(next)
      setMode('photo')
    } catch (e) { console.error('[ActivityMediaHero] upload', e) }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }

  async function remove(idx: number) {
    const item = media[idx]; if (!item) return
    const next = media.filter((_, i) => i !== idx)
    setMedia(next)
    if (next.length === 0) setMode('map')
    try { const sb = createClient(); await sb.storage.from('activity-media').remove([item.path]); await sb.from('activities').update({ media: next }).eq('id', activityId) }
    catch (e) { console.error('[ActivityMediaHero] delete', e) }
  }

  const fileInput = <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={e => onFiles(e.target.files)} />
  const addBtnStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)',
  }

  // Galerie défilable (photos + vidéos) — scroll horizontal snap. Fonction (pas
  // sous-composant) pour éviter tout remontage au re-render du parent.
  const renderGallery = (height: number | string, radius: number) => (
    <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', height, borderRadius: radius, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      {media.map((m, i) => (
        <div key={m.path} style={{ position: 'relative', flex: '0 0 100%', scrollSnapAlign: 'center', height: '100%', background: '#000' }}>
          {m.type === 'video'
            ? <video src={m.url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <button onClick={() => remove(i)} aria-label="Supprimer" style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}><IconTrash size={16} /></button>
        </div>
      ))}
    </div>
  )

  // ── INLINE (pas de carte) : carte média dans le corps de la feuille ──
  if (variant === 'inline') {
    return (
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        {fileInput}
        {media.length === 0 ? (
          <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ width: '100%', padding: '22px 16px', borderRadius: 16, border: '1.5px dashed var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {busy ? <IconLoader2 size={24} className="thw-spin" /> : <IconPlus size={24} />}
            <span style={{ fontSize: 13, fontWeight: 600 }}>Ajouter une photo / vidéo</span>
          </button>
        ) : (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {renderGallery(220, 16)}
            <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ ...addBtnStyle, position: 'absolute', bottom: 10, right: 10 }}>{busy ? <IconLoader2 size={18} className="thw-spin" /> : <IconPlus size={20} />}</button>
          </div>
        )}
        <style>{'@keyframes thwSpin{to{transform:rotate(360deg)}}.thw-spin{animation:thwSpin .8s linear infinite}'}</style>
      </div>
    )
  }

  // ── OVERLAY (avec carte) ──
  const insetSize = 66
  const showPhoto = mode === 'photo' && media.length > 0
  return (
    <>
      {fileInput}
      {/* Grande photo par-dessus la carte (zone visible du héros, au-dessus de la feuille) */}
      {showPhoto && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: bottomInset, zIndex: 1, background: '#000' }}>
          {renderGallery("100%", 0)}
        </div>
      )}
      {/* Vignette encadrée (bas gauche, au-dessus de la feuille) */}
      {media.length > 0 && (
        <button onClick={() => setMode(showPhoto ? 'map' : 'photo')} aria-label="Inverser carte / photo" style={{
          position: 'absolute', left: 12, bottom: bottomInset + 16, zIndex: 11,
          width: insetSize, height: insetSize, borderRadius: 14, overflow: 'hidden', padding: 0, cursor: 'pointer',
          border: '2px solid #fff', boxShadow: '0 3px 12px rgba(0,0,0,0.35)', background: 'var(--bg-card2)',
        }}>
          {showPhoto
            ? (hasMap ? <MiniMap points={points!} size={insetSize} /> : null)
            : (media[0].type === 'video'
                ? <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}><video src={media[0].url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}><IconPlayerPlayFilled size={20} color="#fff" /></span></span>
                : <img src={media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
        </button>
      )}
      {/* Bouton ajouter (à droite de la vignette, ou seul si aucune photo) */}
      <button onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Ajouter une photo" style={{
        ...addBtnStyle, position: 'absolute', zIndex: 11,
        left: media.length > 0 ? 12 + insetSize + 8 : 12, bottom: bottomInset + 16 + (media.length > 0 ? (insetSize - 40) / 2 : 0),
      }}>{busy ? <IconLoader2 size={18} className="thw-spin" /> : <IconPlus size={20} />}</button>
      <style>{'@keyframes thwSpin{to{transform:rotate(360deg)}}.thw-spin{animation:thwSpin .8s linear infinite}'}</style>
    </>
  )
}
