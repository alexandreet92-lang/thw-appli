'use client'
// ══════════════════════════════════════════════════════════════════
// Sélecteur d'exercices muscu pour le builder Planning — MÊME navigation que
// la page Session : groupes (Push/Pull/Legs/Haltéro/Core) → familles → variantes.
// Source unique : FAMILLES_MUSCU (src/data/exercices). Sélectionner une unité
// la convertit en ExoDefinition (defForFamille / defForVariante) et la remonte
// au builder via onPick. Recherche transverse sur tout (familles + variantes).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { IconSearch, IconChevronRight, IconArrowLeft, IconBarbell } from '@tabler/icons-react'
import {
  FAMILLES_MUSCU, GROUPE_ORDER, GROUPE_LABEL, GROUPE_SUBTITLE, MODE_LABEL,
  primaryMode, type FamilleExercice, type Groupe,
} from '@/data/exercices'
import { defForFamille, defForVariante } from '../biblioExercises'
import type { ExoDefinition } from '../exercises'

const famsOf = (g: Groupe) => FAMILLES_MUSCU.filter(f => f.groupe === g)

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
  padding: '10px 8px', border: 'none', borderRadius: 10, cursor: 'pointer',
  background: 'var(--se-card2)', marginBottom: 6,
}
const titleStyle: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: 'var(--se-text)' }
const subStyle: React.CSSProperties = { fontSize: 11, color: 'var(--se-dim)', marginTop: 2 }

function metaLine(f: FamilleExercice): string {
  return `${MODE_LABEL[primaryMode(f.modes)]} · Diff. ${f.difficulteTechnique}/10` +
    (f.variantes.length ? ` · ${f.variantes.length} variante${f.variantes.length > 1 ? 's' : ''}` : '')
}

export function ExercisePicker({ accent, onPick, onCustom }: {
  accent: string
  onPick: (def: ExoDefinition) => void
  onCustom: (name: string) => void
}) {
  const [groupe, setGroupe] = useState<Groupe | null>(null)
  const [famille, setFamille] = useState<FamilleExercice | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!q) return []
    const out: { key: string; def: ExoDefinition; sub: string }[] = []
    for (const f of FAMILLES_MUSCU) {
      if (f.nom.toLowerCase().includes(q)) out.push({ key: `f_${f.id}`, def: defForFamille(f), sub: GROUPE_LABEL[f.groupe] })
      for (const v of f.variantes) if (v.nom.toLowerCase().includes(q)) out.push({ key: `v_${v.id}`, def: defForVariante(f, v), sub: f.nom })
    }
    return out.slice(0, 40)
  }, [q])

  const bubble = (
    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}1f`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <IconBarbell size={17} />
    </div>
  )

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', background: 'var(--se-card)', padding: 10 }}>
      {/* Barre de recherche + retour contextuel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {(groupe || famille) && !q && (
          <button type="button" aria-label="Retour" onClick={() => famille ? setFamille(null) : setGroupe(null)}
            style={{ border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <IconArrowLeft size={17} />
          </button>
        )}
        <IconSearch size={15} color="var(--se-dim)" />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un exercice…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--se-text)' }} />
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* RECHERCHE transverse */}
        {q ? (
          <>
            {searchResults.map(r => (
              <button key={r.key} type="button" onClick={() => onPick(r.def)} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={titleStyle}>{r.def.name}</div>
                  <div style={subStyle}>{r.sub}</div>
                </div>
              </button>
            ))}
            <button type="button" onClick={() => onCustom(query.trim())}
              style={{ ...rowStyle, background: 'transparent', border: '1px dashed var(--se-rule)', color: accent }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>+ Créer « {query.trim()} »</span>
            </button>
          </>
        ) : famille ? (
          /* VARIANTES d'une famille (+ le mouvement-clé) */
          <>
            <button type="button" onClick={() => onPick(defForFamille(famille))} style={rowStyle}>
              {bubble}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={titleStyle}>{famille.nom}</div>
                <div style={subStyle}>Mouvement-clé · {MODE_LABEL[primaryMode(famille.modes)]}</div>
              </div>
            </button>
            {famille.variantes.map(v => (
              <button key={v.id} type="button" onClick={() => onPick(defForVariante(famille, v))} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={titleStyle}>{v.nom}</div>
                  <div style={subStyle}>Diff. {v.difficulteTechnique}/10{v.note ? ` · ${v.note}` : ''}</div>
                </div>
              </button>
            ))}
          </>
        ) : groupe ? (
          /* FAMILLES d'un groupe */
          famsOf(groupe).map(f => (
            <button key={f.id} type="button" onClick={() => f.variantes.length ? setFamille(f) : onPick(defForFamille(f))} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={titleStyle}>{f.nom}</div>
                <div style={subStyle}>{metaLine(f)}</div>
              </div>
              {f.variantes.length > 0 && <IconChevronRight size={16} color="var(--se-dim)" />}
            </button>
          ))
        ) : (
          /* GROUPES (5 bulles) */
          GROUPE_ORDER.map(g => (
            <button key={g} type="button" onClick={() => setGroupe(g)} style={rowStyle}>
              {bubble}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={titleStyle}>{GROUPE_LABEL[g]}</div>
                <div style={subStyle}>{GROUPE_SUBTITLE[g]}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: accent, marginRight: 4 }}>{famsOf(g).length}</span>
              <IconChevronRight size={16} color="var(--se-dim)" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
