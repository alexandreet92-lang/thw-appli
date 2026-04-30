'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────

interface AutreCourse {
  nom: string
  date?: string
  importance?: 'A' | 'B' | 'C'
  temps_vise?: string
}

type Statut = 'nouveau' | 'en_cours' | 'accepte' | 'refuse'

interface Questionnaire {
  id: string
  created_at: string
  updated_at: string
  statut: Statut
  notes_coach: string | null
  prenom: string
  nom: string
  email: string
  age: number | null
  sexe: string | null
  objectif_sport: string | null
  objectif_course: string | null
  objectif_date: string | null
  objectif_temps: string | null
  autres_courses: AutreCourse[]
  heures_par_semaine: number | null
  jours_disponibles: string[]
  contraintes: string | null
  blessures: string | null
  montre_gps: boolean
  capteur_puissance: boolean
  home_trainer: boolean
  salle_muscu: boolean
  strava_connecte: boolean
  coaching_type: 'pack' | 'abonnement' | null
  coaching_duree: string | null
  coaching_sport: string | null
  coaching_objectif: string | null
  option_renfo: boolean
  niveau_suivi: string | null
  infos_complementaires: string | null
}

// ── Config ─────────────────────────────────────────────────────────

const STATUTS: Record<Statut, { label: string; color: string; bg: string }> = {
  nouveau:  { label: 'Nouveau',  color: '#00c8e0', bg: 'rgba(0,200,224,0.12)'  },
  en_cours: { label: 'En cours', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  accepte:  { label: 'Accepté',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  refuse:   { label: 'Refusé',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
}

const SPORT_COLORS: Record<string, { color: string; bg: string }> = {
  running:   { color: '#f97316', bg: 'rgba(249,115,22,0.13)' },
  trail:     { color: '#f97316', bg: 'rgba(249,115,22,0.13)' },
  marathon:  { color: '#f97316', bg: 'rgba(249,115,22,0.13)' },
  cycling:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  velo:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  triathlon: { color: '#06b6d4', bg: 'rgba(6,182,212,0.13)'  },
  natation:  { color: '#06b6d4', bg: 'rgba(6,182,212,0.13)'  },
  gym:       { color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)' },
  hyrox:     { color: '#ec4899', bg: 'rgba(236,72,153,0.13)' },
}

function sportColor(sport: string | null) {
  if (!sport) return { color: 'var(--text-dim)', bg: 'var(--bg-card2)' }
  return SPORT_COLORS[sport.toLowerCase()] ?? { color: 'var(--text-mid)', bg: 'var(--bg-card2)' }
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Micro-composants ───────────────────────────────────────────────

function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUTS[statut]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      fontFamily: 'DM Sans, sans-serif',
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}44`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function SportBadge({ sport }: { sport: string | null }) {
  const { color, bg } = sportColor(sport)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'capitalize',
      fontFamily: 'DM Sans, sans-serif',
      color, background: bg,
      border: `1px solid ${color}33`,
      whiteSpace: 'nowrap',
    }}>
      {sport ?? '—'}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif',
        marginBottom: 10, paddingBottom: 6,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  )
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0',
      borderBottom: '1px solid var(--border)',
      fontSize: 12, fontFamily: 'DM Sans, sans-serif',
      color: value ? 'var(--text)' : 'var(--text-dim)',
    }}>
      <span>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: value ? '#22c55e' : 'var(--text-dim)' }}>
        {value ? '✓ Oui' : '—'}
      </span>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────

const COL = '200px 1fr 110px 110px 170px 100px 100px'

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
      {[160, 120, 80, 80, 130, 70, 70].map((w, i) => (
        <div key={i} style={{ height: 13, borderRadius: 6, background: 'var(--bg-card2)', width: w, maxWidth: '100%', animation: 'shimmer 1.6s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

// ── Panneau détail ─────────────────────────────────────────────────

function DetailPanel({
  q, notes, onNotesChange, onSaveNotes, onStatut, onClose, saving,
}: {
  q: Questionnaire
  notes: string
  onNotesChange: (v: string) => void
  onSaveNotes: () => void
  onStatut: (s: Statut) => void
  onClose: () => void
  saving: boolean
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        zIndex: 50,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.28)',
        overflowY: 'auto',
      }}>

        {/* Header sticky */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0, position: 'sticky', top: 0,
          background: 'var(--bg-card)', zIndex: 1,
        }}>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-mid)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.prenom} {q.nom}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Soumis le {fmtDate(q.created_at)}
            </div>
          </div>
          <StatutBadge statut={q.statut} />
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 32px', flex: 1 }}>

          {/* Boutons statut */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 }}>
              Changer le statut
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.entries(STATUTS) as [Statut, typeof STATUTS[Statut]][]).map(([key, s]) => {
                const active = q.statut === key
                return (
                  <button
                    key={key}
                    onClick={() => onStatut(key)}
                    disabled={saving || active}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: active ? 'default' : 'pointer',
                      fontSize: 12, fontWeight: active ? 700 : 400,
                      fontFamily: 'DM Sans, sans-serif',
                      color: active ? s.color : 'var(--text-mid)',
                      background: active ? s.bg : 'transparent',
                      border: `1px solid ${active ? s.color + '55' : 'var(--border)'}`,
                      transition: 'all 0.14s',
                      opacity: saving && !active ? 0.5 : 1,
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Identité */}
          <Section title="Identité">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Prénom" value={q.prenom} />
              <Field label="Nom" value={q.nom} />
              <Field label="Âge" value={q.age ? `${q.age} ans` : null} />
              <Field label="Sexe" value={q.sexe} />
            </div>
            <Field label="Email" value={q.email} />
          </Section>

          {/* Objectif principal */}
          <Section title="Objectif principal">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Sport" value={q.objectif_sport} />
              <Field label="Temps visé" value={q.objectif_temps} />
            </div>
            <Field label="Course / épreuve" value={q.objectif_course} />
            <Field label="Date" value={q.objectif_date ? fmtDate(q.objectif_date) : null} />
          </Section>

          {/* Autres courses */}
          {q.autres_courses?.length > 0 && (
            <Section title="Autres courses de la saison">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.autres_courses.map((c, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>{c.nom}</span>
                      {c.importance && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: c.importance === 'A' ? '#ef4444' : c.importance === 'B' ? '#f97316' : '#22c55e',
                          background: c.importance === 'A' ? 'rgba(239,68,68,0.1)' : c.importance === 'B' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
                          padding: '2px 7px', borderRadius: 4,
                          fontFamily: 'DM Sans, sans-serif',
                        }}>
                          {c.importance}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
                      {fmtDate(c.date)}{c.temps_vise ? ` · ${c.temps_vise}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Mode de vie */}
          <Section title="Mode de vie">
            <Field label="Heures d'entraînement / semaine" value={q.heures_par_semaine ? `${q.heures_par_semaine}h` : null} />
            {q.jours_disponibles?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>
                  Jours disponibles
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {q.jours_disponibles.map(j => (
                    <span key={j} style={{ padding: '3px 9px', borderRadius: 6, background: 'rgba(0,200,224,0.1)', color: '#00c8e0', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(0,200,224,0.2)' }}>
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Field label="Contraintes pro / perso" value={q.contraintes} />
            <Field label="Blessures / antécédents" value={q.blessures} />
          </Section>

          {/* Matériel */}
          <Section title="Matériel">
            <BoolRow label="Montre GPS" value={q.montre_gps} />
            <BoolRow label="Capteur de puissance" value={q.capteur_puissance} />
            <BoolRow label="Home trainer" value={q.home_trainer} />
            <BoolRow label="Salle de muscu" value={q.salle_muscu} />
            <BoolRow label="Strava connecté" value={q.strava_connecte} />
          </Section>

          {/* Coaching choisi */}
          <Section title="Coaching choisi">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Type" value={q.coaching_type === 'pack' ? 'Pack' : q.coaching_type === 'abonnement' ? 'Abonnement' : null} />
              <Field label="Durée" value={q.coaching_duree} />
              <Field label="Sport" value={q.coaching_sport} />
            </div>
            <Field label="Objectif coaching" value={q.coaching_objectif} />
          </Section>

          {/* Options */}
          <Section title="Options">
            <BoolRow label="Renforcement musculaire" value={q.option_renfo} />
            <Field label="Niveau de suivi" value={q.niveau_suivi} />
          </Section>

          {/* Infos complémentaires */}
          {q.infos_complementaires && (
            <Section title="Informations complémentaires">
              <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.65, background: 'var(--bg-card2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                {q.infos_complementaires}
              </div>
            </Section>
          )}

          {/* Notes coach */}
          <Section title="Notes coach">
            <textarea
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Ajouter des notes sur ce candidat…"
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                transition: 'border-color 0.14s',
              }}
              onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(0,200,224,0.5)' }}
              onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)' }}
            />
            <button
              onClick={onSaveNotes}
              disabled={saving}
              style={{
                marginTop: 8, padding: '8px 18px', borderRadius: 8,
                background: saving ? 'var(--bg-card2)' : '#00c8e0',
                color: saving ? 'var(--text-dim)' : '#000',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.14s',
              }}
            >
              {saving ? 'Enregistrement…' : 'Sauvegarder les notes'}
            </button>
          </Section>

        </div>
      </div>
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────

export default function QuestionnairePage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<Statut | ''>('')
  const [filterSport, setFilterSport] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selected = questionnaires.find(q => q.id === selectedId) ?? null

  useEffect(() => {
    if (selectedId) {
      const q = questionnaires.find(x => x.id === selectedId)
      setNotes(q?.notes_coach ?? '')
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/questionnaire?limit=100', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { questionnaires: Questionnaire[] }
      setQuestionnaires(data.questionnaires ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const sports = [...new Set(questionnaires.map(q => q.objectif_sport).filter(Boolean))] as string[]

  const filtered = questionnaires.filter(q => {
    if (filterStatut && q.statut !== filterStatut) return false
    if (filterSport && !q.objectif_sport?.toLowerCase().includes(filterSport.toLowerCase())) return false
    if (search) {
      const s = search.toLowerCase()
      if (!`${q.nom} ${q.prenom} ${q.email}`.toLowerCase().includes(s)) return false
    }
    return true
  })

  const countNouveau = questionnaires.filter(q => q.statut === 'nouveau').length

  async function updateStatut(id: string, statut: Statut) {
    setSaving(true)
    try {
      const res = await fetch(`/api/questionnaire?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (res.ok) setQuestionnaires(prev => prev.map(q => q.id === id ? { ...q, statut } : q))
    } finally { setSaving(false) }
  }

  async function saveNotes() {
    if (!selectedId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/questionnaire?id=${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_coach: notes }),
      })
      if (res.ok) setQuestionnaires(prev => prev.map(q => q.id === selectedId ? { ...q, notes_coach: notes } : q))
    } finally { setSaving(false) }
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.35 }
        }
      `}</style>

      <div style={{ padding: '28px 24px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
              Candidatures
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: '4px 0 0' }}>
              Questionnaires reçus depuis le site web
            </p>
          </div>
          {countNouveau > 0 && (
            <span style={{
              padding: '4px 11px', borderRadius: 99, marginBottom: 3,
              background: 'rgba(0,200,224,0.12)', color: '#00c8e0',
              fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(0,200,224,0.3)',
            }}>
              {countNouveau} nouveau{countNouveau > 1 ? 'x' : ''}
            </span>
          )}
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Recherche */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filtre statut */}
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value as Statut | '')}
            style={{
              height: 36, padding: '0 28px 0 10px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}
          >
            <option value="">Tous les statuts</option>
            {(Object.entries(STATUTS) as [Statut, typeof STATUTS[Statut]][]).map(([k, s]) => (
              <option key={k} value={k}>{s.label}</option>
            ))}
          </select>

          {/* Filtre sport */}
          <select
            value={filterSport}
            onChange={e => setFilterSport(e.target.value)}
            style={{
              height: 36, padding: '0 28px 0 10px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}
          >
            <option value="">Tous les sports</option>
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
            {loading ? '…' : `${filtered.length} / ${questionnaires.length} candidature${questionnaires.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── Tableau ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>

          {/* En-têtes */}
          <div style={{
            display: 'grid', gridTemplateColumns: COL, gap: 12,
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card2)',
          }}>
            {['Athlète', 'Email', 'Sport', 'Coaching', 'Objectif', 'Soumis le', 'Statut'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Skeletons */}
          {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {/* État vide */}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              {questionnaires.length === 0
                ? 'Aucune candidature reçue pour le moment'
                : 'Aucune candidature ne correspond aux filtres'
              }
            </div>
          )}

          {/* Lignes */}
          {!loading && filtered.map(q => (
            <div
              key={q.id}
              onClick={() => setSelectedId(prev => prev === q.id ? null : q.id)}
              style={{
                display: 'grid', gridTemplateColumns: COL, gap: 12,
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                alignItems: 'center', cursor: 'pointer',
                background: selectedId === q.id ? 'rgba(0,200,224,0.06)' : 'transparent',
                transition: 'background 0.12s',
                borderLeft: `3px solid ${selectedId === q.id ? '#00c8e0' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (selectedId !== q.id) (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,224,0.04)' }}
              onMouseLeave={e => { if (selectedId !== q.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Athlète */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
                  {q.prenom} {q.nom}
                </div>
              </div>

              {/* Email */}
              <div style={{ fontSize: 12, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.email}
              </div>

              {/* Sport */}
              <div><SportBadge sport={q.objectif_sport} /></div>

              {/* Coaching */}
              <div style={{ fontSize: 12, color: 'var(--text-mid)', textTransform: 'capitalize' }}>
                {q.coaching_type ?? '—'}
              </div>

              {/* Objectif */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.objectif_course ?? '—'}
                </div>
                {q.objectif_date && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
                    {fmtDate(q.objectif_date)}
                  </div>
                )}
              </div>

              {/* Date soumission */}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                {fmtDate(q.created_at)}
              </div>

              {/* Statut */}
              <div><StatutBadge statut={q.statut} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau détail ── */}
      {selected && (
        <DetailPanel
          q={selected}
          notes={notes}
          onNotesChange={setNotes}
          onSaveNotes={saveNotes}
          onStatut={s => updateStatut(selected.id, s)}
          onClose={() => setSelectedId(null)}
          saving={saving}
        />
      )}
    </>
  )
}
