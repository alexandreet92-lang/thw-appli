'use client'
// Upload d'un média de vitrine coach (photo ou vidéo) via la route serveur gatée.
export async function uploadCoachMedia(file: File): Promise<{ url: string; kind: 'image' | 'video' }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/coach/media/upload', { method: 'POST', body: fd })
  const json = await res.json() as { url?: string; kind?: 'image' | 'video'; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload impossible.')
  return { url: json.url, kind: json.kind ?? 'image' }
}
