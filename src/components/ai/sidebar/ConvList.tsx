'use client'
import { useState, useEffect, useRef } from 'react'

export interface ConvLike {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  convs: ConvLike[]
  activeId: string | null
  onSelect: (c: ConvLike) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
  emptyLabel?: string
}

function fmt(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)     return 'instant'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)} min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function ConvRow({ c, active, onSelect, onDelete, onPin }: {
  c: ConvLike; active: boolean
  onSelect: (c: ConvLike) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])

  const btnBase = 'w-full text-left px-3 py-2 rounded-xl transition-colors duration-100 font-[DM_Sans]'
  const btnState = active
    ? 'bg-black/[0.08] dark:bg-white/10'
    : 'hover:bg-black/5 dark:hover:bg-white/[0.06]'

  return (
    <div ref={ref} className="relative mb-px">
      <button onClick={() => onSelect(c)} className={`${btnBase} ${btnState}`}>
        <p className="text-sm font-medium truncate text-[#0A0A0A] dark:text-white leading-snug">
          {c.isPinned && <span className="mr-1 text-[#3B82F6]">★</span>}
          {c.title || 'Nouvelle discussion'}
        </p>
        <p className="text-xs text-[#8C8C8C] mt-0.5">{fmt(c.updatedAt)}</p>
      </button>
      <button
        onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
        aria-label="Options"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded
                   flex items-center justify-center
                   text-[#8C8C8C] hover:bg-black/5 dark:hover:bg-white/10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {menu && (
        <div className="absolute right-1.5 top-[calc(100%-2px)] z-50 min-w-[150px]
                        rounded-xl overflow-hidden
                        bg-white dark:bg-[#262626]
                        border border-black/[0.08] dark:border-white/[0.08]
                        shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
          <button
            onClick={() => { onPin(c.id); setMenu(false) }}
            className="block w-full px-3 py-2 text-left text-xs font-[DM_Sans]
                       text-[#0A0A0A] dark:text-white/90
                       hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
          >
            {c.isPinned ? 'Désépingler' : 'Épingler'}
          </button>
          <button
            onClick={() => { onDelete(c.id); setMenu(false) }}
            className="block w-full px-3 py-2 text-left text-xs font-[DM_Sans]
                       text-[#ef4444] hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

export function ConvList({ convs, activeId, onSelect, onDelete, onPin, emptyLabel }: Props) {
  if (convs.length === 0) {
    return (
      <p className="text-center text-xs text-[#8C8C8C] mt-5 mb-2 mx-3 font-[DM_Sans]">
        {emptyLabel ?? 'Aucune conversation'}
      </p>
    )
  }
  const pinned = convs.filter(c => c.isPinned)
  const recent = convs.filter(c => !c.isPinned)
  return (
    <>
      {pinned.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8C8C8C] mx-3 mt-1.5 mb-1 font-[DM_Sans]">
            Épinglés
          </p>
          {pinned.map(c => (
            <ConvRow key={c.id} c={c} active={c.id === activeId}
              onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
          ))}
        </>
      )}
      {recent.map(c => (
        <ConvRow key={c.id} c={c} active={c.id === activeId}
          onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
      ))}
    </>
  )
}

export default ConvList
