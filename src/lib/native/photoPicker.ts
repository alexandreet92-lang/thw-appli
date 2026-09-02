'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sélecteur de photo NATIF (Capacitor Camera).
//
// Sur iOS, un <input type="file" accept="image/*"> ouvre une FEUILLE D'ACTIONS
// intermédiaire (Photothèque / Prendre une photo / Choisir un fichier). Pour
// ouvrir DIRECTEMENT la photothèque (ou l'appareil photo), on passe par le
// plugin @capacitor/camera.
//
// ⚠️ Info.plist (côté Xcode, non versionné dans ce repo) DOIT contenir :
//   • NSPhotoLibraryUsageDescription  (accès photothèque)
//   • NSCameraUsageDescription        (accès appareil photo)
// Sans ces clés, iOS TUE l'app au moment de l'accès. La fonction ci-dessous
// est protégée par try/catch, mais un crash natif « usage description
// manquante » ne peut PAS être rattrapé en JS → les clés sont obligatoires.
//
// En cas d'échec (plugin absent, permission refusée, web), on renvoie null :
// l'appelant retombe alors sur l'<input type="file"> classique.
// ══════════════════════════════════════════════════════════════════════════

import { isNativeApp } from '@/lib/native/platform'

export type PhotoSource = 'camera' | 'photos'

/**
 * Ouvre directement l'appareil photo ou la photothèque (natif uniquement) et
 * renvoie l'image choisie sous forme de File. Renvoie null si indisponible
 * (l'appelant doit alors utiliser le sélecteur <input type="file"> de secours).
 */
export async function pickNativePhoto(source: PhotoSource): Promise<File | null> {
  if (!isNativeApp()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      presentationStyle: 'popover',
    })
    const uri = photo.webPath || photo.path
    if (!uri) return null
    const res = await fetch(uri)
    const blob = await res.blob()
    const ext = (photo.format || 'jpeg').toLowerCase()
    const type = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return new File([blob], `photo.${ext}`, { type })
  } catch {
    // Permission refusée / annulation utilisateur / plugin absent → secours.
    return null
  }
}

/**
 * Ouvre la photothèque en SÉLECTION MULTIPLE (natif uniquement). Renvoie la liste
 * des images choisies (max `limit`). Renvoie null si indisponible → l'appelant
 * retombe sur l'<input type="file" multiple> de secours.
 */
export async function pickNativePhotos(limit = 10): Promise<File[] | null> {
  if (!isNativeApp()) return null
  try {
    const { Camera } = await import('@capacitor/camera')
    const result = await Camera.pickImages({ quality: 85, limit })
    const photos = result?.photos ?? []
    if (photos.length === 0) return []
    const files: File[] = []
    for (const p of photos) {
      const uri = p.webPath || p.path
      if (!uri) continue
      try {
        const res = await fetch(uri)
        const blob = await res.blob()
        const ext = (p.format || 'jpeg').toLowerCase()
        const type = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
        files.push(new File([blob], `photo.${ext}`, { type }))
      } catch { /* image illisible → ignorée */ }
    }
    return files
  } catch {
    return null
  }
}
