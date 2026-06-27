'use client'
// ══════════════════════════════════════════════════════════════════
// Builder — « Mes séances en réserve » de l'athlète.
//  • Grille des sports (esthétique Bibliothèque) ↔ détail d'un sport.
//  • La réserve EST la table session_favorites : les séances créées ici
//    apparaissent aussi dans le Planning (« Charger un favori »).
//  • Création / édition via le VRAI éditeur du Planning (SessionEditor),
//    en mode « réserve » (sans Sport/Date/Heure — séance non planifiée).
//  • Filtre par type de séance + étoile « préférée » par sport.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, useCallback } from 'react'
import { IconArrowLeft, IconPlus, IconPencil, IconTrash, IconStar, IconStarFilled } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { SlideView } from '@/components/ui/SlideView'
import { SessionEditor } from '@/components/planning/SessionEditor'
import type { NutritionItem } from '@/components/planning/SessionEditor'
import { type Block, type Session, type SportType } from '@/app/planning/page'
import { BuilderSportGrid } from './BuilderSportGrid'
import { BUILDER_THEME, BUILDER_ORDER, builderIdFromPlanning, type BuilderSportId } from './builderTheme'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

interface Fav {
  id: string
  name: string
  sport: string
  training_type: string | null
  blocks_data: Block[] | null
  nutrition_data: NutritionItem[] | null
  duration_min: number | null
  rpe: number | null
  notes: string | null
  starred: boolean
}

type EditorState =
  | { mode: 'create'; sport: SportType }
  | { mode: 'edit'; fav: Fav }
  | null

const favTypes = (fav: Fav) => (fav.training_type ?? '').split('+').filter(Boolean)

