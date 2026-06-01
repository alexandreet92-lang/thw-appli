'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Menu, Lock, X } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { createClient } from '@/lib/supabase/client'
import type { CategorieCompetence, CompetenceWithUserState } from '@/types/competences'
import { useCompetences } from './hooks/useCompetences'
import { useUserCompetences } from './hooks/useUserCompetences'
import SportSidebar from './components/SportSidebar'
import CompetencesLibrary from './components/CompetencesLibrary'
import CreateCompetencePanel from './components/CreateCompetencePanel'
import MobileSidebar from './components/MobileSidebar'
import CompetenceCard from './components/CompetenceCard'
import CompetenceDetailModal from './components/CompetenceDetailModal'
import { SPORTS_ORDER, SPORT_LABELS, sportIcon, type SportFilter, type CompetenceTab } from './constants'

export default function CompetencesPage() {
  useTheme()
  const router = useRouter()
  const { competences, setCompetences, loading, reload } = useCompetences()
  const { checkLimit, detectConflicts, toggleCompetence } = useUserCompetences()

  const [activeSport, setActiveSport]       = useState<SportFilter>('all')
  const [activeCategory, setActiveCategory] = useState<CategorieCompetence | null>(null)
  const [activeTab, setActiveTab]           = useState<CompetenceTab>('toutes')
  const [mobileSidebarOpen, setMobileOpen]  = useState(false)
  const [isDesktop, setIsDesktop]           = useState(true)
  const [notice, setNotice]                 = useState<string | null>(null)
  const [detail, setDetail]                 = useState<CompetenceWithUserState | null>(null)
  const [conflictState, setConflictState]   = useState<{ target: CompetenceWithUserState; blocker: CompetenceWithUserState } | null>(null)
  const [limitModal, setLimitModal]         = useState(false)

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

  // Bascule optimiste + DB (sans vérifs — déjà faites par l'appelant)
  const applyToggle = useCallback(async (c: CompetenceWithUserState, currentlyActive: boolean) => {
    setCompetences(prev => prev.map(x => x.id === c.id
      ? { ...x, user_state: { active: !currentlyActive, prompt_custom: x.user_state?.prompt_custom ?? null, activated_at: !currentlyActive ? new Date().toISOString() : null } }
      : x))
    const res = await toggleCompetence(c.id, currentlyActive)
    if (!res.ok) {
      setNotice(res.error ?? 'Erreur lors de la mise à jour.')
      setCompetences(prev => prev.map(x => x.id === c.id
        ? { ...x, user_state: { active: currentlyActive, prompt_custom: x.user_state?.prompt_custom ?? null, activated_at: x.user_state?.activated_at ?? null } }
        : x))
    }
  }, [toggleCompetence, setCompetences])

  const handleToggle = useCallback(async (c: CompetenceWithUserState) => {
    const currentlyActive = c.user_state?.active ?? false

    if (!currentlyActive) {
      // Vérifier la limite → modal dédié
      if (!limit.can_activate_more) {
        setLimitModal(true)
        return
      }
      // Vérifier les conflits → proposer de désactiver l'autre
      const conflicts = detectConflicts(c, competences)
      if (conflicts.length > 0) {
        setConflictState({ target: c, blocker: conflicts[0] })
        return
      }
    }

    await applyToggle(c, currentlyActive)
  }, [competences, limit, detectConflicts, applyToggle])

  // Résolution de conflit : désactive l'autre puis active la cible
  const resolveConflict = useCallback(async () => {
    if (!conflictState) return
    const { target, blocker } = conflictState
    setConflictState(null)
    await applyToggle(blocker, true)   // blocker est actif → on le désactive
    await applyToggle(target, false)   // target est inactif → on l'active
  }, [conflictState, applyToggle])

  const handleOpenDetail = useCallback((c: CompetenceWithUserState) => {
    setDetail(c)
  }, [])

  // Sauvegarde du prompt remodelé
  const handleSaveDetail = useCallback(async (newPrompt: string) => {
    if (!detail) return
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setNotice('Non connecté'); return }
      if (!detail.is_predefined && detail.created_by === user.id) {
        // compétence custom du créateur → modifier le prompt de base
        await sb.from('competences').update({ prompt_base: newPrompt }).eq('id', detail.id)
      } else {
        // prédéfinie → override perso via user_competences
        await sb.from('user_competences').upsert(
          { user_id: user.id, competence_id: detail.id, prompt_custom: newPrompt },
          { onConflict: 'user_id,competence_id' },
        )
      }
      setNotice('Prompt enregistré')
      setDetail(null)
      await reload()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Erreur')
    }
  }, [detail, reload])

  const handleDeleteDetail = useCallback(async () => {
    if (!detail) return
    try {
      const sb = createClient()
      await sb.from('competences').delete().eq('id', detail.id)
      setNotice('Compétence supprimée')
      setDetail(null)
      await reload()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Erreur')
    }
  }, [detail, reload])

  const focusCreate = useCallback(() => {
    const el = document.getElementById('create-competence-input')
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLTextAreaElement).focus() }
  }, [])

  // Retour vers l'app / le Coach IA (le coach est un overlay, pas une route)
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }, [router])

  const badge = (
    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-alt)', border: '0.5px solid var(--border-mid)', borderRadius: 20, padding: '5px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: 13 }}>{limit.active_count}</span> / {limit.limit} actives · Plan {limit.planLabel}
    </span>
  )

  // Modal de détail + barre de résolution de conflit (rendus dans les 2 layouts)
  const overlays = (
    <>
      {detail && (
        <CompetenceDetailModal
          competence={detail}
          conflicts={conflictsFor(detail)}
          isOpen={!!detail}
          onClose={() => setDetail(null)}
          onSave={handleSaveDetail}
          onDelete={handleDeleteDetail}
        />
      )}
      {limitModal && (
        <div
          onClick={() => setLimitModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 420, width: '100%', background: 'var(--bg-card)',
              border: '0.5px solid var(--border-mid)', borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: '22px 22px 18px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} color="#06B6D4" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Limite atteinte</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-mid)' }}>
                  Plan {limit.planLabel} · {limit.limit} compétence{limit.limit > 1 ? 's' : ''} active{limit.limit > 1 ? 's' : ''} maximum
                </p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
              Désactive une compétence active pour en ajouter une autre, ou passe à un plan supérieur pour en activer davantage.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={() => { setActiveTab('actives'); setLimitModal(false) }}
                style={{ flex: 1, fontSize: 12.5, background: 'transparent', color: 'var(--text)', border: '0.5px solid var(--border-mid)', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Voir les compétences actives
              </button>
              <button
                onClick={() => router.push('/settings/subscription')}
                style={{ flex: 1, fontSize: 12.5, fontWeight: 500, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Découvrir les plans
              </button>
            </div>
          </div>
        </div>
      )}
      {conflictState && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 110,
          maxWidth: 480, width: 'calc(100% - 28px)',
          background: 'var(--bg-card)', border: '0.5px solid var(--border-mid)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)', padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--text)' }}>
            Cette compétence entre en conflit avec « {conflictState.blocker.nom} ».
          </span>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConflictState(null)} style={{ fontSize: 12, background: 'transparent', color: 'var(--text-mid)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>Annuler</button>
            <button onClick={() => void resolveConflict()} style={{ fontSize: 12, fontWeight: 500, background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>Désactiver l&apos;autre et activer celle-ci</button>
          </div>
        </div>
      )}
    </>
  )

  // ══════════════════ MOBILE ══════════════════
  if (!isDesktop) {
    return (
      <div className="competences-mobile-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--bg-card)' }}>
        {/* Header dédié — sticky */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '14px 16px', background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)',
        }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Filtres"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-alt)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Menu size={16} color="var(--text)" />
          </button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Compétences</div>
            <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>Personnalise ton coach IA</div>
          </div>
          <button onClick={goBack} aria-label="Retour au Coach IA"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} color="var(--text)" />
          </button>
        </div>

        {/* Chips sports */}
        <div className="comp-chips-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 12px' }}>
          {SPORTS_ORDER.map(s => {
            const a = activeSport === s
            return (
              <button key={s} onClick={() => setActiveSport(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  fontSize: 12, padding: '6px 14px', borderRadius: 18, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                  border: `0.5px solid ${a ? 'rgba(6,182,212,0.4)' : 'var(--border)'}`,
                  background: a ? 'rgba(6,182,212,0.12)' : 'var(--bg-card)',
                  color: a ? '#06B6D4' : 'var(--text-mid)',
                  fontWeight: a ? 500 : 400,
                }}>
                {sportIcon(s, 12)}{SPORT_LABELS[s]}
              </button>
            )
          })}
        </div>

        {/* Compteur sous les chips */}
        <div style={{ fontSize: 12, color: 'var(--text-mid)', padding: '0 16px 12px' }}>
          <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: 13 }}>{limit.active_count}</span> / {limit.limit} actives · Plan {limit.planLabel}
        </div>

        {/* Notice */}
        {notice && <div style={noticeStyle}>{notice}</div>}

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 120px' }}>
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

        <CreateCompetencePanel variant="mobile" limitReached={!limit.can_activate_more} onCreated={reload} onNotice={setNotice} />

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

        {overlays}
      </div>
    )
  }

  // ══════════════════ DESKTOP ══════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-card)' }}>
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

        <CreateCompetencePanel variant="desktop" limitReached={!limit.can_activate_more} onCreated={reload} onNotice={setNotice} />
      </div>

      {overlays}
    </div>
  )
}

const noticeStyle: React.CSSProperties = {
  margin: '8px 14px', padding: '8px 12px', borderRadius: 8,
  background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)',
  color: '#ef4444', fontSize: 12,
}
