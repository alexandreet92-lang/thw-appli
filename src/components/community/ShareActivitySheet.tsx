'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager une activité » : mes activités récentes ; en choisir une
// la met en attente au-dessus du champ (on peut ajouter un commentaire).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Activity, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { listMyRecentActivities } from '@/lib/community/activities'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { CmSheet, CmSkel, CmEmpty, CARD_BG, SOFT_SHADOW, TNUM, FB, stagger, fmtKm, fmtHms } from './kit'
import type { ActivityRef } from '@/types/community'

function fmtLine(a: ActivityRef): string {
  const bits: string[] = [sportLabel(a.sport)]
  const d = fmtKm(a.distanceM); if (d) bits.push(d)
  const h = fmtHms(a.durationS); if (h) bits.push(h)
  try { bits.push(new Date(a.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) } catch { /* */ }
  return bits.join(' · ')
}

export function ShareActivitySheet({ onClose, onShare }: {
  onClose: () => void; onShare: (a: ActivityRef) => void
}) {
  const { t } = useI18n()
  const [items, setItems] = useState<ActivityRef[] | null>(null)
  useEffect(() => { void listMyRecentActivities(25).then(setItems) }, [])

  return (
    <CmSheet full onClose={onClose} title={t('w1g.shareActivity')} zIndex={15400}>
      {items === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3].map(i => <CmSkel key={i} h={72} r="var(--r-lg)" />)}</div>
      ) : items.length === 0 ? (
        <CmEmpty icon={<Activity size={26} strokeWidth={2} />} title={t('cm.noActivityToShare')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((a, i) => {
            const col = sportColor(a.sport)
            return (
              <button key={a.id} type="button" onClick={() => { haptic('light'); onShare(a) }} className="cm-btn cm-press cm-in"
                style={{ ...stagger(i), display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW, fontFamily: FB }}>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, background: `color-mix(in srgb, ${col} 14%, transparent)` }}>
                  <Activity size={20} strokeWidth={2.2} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 750, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || sportLabel(a.sport)}</span>
                  <span style={{ ...TNUM, display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtLine(a)}</span>
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
