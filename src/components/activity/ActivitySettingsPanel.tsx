'use client'
// ══════════════════════════════════════════════════════════════════════════
// Réglages d'une activité (propriétaire) — visibles sur l'écran d'édition/analyse
// après une synchro. Regroupe : confidentialité (visible par + masquage des
// données, pré-remplis depuis les réglages globaux de l'athlète), et le matériel
// (vélo pour le cyclisme, chaussures pour la course/trail) avec ajout direct et
// stats cumulées (heures / D+ / km). Le matériel par défaut est le seul existant,
// sinon le dernier utilisé.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import {
  getMyActivityVisibility, getMyHiddenData, HIDDEN_DATA_CATS,
  type ActivityVisibility, type HiddenDataCat,
} from '@/lib/profile/activityShowcase'
import {
  listGear, addGear, setActivityGear, getActivityGear, getLastUsedGear,
  type GearItem, type GearKind,
} from '@/lib/gear/client'

import { useIsMobile, AM_CARD, AM_INPUT, HAIRLINE, SegTrack, amChip, AmSectionLabel, PillButton, Ico, NUMS } from './ActivityMobileKit'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

const VIS_OPTS: { k: ActivityVisibility; label: string }[] = [
  { k: 'public', label: 'Tout le monde' },
  { k: 'followers', label: 'Abonnés' },
  { k: 'private', label: 'Privé' },
]
// Catégories pertinentes selon le sport (allure = course, vitesse/watts = vélo).
function catsForSport(sport: string): HiddenDataCat[] {
  const s = sport.toLowerCase()
  if (s.includes('bike') || s.includes('cycl') || s.includes('velo')) return ['hr', 'watts', 'speed', 'kcal']
  if (s.includes('run') || s.includes('trail')) return ['hr', 'pace', 'kcal']
  return HIDDEN_DATA_CATS
}
function gearKindForSport(sport: string): GearKind | null {
  const s = sport.toLowerCase()
  if (s.includes('bike') || s.includes('cycl') || s.includes('velo')) return 'bike'
  if (s.includes('run') || s.includes('trail')) return 'shoes'
  return null
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
      <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 'var(--space-3)' }}>{title}</div>
      {children}
    </div>
  )
}

