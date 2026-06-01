'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Menu } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import type { CategorieCompetence, CompetenceWithUserState } from '@/types/competences'
import { useCompetences } from './hooks/useCompetences'
import { useUserCompetences } from './hooks/useUserCompetences'
import SportSidebar from './components/SportSidebar'
import CompetencesLibrary from './components/CompetencesLibrary'
import CreateCompetencePanel from './components/CreateCompetencePanel'
import MobileSidebar from './components/MobileSidebar'
import CompetenceCard from './components/CompetenceCard'
import { SPORTS_ORDER, SPORT_LABELS, sportIcon, type SportFilter, type CompetenceTab } from './constants'

export default function CompetencesPage() {
  useTheme()
  const { competences, setCompetences, loading } = useCompetences()
  const { checkLimit, detectConflicts, toggleCompetence } = useUserCompetences()

  const [activeSport, setActiveSport]       = useState<SportFilter>('all')
  const [activeCategory, setActiveCategory] = useState<CategorieCompetence | null>(null)
  const [activeTab, setActiveTab]           = useState<CompetenceTab>('toutes')
  const [mobileSidebarOpen, setMobileOpen]  = useState(false)
  const [isDesktop, setIsDesktop]           = useState(true)
  const [notice, setNotice]                 = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const limit = useMemo(() => checkLimit(competences), [checkLimit, competences])

  const conflictsFor = useCallback(
    (c: CompetenceWithUserState) => detectConflicts(c, competences),
    [detectConflicts, competences],
  )

  // Filtrage
  const filtered = useMemo(() => competences.filter(c => {
    if (activeSport !== 'all' && !c.sports.includes(activeSport)) return false
    if (activeCategory && c.categorie !== activeCategory) return false
    if (activeTab === 'actives' && !c.user_state?.active) return false
    if (activeTab === 'miennes' && c.is_predefined) return false
    return true
  }), [competences, activeSport, activeCategory, activeTab])

  const handleToggle = useCallback(async (c: CompetenceWithUserState) => {
    const currentlyActive = c.user_state?.active ?? false

    if (!currentlyActive) {
      // Vérifier la limite
      if (!limit.can_activate_more) {
        setNotice(`Limite atteinte : ${limit.limit} compétences actives (plan ${limit.planLabel}).`)
        return
      }
      // Vérifier les conflits
      const conflicts = detectConflicts(c, competences)
      if (conflicts.length > 0) {
        setNotice(`Conflit avec « ${conflicts[0].nom} » — désactive-la d'abord.`)
        return
      }
    }

    // Optimistic update
    setCompetences(prev => prev.map(x => x.id === c.id
      ? { ...x, user_state: { active: !currentlyActive, prompt_custom: x.user_state?.prompt_custom ?? null, activated_at: !currentlyActive ? new Date().toISOString() : null } }
      : x))

    const res = await toggleCompetence(c.id, currentlyActive)
    if (!res.ok) {
      setNotice(res.error ?? 'Erreur lors de la mise à jour.')
      // rollback
      setCompetences(prev => prev.map(x => x.id === c.id
        ? { ...x, user_state: { active: currentlyActive, prompt_custom: x.user_state?.prompt_custom ?? null, activated_at: x.user_state?.activated_at ?? null } }
        : x))
    }
  }, [competences, limit, detectConflicts, toggleCompetence, setCompetences])

  const handleOpenDetail = useCallback((c: CompetenceWithUserState) => {
    // Modal de détail : prompt 4
    console.log('Modal détail à venir', c.id)
  }, [])

  const focusCreate = useCallback(() => {
    const el = document.getElementById('create-competence-input')
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLTextAreaElement).focus() }
  }, [])

  const badge = (
    <span style={{ fontSize: 11, border: '0.5px solid var(--border)', borderRadius: 20, padding: '4px 12px', color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#06B6D4', fontWeight: 700 }}>{limit.active_count}</span> / {limit.limit} actives · Plan {limit.planLabel}
    </span>
  )

  // ══════════════════ MOBILE ══════════════════
  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 90 }}>
        {/* Header mobile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 18px 14px' }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Filtres"
            style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Menu size={16} color="var(--text)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Compétences</div>
            <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>Personnalise ton coach IA</div>
          </div>
          <button onClick={focusCreate} aria-label="Créer"
            style={{ width: 28, height: 28, borderRadius: 7, background: '#06B6D4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={16} color="#fff" />
          </button>
        </div>

        {/* Chips sports */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 14px 12px' }}>
          {SPORTS_ORDER.map(s => {
            const a = activeSport === s
            return (
              <button key={s} onClick={() => setActiveSport(s)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  fontSize: 11, padding: '5px 12px', borderRadius: 16, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  border: `0.5px solid ${a ? 'rgba(6,182,212,0.4)' : 'var(--border)'}`,
                  background: a ? 'rgba(6,182,212,0.12)' : 'transparent',
                  color: a ? '#06B6D4' : 'var(--text-mid)',
                }}>
                {sportIcon(s, 12)}{SPORT_LABELS[s]}
              </button>
            )
          })}
        </div>

        {/* Compteur */}
        <div style={{ fontSize: 10, color: 'var(--text-mid)', padding: '0 14px 8px' }}>
          <span style={{ color: '#06B6D4', fontWeight: 700 }}>{limit.active_count}</span> / {limit.limit} actives · Plan {limit.planLabel}
        </div>

        {/* Notice */}
        {notice && <div style={noticeStyle}>{notice}</div>}

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px' }}>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>Aucune compétence dans ce filtre.</p>
          ) : (
            filtered.map(c => (
              <CompetenceCard key={c.id} competence={c} conflicts={conflictsFor(c)} compact
                onToggle={() => handleToggle(c)} onOpenDetail={() => handleOpenDetail(c)} />
            ))
          )}
        </div>

        <CreateCompetencePanel variant="mobile" />

        <MobileSidebar
          open={mobileSidebarOpen}
          onClose={() => setMobileOpen(false)}
          activeSport={activeSport}
          activeCategory={activeCategory}
          activeTab={activeTab}
          onSelectSport={setActiveSport}
          onSelectCategory={setActiveCategory}
          onSelectTab={setActiveTab}
        />
      </div>
    )
  }

  // ══════════════════ DESKTOP ══════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Compétences</h1>
          <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '2px 0 0' }}>Personnalise le comportement de ton coach IA</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {badge}
          <button onClick={focusCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <Plus size={15} /> Créer
          </button>
        </div>
      </div>

      {notice && <div style={noticeStyle}>{notice}</div>}

      {/* 3 colonnes */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 200, flexShrink: 0, borderRight: '0.5px solid var(--border)', padding: '12px 8px', overflowY: 'auto' }}>
          <SportSidebar
            activeSport={activeSport}
            activeCategory={activeCategory}
            onSelectSport={setActiveSport}
            onSelectCategory={setActiveCategory}
          />
        </div>

        <CompetencesLibrary
          competences={filtered}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          conflictsFor={conflictsFor}
          onToggle={handleToggle}
          onOpenDetail={handleOpenDetail}
          loading={loading}
        />

        <CreateCompetencePanel variant="desktop" />
      </div>
    </div>
  )
}

const noticeStyle: React.CSSProperties = {
  margin: '8px 14px', padding: '8px 12px', borderRadius: 8,
  background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)',
  color: '#ef4444', fontSize: 12,
}
