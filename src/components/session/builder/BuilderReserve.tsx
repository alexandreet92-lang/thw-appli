'use client'
// ══════════════════════════════════════════════════════════════════
// Builder — « Mes séances en réserve » de l'athlète.
//  • Grille des sports (esthétique Bibliothèque) ↔ détail d'un sport.
//  • La réserve EST la table session_favorites : les séances créées ici
//    apparaissent aussi dans le Planning (« Charger un favori »).
//  • Création / édition via le VRAI éditeur du Planning (SessionEditor),
//    donc strictement la même expérience que sur la page Planning.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react'
import { IconArrowLeft, IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { SlideView } from '@/components/ui/SlideView'
import { SessionEditor } from '@/components/planning/SessionEditor'
import type { NutritionItem } from '@/components/planning/SessionEditor'
import { SPORT_LABEL, type Block, type Session, type SportType } from '@/app/planning/page'
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
}

type EditorState =
  | { mode: 'create'; sport: SportType }
  | { mode: 'edit'; fav: Fav }
  | null

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
    nutritionItems: fav.nutrition_data ?? undefined,
  }
}

// ── Carte d'une séance en réserve ─────────────────────────────────
function ReserveCard({ fav, accent, onEdit, onDelete }: {
  fav: Fav; accent: string; onEdit: () => void; onDelete: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const types = (fav.training_type ?? '').split('+').filter(Boolean)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setFavs([]); return }
      const { data } = await sb.from('session_favorites')
        .select('id,name,sport,training_type,blocks_data,nutrition_data,duration_min,rpe,notes')
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

  function openSport(id: BuilderSportId) { setDir(1); setSport(id) }
  function backToGrid() { setDir(-1); setSport(null) }

  const counts = BUILDER_ORDER.reduce((acc, id) => {
    acc[id] = favs.filter(f => builderIdFromPlanning(f.sport) === id).length
    return acc
  }, {} as Record<BuilderSportId, number>)

  const theme = sport ? BUILDER_THEME[sport] : null
  const sportFavs = sport ? favs.filter(f => builderIdFromPlanning(f.sport) === sport) : []

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

            {sportFavs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>
                  Aucune séance {theme.label.toLowerCase()} en réserve.
                </p>
                <button onClick={() => setEditor({ mode: 'create', sport: theme.planning })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 'var(--r-md)',
                    border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13,
                    fontWeight: 600, cursor: 'pointer' }}>
                  <IconPlus size={16} /> Créer une séance
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--space-4)' }} id="reserve-grid">
                {sportFavs.map(f => (
                  <ReserveCard key={f.id} fav={f} accent={theme.accent}
                    onEdit={() => setEditor({ mode: 'edit', fav: f })}
                    onDelete={() => void handleDelete(f.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</div>
          ) : (
            <BuilderSportGrid counts={counts} onSelect={openSport} onNew={() => setEditor({ mode: 'create', sport: 'run' })} />
          )
        )}
      </SlideView>

      {/* Éditeur Planning — exactement le même que sur la page Planning */}
      {editor && (
        <SessionEditor
          mode={editor.mode}
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