export function ActivitySettingsPanel({ activityId, sport }: { activityId: string; sport: string }) {
  const { t } = useI18n()
  const sb = createClient()
  const kind = gearKindForSport(sport)
  const cats = catsForSport(sport)

  const [vis, setVis] = useState<ActivityVisibility | null>(null)
  const [hidden, setHidden] = useState<HiddenDataCat[]>([])
  const [gear, setGear] = useState<GearItem[]>([])
  const [selGear, setSelGear] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftBrand, setDraftBrand] = useState('')
  const [busy, setBusy] = useState(false)
  const mob = useIsMobile()

  // Charge la confidentialité effective (override activité → défaut global).
  useEffect(() => {
    let off = false
    void (async () => {
      const { data } = await sb.from('activities').select('visibility, hidden_data').eq('id', activityId).maybeSingle()
      const row = data as { visibility: string | null; hidden_data: string[] | null } | null
      const [gVis, gHidden] = await Promise.all([getMyActivityVisibility(), getMyHiddenData()])
      if (off) return
      setVis(((row?.visibility as ActivityVisibility) ?? gVis) || 'public')
      const h = Array.isArray(row?.hidden_data) ? row!.hidden_data as HiddenDataCat[] : gHidden
      setHidden(h.filter(c => (HIDDEN_DATA_CATS as string[]).includes(c)))
    })()
    return () => { off = true }
  }, [activityId, sb])

  // Charge le matériel + sélection (rattaché → sinon défaut = seul, sinon dernier utilisé).
  const loadGear = useCallback(async () => {
    if (!kind) return
    const { bikes, shoes } = await listGear()
    const list = kind === 'bike' ? bikes : shoes
    setGear(list)
    const cur = await getActivityGear(activityId)
    let sel = kind === 'bike' ? cur.bike_id : cur.shoes_id
    if (!sel) {
      if (list.length === 1) sel = list[0].id
      else if (list.length > 1) sel = (await getLastUsedGear(kind, activityId)) ?? (list.find(g => g.is_default)?.id ?? null)
      if (sel) await setActivityGear(activityId, kind, sel) // défaut auto-rattaché
    }
    setSelGear(sel)
  }, [kind, activityId])

  useEffect(() => { void loadGear() }, [loadGear])

  const chooseVis = (v: ActivityVisibility) => {
    setVis(v)
    void sb.from('activities').update({ visibility: v }).eq('id', activityId)
  }
  const toggleHidden = (c: HiddenDataCat) => {
    const next = hidden.includes(c) ? hidden.filter(x => x !== c) : [...hidden, c]
    setHidden(next)
    void sb.from('activities').update({ hidden_data: next }).eq('id', activityId)
  }
  const chooseGear = (id: string) => {
    if (!kind) return
    setSelGear(id)
    void setActivityGear(activityId, kind, id)
  }
  const submitGear = async () => {
    if (!kind || busy) return
    const name = draftName.trim() || draftBrand.trim()
    if (!name) return
    setBusy(true)
    const created = await addGear(kind, { name, brand: draftBrand.trim() || undefined })
    setBusy(false)
    if (created) {
      setDraftName(''); setDraftBrand(''); setAdding(false)
      await loadGear()
      chooseGear(created.id)
    }
  }

  // ── Mobile (Strava) : libellés gris au-dessus, cartes blanches, piste
  // segmentée, puces pilules, liste groupée à coche, champs pleins doux. ──
  if (mob) {
    return (
      <div>
        <AmSectionLabel>{t('w3f.visible_by')}</AmSectionLabel>
        <SegTrack<ActivityVisibility> value={vis ?? 'public'} onChange={chooseVis}
          options={VIS_OPTS.map(o => ({ v: o.k, l: t(`w3f.vis_${o.k}`) }))} />

        <AmSectionLabel>{t('w3f.hide_some_data')}</AmSectionLabel>
        <div style={{ ...AM_CARD }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.map(c => {
              const on = hidden.includes(c)
              return (
                <button key={c} onClick={() => toggleHidden(c)} aria-pressed={on} style={amChip(on)}>
                  {on ? '🔒 ' : ''}{t(`w3f.hidden_${c}`)}
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.45, margin: '12px 2px 0' }}>{t('w3f.hidden_hint')}</p>
        </div>

        {kind && (
          <>
            <AmSectionLabel>{kind === 'bike' ? t('w3f.gear_bike_title') : t('w3f.gear_shoes_title')}</AmSectionLabel>
            <div style={{ ...AM_CARD, padding: '0 16px' }}>
              {gear.map((g, i) => {
                const on = selGear === g.id
                return (
                  <button key={g.id} onClick={() => chooseGear(g.id)} aria-pressed={on}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '10px 0', textAlign: 'left', border: 'none', borderTop: i === 0 ? 'none' : HAIRLINE, background: 'transparent', cursor: 'pointer', fontFamily: FB }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{g.brand ? `${g.brand} ` : ''}{g.name}</span>
                      <span style={{ ...NUMS, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{g.stats.total_hours} h · {g.stats.total_elev_m} m D+ · {g.stats.total_km} km</span>
                    </span>
                    <span aria-hidden style={{ width: 24, display: 'flex', justifyContent: 'flex-end', color: 'var(--primary)' }}>
                      {on && <Ico d={<path d="M20 6 9 17l-5-5" />} size={22} sw={2.6} />}
                    </span>
                  </button>
                )
              })}
              {adding ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0 16px', borderTop: gear.length ? HAIRLINE : 'none' }}>
                  <input value={draftBrand} onChange={e => setDraftBrand(e.target.value)} placeholder={kind === 'bike' ? t('w3f.brand_ph_bike') : t('w3f.brand_ph_shoes')} style={AM_INPUT} />
                  <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={kind === 'bike' ? t('w3f.model_ph_bike') : t('w3f.model_ph_shoes')}
                    onKeyDown={e => { if (e.key === 'Enter') void submitGear() }} style={AM_INPUT} />
                  <PillButton onClick={() => void submitGear()} disabled={busy || !(draftName.trim() || draftBrand.trim())}>{busy ? '…' : t('w3f.add')}</PillButton>
                  <button onClick={() => { setAdding(false); setDraftName(''); setDraftBrand('') }}
                    style={{ minHeight: 44, border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    {t('w3f.cancel')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setAdding(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 52, padding: 0, border: 'none', borderTop: gear.length ? HAIRLINE : 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  {kind === 'bike' ? t('w3f.add_gear_bike') : t('w3f.add_gear_shoes')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Confidentialité */}
      <Card title={t('w3f.visible_by')}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {VIS_OPTS.map(o => {
            const on = vis === o.k
            return (
              <button key={o.k} onClick={() => chooseVis(o.k)}
                style={{ flex: '1 1 auto', minWidth: 96, padding: '9px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600,
                  border: on ? '2px solid var(--primary)' : '1px solid var(--border-mid)',
                  background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                  color: on ? 'var(--primary)' : 'var(--text-mid)' }}>
                {t(`w3f.vis_${o.k}`)}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title={t('w3f.hide_some_data')}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {cats.map(c => {
            const on = hidden.includes(c)
            return (
              <button key={c} onClick={() => toggleHidden(c)}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600,
                  border: on ? '2px solid var(--danger)' : '1px solid var(--border-mid)',
                  background: on ? 'var(--danger-soft)' : 'transparent',
                  color: on ? 'var(--danger)' : 'var(--text-mid)' }}>
                {on ? '🔒 ' : ''}{t(`w3f.hidden_${c}`)}
              </button>
            )
          })}
        </div>
        <p style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
          {t('w3f.hidden_hint')}
        </p>
      </Card>

      {/* Matériel */}
      {kind && (
        <Card title={kind === 'bike' ? t('w3f.gear_bike_title') : t('w3f.gear_shoes_title')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {gear.map(g => {
              const on = selGear === g.id
              return (
                <button key={g.id} onClick={() => chooseGear(g.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left', width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB,
                    border: on ? '2px solid var(--primary)' : '1px solid var(--border-mid)', background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: on ? '5px solid var(--primary)' : '2px solid var(--border-mid)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{g.brand ? `${g.brand} ` : ''}{g.name}</div>
                    <div className="tnum" style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {g.stats.total_hours} h · {g.stats.total_elev_m} m D+ · {g.stats.total_km} km
                    </div>
                  </div>
                </button>
              )
            })}

            {adding ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2)', border: '1px dashed var(--border-mid)', borderRadius: 'var(--r-sm)' }}>
                <input value={draftBrand} onChange={e => setDraftBrand(e.target.value)} placeholder={kind === 'bike' ? t('w3f.brand_ph_bike') : t('w3f.brand_ph_shoes')}
                  style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: FB, fontSize: 14 }} />
                <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={kind === 'bike' ? t('w3f.model_ph_bike') : t('w3f.model_ph_shoes')}
                  onKeyDown={e => { if (e.key === 'Enter') void submitGear() }}
                  style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: FB, fontSize: 14 }} />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={() => void submitGear()} disabled={busy || !(draftName.trim() || draftBrand.trim())}
                    style={{ flex: 1, padding: '9px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? '…' : t('w3f.add')}
                  </button>
                  <button onClick={() => { setAdding(false); setDraftName(''); setDraftBrand('') }}
                    style={{ padding: '9px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, cursor: 'pointer' }}>
                    {t('w3f.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 'var(--space-3)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-mid)', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                {kind === 'bike' ? t('w3f.add_gear_bike') : t('w3f.add_gear_shoes')}
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
