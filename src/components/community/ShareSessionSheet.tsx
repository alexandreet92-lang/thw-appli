'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager une séance » : mes séances de bibliothèque ; en choisir
// une la met en attente au-dessus du champ (carte → détail copiable/planifiable).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Dumbbell, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { listMyLibrarySessions, type LibrarySession } from '@/lib/community/sessions'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { CmSheet, CmSkel, CmEmpty, CARD_BG, SOFT_SHADOW, TNUM, FB, stagger } from './kit'

function fmtDuration(min: number | null): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function fmtLine(s: LibrarySession, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const bits: string[] = [sportLabel(s.sport)]
  const d = fmtDuration(s.durationMin); if (d) bits.push(d)
  if (s.blocks.length) bits.push(t(s.blocks.length > 1 ? 'w2g.blocksPlural' : 'w2g.blockSingular', { n: s.blocks.length }))
  if (s.rpe) bits.push(`RPE ${s.rpe}`)
  return bits.join(' · ')
}

export function ShareSessionSheet({ onClose, onShare }: {
  onClose: () => void; onShare: (s: LibrarySession) => void
}) {
  const { t } = useI18n()
  const [items, setItems] = useState<LibrarySession[] | null>(null)
  useEffect(() => { void listMyLibrarySessions(40).then(setItems) }, [])

  return (
    <CmSheet full onClose={onClose} title={t('w2g.shareSession')} zIndex={15400}>
      {items === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3].map(i => <CmSkel key={i} h={72} r="var(--r-lg)" />)}</div>
      ) : items.length === 0 ? (
        <CmEmpty icon={<Dumbbell size={26} strokeWidth={2} />} title={t('w2g.noSessions')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((s, i) => {
            const col = sportColor(s.sport)
            return (
              <button key={s.id} type="button" onClick={() => { haptic('light'); onShare(s) }} className="cm-btn cm-press cm-in"
                style={{ ...stagger(i), display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW, fontFamily: FB }}>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, background: `color-mix(in srgb, ${col} 14%, transparent)` }}>
                  <Dumbbell size={20} strokeWidth={2.2} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 750, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ ...TNUM, display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtLine(s, t)}</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} color="var(--text-dim)" />
              </button>
            )
          })}
        </div>
      )}
    </CmSheet>
  )
}
