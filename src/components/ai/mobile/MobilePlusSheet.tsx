'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — feuille « Ajouter » (bouton + du composeur).
//  · Caméra / Photos / Fichiers → gestionnaires de pièces jointes existants
//  · bande des photos récentes (médias des activités) → sélection multiple
//  · Actions rapides › (sous-écran : recherche + thèmes + liste)
//  · Parcours › (créer par l'IA / analyser un GPX-TCX) — masqué agent Coach
//  · Connecteurs › (sous-écran, état « connecté » existant)
//  · Compétences › (/competences)
//  · Recherche web (réglage persistant existant)
// Les sous-écrans glissent dans la feuille (SlideView), retour « ‹ Ajouter ».
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { Camera, File as FileIcon, Globe, Image as ImageIcon, Paperclip, Plug, Route, Search, Star, Zap, MapPin, Sparkle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { MobileSheet } from '../MobileSheet'
import { SlideView } from '@/components/ui/SlideView'
import { Switch } from '@/components/shadcn/switch'
import { quickActionEstimate } from '@/lib/quick-actions/models'
import { ModelEffigy } from '../ModelEffigy'
import { AimRow, AimSep, AimSheetHeader, AimSubTitle, AimTile } from './SheetParts'
import { aimModelName } from './MobileTopBar'
import type { AimAgent, AimConnector, AimQuickAction, AimTheme } from './types'

export type AimPlusScreen = 'main' | 'actions' | 'connecteurs' | 'parcours'

const SCREEN_ORDER: Record<AimPlusScreen, number> = { main: 0, actions: 1, connecteurs: 1, parcours: 1 }

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
function compactEstimate(tokens: number): string {
  return tokens >= 1000 ? `~${Math.round(tokens / 1000)} k` : `~${tokens}`
}

/** Liste d'actions rapides (sous-écran) — réutilisable. */
function QuickActionsScreen({ themes, actions, onRun }: {
  themes: AimTheme[]
  actions: AimQuickAction[]
  onRun: (qa: AimQuickAction) => void
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<string>('all')

  const byKey = useMemo(() => new Map(actions.map(a => [a.key, a])), [actions])
  const visibleThemes = useMemo(() => themes.filter(th => th.keys.some(k => byKey.has(k))), [themes, byKey])
  const ordered = useMemo(() => {
    const seen = new Set<string>()
    const out: AimQuickAction[] = []
    for (const th of themes) for (const k of th.keys) {
      const qa = byKey.get(k)
      if (qa && !seen.has(k)) { seen.add(k); out.push(qa) }
    }
    for (const qa of actions) if (!seen.has(qa.key)) { seen.add(qa.key); out.push(qa) }
    return out
  }, [themes, actions, byKey])

  const list = useMemo(() => {
    const base = theme === 'all'
      ? ordered
      : (themes.find(th => th.id === theme)?.keys ?? []).map(k => byKey.get(k)).filter((x): x is AimQuickAction => !!x)
    const q = norm(query.trim())
    if (!q) return base
    // La recherche porte sur TOUTES les actions (pas seulement le thème actif).
    return ordered.filter(a => norm(a.label).includes(q) || norm(a.sub).includes(q))
  }, [theme, ordered, themes, byKey, query])

  return (
    <div style={{ padding: '0 8px 16px' }}>
      <AimSubTitle title={t('ai.quickActions')} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 46, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--text-dim)', marginBottom: 12 }}>
        <Search size={17} style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('aim.qa.search')}
          aria-label={t('aim.qa.search')}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 16 }}
        />
      </label>
      {!query.trim() && (
        <div className="aim-scroll-x" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -8px 12px', padding: '0 8px' }}>
          {[{ id: 'all', label: t('aim.qa.all') }, ...visibleThemes.map(th => ({ id: th.id, label: th.label }))].map(c => {
            const on = c.id === theme
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTheme(c.id)}
                style={{
                  flexShrink: 0, minHeight: 44, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
                  background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--surface-card)' : 'var(--text-mid)',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}
      {list.length === 0 ? (
        <p style={{ margin: '24px 8px', textAlign: 'center', fontSize: 14, color: 'var(--text-mid)' }}>{t('aim.qa.empty')}</p>
      ) : (
        <div className="aim-group">
          {list.map((qa, i) => (
            <div key={qa.key}>
              {i > 0 && <AimSep flush />}
              <button type="button" className="aim-row" onClick={() => onRun(qa)} style={{ alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>{qa.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qa.sub}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  <ModelEffigy model={qa.model} size={14} />
                  {aimModelName(qa.model)} · {compactEstimate(quickActionEstimate(qa.flow ?? qa.key))}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '10px 6px 0', lineHeight: 1.4 }}>{t('aim.qa.footer')}</p>
    </div>
  )
}

export function MobilePlusSheet({
  agent,
  initialScreen = 'main',
  themes,
  actions,
  connectors,
  webSearchOn,
  onToggleWeb,
  onCamera,
  onPhotos,
  onFiles,
  onPickPhotos,
  onRunAction,
  onCreateRoute,
  onOpenCompetences,
  onOpenConnections,
  onClose,
}: {
  agent: AimAgent
  initialScreen?: AimPlusScreen
  themes: AimTheme[]
  actions: AimQuickAction[]
  connectors: AimConnector[]
  webSearchOn: boolean
  onToggleWeb: () => void
  onCamera: () => void
  onPhotos: () => void
  onFiles: () => void
  onPickPhotos: (urls: string[]) => void
  onRunAction: (qa: AimQuickAction) => void
  onCreateRoute: () => void
  onOpenCompetences: () => void
  onOpenConnections: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [screen, setScreen] = useState<AimPlusScreen>(initialScreen)
  const [dir, setDir] = useState(1)
  const go = (s: AimPlusScreen) => { setDir(SCREEN_ORDER[s] >= SCREEN_ORDER[screen] ? 1 : -1); setScreen(s) }

  // Compétences actives + limite de la formule (même logique que le menu + desktop).
  const [compCount, setCompCount] = useState<number | null>(null)
  const [compLimit, setCompLimit] = useState(3)
  // 10 dernières photos des activités de l'utilisateur.
  const [recentPhotos, setRecentPhotos] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) return
        const [comp, sub, media] = await Promise.all([
          sb.from('user_competences').select('competence_id').eq('user_id', user.id).eq('active', true),
          sb.from('user_subscriptions').select('tier').eq('user_id', user.id).maybeSingle(),
          sb.from('activities').select('media, started_at').eq('user_id', user.id).not('media', 'is', null).order('started_at', { ascending: false }).limit(20),
        ])
        if (!alive) return
        const tier = (sub.data as { tier?: string } | null)?.tier
        setCompLimit(tier === 'pro' ? 7 : tier === 'expert' ? 20 : 3)
        setCompCount(((comp.data as unknown[] | null) ?? []).length)
        const urls: string[] = []
        for (const r of ((media.data as { media: unknown }[] | null) ?? [])) {
          const list = Array.isArray(r.media) ? r.media : []
          for (const m of list) {
            const item = m as { url?: string; type?: string }
            if (item?.url && item.type !== 'video') urls.push(item.url)
            if (urls.length >= 10) break
          }
          if (urls.length >= 10) break
        }
        setRecentPhotos(urls)
      } catch { /* silencieux */ }
    })()
    return () => { alive = false }
  }, [])

  const connectedNames = connectors.filter(c => c.connected).map(c => c.name)
  const compSub = compCount === null
    ? t('aim.skills.custom')
    : compCount === 0 ? t('aim.skills.none') : t('aim.skills.count', { n: compCount, limit: compLimit })

  const tileStyle: React.CSSProperties = {
    flex: 1, minHeight: 72, borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
    color: 'var(--text)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
  }

  const main = (
    <div style={{ padding: '0 8px 12px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button type="button" className="aim-press aim-tilebtn" style={tileStyle} onClick={() => { onClose(); setTimeout(onCamera, 80) }}>
          <Camera size={22} strokeWidth={1.9} />{t('aip.ui.camera')}
        </button>
        <button type="button" className="aim-press aim-tilebtn" style={tileStyle} onClick={() => { onClose(); setTimeout(onPhotos, 80) }}>
          <ImageIcon size={22} strokeWidth={1.9} />{t('aim.plus.photos')}
        </button>
        <button type="button" className="aim-press aim-tilebtn" style={tileStyle} onClick={() => { onClose(); setTimeout(onFiles, 80) }}>
          <FileIcon size={22} strokeWidth={1.9} />{t('aim.plus.files')}
        </button>
      </div>

      {recentPhotos.length > 0 && (
        <div className="aim-scroll-x" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -8px 12px', padding: '0 8px' }}>
          {recentPhotos.map((url, i) => {
            const sel = selected.includes(url)
            return (
              <button
                key={`${i}-${url}`}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-pressed={sel}
                onClick={() => setSelected(s => s.includes(url) ? s.filter(u => u !== url) : [...s, url])}
                style={{ position: 'relative', flexShrink: 0, width: 76, height: 76, padding: 0, borderRadius: 'var(--r-md)', overflow: 'hidden', cursor: 'pointer', border: 'none', background: 'var(--surface-chip)', boxShadow: sel ? 'inset 0 0 0 2.5px var(--primary)' : 'none' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" onError={() => setRecentPhotos(p => p.filter(u => u !== url))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{
                  position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                  background: sel ? 'var(--primary)' : 'var(--scrim)',
                  boxShadow: sel ? 'none' : 'inset 0 0 0 1.5px var(--on-primary)', color: 'var(--on-primary)',
                }}>
                  {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="aim-group">
        <AimRow icon={<AimTile tint="quick"><Zap size={17} /></AimTile>} title={t('ai.quickActions')} sub={t('aim.plus.qaSub')} chevron onClick={() => go('actions')} />
        {agent !== 'coach' && (
          <>
            <AimSep />
            <AimRow icon={<AimTile tint="route"><Route size={17} /></AimTile>} title={t('aim.plus.route')} sub={t('aim.plus.routeSub')} chevron onClick={() => go('parcours')} />
          </>
        )}
        <AimSep />
        <AimRow icon={<AimTile tint="connect"><Plug size={17} /></AimTile>} title={t('aim.conn.title')} sub={connectedNames.length > 0 ? connectedNames.join(', ') : t('aim.conn.none')} chevron onClick={() => go('connecteurs')} />
        <AimSep />
        <AimRow icon={<AimTile tint="skills"><Star size={17} /></AimTile>} title={t('aip.ui.skills')} sub={compSub} chevron onClick={() => { onClose(); onOpenCompetences() }} />
      </div>

      <div className="aim-group" style={{ marginTop: 10 }}>
        <AimRow
          icon={<AimTile tint="web"><Globe size={17} /></AimTile>}
          title={t('aim.plus.web')}
          sub={t('aim.plus.webSub')}
          right={<Switch checked={webSearchOn} onCheckedChange={() => onToggleWeb()} aria-label={t('aim.plus.web')} />}
        />
      </div>

      {selected.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 5, padding: '12px 0 4px', background: 'linear-gradient(to top, var(--surface-card) 70%, transparent)' }}>
          <button
            type="button"
            className="aim-press"
            onClick={() => { const urls = selected; setSelected([]); onPickPhotos(urls); onClose() }}
            style={{ width: '100%', minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Paperclip size={18} />
            {t('aim.plus.attachPhotos', { n: selected.length })}
          </button>
        </div>
      )}
    </div>
  )

  const connecteurs = (
    <div style={{ padding: '0 8px 16px' }}>
      <AimSubTitle title={t('aim.conn.title')} sub={t('aim.conn.sub')} />
      <div className="aim-group">
        {connectors.map((c, i) => (
          <div key={c.id}>
            {i > 0 && <AimSep />}
            <AimRow
              icon={
                <span style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--on-primary)', display: 'grid', placeItems: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo} alt="" width={30} height={30} style={{ objectFit: 'contain', display: 'block' }} />
                </span>
              }
              title={c.name}
              right={c.connected ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
                  {t('aip.ui.connected')}
                </span>
              ) : (
                <button type="button" onClick={() => { onClose(); onOpenConnections() }}
                  style={{ minHeight: 44, padding: '0 2px', border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {t('aim.conn.connect')}
                </button>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const parcours = (
    <div style={{ padding: '0 8px 16px' }}>
      <AimSubTitle title={t('aim.plus.route')} />
      <div className="aim-group">
        <AimRow icon={<AimTile tint="route"><Sparkle size={17} /></AimTile>} title={t('record.routeLibraryCreate')} sub={t('aim.route.createSub')} chevron onClick={() => { onClose(); onCreateRoute() }} />
        <AimSep />
        <AimRow icon={<AimTile tint="route"><MapPin size={17} /></AimTile>} title={t('aim.route.analyze')} sub="GPX / TCX" chevron onClick={() => { onClose(); setTimeout(onFiles, 80) }} />
      </div>
    </div>
  )

  return (
    <MobileSheet
      onClose={onClose}
      surface="var(--surface-card)"
      expanded={screen === 'actions' || screen === 'connecteurs'}
      renderHeader={close => screen === 'main'
        ? <AimSheetHeader title={t('aim.plus.title')} onClose={close} />
        : <AimSheetHeader back={{ label: t('aim.plus.title'), onBack: () => go('main') }} onClose={close} />}
    >
      <SlideView screenKey={screen} direction={dir}>
        {screen === 'main' && main}
        {screen === 'actions' && <QuickActionsScreen themes={themes} actions={actions} onRun={qa => { onClose(); onRunAction(qa) }} />}
        {screen === 'connecteurs' && connecteurs}
        {screen === 'parcours' && parcours}
      </SlideView>
    </MobileSheet>
  )
}

