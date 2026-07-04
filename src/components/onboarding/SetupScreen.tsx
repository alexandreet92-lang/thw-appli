'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

interface Props { onComplete: () => void }

const SPORTS = ['Cyclisme', 'Running', 'Trail', 'Natation', 'Muscu']
const dim = 'rgba(255,255,255,0.45)'
const surface = 'rgba(255,255,255,0.07)'
const border = 'rgba(255,255,255,0.12)'

function NumRow({ label, desc, value, onChange, min, max, step, unit }: { label: string; desc?: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#fff', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: dim, margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>{desc}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={{ width: 36, height: 36, borderRadius: '50%', background: surface, border: `1px solid ${border}`, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#06B6D4', minWidth: 56, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>{value}<span style={{ fontSize: 11, color: dim, fontWeight: 400, marginLeft: 2 }}>{unit}</span></span>
        <button onClick={() => onChange(Math.min(max, value + step))} style={{ width: 36, height: 36, borderRadius: '50%', background: surface, border: `1px solid ${border}`, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
    </div>
  )
}

export default function SetupScreen({ onComplete }: Props) {
  const { t } = useI18n()
  const [ftp, setFtp] = useState(200)
  const [maxHr, setMaxHr] = useState(185)
  const [primarySport, setPrimarySport] = useState('')
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('athlete_profiles').upsert({
          user_id: user.id,
          ftp_watts: ftp,
          max_hr: maxHr,
          primary_sport: primarySport || null,
        }, { onConflict: 'user_id' })
      }
    } catch (e) { console.error('[setup] save error:', e) }
    onComplete()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#0A0A0F 0%,#0F1A2E 100%)', display: 'flex', flexDirection: 'column', animation: 'ob-slide-in 320ms cubic-bezier(0.16,1,0.3,1)', paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{`@keyframes ob-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      <div style={{ padding: '20px 20px 0' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', fontFamily: 'Syne, sans-serif' }}>{t('onboarding.setupTitle')}</h2>
        <p style={{ fontSize: 14, color: dim, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{t('onboarding.setupSubtitle')}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        <NumRow label="FTP" desc={t('onboarding.ftpDesc')} value={ftp} onChange={setFtp} min={50} max={600} step={5} unit="w" />
        <NumRow label={t('onboarding.maxHr')} desc={t('onboarding.maxHrDesc')} value={maxHr} onChange={setMaxHr} min={100} max={220} step={1} unit="bpm" />

        <div style={{ padding: '16px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: dim, margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif' }}>{t('onboarding.primarySport')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(s => (
              <button key={s} onClick={() => setPrimarySport(p => p === s ? '' : s)} style={{ padding: '8px 16px', borderRadius: 20, background: primarySport === s ? 'rgba(6,182,212,0.18)' : surface, border: `1px solid ${primarySport === s ? '#06B6D4' : border}`, color: primarySport === s ? '#06B6D4' : 'rgba(255,255,255,0.75)', fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 200ms' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),24px)' }}>
        <button onClick={handleStart} disabled={saving} style={{ width: '100%', height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 24px rgba(6,182,212,0.35)' }}>
          {saving ? t('onboarding.saving') : t('onboarding.startAdventure') + ' 🚀'}
        </button>
      </div>
    </div>
  )
}
