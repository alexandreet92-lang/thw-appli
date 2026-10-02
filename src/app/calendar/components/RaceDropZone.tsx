'use client'
// Zone d'upload de parcours (glisser-déposer GPX/TCX) — style éditorial clair.
// iOS Safari : on déclenche le sélecteur via un <label> natif (et non via un
// input caché + ref.click()), sinon le geste ne s'enregistre pas de façon
// fiable et le fichier n'entre jamais dans l'état → « le parcours ne reste pas ».
// L'attribut accept reste large : iOS grise les .gpx/.tcx/.kml quand accept ne
// contient que ces extensions custom, empêchant toute sélection.
import { useState } from 'react'
import { IconUpload, IconX } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import { useFormM, M_LBL } from './mobileForm'

// Extensions de parcours acceptées (validées côté code après sélection).
const ROUTE_RE = /\.(gpx|tcx|kml)$/i

export default function RaceDropZone({ label, list, setter }: {
  label?: string; list: File[]; setter: (f: File[]) => void
}) {
  const { t } = useI18n()
  const [over, setOver] = useState(false)
  const m = useFormM()
  const add = (l: FileList | null) => {
    if (!l) return
    // On garde les fichiers de parcours ; si l'utilisateur en dépose un autre
    // type, on l'accepte quand même (validation souple) pour ne jamais bloquer.
    const files = Array.from(l)
    const routes = files.filter(f => ROUTE_RE.test(f.name))
    setter([...list, ...(routes.length ? routes : files)])
  }
  const accept = '.gpx,.tcx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml,application/xml,text/xml,application/octet-stream,*/*'
  // Mobile : zone pleine douce (sans bordure pointillée), cible ≥ 52 px.
  if (m) return (
    <div>
      {label && <span style={M_LBL}>{label}</span>}
      <label
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
        style={{ minHeight: 52, borderRadius: 'var(--r-md)', padding: '0 16px', cursor: 'pointer', background: over ? 'var(--surface-bar)' : 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-mid)' }}>
        <IconUpload size={18} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t('calendar.dragDropOrBrowse')}</span>
        <input type="file" accept={accept} style={{ display: 'none' }}
          onChange={e => { add(e.target.files); e.currentTarget.value = '' }} />
      </label>
      {list.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
          {list.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button type="button" aria-label={t('calendar.remove')} onClick={e => { e.preventDefault(); e.stopPropagation(); setter(list.filter((_, j) => j !== i)) }}
                style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, marginRight: -10 }}><IconX size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  return (
    <div>
      {label && <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 4px' }}>{label}</p>}
      <label
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
        style={{ border: `1.5px dashed ${over ? 'var(--text-dim)' : 'var(--border-mid)'}`, borderRadius: 'var(--r-md)', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <IconUpload size={15} color="var(--text-dim)" />
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{t('calendar.dragDropOrBrowse')}</p>
        <input type="file" accept=".gpx,.tcx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml,application/xml,text/xml,application/octet-stream,*/*"
          style={{ display: 'none' }}
          onChange={e => { add(e.target.files); e.currentTarget.value = '' }} />
      </label>
      {list.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {list.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setter(list.filter((_, j) => j !== i)) }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 0 }}><IconX size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
