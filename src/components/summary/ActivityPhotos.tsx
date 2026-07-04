'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import PhotoViewer from './PhotoViewer'

interface Photo { id: string; url: string; taken_at: string }

interface Props { sessionId: string }

export default function ActivityPhotos({ sessionId }: Props) {
  const { t } = useI18n()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.from('activity_photos')
      .select('id, url, taken_at')
      .eq('session_id', sessionId)
      .order('taken_at', { ascending: true })
      .then(({ data }) => { if (data) setPhotos(data) })
  }, [sessionId])

  if (photos.length === 0) return null

  const cols = photos.length === 1 ? 1 : photos.length === 2 ? 2 : 3

  return (
    <>
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', margin: '0 0 10px', fontFamily: 'DM Sans, sans-serif' }}>
          {t('shared.photos')} · {photos.length}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setViewerIdx(i)}
              style={{ padding: 0, border: 'none', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'rgba(255,255,255,0.06)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      </div>

      {viewerIdx !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIdx}
          onClose={() => setViewerIdx(null)}
        />
      )}
    </>
  )
}
