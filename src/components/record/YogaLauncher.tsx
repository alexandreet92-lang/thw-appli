'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { YogaSessionExercise, YogaPlannedSession } from '@/types/yoga'
import { DEFAULT_YOGA_EXERCISES } from '@/types/yoga'
import YogaSessionBuilder from './YogaSessionBuilder'
import { useI18n } from '@/lib/i18n'
import { RkSheet, RkCta, RkSectionLabel, RkGroup, RkRow, RkTile, RkIco, RK_ICON } from './kit/RecordKit'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (exercises: YogaSessionExercise[], title: string) => void
  isDark: boolean
}

export default function YogaLauncher({ open, onClose, onStart, isDark }: Props) {
  const { t } = useI18n()
  const [sessions, setSessions]       = useState<YogaPlannedSession[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [closing, setClosing]         = useState(false)

  useEffect(() => {
    if (!open) return
    setClosing(false)
    createClient().from('planned_sessions').select('id,title,blocks,target_duration_min').eq('sport', 'yoga').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setSessions((data ?? []).map(d => ({
        id: d.id, title: d.title,
        target_duration_min: d.target_duration_min ?? 30,
        exercises: (d.blocks ?? []) as YogaSessionExercise[],
      }))))
  }, [open])

  if (!open && !builderOpen) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 300) }

  const launchFree = () => {
    const free = DEFAULT_YOGA_EXERCISES.slice(0, 6).map((e, i) => ({
      exerciseId: `free-${i}`, name: e.name, category: e.category,
      duration_seconds: e.default_duration_seconds,
    }))
    onStart(free, t('record.yogaFreeSession'))
  }

  return (
    <>
      <RkSheet open={open && !closing} onClose={handleClose} title={t('record.yogaLauncherTitle')} isDark={isDark} zIndex={9000}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <RkCta variant="primary" onClick={() => setBuilderOpen(true)}>{t('record.yogaCreateSession')}</RkCta>
            <RkCta variant="white" onClick={launchFree}>{t('record.yogaLaunchFree')}</RkCta>
          </div>
        }>
        {sessions.length > 0 ? (
          <>
            <RkSectionLabel>{t('record.yogaMySessions')}</RkSectionLabel>
            <RkGroup>
              {sessions.map(s => (
                <RkRow key={s.id}
                  icon={<RkTile color="var(--sport-rowing)"><RkIco d={RK_ICON.play} size={16} fill="currentColor" sw={0} /></RkTile>}
                  label={s.title} sub={`${s.exercises.length} ${t('record.yogaExercisesLabel')} · ${s.target_duration_min} min`}
                  onClick={() => onStart(s.exercises, s.title)} />
              ))}
            </RkGroup>
          </>
        ) : (
          <p style={{ textAlign: 'center', fontSize: 15, color: 'var(--text-mid)', padding: '24px 8px' }}>{t('record.yogaNoSavedSession')}</p>
        )}
      </RkSheet>

      {builderOpen && (
        <YogaSessionBuilder
          isDark={isDark}
          onClose={() => setBuilderOpen(false)}
          onStart={(exs, title) => { setBuilderOpen(false); onStart(exs, title) }}
        />
      )}
    </>
  )
}