function fmtDur(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

function favToSession(fav: Fav): Session {
  return {
    id: fav.id,
    sport: fav.sport as SportType,
    title: fav.name,
    time: '09:00',
    durationMin: fav.duration_min ?? 60,
    status: 'planned',
    notes: fav.notes ?? undefined,
    blocks: fav.blocks_data ?? [],
    rpe: fav.rpe ?? 5,
    dayIndex: 0,
    trainingTypes: favTypes(fav),
    nutritionItems: fav.nutrition_data ?? undefined,
  }
}

// ── Carte d'une séance en réserve ─────────────────────────────────
function ReserveCard({ fav, accent, onEdit, onDelete, onToggleStar }: {
  fav: Fav; accent: string; onEdit: () => void; onDelete: () => void; onToggleStar: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const types = favTypes(fav)
  const nBlocks = fav.blocks_data?.length ?? 0
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
      padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0, marginTop: 7 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.3 }}>{fav.name}</h3>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {types.map(tp => (
              <span key={tp} style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--bg-card2)',
                fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-mid)' }}>{tp}</span>
            ))}
          </div>
        </div>
        <button onClick={onToggleStar} aria-label={fav.starred ? 'Retirer des favoris' : 'Marquer comme favori'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
            color: fav.starred ? 'var(--lib-triathlon)' : 'var(--text-dim)', display: 'flex' }}>
          {fav.starred ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
        <span>{fmtDur(fav.duration_min ?? 60)}</span>
        {nBlocks > 0 && <span>{nBlocks} bloc{nBlocks > 1 ? 's' : ''}</span>}
        {fav.rpe != null && <span>RPE {fav.rpe}/10</span>}
      </div>

      {confirm ? (
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ flex: 1, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>Supprimer cette séance ?</span>
          <button onClick={() => setConfirm(false)}
            style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          <button onClick={onDelete}
            style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--zone-5)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button onClick={onEdit}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0',
              borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)',
              fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <IconPencil size={15} /> Modifier
          </button>
          <button onClick={() => setConfirm(true)} aria-label="Supprimer"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px',
              borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <IconTrash size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

export function BuilderReserve() {
  const [favs, setFavs] = useState<Fav[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<BuilderSportId | null>(null)
  const [dir, setDir] = useState(1)
  const [editor, setEditor] = useState<EditorState>(null)
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [starredOnly, setStarredOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setFavs([]); return }
      const { data } = await sb.from('session_favorites')
        .select('id,name,sport,training_type,blocks_data,nutrition_data,duration_min,rpe,notes,starred')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setFavs((data as Fav[]) ?? [])
    } catch { setFavs([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSave(s: Session) {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const row = {
        user_id: user.id, name: s.title, sport: s.sport,
        training_type: s.trainingTypes && s.trainingTypes.length > 0 ? s.trainingTypes.join('+') : null,
        blocks_data: s.blocks, nutrition_data: s.nutritionItems ?? null,
        duration_min: s.durationMin, rpe: s.rpe ?? null, notes: s.notes ?? null,
      }
      if (editor?.mode === 'edit') await sb.from('session_favorites').update(row).eq('id', editor.fav.id)
      else await sb.from('session_favorites').insert(row)
      await load()
    } catch { /* best-effort */ }
    setEditor(null)
  }

  async function handleDelete(id: string) {
    try {
      const sb = createClient()
      await sb.from('session_favorites').delete().eq('id', id)
    } catch { /* ignore */ }
    await load()
  }

  async function toggleStar(fav: Fav) {
    // Optimiste : on bascule localement, puis on persiste.
    setFavs(prev => prev.map(f => f.id === fav.id ? { ...f, starred: !f.starred } : f))
    try {
      const sb = createClient()
      await sb.from('session_favorites').update({ starred: !fav.starred }).eq('id', fav.id)
    } catch { void load() }
  }

  function openSport(id: BuilderSportId) { setDir(1); setTypeFilters([]); setStarredOnly(false); setSport(id) }
  function backToGrid() { setDir(-1); setTypeFilters([]); setStarredOnly(false); setSport(null) }
  function toggleType(tp: string) {
    setTypeFilters(prev => prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp])
  }

  const counts = useMemo(() => BUILDER_ORDER.reduce((acc, id) => {
    acc[id] = favs.filter(f => builderIdFromPlanning(f.sport) === id).length
    return acc
  }, {} as Record<BuilderSportId, number>), [favs])

  const theme = sport ? BUILDER_THEME[sport] : null
  const sportFavs = useMemo(
    () => sport ? favs.filter(f => builderIdFromPlanning(f.sport) === sport) : [],
    [favs, sport],
  )

  // Types présents dans ce sport (pour la barre de filtres).
  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    sportFavs.forEach(f => favTypes(f).forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [sportFavs])

  // Filtrage + tri (préférées d'abord).
  const displayed = useMemo(() => sportFavs
    .filter(f => !starredOnly || f.starred)
    .filter(f => typeFilters.length === 0 || favTypes(f).some(t => typeFilters.includes(t)))
    .slice()
    .sort((a, b) => Number(b.starred) - Number(a.starred)),
    [sportFavs, starredOnly, typeFilters],
  )

  const chip = (active: boolean, accent: string): React.CSSProperties => ({
    padding: '5px 13px', borderRadius: 99,
    border: `1px solid ${active ? accent : 'var(--border)'}`,
    background: active ? accent : 'transparent',
    color: active ? 'var(--on-primary)' : 'var(--text-dim)',
    fontFamily: FB, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={sport ? `sport-${sport}` : 'grid'} direction={dir}>
        {sport && theme ? (
          <div>
            <button onClick={backToGrid} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13,
              padding: '4px 0', marginBottom: 'var(--space-4)' }}>
              <IconArrowLeft size={16} /> Sports
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)',
              flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent, flexShrink: 0 }} />
                <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{theme.label}</h2>
              </div>
              <button onClick={() => setEditor({ mode: 'create', sport: theme.planning })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 'var(--r-sm)',
                  border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <IconPlus size={16} /> Nouvelle séance
              </button>
            </div>

            {/* Barre de filtres : ⭐ Favoris + types de séance */}
            {sportFavs.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <button onClick={() => setStarredOnly(v => !v)}
                  style={{ ...chip(starredOnly, 'var(--lib-triathlon)'), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {starredOnly ? <IconStarFilled size={13} /> : <IconStar size={13} />} Favoris
                </button>
                {availableTypes.map(tp => (
                  <button key={tp} style={chip(typeFilters.includes(tp), theme.accent)} onClick={() => toggleType(tp)}>{tp}</button>
                ))}
                {(typeFilters.length > 0 || starredOnly) && (
                  <button onClick={() => { setTypeFilters([]); setStarredOnly(false) }}
                    style={{ padding: '4px 10px', borderRadius: 99, border: 'none', background: 'transparent',
                      color: 'var(--text-dim)', fontFamily: FB, fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>
                    Effacer
                  </button>
                )}
              </div>
            )}

            {displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>
                  {sportFavs.length === 0
                    ? `Aucune séance ${theme.label.toLowerCase()} en réserve.`
                    : 'Aucune séance pour ces filtres.'}
                </p>
                {sportFavs.length === 0 ? (
                  <button onClick={() => setEditor({ mode: 'create', sport: theme.planning })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 'var(--r-md)',
                      border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13,
                      fontWeight: 600, cursor: 'pointer' }}>
                    <IconPlus size={16} /> Créer une séance
                  </button>
                ) : (
                  <button onClick={() => { setTypeFilters([]); setStarredOnly(false) }}
                    style={{ padding: '10px 22px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, cursor: 'pointer' }}>
                    Effacer les filtres
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--space-4)' }} id="reserve-grid">
                {displayed.map(f => (
                  <ReserveCard key={f.id} fav={f} accent={theme.accent}
                    onEdit={() => setEditor({ mode: 'edit', fav: f })}
                    onDelete={() => void handleDelete(f.id)}
                    onToggleStar={() => void toggleStar(f)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</div>
          ) : (
            <BuilderSportGrid counts={counts} onSelect={openSport} />
          )
        )}
      </SlideView>

      {/* Éditeur Planning en mode réserve (sans Sport / Date / Heure) */}
      {editor && (
        <SessionEditor
          mode={editor.mode}
          reserveMode
          session={editor.mode === 'edit' ? favToSession(editor.fav) : undefined}
          initialSport={editor.mode === 'create' ? editor.sport : undefined}
          onClose={() => setEditor(null)}
          onSave={(s) => { void handleSave(s) }}
          onDelete={editor.mode === 'edit' ? (id: string) => { void handleDelete(id); setEditor(null) } : undefined}
        />
      )}

      <style>{`@media (max-width:600px){#reserve-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}
