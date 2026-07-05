'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityMedia — photos & vidéos uploadées sur une activité (façon Strava).
// Upload vers le bucket Supabase `activity-media` (dossier user/activité),
// persistance dans activities.media (jsonb), lecture publique, suppression
// par le propriétaire. Affichage en grille + visionneuse plein écran.
// ══════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconPlus, IconX, IconPhoto, IconTrash, IconPlayerPlayFilled, IconLoader2 } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

export interface MediaItem { url: string; type: 'image' | 'video'; path: string }

export function ActivityMedia({ activityId, initialMedia, initialComment }: { activityId: string; initialMedia?: MediaItem[] | null; initialComment?: string | null }) {
  const { t } = useI18n()
  const [media, setMedia] = useState<MediaItem[]>(Array.isArray(initialMedia) ? initialMedia : [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [comment, setComment] = useState<string>(initialComment ?? '')
  const savedComment = useRef<string>(initialComment ?? '')

  async function saveComment() {
    const v = comment.trim()
    if (v === savedComment.current) return
    savedComment.current = v
    try { await createClient().from('activities').update({ comment: v || null }).eq('id', activityId) }
    catch (e) { console.error('[ActivityMedia] comment', e) }
  }

  async function persist(next: MediaItem[]) {
    const sb = createClient()
    const { error: e } = await sb.from('activities').update({ media: next }).eq('id', activityId)
    if (e) throw e
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true); setError(null)
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
      await persist(next)
      setMedia(next)
    } catch (e) {
      console.error('[ActivityMedia] upload', e)
      setError(t('lo.uploadFailed'))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(idx: number) {
    const item = media[idx]; if (!item) return
    const next = media.filter((_, i) => i !== idx)
    setMedia(next); setViewer(null)
    try {
      const sb = createClient()
      await sb.storage.from('activity-media').remove([item.path])
      await persist(next)
    } catch (e) { console.error('[ActivityMedia] delete', e) }
  }

  const tile: React.CSSProperties = { position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card2)', cursor: 'pointer', border: '1px solid var(--border)' }

  return (
    <div style={{ marginTop: 4 }}>
      {/* Commentaire de l'athlète */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 8 }}>Commentaire</span>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={saveComment}
          placeholder="Ajoute un commentaire sur ta séance…"
          rows={2}
          style={{ width: '100%', resize: 'vertical', minHeight: 44, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, lineHeight: 1.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>{t('lo.photosVideos')}</span>
        <button onClick={() => inputRef.current?.click()} disabled={busy} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
        }}>
          {busy ? <IconLoader2 size={15} className="thw-spin" /> : <IconPlus size={15} />}
          {busy ? t('lo.sending') : t('lo.add')}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={e => onFiles(e.target.files)} />
      <style>{'@keyframes thwSpin{to{transform:rotate(360deg)}}.thw-spin{animation:thwSpin .8s linear infinite}'}</style>

      {error && <div style={{ fontSize: 12, color: 'var(--danger, #ef4444)', marginBottom: 8 }}>{error}</div>}

      {media.length === 0 ? (
        <button onClick={() => inputRef.current?.click()} disabled={busy} style={{
          width: '100%', padding: '22px 16px', borderRadius: 14, border: '1.5px dashed var(--border)', background: 'transparent',
          color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <IconPhoto size={26} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('lo.addMediaHint')}</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {media.map((m, i) => (
            <div key={m.path} style={tile} onClick={() => setViewer(i)}>
              {m.type === 'video'
                ? <><video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline preload="metadata" />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}><IconPlayerPlayFilled size={26} color="#fff" /></span></>
                : <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
          <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ ...tile, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', background: 'var(--bg-card2)' }}>
            {busy ? <IconLoader2 size={22} className="thw-spin" /> : <IconPlus size={24} />}
          </button>
        </div>
      )}

      {viewer != null && media[viewer] && createPortal(
        <div onClick={() => setViewer(null)} style={{ position: 'fixed', inset: 0, zIndex: 14000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={e => { e.stopPropagation(); setViewer(null) }} aria-label={t('lo.close')} style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={20} color="#fff" /></button>
          <button onClick={e => { e.stopPropagation(); remove(viewer) }} aria-label={t('lo.delete')} style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTrash size={19} color="#fff" /></button>
          {media[viewer].type === 'video'
            ? <video src={media[viewer].url} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '86vh' }} onClick={e => e.stopPropagation()} />
            : <img src={media[viewer].url} alt="" style={{ maxWidth: '100%', maxHeight: '86vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />}
        </div>,
        document.body,
      )}
    </div>
  )
}
