'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { metricColor, localToday } from './helpers'
import type { CheckInDraft, CheckInRow } from './types'
import { BLANK_DRAFT } from './types'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Props {
  existing: CheckInRow | null
  onClose: () => void
  onSaved: (row: CheckInRow) => void
}

const FIELDS: { key: keyof CheckInDraft; labelKey: string; subKey: string; inverted?: boolean; isNum?: boolean }[] = [
  { key:'fatigue',       labelKey:'recovery.metric.fatigue',    subKey:'recovery.checkinModal.sub.fatigue',    inverted:true, isNum:true },
  { key:'energy',        labelKey:'recovery.metric.energy',    subKey:'recovery.checkinModal.sub.energy',     isNum:true },
  { key:'stress',        labelKey:'recovery.metric.stress',     subKey:'recovery.checkinModal.sub.stress',     inverted:true, isNum:true },
  { key:'motivation',    labelKey:'recovery.metric.motivation', subKey:'recovery.checkinModal.sub.motivation', isNum:true },
  { key:'pain',          labelKey:'recovery.metric.pain',   subKey:'recovery.checkinModal.sub.pain',  inverted:true, isNum:true },
  { key:'sleep_quality', labelKey:'recovery.metric.sleep',    subKey:'recovery.checkinModal.sub.sleep',      isNum:true },
]

export default function CheckInModal({ existing, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const init: CheckInDraft = existing
    ? { fatigue:existing.fatigue, energy:existing.energy, stress:existing.stress,
        motivation:existing.motivation, pain:existing.pain,
        pain_location:existing.pain_location??'', sleep_quality:existing.sleep_quality,
        sleep_hours:existing.sleep_hours!=null?String(existing.sleep_hours):'',
        notes:existing.notes??'' }
    : { ...BLANK_DRAFT }

  const [d, setD] = useState<CheckInDraft>(init)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string|null>(null)

  async function save() {
    setSaving(true); setErr(null)
    const sb = createClient()
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) { setErr(t('recovery.checkinModal.err.notConnected')); setSaving(false); return }

    const payload = {
      user_id: user.id, date: localToday(),
      fatigue: d.fatigue, energy: d.energy, stress: d.stress,
      motivation: d.motivation, pain: d.pain,
      pain_location: d.pain > 5 && d.pain_location ? d.pain_location : null,
      sleep_quality: d.sleep_quality,
      sleep_hours: d.sleep_hours ? parseFloat(d.sleep_hours) : null,
      notes: d.notes || null,
    }
    const { data, error } = await sb.from('daily_checkin')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select().single()
    if (error || !data) { setErr(error?.message ?? t('recovery.checkinModal.err.unknown')); setSaving(false); return }
    onSaved(data as CheckInRow)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border-mid)',padding:24,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>{t('recovery.checkinMorning')}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:'3px 0 0' }}>{new Date().toLocaleDateString(currentLocale(),{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
          {FIELDS.map(f => {
            const val = d[f.key] as number
            const color = metricColor(val, f.inverted)
            return (
              <div key={String(f.key)}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                  <div>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{t(f.labelKey)}</p>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{t(f.subKey)}</p>
                  </div>
                  <span style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color,minWidth:28,textAlign:'right' }}>{val}</span>
                </div>
                <input type="range" min={1} max={10} value={val}
                  onChange={e=>setD(prev=>({...prev,[f.key]:Number(e.target.value)}))}
                  style={{ width:'100%',accentColor:color,cursor:'pointer',height:4 }}/>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--text-dim)',marginTop:2 }}><span>1</span><span>10</span></div>
              </div>
            )
          })}

          {d.pain > 5 && (
            <div>
              <p style={{ fontSize:12,fontWeight:600,margin:'0 0 5px' }}>{t('recovery.checkinModal.painLocation')}</p>
              <input value={d.pain_location} onChange={e=>setD(prev=>({...prev,pain_location:e.target.value}))}
                placeholder={t('recovery.checkinModal.painPlaceholder')}
                style={{ width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg,var(--bg-card2))',color:'var(--text)',fontSize:12,outline:'none' }}/>
            </div>
          )}

          <div>
            <p style={{ fontSize:12,fontWeight:600,margin:'0 0 5px' }}>{t('recovery.checkinModal.sleepHours')}</p>
            <input type="number" min={0} max={24} step={0.5} value={d.sleep_hours}
              onChange={e=>setD(prev=>({...prev,sleep_hours:e.target.value}))}
              placeholder={t('recovery.checkinModal.sleepHoursPlaceholder')}
              style={{ width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg,var(--bg-card2))',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>

          <div>
            <p style={{ fontSize:12,fontWeight:600,margin:'0 0 5px' }}>{t('recovery.checkinModal.notes')}</p>
            <textarea value={d.notes} onChange={e=>setD(prev=>({...prev,notes:e.target.value}))}
              placeholder={t('recovery.checkinModal.notesPlaceholder')}
              rows={3}
              style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--input-bg,var(--bg-card2))',color:'var(--text)',fontSize:12,outline:'none',resize:'none',lineHeight:1.5 }}/>
          </div>
        </div>

        {err && <p style={{ fontSize:11,color:'#ef4444',margin:'10px 0 0' }}>{err}</p>}

        <div style={{ display:'flex',gap:8,marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px',borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{t('recovery.cancel')}</button>
          <button onClick={save} disabled={saving}
            style={{ flex:2,padding:'10px',borderRadius:11,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:saving?'default':'pointer',opacity:saving?0.7:1 }}>
            {saving ? t('recovery.saving') : t('recovery.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
