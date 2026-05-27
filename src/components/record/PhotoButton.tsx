'use client'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/imageCompression'

export interface PhotoButtonHandle {
  flushToSession: (sessionId: string, lat?: number, lng?: number) => Promise<void>
}

interface Props {
  onPreview: (url: string) => void
  currentLat?: number
  currentLng?: number
}

const PhotoButton = forwardRef<PhotoButtonHandle, Props>(function PhotoButton({ onPreview, currentLat, currentLng }, ref) {
  const pendingFiles = useRef<Array<{ file: File; lat?: number; lng?: number; takenAt: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useImperativeHandle(ref, () => ({
    async flushToSession(sessionId: string, lat?: number, lng?: number) {
      if (pendingFiles.current.length === 0) return
      setUploading(true)
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setUploading(false); return }

      for (const { file, lat: fLat, lng: fLng, takenAt } of pendingFiles.current) {
        try {
          const blob = await compressImage(file)
          const ext = 'jpg'
          const path = `${user.id}/${sessionId}/${Date.now()}.${ext}`
          const { error: upErr } = await sb.storage.from('activity-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
          if (upErr) { console.error('[photo] upload error:', upErr); continue }
          const { data: { publicUrl } } = sb.storage.from('activity-photos').getPublicUrl(path)
          await sb.from('activity_photos').insert({
            session_id: sessionId,
            user_id: user.id,
            url: publicUrl,
            taken_at: takenAt,
            lat: fLat ?? lat,
            lng: fLng ?? lng,
          })
        } catch (e) {
          console.error('[photo] flush error:', e)
        }
      }
      pendingFiles.current = []
      setUploading(false)
    }
  }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const takenAt = new Date().toISOString()
    pendingFiles.current.push({ file, lat: currentLat, lng: currentLng, takenAt })
    const previewUrl = URL.createObjectURL(file)
    onPreview(previewUrl)
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
        title="Prendre une photo"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    </>
  )
})

export default PhotoButton
