'use client'
// Zone d'upload de parcours (glisser-déposer GPX/TCX) — style éditorial clair.
import { useRef, useState } from 'react'
import { IconUpload, IconX } from '@tabler/icons-react'

export default function RaceDropZone({ label, list, setter }: {
  label?: string; list: File[]; setter: (f: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const add = (l: FileList | null) => { if (l) setter([...list, ...Array.from(l)]) }
  return (
    <div>
      {label && <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 4px' }}>{label}</p>}
      <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }} onClick={() => ref.current?.click()}
        style={{ border: `1.5px dashed ${over ? 'var(--text-dim)' : 'var(--border-mid)'}`, borderRadius: 12, padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <IconUpload size={15} color="var(--text-dim)" />
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Glisser-déposer ou parcourir</p>
        <input ref={ref} type="file" multiple accept=".gpx,.tcx,.kml" style={{ display: 'none' }} onChange={e => add(e.target.files)} />
      </div>
      {list.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {list.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={e => { e.stopPropagation(); setter(list.filter((_, j) => j !== i)) }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 0 }}><IconX size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
