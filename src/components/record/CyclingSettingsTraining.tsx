'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import type { ThemeColors } from './settings/types'
import { useI18n } from '@/lib/i18n'

interface Session { id: string; title: string; sport: string; duration_min: number; day_index: number }
interface LinkedSession { id: string; name: string; day: string; duration: string }

interface Props { theme: ThemeColors }

export default function CyclingSettingsTraining({ theme }: Props) {
  const { t } = useI18n()
  const DAYS = [t('record.dayMon'), t('record.dayTue'), t('record.dayWed'), t('record.dayThu'), t('record.dayFri'), t('record.daySat'), t('record.daySun')]
  const [linked, setLinked] = useState<LinkedSession | null>(null)
  const [showZones, setShowZones] = useState(false)
  const [outOfZone, setOutOfZone] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerClosing, setPickerClosing] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])

  const openPicker = async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const weekStart = monday.toISOString().split('T')[0]
      const { data } = await sb.from('planned_sessions')
        .select('id, title, sport, duration_min, day_index')
        .eq('user_id', user.id).eq('week_start', weekStart).eq('status', 'planned')
        .order('day_index', { ascending: true })
      setSessions((data ?? []) as Session[])
    } catch { setSessions([]) }
    setPickerOpen(true); setPickerClosing(false)
  }

  const closePicker = () => { setPickerClosing(true); setTimeout(() => setPickerOpen(false), 230) }

  return (
    <>
      <SettingsSection title={t('record.sectionTrainingUpper')} theme={theme}>
        <SettingsRow theme={theme} label={t('record.cyclingTrainingLinkSession')}
          description={t('record.cyclingTrainingLinkSessionDesc')}
          onClick={openPicker}
          right={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          }
        />
        {linked && (
          <div style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.08)', borderBottom: `1px solid ${theme.separator}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#06B6D4', margin: 0 }}>{linked.name}</p>
            <p style={{ fontSize: 12, color: '#8C8C8C', margin: '3px 0 0' }}>{linked.day} · {linked.duration}</p>
            <button onClick={() => setLinked(null)}
              style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', padding: 0, marginTop: 6, cursor: 'pointer' }}>
              {t('record.cyclingTrainingUnlink')}
            </button>
          </div>
        )}
        <SettingsRow theme={theme} label={t('record.cyclingTrainingShowZones')}
          description={t('record.cyclingTrainingShowZonesDesc')}
          disabled={!linked}
          right={<Toggle theme={theme} value={showZones} onChange={setShowZones} disabled={!linked} />}
        />
        <SettingsRow theme={theme} label={t('record.cyclingTrainingOutOfZone')} last
          description={t('record.cyclingTrainingOutOfZoneDesc')}
          disabled={!linked || !showZones}
          right={<Toggle theme={theme} value={outOfZone} onChange={setOutOfZone} disabled={!linked || !showZones} />}
        />
      </SettingsSection>

      {pickerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10010 }}>
          <div onClick={closePicker} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div className={pickerClosing ? 'sheet-close' : 'sheet-open'}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60vh', background: theme.bg, borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.separator }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: theme.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>{t('record.cyclingTrainingPickSession')}</h3>
              <button onClick={closePicker} style={{ background: 'none', border: 'none', fontSize: 22, color: theme.dim, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {sessions.length === 0
                ? <p style={{ textAlign: 'center', color: theme.dim, fontSize: 14, padding: '32px 20px' }}>{t('record.cyclingTrainingNoSession')}</p>
                : sessions.map(s => (
                  <button key={s.id}
                    onClick={() => { setLinked({ id: s.id, name: s.title, day: DAYS[s.day_index] ?? '', duration: `${s.duration_min} min` }); closePicker() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 20px', background: 'none', border: 'none', borderBottom: `1px solid ${theme.separator}`, cursor: 'pointer', textAlign: 'left', gap: 12, fontFamily: 'DM Sans, sans-serif' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, color: theme.text, margin: 0, fontWeight: 500 }}>{s.title}</p>
                      <p style={{ fontSize: 12, color: '#8C8C8C', margin: '2px 0 0' }}>{DAYS[s.day_index]} · {s.duration_min} min · {s.sport}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </>
  )
}
