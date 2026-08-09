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
import { createClient } from '@/lib/supabase/client'
import {
  getMyActivityVisibility, getMyHiddenData, HIDDEN_DATA_CATS,
  type ActivityVisibility, type HiddenDataCat,
} from '@/lib/profile/activityShowcase'
import {
  listGear, addGear, setActivityGear, getActivityGear, getLastUsedGear,
  type GearItem, type GearKind,
} from '@/lib/gear/client'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

const VIS_OPTS: { k: ActivityVisibility; label: string }[] = [
  { k: 'public', label: 'Tout le monde' },
  { k: 'followers', label: 'Abonnés' },
  { k: 'private', label: 'Privé' },
]
const HIDDEN_LABELS: Record<HiddenDataCat, string> = {
  hr: 'FC', watts: 'Watts', pace: 'Allure', speed: 'Vitesse', kcal: 'Kcal',
}
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

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Confidentialité */}
      <Card title="Visible par">
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {VIS_OPTS.map(o => {
            const on = vis === o.k
            return (
              <button key={o.k} onClick={() => chooseVis(o.k)}
                style={{ flex: '1 1 auto', minWidth: 96, padding: '9px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600,
                  border: on ? '2px solid var(--primary)' : '1px solid var(--border-mid)',
                  background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                  color: on ? 'var(--primary)' : 'var(--text-mid)' }}>
                {o.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="Masquer certaines données">
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {cats.map(c => {
            const on = hidden.includes(c)
            return (
              <button key={c} onClick={() => toggleHidden(c)}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600,
                  border: on ? '2px solid var(--danger)' : '1px solid var(--border-mid)',
                  background: on ? 'var(--danger-soft)' : 'transparent',
                  color: on ? 'var(--danger)' : 'var(--text-mid)' }}>
                {on ? '🔒 ' : ''}{HIDDEN_LABELS[c]}
              </button>
            )
          })}
        </div>
        <p style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
          Pré-rempli depuis tes réglages ; masqué pour les autres athlètes sur cette activité.
        </p>
      </Card>

      {/* Matériel */}
      {kind && (
        <Card title={kind === 'bike' ? 'Vélo utilisé' : 'Chaussures utilisées'}>
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
                <input value={draftBrand} onChange={e => setDraftBrand(e.target.value)} placeholder={kind === 'bike' ? 'Marque (ex. Canyon)' : 'Marque (ex. Nike)'}
                  style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: FB, fontSize: 14 }} />
                <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={kind === 'bike' ? 'Modèle / nom (ex. Ultimate)' : 'Modèle (ex. Pegasus 40)'}
                  onKeyDown={e => { if (e.key === 'Enter') void submitGear() }}
                  style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: FB, fontSize: 14 }} />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={() => void submitGear()} disabled={busy || !(draftName.trim() || draftBrand.trim())}
                    style={{ flex: 1, padding: '9px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? '…' : 'Ajouter'}
                  </button>
                  <button onClick={() => { setAdding(false); setDraftName(''); setDraftBrand('') }}
                    style={{ padding: '9px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 'var(--space-3)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-mid)', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                + Ajouter {kind === 'bike' ? 'un vélo' : 'des chaussures'}
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
