'use client'
// ══════════════════════════════════════════════════════════════════
// Écran de RÉSULTAT d'un test vélo (rampe / CP20), affiché à la fin de la
// séance home trainer. L'athlète confirme ce qu'il a réellement tenu :
//  • RAMPE : nombre de paliers validés (pré-rempli) + temps tenu sur le
//    dernier palier échoué (pré-rempli) → PMA, FTP.
//  • CP20 : moyenne mesurée sur 20 min → FTP.
// Puis on affiche PMA/FTP + les zones Z1→Z7 estimées + SL1/SL2, et on
// enregistre dans le profil (page Performance mise à jour directement).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { computeRamp, computeCp20, type TestResult } from './rampTest'

export interface RampStop {
  startW: number
  stepW: number
  stepMin: number
  validatedPaliers: number
  heldSecOnFailed: number
}

interface Props {
  mode: 'ramp' | 'cp20'
  ramp?: RampStop
  cp20AvgWatts?: number
  massKg: number
  onDone: () => void
}

function fmtMMSS(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
function parseMMSS(v: string): number {
  const m = (v || '').trim().match(/^(\d+):(\d{1,2})$/)
  if (m) return (+m[1]) * 60 + (+m[2])
  const n = parseInt(v || '0'); return isNaN(n) ? 0 : n
}

export default function RampTestResult({ mode, ramp, cp20AvgWatts, massKg, onDone }: Props) {
  const { t } = useI18n()
  const [validated, setValidated] = useState(ramp?.validatedPaliers ?? 1)
  const [heldStr, setHeldStr] = useState(fmtMMSS(ramp?.heldSecOnFailed ?? 0))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const result: TestResult & { pma: number | null } = useMemo(() => {
    if (mode === 'ramp' && ramp) {
      return computeRamp({
        startW: ramp.startW, stepW: ramp.stepW, stepMin: ramp.stepMin,
        validatedPaliers: validated, heldSecOnFailed: parseMMSS(heldStr),
      })
    }
    return computeCp20(cp20AvgWatts ?? 0)
  }, [mode, ramp, validated, heldStr, cp20AvgWatts])

  const wkg = (w: number) => (massKg > 0 ? `${(w / massKg).toFixed(1).replace('.', ',')} W/kg` : null)

  async function save() {
    setSaving(true)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { setSaving(false); return }
      const today = new Date().toISOString().split('T')[0]
      const nowISO = new Date().toISOString()
      // 1. FTP canonique (page Performance : zones de puissance + sous-métrique FTP)
      await sb.from('athlete_performance_profile').upsert(
        { user_id: user.id, ftp_watts: result.ftp, updated_at: nowISO }, { onConflict: 'user_id' },
      )
      // 2. training_zones vélo (source préférée du planning)
      await sb.from('training_zones').upsert(
        { user_id: user.id, sport: 'bike', ftp_watts: result.ftp, sl1: String(result.sl1), sl2: String(result.sl2), is_current: true, effective_from: today, updated_at: nowISO },
        { onConflict: 'user_id,sport,effective_from' },
      )
      // 3. Repères SL1/SL2/PMA — sous 'bike' (planning) ET 'cycling' (page Perf),
      //    en fusionnant les params existants pour ne rien écraser.
      const { data: rows } = await sb.from('athlete_sport_profile').select('sport,params').eq('user_id', user.id).in('sport', ['bike', 'cycling'])
      for (const sport of ['bike', 'cycling'] as const) {
        const existing = (rows?.find(x => x.sport === sport)?.params as Record<string, unknown> | undefined) ?? {}
        const params: Record<string, unknown> = { ...existing, watts_sl1: result.sl1, watts_sl2: result.sl2 }
        if (result.pma != null) params.watts_pma = result.pma
        await sb.from('athlete_sport_profile').upsert(
          { user_id: user.id, sport, params, updated_at: nowISO }, { onConflict: 'user_id,sport' },
        )
      }
      setSaved(true)
    } catch { /* silencieux : l'athlète peut réessayer ou passer */ }
    setSaving(false)
  }

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14 }
  const input: React.CSSProperties = { width: 72, padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'center' as const, outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', overflowY: 'auto', padding: 'max(env(safe-area-inset-top), 20px) 18px 28px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '4px 0 2px', color: 'var(--text)' }}>{t('w3b.test_result')}</h2>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-mid)' }}>{mode === 'ramp' ? t('w3b.ramp_confirm') : t('w3b.cp20_desc')}</p>
        </div>

        {mode === 'ramp' && ramp && (
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 11.5, color: 'var(--text-mid)' }}>
              {t('w3b.depart')} <b style={{ color: 'var(--text)' }}>{ramp.startW} W</b> {t('w3b.ramp_cadence', { step: ramp.stepW, clock: fmtMMSS(ramp.stepMin * 60) })}
            </p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <div>
                <span style={lbl}>{t('w3b.validated_steps')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setValidated(n => Math.max(1, n - 1))} style={stepBtn}>−</button>
                  <input value={validated} inputMode="numeric" onChange={e => setValidated(Math.max(1, parseInt(e.target.value) || 1))} style={input} />
                  <button onClick={() => setValidated(n => n + 1)} style={stepBtn}>+</button>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>{t('w3b.held_at', { w: ramp.startW + (Math.max(1, validated) - 1) * ramp.stepW })}</span>
              </div>
              <div>
                <span style={lbl}>{t('w3b.held_next_step')}</span>
                <input value={heldStr} onChange={e => setHeldStr(e.target.value)} placeholder="m:ss" style={{ ...input, width: 88 }} />
                <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>{t('w3b.on_failed', { w: ramp.startW + Math.max(1, validated) * ramp.stepW })}</span>
              </div>
            </div>
          </div>
        )}

        {/* PMA / FTP */}
        <div style={{ display: 'flex', gap: 12 }}>
          {result.pma != null && (
            <div style={{ ...card, flex: 1, textAlign: 'center' }}>
              <span style={lbl}>PMA</span>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{result.pma}<small style={{ fontSize: 13, color: 'var(--text-mid)', marginLeft: 2 }}>W</small></div>
              {wkg(result.pma) && <div style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700 }}>{wkg(result.pma)}</div>}
            </div>
          )}
          <div style={{ ...card, flex: 1, textAlign: 'center' }}>
            <span style={lbl}>FTP</span>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{result.ftp}<small style={{ fontSize: 13, color: 'var(--text-mid)', marginLeft: 2 }}>W</small></div>
            {wkg(result.ftp) && <div style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700 }}>{wkg(result.ftp)}</div>}
          </div>
        </div>

        {/* Zones estimées + SL1/SL2 */}
        <div style={card}>
          <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800 }}>{t('w3b.estimated_power_zones')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {result.zones.map(z => (
              <div key={z.z} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 3, alignSelf: 'stretch', minHeight: 14, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                <span style={{ width: 22, fontSize: 10.5, fontWeight: 800, color: z.color, fontVariantNumeric: 'tabular-nums' }}>{z.z}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{z.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{z.range}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div><span style={lbl}>SL1</span><span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{result.sl1} W</span></div>
            <div><span style={lbl}>SL2</span><span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{result.sl2} W</span></div>
            <div><span style={lbl}>FTP</span><span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{result.ftp} W</span></div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <button onClick={onDone} style={{ padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{t('w3b.skip')}</button>
          <button onClick={saved ? onDone : save} disabled={saving} style={{ flex: 1, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--primary)', border: 'none', color: 'var(--on-primary)', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saved ? t('w3b.saved_close') : saving ? t('w3b.saving') : t('w3b.save_to_profile')}
          </button>
        </div>
        {saved && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-mid)', textAlign: 'center' }}>{t('w3b.profile_updated')}</p>}
      </div>
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 34, height: 38, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
  background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 18, fontWeight: 800, cursor: 'pointer', lineHeight: 1,
}
