'use client'
// ══════════════════════════════════════════════════════════════
// STUDIO D'AGENTS — interface plein écran (façon Make).
// ──────────────────────────────────────────────────────────────
// 3 vues :
//  • Canvas — barre « Décris ton système » (texte OU dictée vocale) : l'IA
//    construit le graphe toute seule. On peut aussi tout faire à la main :
//    poser des nœuds (agents, connecteurs de pages, validation…), les relier.
//  • Pilotage — objectif, journal du run, validations humaines.
//  • Rendu — le résultat produit par le collectif.
// Un bouton « ? » ouvre une sur-page d'explication (+ lien vers le site).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  emptyGraph, sampleGraph, genId, autoLayout, validateGraph, makeGraphAutonomous,
  MODEL_LABEL, KIND_LABEL, SOURCE_LABEL, ACTION_LABEL,
  type StudioGraph, type StudioNode, type StudioNodeKind, type StudioModel, type StudioSourceKey, type StudioActionKey, type GraphIssues, type StudioMethod,
} from '@/lib/studio/graph'
import { runGraph, terminalNodeIds, planningFromText, type NodeStatus } from '@/lib/studio/runner'
import { converseArchitect, planToGraph, recommendSystems, type ArchitectChatMessage, type ArchitectQuestion } from '@/lib/studio/architect'
import { readSourceWith } from '@/lib/studio/source-readers'
import { buildLivingContext, detectHealthFlags } from '@/lib/studio/living'
import { CoachQuestionCard } from '@/components/ai/CoachQuestionCard'
import { listSystems, createSystem, updateSystem, deleteSystem, duplicateSystem, migrateLocalGraphIfAny, type StudioSystemRow } from '@/lib/studio/store'
import { STUDIO_TEMPLATES } from '@/lib/studio/templates'
import { STUDIO_PACKS, estimateRunTokens, formatTokens, type StudioAccess } from '@/lib/studio/offers'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { hasCoachAccess } from '@/lib/coach/owner'
import { listMyAthletes } from '@/lib/coach/relationships'
import { VoiceOverlay } from '@/components/ai/VoiceOverlay'
import StudioMarkdown from './StudioMarkdown'
import { useI18n } from '@/lib/i18n'

// Nœuds = « bulles-logos » circulaires (façon Make) : diamètre fixe, libellé
// dessous, port d'entrée à gauche / de sortie à droite (au centre vertical).
const NODE_D = 66            // diamètre de la bulle
const NODE_W = NODE_D        // (compat) largeur = diamètre
const PORT_Y = NODE_D / 2    // ancrage vertical des ports = centre de la bulle
const CHAT_W = 380           // largeur du panneau de chat Architecte (desktop)
// Variables --ai-* attendues par CoachQuestionCard (normalement portées par
// .aip-root) — on les fournit localement pour réutiliser la carte dans le Studio.
const aiVars = {
  '--ai-bg': 'var(--bg-card)', '--ai-bg2': 'var(--bg-alt)', '--ai-border': 'var(--border)',
  '--ai-text': 'var(--text)', '--ai-mid': 'var(--text-mid)', '--ai-dim': 'var(--text-dim)',
} as React.CSSProperties

// ── Règles de liaison ──────────────────────────────────────────
// Sortie : tout sauf Action (bout de chaîne). Entrée : tout sauf Objectif
// (départ) et Application-lecture (source, produit des données).
const hasStudioOutput = (k: StudioNodeKind) => k !== 'action'
const hasStudioInput = (k: StudioNodeKind) => k !== 'trigger' && k !== 'source'

const KIND_COLOR: Record<StudioNodeKind, string> = {
  trigger:    'var(--studio-accent)',
  agent:      '#06B6D4',
  merge:      '#F59E0B',
  validation: '#EC4899',
  source:     '#22C55E',
  action:     '#EF4444',
}
const STATUS_RING: Record<NodeStatus, string> = {
  idle: 'transparent', running: 'rgba(6,182,212,0.45)', waiting: 'rgba(245,158,11,0.5)',
  done: 'rgba(34,197,94,0.45)', error: 'rgba(239,68,68,0.5)', skipped: 'transparent',
}

// Variante LECTURE SEULE d'un système : on retire les nœuds d'écriture (action)
// et de validation → le run produit une ANALYSE par athlète sans jamais écrire
// ni demander d'accord. C'est ce qu'on lance en fan-out sur un roster.
function readOnlyGraph(g: StudioGraph): StudioGraph {
  const drop = new Set(g.nodes.filter(n => n.kind === 'action' || n.kind === 'validation').map(n => n.id))
  return {
    ...g,
    nodes: g.nodes.filter(n => !drop.has(n.id)),
    edges: g.edges.filter(e => !drop.has(e.from) && !drop.has(e.to)),
  }
}

// Résultat d'un run roster pour un athlète.
type RosterState = 'idle' | 'running' | 'done' | 'error'
interface RosterResult { state: RosterState; summary?: string; text?: string; cost?: number; error?: string }

// Icônes par type de nœud (traits, cohérents avec le design system)
function KindIcon({ kind, size = 13 }: { kind: StudioNodeKind; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'trigger':    return <svg {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    case 'agent':      return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
    case 'merge':      return <svg {...p}><path d="M6 3v6a6 6 0 006 6 6 6 0 016-6V3M12 15v6"/></svg>
    case 'validation': return <svg {...p}><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>
    case 'source':     return <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
    case 'action':     return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
  }
}

// Logo THW (shuriken 4 bras) — remplace l'étoile générique dans le Studio.
function StudioLogo({ size = 16 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logos/logo_4bras.png" alt="" width={size} height={size} style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }} />
}

// Zone de texte qui passe à la ligne et grandit avec le contenu (façon chat
// coach). Entrée = envoyer, Maj+Entrée = nouvelle ligne.
function AutoGrowTextarea({ value, onChange, onSend, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string; disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 150)}px` }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
      disabled={disabled}
      placeholder={placeholder}
      style={{ width: '100%', boxSizing: 'border-box', resize: 'none', maxHeight: 150, overflowY: 'auto', padding: '3px 4px', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.45, display: 'block' }}
    />
  )
}

// ── « Applications » = pages de l'app connectables (façon modules Make) ──
// Chacune a son icône propre pour être reconnue d'un coup d'œil, distincte
// des « outils » abstraits (Objectif, Agent, Synthèse, Validation).
type AppEntry =
  | { id: string; label: string; color: string; kind: 'source'; sourceKey: StudioSourceKey; access: 'lecture' }
  | { id: string; label: string; color: string; kind: 'action'; actionKey: StudioActionKey; access: 'écriture' }

const APP_CATALOG: AppEntry[] = [
  { id: 'app_activities', label: 'Activités',     color: '#22C55E', kind: 'source', sourceKey: 'activities', access: 'lecture' },
  { id: 'app_planning',   label: 'Planning',      color: '#06B6D4', kind: 'source', sourceKey: 'planning',   access: 'lecture' },
  { id: 'app_injuries',   label: 'Blessures',     color: '#EF4444', kind: 'source', sourceKey: 'injuries',   access: 'lecture' },
  { id: 'app_recovery',   label: 'Récupération',  color: '#14B8A6', kind: 'source', sourceKey: 'recovery',   access: 'lecture' },
  { id: 'app_profile',    label: 'Profil',        color: '#F59E0B', kind: 'source', sourceKey: 'profile',    access: 'lecture' },
  { id: 'act_planning',   label: 'Planning (ajout)', color: '#EF4444', kind: 'action', actionKey: 'planning_save', access: 'écriture' },
  { id: 'act_plan_repl',  label: 'Planning (remplacer)', color: '#DC2626', kind: 'action', actionKey: 'planning_replace', access: 'écriture' },
  { id: 'act_calendar',   label: 'Calendrier',    color: '#F97316', kind: 'action', actionKey: 'calendar_race', access: 'écriture' },
  { id: 'act_nutrition',  label: 'Nutrition',     color: '#10B981', kind: 'action', actionKey: 'nutrition_save', access: 'écriture' },
  { id: 'act_notify',     label: 'Notification',  color: '#0EA5E9', kind: 'action', actionKey: 'notify_report', access: 'écriture' },
]

// Apps EXTERNES (données synchronisées depuis un service tiers) — visibles dans
// la palette comme des modules à part, grisées tant qu'elles ne sont pas
// connectées (page Connexions).
interface ExtEntry { id: string; label: string; color: string; sourceKey: StudioSourceKey; provider: string }
const EXT_CATALOG: ExtEntry[] = [
  { id: 'ext_strava',   label: 'Strava',   color: '#FC4C02', sourceKey: 'ext_strava',   provider: 'strava' },
  { id: 'ext_withings', label: 'Withings', color: '#0A8F9E', sourceKey: 'ext_withings', provider: 'withings' },
  { id: 'ext_polar',    label: 'Polar',    color: '#E4022A', sourceKey: 'ext_polar',    provider: 'polar' },
]

function AppIcon({ id, size = 14 }: { id: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'app_activities': return <svg {...p}><path d="M3 12h4l2 7 4-16 2 9h6"/></svg>
    case 'app_planning':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
    case 'app_injuries':   return <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
    case 'app_recovery':   return <svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
    case 'app_profile':    return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
    case 'act_planning':   return <svg {...p}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
    case 'act_calendar':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M9 14l2 2 4-4"/></svg>
    case 'act_nutrition':  return <svg {...p}><path d="M4 3v7a3 3 0 003 3v8M7 3v7M10 3v7M16 3c-1.5 1-2 3-2 6s.5 5 2 6v3"/></svg>
    case 'act_notify':     return <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    // Apps externes — pictos évocateurs (pas les logos officiels).
    case 'ext_strava':     return <svg {...p} fill="currentColor" stroke="none"><path d="M9 3l5 9h-3l-2-4-2 4H2L9 3zm5 11h3l1.5 3 1.5-3h3l-4.5 8L14 14z"/></svg>
    case 'ext_withings':   return <svg {...p}><circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 2v2"/></svg>
    case 'ext_polar':      return <svg {...p}><path d="M20.8 5.6a5.5 5.5 0 00-8.8 1.4A5.5 5.5 0 003.2 5.6a5.5 5.5 0 000 7.8L12 21l8.8-7.6a5.5 5.5 0 000-7.8z"/><path d="M6 12h3l1.5-3 2 5 1.5-2H18"/></svg>
    default:               return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
  }
}

type Tab = 'canvas' | 'chat' | 'rendu' | 'runs' | 'methode'
type LogEntry = { nodeId: string; title: string; text: string }
type Approval = { node: StudioNode; content: string; resolve: (ok: boolean) => void }
interface RunRow {
  id: string
  system_name: string
  status: 'done' | 'error' | 'stopped'
  renders: { title: string; text: string }[]
  tokens_est: number | null
  created_at: string
}

export default function StudioView({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [graph, setGraph] = useState<StudioGraph>(() => emptyGraph())
  const [tab, setTab] = useState<Tab>('canvas')
  // ── Accueil multi-systèmes + accès (offre Pro/Expert) ────────
  const [view, setView] = useState<'home' | 'canvas'>('home')
  const [systems, setSystems] = useState<StudioSystemRow[]>([])
  const [systemId, setSystemId] = useState<string | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [homeErr, setHomeErr] = useState<string | null>(null)
  const [access, setAccess] = useState<StudioAccess | null>(null)
  // Espace « Pour mes athlètes » = réservé à l'abonnement coach.
  const [coachAccess, setCoachAccess] = useState(false)
  useEffect(() => {
    void hasCoachAccess().then(async ok => {
      setCoachAccess(ok)
      if (!ok) return
      const ath = await listMyAthletes().catch(() => [])
      setCoachAthletes(ath.map(a => ({ id: a.id, name: a.full_name || a.first_name || t('w1i.athlete') })))
    })
  }, [])
  const [walletOpen, setWalletOpen] = useState(false)
  const [runs, setRuns] = useState<RunRow[] | null>(null)
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  // Coût réel du dernier run (tokens pondérés, mesurés côté serveur)
  const [runCost, setRunCost] = useState<number | null>(null)
  // Dossiers de systèmes (rail latéral de l'accueil)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)   // null = tous
  const [folderMenuFor, setFolderMenuFor] = useState<string | null>(null) // systemId du menu « Déplacer »
  const [newFolderName, setNewFolderName] = useState('')
  // Deux espaces : systèmes « perso » (tournent sur soi) vs « coach » (à lancer
  // sur ses athlètes). Filtre l'affichage + définit le scope des créations.
  const [scopeTab, setScopeTab] = useState<'perso' | 'coach'>('perso')
  // Popover « Nouveau système » : nom + dossier (existant ou nouveau).
  const [newSysOpen, setNewSysOpen] = useState(false)
  const [newSysName, setNewSysName] = useState(t('w1i.my_system'))
  const [newSysFolder, setNewSysFolder] = useState<string | null>(null)
  const [newSysNewFolder, setNewSysNewFolder] = useState('')
  // Coach : rattacher un système « Pour mes athlètes » à un athlète précis (optionnel).
  const [newSysAthlete, setNewSysAthlete] = useState<string | null>(null)
  const [coachAthletes, setCoachAthletes] = useState<{ id: string; name: string }[]>([])
  // Planification autonome (un planning par système)
  const [schedule, setSchedule] = useState<{ frequency: 'daily' | 'weekly'; hour: number; weekday: number; enabled: boolean } | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)   // bulle survolée → champ de rôle
  const [pickerOpen, setPickerOpen] = useState(false)           // sélecteur « + » façon Make
  const [athletePickerOpen, setAthletePickerOpen] = useState(false)   // coach : choisir l'athlète cible du système
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerFrom, setPickerFrom] = useState<string | null>(null)  // « + » d'une bulle → nouvelle branche
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [helpOpen, setHelpOpen] = useState(false)
  // Contrôle pré-run : erreurs (bloquent) + avertissements (on peut forcer).
  const [issues, setIssues] = useState<(GraphIssues & { canForce: boolean }) | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // Apps externes réellement connectées (page Connexions) → grisage sinon.
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/oauth/status')
        const j = await r.json() as { connected?: { provider: string }[] }
        setConnectedProviders(new Set((j.connected ?? []).map(c => c.provider)))
      } catch { /* silencieux */ }
    })()
  }, [])

  // Architecte (« décris ton système »)
  const [desc, setDesc] = useState('')
  const [micOpen, setMicOpen] = useState(false)
  const prevGraphRef = useRef<StudioGraph | null>(null)

  // ── Architecte CONVERSATIONNEL : dialogue → confirmation → application ──
  // L'IA ne construit rien sans un « oui » explicite. Les messages s'affichent
  // dans un panneau à droite (repliable) ou en plein écran.
  type ChatMsg =
    | { id: string; role: 'user'; text: string }
    | { id: string; role: 'assistant'; kind: 'ask'; text: string; questions: ArchitectQuestion[] }
    | { id: string; role: 'assistant'; kind: 'propose'; text: string; graph: StudioGraph; applied?: boolean; declined?: boolean }
    | { id: string; role: 'assistant'; kind: 'reply'; text: string }
    | { id: string; role: 'assistant'; kind: 'error'; text: string }
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatOpen, setChatOpen] = useState(false)     // panneau latéral droit visible
  const [chatFull, setChatFull] = useState(false)     // plein écran
  const [chatBusy, setChatBusy] = useState(false)     // l'IA réfléchit
  const [chatInput, setChatInput] = useState('')
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [builderModel, setBuilderModel] = useState<StudioModel>('athena')  // modèle de l'architecte
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [autonomy, setAutonomy] = useState<'auto' | 'manual'>('auto')      // exécution : autonome / confirmation
  // Réglages Studio (Réglages IA → Studio), lus en localStorage.
  useEffect(() => {
    const load = () => {
      try { const v = localStorage.getItem('thw_studio_builder_model'); if (v === 'hermes' || v === 'athena' || v === 'zeus') setBuilderModel(v) } catch { /* ignore */ }
      try { const a = localStorage.getItem('thw_studio_autonomy'); setAutonomy(a === 'manual' ? 'manual' : 'auto') } catch { /* ignore */ }
    }
    load()
    window.addEventListener('thw:studio-settings-changed', load)
    return () => window.removeEventListener('thw:studio-settings-changed', load)
  }, [])
  const [micTarget, setMicTarget] = useState<'desc' | 'chat'>('desc')       // champ visé par la dictée
  const micBaseRef = useRef('')                                             // texte du champ avant dictée (streaming live)
  const [previewSel, setPreviewSel] = useState<{ msgId: string; nodeId: string } | null>(null)  // bulle touchée dans une maquette
  const [mockupMsgId, setMockupMsgId] = useState<string | null>(null)      // sur-page maquette ouverte
  // Recommandations « pour toi » : l'IA propose des systèmes prêts à lancer.
  const [recos, setRecos] = useState<{ title: string; why: string; graph: StudioGraph }[]>([])
  const [recosLoading, setRecosLoading] = useState(false)
  const [recosError, setRecosError] = useState(false)
  const [recoMockup, setRecoMockup] = useState<{ title: string; why: string; graph: StudioGraph } | null>(null)  // maquette d'une reco
  const [renduSelId, setRenduSelId] = useState<string | null>(null)         // bulle sélectionnée dans le Rendu
  // Objectif « en cours » du système vivant (éditeur).
  const [objEditOpen, setObjEditOpen] = useState(false)
  const [objText, setObjText] = useState('')
  const [objDeadline, setObjDeadline] = useState('')
  // Signaux santé (garde-fou visible) : motifs courts ou null si tout va bien.
  const [healthAlert, setHealthAlert] = useState<string | null>(null)
  // Onboarding « premier système » : objectif saisi + message à envoyer à
  // l'architecte dès que le nouveau système est ouvert.
  const [firstObjective, setFirstObjective] = useState('')
  const [pendingFirstMsg, setPendingFirstMsg] = useState<string | null>(null)

  // Exécution
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Record<string, NodeStatus>>({})
  const [nodeText, setNodeText] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [approval, setApproval] = useState<Approval | null>(null)
  const [runErr, setRunErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<null | { mode: 'node' | 'pan' | 'conn' | 'pinch'; id?: string; dx: number; dy: number; moved?: boolean }>(null)
  const [pending, setPending] = useState<null | { fromId: string; x: number; y: number }>(null)
  // Pincement tactile (deux doigts) sur la toile
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)

  // Mobile : inspecteur en sheet bas + barre compacte.
  const [isMobile, setIsMobile] = useState(false)
  const [, setPaletteOpen] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => { setIsMobile(mq.matches); setPaletteOpen(!mq.matches) }
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  // ── Persistance SERVEUR (debounce) — remplace le localStorage ──
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const systemIdRef = useRef<string | null>(null)
  useEffect(() => { systemIdRef.current = systemId }, [systemId])

  // ── Mémoire du chat Architecte (localStorage, ~48 h par système) ──
  const chatKey = (id: string) => `thw_studio_chat_${id}`
  useEffect(() => {
    const id = systemIdRef.current
    if (!id) return
    try {
      if (!chatMsgs.length) localStorage.removeItem(chatKey(id))
      else localStorage.setItem(chatKey(id), JSON.stringify({ v: 1, updatedAt: Date.now(), msgs: chatMsgs }))
    } catch { /* quota / privé — silencieux */ }
  }, [chatMsgs])
  const scheduleSave = useCallback((g: StudioGraph) => {
    const id = systemIdRef.current
    if (!id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void updateSystem(id, { graph: g, name: g.name }).catch(() => { /* réessaiera à la prochaine modif */ })
    }, 700)
  }, [])
  const persist = useCallback((g: StudioGraph) => { setGraph(g); scheduleSave(g) }, [scheduleSave])

  // ── Historique local (annuler / rétablir) ─────────────────────
  // Chaque mutation de l'utilisateur snapshot le graphe AVANT changement. Les
  // retouches de texte consécutives (même structure) sont fusionnées en une
  // seule étape pour ne pas polluer l'historique.
  const undoRef = useRef<StudioGraph[]>([])
  const redoRef = useRef<StudioGraph[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const structSig = (g: StudioGraph) =>
    g.nodes.map(n => n.id + n.kind).sort().join('|') + '#' + g.edges.map(e => `${e.from}>${e.to}`).sort().join('|')
  const pushHistory = useCallback(() => {
    const cur = graphRef.current
    const top = undoRef.current[undoRef.current.length - 1]
    if (!(top && structSig(top) === structSig(cur))) {
      undoRef.current.push(cur)
      if (undoRef.current.length > 60) undoRef.current.shift()
    }
    redoRef.current = []
    setCanUndo(undoRef.current.length > 0); setCanRedo(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const resetHistory = useCallback(() => { undoRef.current = []; redoRef.current = []; setCanUndo(false); setCanRedo(false) }, [])
  // Mutation « avec historique » : snapshot puis applique. On garde graphRef
  // synchronisé pour que des clics/actions rapprochés lisent le bon état.
  const commit = useCallback((g: StudioGraph) => { pushHistory(); graphRef.current = g; persist(g) }, [pushHistory, persist])
  const undo = () => {
    if (!undoRef.current.length) return
    redoRef.current.push(graphRef.current)
    const prev = undoRef.current.pop()!
    graphRef.current = prev
    setGraph(prev); scheduleSave(prev); setSelId(null); setSelEdge(null)
    setCanUndo(undoRef.current.length > 0); setCanRedo(true)
  }
  const redo = () => {
    if (!redoRef.current.length) return
    undoRef.current.push(graphRef.current)
    const next = redoRef.current.pop()!
    graphRef.current = next
    setGraph(next); scheduleSave(next); setSelId(null); setSelEdge(null)
    setCanUndo(true); setCanRedo(redoRef.current.length > 0)
  }

  const refreshAccess = useCallback(() => {
    void fetch('/api/studio/access')
      .then(r => (r.ok ? (r.json() as Promise<StudioAccess>) : null))
      .then(a => { if (a) setAccess(a) })
      .catch(() => { /* silencieux */ })
  }, [])

  // Démontage : sauvegarde immédiate du système ouvert (sinon les 700 ms de
  // debounce peuvent se perdre à la fermeture du Studio).
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const id = systemIdRef.current
    if (id) void updateSystem(id, { graph: graphRef.current, name: graphRef.current.name }).catch(() => {})
  }, [])

  // Boot : accès (offre) + liste des systèmes + migration localStorage.
  useEffect(() => {
    refreshAccess()
    void (async () => {
      try {
        let list = await listSystems()
        const migrated = await migrateLocalGraphIfAny(list)
        if (migrated) list = [migrated, ...list]
        setSystems(list)
      } catch {
        setHomeErr(t('w1i.err_load_systems'))
      } finally {
        setHomeLoading(false)
      }
    })()
  }, [refreshAccess])

  // ── Recommandations « pour toi » : l'IA lit profil + données réelles et
  // propose des systèmes prêts à lancer. Caché 24 h (coût), rafraîchissable. ──
  const loadRecos = useCallback(async (force = false) => {
    const RECO_KEY = 'thw_studio_recos'
    setRecosError(false)
    if (!force) {
      try {
        const raw = localStorage.getItem(RECO_KEY)
        if (raw) {
          const p = JSON.parse(raw) as { updatedAt?: number; items?: { title: string; why: string; graph: StudioGraph }[] }
          if (p?.items?.length && Date.now() - (p.updatedAt ?? 0) < 24 * 60 * 60 * 1000) { setRecos(p.items); return }
        }
      } catch { /* cache illisible → on régénère */ }
    }
    setRecosLoading(true)
    try {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) return
      const keys: StudioSourceKey[] = ['profile', 'activities', 'recovery', 'injuries']
      // Système coach ciblant un athlète : recommandations basées sur SES données.
      const ctxUid = (scopeTab === 'coach' ? openAthleteId : null) ?? user.id
      const parts = await Promise.all(keys.map(k => readSourceWith(supabase, ctxUid, k).catch(() => '')))
      const ctx = parts.filter(Boolean).join('\n\n')
      const recommended = await recommendSystems(ctx, builderModel)
      const items = recommended
        .map(r => ({ title: r.title, why: r.why, graph: planToGraph(r.plan, r.why || r.title).graph }))
        .filter(x => x.graph.nodes.length)
      setRecos(items)
      try { localStorage.setItem(RECO_KEY, JSON.stringify({ updatedAt: Date.now(), items })) } catch { /* quota */ }
    } catch {
      setRecosError(true)
    } finally {
      setRecosLoading(false)
    }
  }, [builderModel])

  // Charge les recos une fois l'accès Studio confirmé (Pro/Expert).
  useEffect(() => {
    if (access?.allowed) void loadRecos(false)
  }, [access?.allowed, loadRecos])

  // Signaux santé : calculés à l'accueil ET dans un système (garde-fou visible
  // + suggestion proactive). Recalculé quand on change de vue / de système.
  useEffect(() => {
    if (!access?.allowed) return
    let cancelled = false
    void (async () => {
      try {
        const supabase = createClient()
        const user = await getCurrentUser()
        if (!user) return
        const flags = await detectHealthFlags(supabase, user.id)
        if (!cancelled) setHealthAlert(flags.length ? flags.join(' · ') : null)
      } catch { if (!cancelled) setHealthAlert(null) }
    })()
    return () => { cancelled = true }
  }, [view, systemId, access?.allowed])

  // Détection proactive : quand tes données changent (séances, blessures…),
  // on invalide le cache des recos → elles se régénèrent à la prochaine visite.
  useEffect(() => {
    const invalidate = () => { try { localStorage.removeItem('thw_studio_recos') } catch { /* ignore */ } }
    const evts = ['thw:sessions-changed', 'thw:injury-changed', 'thw:injuries-changed', 'thw:recovery-changed', 'thw:race-changed']
    evts.forEach(e => window.addEventListener(e, invalidate))
    return () => evts.forEach(e => window.removeEventListener(e, invalidate))
  }, [])

  const sel = graph.nodes.find(n => n.id === selId) ?? null
  const trigger = graph.nodes.find(n => n.kind === 'trigger') ?? null

  // ── Géométrie ──────────────────────────────────────────────
  const R = NODE_D / 2                              // rayon de la bulle
  const center = (n: StudioNode) => ({ x: n.x + R, y: n.y + R })
  // Poignée de sortie : bord droit de la bulle (le « + » et la pastille de
  // liaison restent toujours à droite, quelle que soit la position du voisin).
  const portOut = (n: StudioNode) => ({ x: n.x + NODE_D, y: n.y + PORT_Y })
  // Ancrages d'une arête façon Make : le fil part du POINT DU BORD de chaque
  // bulle qui fait face à l'autre — il pivote donc autour de la bulle selon où
  // l'on place le voisin, et la ligne reste toujours droite.
  const edgeAnchors = (a: StudioNode, b: StudioNode) => {
    const ca = center(a), cb = center(b)
    const dx = cb.x - ca.x, dy = cb.y - ca.y
    const d = Math.hypot(dx, dy) || 1
    const ux = dx / d, uy = dy / d
    return {
      p1: { x: ca.x + ux * R, y: ca.y + uy * R },   // bord de A vers B
      p2: { x: cb.x - ux * R, y: cb.y - uy * R },   // bord de B vers A
    }
  }
  // Fil courbe (bézier cubique) à tangentes horizontales, façon Make / n8n :
  // le flux « sort » du bord droit et « entre » par la gauche, ce qui donne une
  // courbe lisible pour la mise en page en colonnes (autoLayout).
  const edgeCtrl = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const k = Math.max(28, Math.min(150, Math.abs(dx) * 0.5 + Math.abs(dy) * 0.12))
    const s = dx >= 0 ? 1 : -1
    return { c1: { x: a.x + s * k, y: a.y }, c2: { x: b.x - s * k, y: b.y } }
  }
  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const { c1, c2 } = edgeCtrl(a, b)
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`
  }
  // Point sur la courbe (paramètre t ∈ [0,1]) — pour semer les perles le long
  // du fil courbe plutôt que sur une corde droite.
  const bezAt = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => {
    const { c1, c2 } = edgeCtrl(a, b)
    const mt = 1 - t
    return {
      x: mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x,
      y: mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y,
    }
  }
  // pan/zoom via refs : les handlers pointeur/molette lisent toujours la valeur
  // courante sans se réabonner.
  const panRef = useRef(pan)
  useEffect(() => { panRef.current = pan }, [pan])
  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  const canvasPoint = (clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect()
    return {
      x: (clientX - (r?.left ?? 0) - panRef.current.x) / zoomRef.current,
      y: (clientY - (r?.top ?? 0) - panRef.current.y) / zoomRef.current,
    }
  }

  // ── Interactions pointeur ──────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const d = drag.current
    if (!d) return
    if (d.mode === 'pinch') {
      // Deux doigts : zoom au point médian (mobile)
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const [p1, p2] = [...pointersRef.current.values()]
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        if (dist > 0 && pinchRef.current.dist > 0) {
          const r = wrapRef.current?.getBoundingClientRect()
          zoomAt((p1.x + p2.x) / 2 - (r?.left ?? 0), (p1.y + p2.y) / 2 - (r?.top ?? 0), pinchRef.current.zoom * (dist / pinchRef.current.dist))
        }
      }
      return
    }
    if (d.mode === 'pan') { setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); return }
    if (d.mode === 'node' && d.id) {
      // Au tout premier déplacement réel, on snapshot la position d'avant (1 étape).
      if (!d.moved) { d.moved = true; pushHistory() }
      const pt = canvasPoint(e.clientX, e.clientY)
      setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === d.id ? { ...n, x: pt.x - d.dx, y: pt.y - d.dy } : n) }))
      return
    }
    if (d.mode === 'conn') { const pt = canvasPoint(e.clientX, e.clientY); setPending(p => p ? { ...p, x: pt.x, y: pt.y } : p) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const graphRef = useRef(graph)
  useEffect(() => { graphRef.current = graph }, [graph])

  const onPointerUp = useCallback((e: PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    const d = drag.current
    if (d?.mode === 'pinch' && pointersRef.current.size < 2) { pinchRef.current = null; drag.current = null }
    if (d?.mode === 'node') scheduleSave(graphRef.current)
    if (d?.mode === 'conn') {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const toId = el?.closest('[data-portin]')?.getAttribute('data-portin') ?? null
      if (toId && d.id && toId !== d.id) {
        const g = graphRef.current
        const from = g.nodes.find(n => n.id === d.id), to = g.nodes.find(n => n.id === toId)
        // Règle de liaison : refuse une connexion invalide (silencieux).
        if (from && to && hasStudioOutput(from.kind) && hasStudioInput(to.kind)
          && !g.edges.some(x => x.from === d.id && x.to === toId)) {
          pushHistory()
          const next = { ...g, edges: [...g.edges, { id: genId(), from: d.id, to: toId }] }
          setGraph(next); scheduleSave(next)
        }
      }
      setPending(null)
    }
    drag.current = null
    // Fin du drag : on réautorise la sélection de texte (voir arm()).
    document.body.style.userSelect = ''
    document.body.style.setProperty('-webkit-user-select', '')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  // Pendant un drag (déplacer un nœud, relier, pan), on coupe la sélection de
  // texte native du navigateur — sinon glisser une branche « surligne en bleu »
  // le texte des cartes sur ordinateur. On efface aussi la sélection en cours.
  const arm = () => {
    document.body.style.userSelect = 'none'
    document.body.style.setProperty('-webkit-user-select', 'none')
    window.getSelection?.()?.removeAllRanges()
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const startNodeDrag = (e: React.PointerEvent, n: StudioNode) => {
    e.stopPropagation()
    setSelId(n.id); setSelEdge(null)
    const pt = canvasPoint(e.clientX, e.clientY)
    drag.current = { mode: 'node', id: n.id, dx: pt.x - n.x, dy: pt.y - n.y }
    arm()
  }
  const startConnect = (e: React.PointerEvent, n: StudioNode) => {
    e.stopPropagation()
    e.preventDefault()
    const a = portOut(n)
    drag.current = { mode: 'conn', id: n.id, dx: 0, dy: 0 }
    setPending({ fromId: n.id, x: a.x, y: a.y })
    arm()
  }
  const startPan = (e: React.PointerEvent) => {
    if (e.target !== wrapRef.current && !(e.target as HTMLElement).dataset.bg) return
    e.preventDefault()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // Deuxième doigt sur la toile → bascule en pincement (zoom tactile).
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      pinchRef.current = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y), zoom: zoomRef.current }
      drag.current = { mode: 'pinch', dx: 0, dy: 0 }
      return
    }
    setSelId(null); setSelEdge(null)
    drag.current = { mode: 'pan', dx: 0, dy: 0 }
    arm()
  }

  // ── Mutations ──────────────────────────────────────────────
  const addNode = (kind: StudioNodeKind, opts?: { sourceKey?: StudioSourceKey; actionKey?: StudioActionKey; title?: string; fromId?: string }): string => {
    // Si on ajoute une BRANCHE depuis une bulle → on place le nouveau bloc à sa
    // droite ; sinon au centre de la vue courante.
    const rect = wrapRef.current?.getBoundingClientRect()
    const src = opts?.fromId ? graph.nodes.find(x => x.id === opts.fromId) : undefined
    const downstream = src ? graph.edges.filter(e2 => e2.from === src.id).length : 0
    const cx = src ? src.x + 150 : ((rect ? rect.width / 2 : 400) - pan.x) / zoom - NODE_W / 2
    const cy = src ? src.y + downstream * 100 : ((rect ? rect.height / 2 : 300) - pan.y) / zoom - 40 + Math.round((Math.random() - 0.5) * 40)
    const sourceKey = kind === 'source' ? (opts?.sourceKey ?? 'activities') : undefined
    const actionKey = kind === 'action' ? (opts?.actionKey ?? 'planning_save') : undefined
    const n: StudioNode = {
      id: genId(), kind, x: cx, y: cy,
      title: opts?.title
        ?? (kind === 'agent' ? t('w1i.new_agent')
          : kind === 'source' ? SOURCE_LABEL[sourceKey ?? 'activities']
          : kind === 'action' ? ACTION_LABEL[actionKey ?? 'planning_save']
          : KIND_LABEL[kind]),
      role: kind === 'trigger' ? '' : kind === 'validation' ? t('w1i.validation_role_default') : kind === 'source' || kind === 'action' ? undefined : t('w1i.agent_role_default'),
      model: kind === 'agent' || kind === 'merge' ? 'athena' : undefined,
      sourceKey,
      actionKey,
    }
    // Branche : on relie source → nouveau bloc dans le MÊME enregistrement, si la
    // règle de liaison l'autorise.
    const edges = src && hasStudioOutput(src.kind) && hasStudioInput(kind)
      ? [...graph.edges, { id: genId(), from: src.id, to: n.id }]
      : graph.edges
    commit({ ...graph, nodes: [...graph.nodes, n], edges }); setSelId(n.id); setTab('canvas')
    if (typeof window !== 'undefined' && window.innerWidth < 768) setPaletteOpen(false)
    return n.id
  }
  const addApp = (app: AppEntry, fromId?: string) => {
    if (app.kind === 'source') addNode('source', { sourceKey: app.sourceKey, title: app.label, fromId })
    else addNode('action', { actionKey: app.actionKey, title: app.label, fromId })
  }
  const addExt = (e: ExtEntry, fromId?: string) => addNode('source', { sourceKey: e.sourceKey, title: e.label, fromId })
  // Coach : rattache le système ouvert à un athlète précis (réutilise athlete_id →
  // au lancement, le run cible et verrouille cet athlète). null = tous au lancement.
  const setSystemAthlete = (aid: string | null) => {
    if (!systemId) return
    setSystems(list => list.map(s => s.id === systemId ? { ...s, athlete_id: aid } : s))
    void updateSystem(systemId, { athlete_id: aid }).catch(() => {})
  }
  const curSystem = systems.find(s => s.id === systemId) ?? null
  const isCoachSystem = curSystem?.scope === 'coach'
  const openAthleteId = curSystem?.athlete_id ?? null
  const openAthleteName = openAthleteId ? (coachAthletes.find(a => a.id === openAthleteId)?.name ?? t('w1i.linked_athlete')) : null
  const loadExample = () => { const g = sampleGraph(); commit({ ...g, name: graph.name || g.name }); setSelId(null); setStatus({}); setNodeText({}) }
  const clearCanvas = () => { commit({ ...emptyGraph(), id: graph.id, name: graph.name }); setSelId(null); setSelEdge(null); setStatus({}); setNodeText({}) }

  // ── Accueil : ouvrir / créer / dupliquer / supprimer un système ──
  const openSystem = (row: StudioSystemRow) => {
    const g = row.graph && Array.isArray(row.graph.nodes) ? row.graph : emptyGraph()
    setGraph({ ...g, name: row.name })
    setSystemId(row.id)
    setView('canvas'); setTab('canvas')
    setSelId(null); setSelEdge(null); setStatus({}); setNodeText({}); setLogs([]); setIssues(null)
    setPan({ x: 0, y: 0 }); setZoom(1); resetHistory()
    // Mémoire du chat : restaure la conversation si elle date de < 48 h.
    let restored: ChatMsg[] = []
    try {
      const raw = localStorage.getItem(chatKey(row.id))
      if (raw) {
        const parsed = JSON.parse(raw) as { updatedAt?: number; msgs?: ChatMsg[] }
        if (parsed && Array.isArray(parsed.msgs) && Date.now() - (parsed.updatedAt ?? 0) < 48 * 60 * 60 * 1000) restored = parsed.msgs
        else localStorage.removeItem(chatKey(row.id))
      }
    } catch { /* silencieux */ }
    setChatMsgs(restored); setChatInput(''); setChatBusy(false); setChatFull(false); setChatOpen(restored.length > 0)
    // Reprend le compteur d'ids au-dessus des messages restaurés (pas de collision).
    chatIdRef.current = restored.reduce((mx, m) => { const n = parseInt(String(m.id).slice(1), 10); return Number.isFinite(n) ? Math.max(mx, n) : mx }, 0)
    // Planification existante du système (best-effort)
    setSchedule(null)
    void (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('studio_schedules')
          .select('frequency, hour, weekday, enabled')
          .eq('system_id', row.id).maybeSingle()
        if (data) setSchedule({ frequency: data.frequency as 'daily' | 'weekly', hour: data.hour as number, weekday: (data.weekday as number | null) ?? 6, enabled: Boolean(data.enabled) })
      } catch { /* silencieux */ }
    })()
  }

  // Sauvegarde de la planification (upsert par system_id).
  const saveSchedule = async (next: { frequency: 'daily' | 'weekly'; hour: number; weekday: number; enabled: boolean }) => {
    const id = systemIdRef.current
    if (!id) return
    setSchedule(next)
    setScheduleSaving(true)
    try {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) return
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
      await supabase.from('studio_schedules').upsert({
        user_id: user.id, system_id: id,
        frequency: next.frequency, hour: next.hour,
        weekday: next.frequency === 'weekly' ? next.weekday : null,
        timezone: tz, enabled: next.enabled,
      }, { onConflict: 'system_id' })
    } catch { /* best-effort */ } finally { setScheduleSaving(false) }
  }
  const newSystem = async (name: string, g: StudioGraph, folder?: string | null, athleteId: string | null = null) => {
    try {
      const row = await createSystem(name, { ...g, name }, scopeTab, athleteId)
      // Dossier explicite (popover) sinon dossier actif s'il y en a un.
      const dest = folder !== undefined ? folder : activeFolder
      if (dest) { void updateSystem(row.id, { folder: dest }).catch(() => {}); row.folder = dest }
      setSystems(s => [row, ...s])
      openSystem(row)
    } catch {
      setHomeErr(t('w1i.err_create'))
    }
  }
  // Onboarding : crée un premier système vide et lance l'architecte avec
  // l'objectif saisi (il posera ses questions puis proposera un système).
  const startFirstSystem = async (objective: string) => {
    const msg = objective.trim()
      ? t('w1i.first_msg_with_obj', { objective: objective.trim() })
      : t('w1i.first_msg_no_obj')
    try {
      const row = await createSystem(t('w1i.my_system'), emptyGraph())
      setSystems(s => [row, ...s])
      setPendingFirstMsg(msg)   // sera envoyé à l'architecte à l'ouverture
      openSystem(row)
    } catch { setHomeErr(t('w1i.err_create')) }
  }
  const removeSystem = async (id: string) => {
    if (!confirm(t('w1i.confirm_delete_system'))) return
    try { await deleteSystem(id); setSystems(s => s.filter(x => x.id !== id)) } catch { setHomeErr(t('w1i.err_delete')) }
  }
  const copySystem = async (row: StudioSystemRow) => {
    try { const dup = await duplicateSystem(row); setSystems(s => [dup, ...s]) } catch { setHomeErr(t('w1i.err_duplicate')) }
  }
  const backToHome = () => {
    // Sauvegarde immédiate avant de quitter la toile.
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const id = systemIdRef.current
    if (id) {
      void updateSystem(id, { graph: graphRef.current, name: graphRef.current.name }).catch(() => {})
      setSystems(s => s.map(x => x.id === id ? { ...x, name: graphRef.current.name, graph: graphRef.current, updated_at: new Date().toISOString() } : x))
    }
    setView('home')
  }

  // ── Dossiers : déplacer un système ────────────────────────────
  const moveToFolder = async (id: string, folder: string | null) => {
    setFolderMenuFor(null); setNewFolderName('')
    try {
      await updateSystem(id, { folder })
      setSystems(s => s.map(x => x.id === id ? { ...x, folder } : x))
    } catch { setHomeErr(t('w1i.err_move')) }
  }
  const patchNode = (id: string, patch: Partial<StudioNode>) =>
    commit({ ...graph, nodes: graph.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })
  const deleteNode = (id: string) => {
    commit({ ...graph, nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) })
    setSelId(null)
  }
  const deleteEdge = (id: string) => { commit({ ...graph, edges: graph.edges.filter(e => e.id !== id) }); setSelEdge(null) }

  // ── Zoom / navigation de la toile ──────────────────────────
  const clampZoom = (z: number) => Math.min(1.6, Math.max(0.35, z))
  const zoomAt = (cx: number, cy: number, z1: number) => {
    const z0 = zoomRef.current
    const z = clampZoom(z1)
    const k = z / z0
    setPan(p => ({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }))
    setZoom(z)
  }
  const zoomBy = (k: number) => {
    const r = wrapRef.current?.getBoundingClientRect()
    zoomAt(r ? r.width / 2 : 400, r ? r.height / 2 : 300, zoomRef.current * k)
  }
  const fitViewTo = (nodes: StudioNode[]) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r || nodes.length === 0) { setPan({ x: 0, y: 0 }); setZoom(1); return }
    const minX = Math.min(...nodes.map(n => n.x)) - 50
    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W + 50
    const minY = Math.min(...nodes.map(n => n.y)) - 50
    const maxY = Math.max(...nodes.map(n => n.y)) + 150 + 50
    const z = clampZoom(Math.min(r.width / (maxX - minX), r.height / (maxY - minY), 1.15))
    setZoom(z)
    setPan({ x: (r.width - (maxX - minX) * z) / 2 - minX * z, y: (r.height - (maxY - minY) * z) / 2 - minY * z })
  }
  const fitView = () => fitViewTo(graph.nodes)
  // « Ranger » : auto-layout (déjà utilisé par l'architecte) accessible à la main.
  const tidy = () => {
    if (!graph.nodes.length) return
    const nodes = autoLayout(graph.nodes, graph.edges)
    commit({ ...graph, nodes })
    fitViewTo(nodes)
  }

  // Molette : deux doigts = pan ; ctrl/cmd (ou pincement trackpad) = zoom au curseur.
  useEffect(() => {
    if (tab !== 'canvas') return
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX - r.left, e.clientY - r.top, zoomRef.current * Math.exp(-e.deltaY * 0.0022))
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Clavier : Suppr/Retour = supprimer la sélection ; Échap = désélectionner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      // Annuler / Rétablir (⌘Z, ⌘⇧Z, ⌘Y) — actifs même hors sélection.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        if (e.key === 'y' || e.key === 'Y' || e.shiftKey) redo(); else undo()
        return
      }
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'Escape') { setSelId(null); setSelEdge(null); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selEdge) { e.preventDefault(); deleteEdge(selEdge) }
        else if (selId) {
          const n = graph.nodes.find(x => x.id === selId)
          if (n && n.kind !== 'trigger') { e.preventDefault(); deleteNode(selId) }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selEdge, selId, graph])

  // Toute modification du graphe invalide le contrôle pré-run affiché.
  useEffect(() => { setIssues(null) }, [graph])

  // ── Architecte CONVERSATIONNEL ─────────────────────────────
  // La barre « Décris… » et la saisie du chat mènent ici. L'IA dialogue, pose
  // des questions, puis PROPOSE un plan à confirmer — rien n'est appliqué avant.
  const chatIdRef = useRef(0)
  const newMsgId = () => `m${++chatIdRef.current}`

  const sendArchitect = async (text: string) => {
    const txt = text.trim()
    if (!txt || chatBusy) return
    const userMsg: ChatMsg = { id: newMsgId(), role: 'user', text: txt }
    const history = [...chatMsgs, userMsg]
    setChatMsgs(history)
    setChatOpen(true)
    setChatBusy(true)
    // Historique compact pour l'IA (on résume les propositions par leur texte).
    const apiHistory: ArchitectChatMessage[] = history.map(m =>
      m.role === 'user'
        ? { role: 'user' as const, content: m.text }
        : { role: 'assistant' as const, content: m.kind === 'ask' ? `${m.text}\nQuestions : ${m.questions.map(q => q.question).join(' | ')}` : m.text })
    try {
      const turn = await converseArchitect(apiHistory, graph.nodes.length > 0 ? graph : undefined, undefined, builderModel, autonomy)
      const id = newMsgId()
      if (turn.action === 'ask') {
        setChatMsgs(m => [...m, { id, role: 'assistant', kind: 'ask', text: turn.message, questions: turn.questions }])
      } else if (turn.action === 'propose') {
        // On construit dès maintenant le graphe (mise en page) pour en afficher
        // une MAQUETTE ; il ne sera APPLIQUÉ qu'après confirmation.
        try {
          const built = planToGraph(turn.plan, turn.message || turn.plan.explanation || '').graph
          setChatMsgs(m => [...m, { id, role: 'assistant', kind: 'propose', text: turn.message || turn.plan.explanation || t('w1i.proposed_system'), graph: built }])
        } catch (e) {
          setChatMsgs(m => [...m, { id, role: 'assistant', kind: 'error', text: e instanceof Error ? e.message : t('w1i.err_prepare_system') }])
        }
      } else {
        setChatMsgs(m => [...m, { id, role: 'assistant', kind: 'reply', text: turn.message }])
      }
    } catch (e) {
      setChatMsgs(m => [...m, { id: newMsgId(), role: 'assistant', kind: 'error', text: e instanceof Error ? e.message : t('w1i.err_architect_no_reply') }])
    } finally {
      setChatBusy(false)
    }
  }

  // Onboarding : dès que le premier système est ouvert (chat vierge, non
  // occupé), on envoie l'objectif à l'architecte pour lancer la conversation.
  useEffect(() => {
    if (view !== 'canvas' || !pendingFirstMsg || chatBusy || chatMsgs.length > 0) return
    const msg = pendingFirstMsg
    setPendingFirstMsg(null)
    setChatOpen(true); setChatFull(false)
    void sendArchitect(msg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pendingFirstMsg, chatBusy, chatMsgs.length])

  // Entrée depuis la barre « Décris… » : démarre/continue la conversation.
  const build = async () => {
    const d = desc.trim()
    if (!d || chatBusy) return
    setDesc('')
    await sendArchitect(d)
  }

  // L'utilisateur CONFIRME une proposition → on applique enfin le graphe.
  const confirmPlan = (msgId: string) => {
    const msg = chatMsgs.find(m => m.id === msgId)
    if (!msg || msg.role !== 'assistant' || msg.kind !== 'propose') return
    try {
      // Nouvelle identité de graphe pour éviter d'écraser un autre système ouvert.
      const res: StudioGraph = { ...msg.graph, id: genId(), updatedAt: Date.now() }
      prevGraphRef.current = graph          // pour « Annuler »
      commit(res)
      setSelId(null); setSelEdge(null); setPan({ x: 0, y: 0 }); setZoom(1)
      setStatus({}); setNodeText({}); setLogs([])
      setChatMsgs(m => m.map(x => x.id === msgId && x.role === 'assistant' && x.kind === 'propose' ? { ...x, applied: true } : x))
      const living = !!res.objective?.text
      const done = living
        ? (res.objective?.deadline
          ? t('w1i.done_living_deadline', { deadline: res.objective.deadline })
          : t('w1i.done_living'))
        : t('w1i.done_built')
      setChatMsgs(m => [...m, { id: newMsgId(), role: 'assistant', kind: 'reply', text: done }])
    } catch (e) {
      setChatMsgs(m => [...m, { id: newMsgId(), role: 'assistant', kind: 'error', text: e instanceof Error ? e.message : t('w1i.err_apply_plan') }])
    }
  }
  const declinePlan = (msgId: string) => {
    setChatMsgs(m => m.map(x => x.id === msgId && x.role === 'assistant' && x.kind === 'propose' ? { ...x, declined: true } : x))
    setChatMsgs(m => [...m, { id: newMsgId(), role: 'assistant', kind: 'reply', text: t('w1i.decline_reply') }])
  }
  const resetChat = () => { setChatMsgs([]); setChatInput(''); setChatBusy(false) }

  // ── Objectif « en cours » (système vivant) ──
  const openObjEditor = () => {
    setObjText(graph.objective?.text ?? '')
    setObjDeadline(graph.objective?.deadline ?? '')
    setObjEditOpen(true)
  }
  const saveObjective = () => {
    const text = objText.trim()
    commit({ ...graph, objective: text ? { text, deadline: objDeadline || null } : null })
    setObjEditOpen(false)
  }
  // Jours restants avant l'échéance (null si pas d'échéance). Négatif = passée.
  const objDaysLeft = (): number | null => {
    const dl = graph.objective?.deadline
    if (!dl) return null
    const d = new Date(dl + 'T00:00:00')
    if (isNaN(d.getTime())) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - today.getTime()) / 86400000)
  }

  const undoBuild = () => {
    if (prevGraphRef.current) {
      commit(prevGraphRef.current); prevGraphRef.current = null
      setChatMsgs(m => [...m, { id: newMsgId(), role: 'assistant', kind: 'reply', text: t('w1i.restored_previous') }])
    }
  }

  // Autoscroll du chat à chaque nouveau message.
  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMsgs, chatBusy])

  // ── Maquette visuelle (bulles + branches, comme la toile) — interactive ──
  // opts : hauteur, sélection (ring + clic), statuts de run (badges).
  const miniGraph = (g: StudioGraph, opts?: { height?: number; width?: number; maxScale?: number; bare?: boolean; selectedId?: string | null; onSelect?: (id: string) => void; status?: Record<string, NodeStatus> }) => {
    const height = opts?.height ?? 178
    const nodes = g.nodes
    if (!nodes.length) return null
    const minX = Math.min(...nodes.map(n => n.x)), minY = Math.min(...nodes.map(n => n.y))
    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_D, maxY = Math.max(...nodes.map(n => n.y)) + NODE_D
    const gw = Math.max(1, maxX - minX), gh = Math.max(1, maxY - minY)
    const W = opts?.width ?? 320, PAD = 34
    const k = Math.min((W - 2 * PAD) / gw, (height - 2 * PAD) / gh, opts?.maxScale ?? 0.62)
    const d = Math.max(22, NODE_D * k)
    const cx = (n: StudioNode) => PAD + (n.x - minX) * k + d / 2
    const cy = (n: StudioNode) => PAD + (n.y - minY) * k + d / 2
    const visual = (n: StudioNode) => {
      const ext = n.kind === 'source' ? EXT_CATALOG.find(e => e.sourceKey === n.sourceKey) : undefined
      const app = n.kind === 'source' ? APP_CATALOG.find(a => a.kind === 'source' && a.sourceKey === (n.sourceKey ?? 'activities'))
        : n.kind === 'action' ? APP_CATALOG.find(a => a.kind === 'action' && a.actionKey === (n.actionKey ?? 'planning_save')) : undefined
      const iconId = ext?.id ?? app?.id ?? null
      return { iconId, col: ext?.color ?? KIND_COLOR[n.kind], filled: !!(ext || app) || n.kind === 'trigger' }
    }
    const clickable = !!opts?.onSelect
    const bare = !!opts?.bare
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: W, height, margin: bare ? '0 auto' : '10px auto 2px', borderRadius: bare ? 0 : 14, border: bare ? 'none' : '1px solid var(--border)', background: bare ? 'transparent' : 'var(--bg-alt)', overflow: 'hidden',
        ...(bare ? {} : { backgroundImage: 'radial-gradient(color-mix(in srgb, var(--text) 8%, transparent) 1px, transparent 1px)', backgroundSize: '14px 14px' }) }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet">
          {g.edges.map(e => {
            const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to)
            if (!a || !b) return null
            const ax = cx(a), ay = cy(a), bx = cx(b), by = cy(b)
            const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, r = d / 2
            const p1x = ax + ux * r, p1y = ay + uy * r, p2x = bx - ux * r, p2y = by - uy * r
            const N = Math.max(3, Math.min(16, Math.round(Math.hypot(p2x - p1x, p2y - p1y) / 8)))
            const done = opts?.status && opts.status[e.from] === 'done' && opts.status[e.to] === 'done'
            return (
              <g key={e.id}>
                <defs><linearGradient id={`mg_${g.id}_${e.id}`} gradientUnits="userSpaceOnUse" x1={p1x} y1={p1y} x2={p2x} y2={p2y}><stop offset="0" stopColor={done ? '#22C55E' : KIND_COLOR[a.kind]} /><stop offset="1" stopColor={done ? '#22C55E' : KIND_COLOR[b.kind]} /></linearGradient></defs>
                {Array.from({ length: N + 1 }, (_, i) => { const t = i / N; return <circle key={i} cx={p1x + (p2x - p1x) * t} cy={p1y + (p2y - p1y) * t} r={1.6} fill={`url(#mg_${g.id}_${e.id})`} opacity={0.9} /> })}
              </g>
            )
          })}
        </svg>
        {nodes.map(n => {
          const { iconId, col, filled } = visual(n)
          const st = opts?.status?.[n.id]
          const on = opts?.selectedId === n.id
          return (
            <div key={n.id} onClick={clickable ? () => opts!.onSelect!(n.id) : undefined}
              style={{ position: 'absolute', left: cx(n) - d / 2, top: cy(n) - d / 2, width: d, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: clickable ? 'pointer' : 'default' }}>
              <div style={{ position: 'relative', width: d, height: d, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: filled ? `linear-gradient(140deg, ${col}, color-mix(in srgb, ${col} 60%, #000))` : 'var(--bg-card)',
                color: filled ? '#fff' : col, border: `1.5px solid ${on ? col : filled ? 'transparent' : `color-mix(in srgb, ${col} 55%, transparent)`}`,
                boxShadow: on ? `0 0 0 3px color-mix(in srgb, ${col} 40%, transparent), 0 2px 6px rgba(0,0,0,0.16)` : '0 2px 6px rgba(0,0,0,0.14)', transition: 'box-shadow 0.14s' }}>
                {iconId ? <AppIcon id={iconId} size={Math.round(d * 0.44)} /> : <KindIcon kind={n.kind} size={Math.round(d * 0.44)} />}
                {st === 'done' && <span style={{ position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>}
                {st === 'running' && <span style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid color-mix(in srgb, ${col} 25%, transparent)`, borderTopColor: col, animation: 'studio_spin 0.7s linear infinite' }} />}
                {st === 'error' && <span style={{ position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
              </div>
              <span style={{ marginTop: 2, maxWidth: d + 30, fontSize: 7.5, fontWeight: 700, color: on ? col : 'var(--text-mid)', textAlign: 'center', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>{n.title}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Composeur unique (identique dans la barre centrale ET dans le chat) :
  // texte + sélecteur de modèle + jauge tokens + dictée + envoi.
  const renderComposer = (opts: { value: string; onChange: (v: string) => void; onSend: () => void; micField: 'desc' | 'chat'; placeholder: string; menuUp?: boolean }) => {
    const { value, onChange, onSend, micField, placeholder, menuUp } = opts
    const ready = !!value.trim() && !chatBusy
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8, padding: '11px 12px 9px',
        borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
      }}>
        <AutoGrowTextarea value={value} onChange={onChange} onSend={onSend} placeholder={placeholder} disabled={chatBusy} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Sélecteur de modèle IA (logo + nom) */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setModelMenuOpen(o => !o)} disabled={chatBusy} title={t('w1i.ai_model')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px 0 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: chatBusy ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={builderModel === 'hermes' ? '/logos/logo_3bras.png' : builderModel === 'zeus' ? '/logos/logo_6bras.png' : '/logos/logo_4bras.png'} alt="" width={16} height={16} style={{ objectFit: 'contain', flexShrink: 0 }} />
              {MODEL_LABEL[builderModel]}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {modelMenuOpen && (
              <>
                <div onClick={() => setModelMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                <div style={{ position: 'absolute', ...(menuUp ? { bottom: 36 } : { top: 36 }), left: 0, zIndex: 20, width: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 34px rgba(0,0,0,0.2)', padding: 5, animation: 'studio_in 0.14s ease' }}>
                  {(['hermes', 'athena', 'zeus'] as StudioModel[]).map(m => (
                    <button key={m} onClick={() => { setBuilderModel(m); setModelMenuOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 9px', borderRadius: 9, border: 'none', background: builderModel === m ? 'color-mix(in srgb, var(--studio-accent) 9%, transparent)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m === 'hermes' ? '/logos/logo_3bras.png' : m === 'zeus' ? '/logos/logo_6bras.png' : '/logos/logo_4bras.png'} alt="" width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{MODEL_LABEL[m]}</span>
                      {builderModel === m && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ flex: 1 }} />
          {/* Jauge d'utilisation des tokens */}
          {access?.allowed && (
            <button onClick={() => setWalletOpen(true)} title={t('w1i.usage_gauge')} aria-label={t('w1i.usage_gauge')}
              style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" opacity="0.4"/><path d="M12 3a9 9 0 018.5 6"/><path d="M12 12l3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
              {access.monthlyLimit > 0 && access.remaining < 1e12 && (
                <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: access.remaining <= 0 ? '#EF4444' : (access.monthlyUsed / Math.max(1, access.monthlyLimit)) > 0.85 ? '#F59E0B' : '#22C55E' }} />
              )}
            </button>
          )}
          {/* Dictée vocale */}
          <button onClick={() => { setMicTarget(micField); micBaseRef.current = micField === 'chat' ? chatInput : desc; setMicOpen(true) }} disabled={chatBusy} title={t('w1i.describe_voice')} aria-label={t('w1i.describe_voice')}
            style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>
            </svg>
          </button>
          {/* Envoyer */}
          <button onClick={onSend} disabled={!ready} aria-label={t('w1i.send')}
            style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: ready ? 'pointer' : 'not-allowed',
              background: ready ? 'var(--studio-accent)' : 'var(--border)', color: ready ? '#fff' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {chatBusy ? (
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'studio_spin 0.7s linear infinite', display: 'inline-block' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            )}
          </button>
        </div>
      </div>
    )
  }

  const chatBody = (
    <>
      <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chatMsgs.length === 0 && !chatBusy && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 280, color: 'var(--text-dim)' }}>
<div style={{ display: 'inline-flex', marginBottom: 8 }}><StudioLogo size={32} /></div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.describe_system')}</p>
            <p style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{t('w1i.describe_system_hint')}</p>
          </div>
        )}
        {chatMsgs.map(m => {
          if (m.role === 'user') return (
            <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '86%', background: 'var(--studio-accent)', color: '#fff', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>{m.text}</div>
          )
          // Réponses de l'IA : à même le fond (pas de bulle), comme l'interface IA principale.
          const plain = (children: React.ReactNode, tone?: 'error') => (
            <div key={m.id} style={{ alignSelf: 'stretch', color: tone === 'error' ? '#EF4444' : 'var(--text)', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-body)', padding: '2px 2px' }}>{children}</div>
          )
          if (m.kind === 'reply') return plain(<span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>)
          if (m.kind === 'error') return plain(<span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>, 'error')
          if (m.kind === 'ask') return (
            <div key={m.id} style={{ alignSelf: 'stretch', ...aiVars }}>
              {m.text && <div style={{ color: 'var(--text-mid)', margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>{m.text}</div>}
              <CoachQuestionCard data={{ questions: m.questions }} onSubmit={recap => void sendArchitect(recap)} />
            </div>
          )
          // propose : texte à même le fond + carte maquette (fond carte + ombre) + confirmation
          return (
            <div key={m.id} style={{ alignSelf: 'stretch', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-body)', padding: '2px 2px' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              {/* Carte cliquable → ouvre la maquette en sur-page (fond carte + ombre). */}
              <button onClick={() => { setPreviewSel(null); setMockupMsgId(m.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', marginTop: 12, padding: '11px 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in srgb, var(--studio-accent) 45%, var(--border))' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'color-mix(in srgb, var(--studio-accent) 12%, transparent)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 6.6 10.6 16.4M17 6.6 13.4 16.4"/></svg>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t('w1i.system_mockup')}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>
                    {m.graph.nodes.length} {t('w1i.block_many')} · {m.graph.nodes.filter(n => n.kind === 'agent' || n.kind === 'merge').length} {t('w1i.agent_many')} · {m.graph.edges.length} {t('w1i.link_many')} {t('w1i.tap_to_open')}
                  </span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
              </button>
              {!m.applied && !m.declined && (
                <>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--studio-accent)' }}>{t('w1i.confirm_build_question')}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => confirmPlan(m.id)}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {t('w1i.confirm')}
                    </button>
                    <button onClick={() => declinePlan(m.id)}
                      style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {t('w1i.no')}
                    </button>
                  </div>
                </>
              )}
              {m.applied && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    {t('w1i.built')}
                  </span>
                  {prevGraphRef.current && (
                    <button onClick={undoBuild} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>{t('w1i.undo')}</button>
                  )}
                </div>
              )}
              {m.declined && <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-dim)', fontStyle: 'italic' }}>{t('w1i.not_applied')}</div>}
            </div>
          )
        })}
        {chatBusy && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 9, alignItems: 'center', padding: '10px 14px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={builderModel === 'hermes' ? '/logos/logo_3bras.png' : builderModel === 'zeus' ? '/logos/logo_6bras.png' : '/logos/logo_4bras.png'}
              alt="" width={17} height={17} style={{ objectFit: 'contain', animation: 'studio_spin 2.4s linear infinite', opacity: 0.9 }} />
            <span className="studio-shimmer" style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{t('w1i.thinking')}</span>
          </div>
        )}
      </div>
      {/* Saisie — composeur IDENTIQUE à la barre centrale */}
      <div style={{ flexShrink: 0, padding: 10 }}>
        {renderComposer({
          value: chatInput,
          onChange: setChatInput,
          onSend: () => { const t = chatInput; setChatInput(''); void sendArchitect(t) },
          micField: 'chat',
          placeholder: t('w1i.chat_placeholder'),
          menuUp: true,
        })}
      </div>
    </>
  )

  // ── Run once ───────────────────────────────────────────────
  const stopRun = () => { abortRef.current?.abort(); setRunning(false); setApproval(null) }

  // Historique : enregistre le run en base (best-effort).
  const saveRunHistory = async (status: RunRow['status'], runLogs: LogEntry[], outputs: Record<string, string>, errorText: string | null, estimate: number) => {
    try {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) return
      const renders = terminalNodeIds(graphRef.current)
        .map(id => { const n = graphRef.current.nodes.find(x => x.id === id); return n ? { title: n.title, text: outputs[id] ?? '' } : null })
        .filter(Boolean)
      await supabase.from('studio_runs').insert({
        user_id: user.id, system_id: systemIdRef.current, system_name: graphRef.current.name,
        status, logs: runLogs, renders, error_text: errorText, tokens_est: estimate,
        finished_at: new Date().toISOString(),
      })
      setRuns(null)   // recharge à la prochaine ouverture de l'onglet
    } catch { /* best-effort */ }
  }

  const runOnce = async (force = false) => {
    if (running) return
    // Contrôle pré-run : erreurs → bloqué ; avertissements → « Lancer quand même ».
    const v = validateGraph(graph)
    if (v.errors.length > 0 || (!force && v.warnings.length > 0)) {
      setIssues({ ...v, canForce: v.errors.length === 0 })
      setTab('canvas')
      return
    }
    // Solde Studio : estimation du coût vs tokens restants.
    const estimate = estimateRunTokens(graph.nodes)
    if (access && access.allowed && estimate > access.remaining) {
      setIssues({
        errors: [t('w1i.err_insufficient_balance', { estimate: formatTokens(estimate), remaining: formatTokens(access.remaining) })],
        warnings: [], nodeIssues: {}, canForce: false,
      })
      setWalletOpen(true)
      return
    }
    setIssues(null)
    setRunErr(null); setLogs([]); setNodeText({}); setStatus({}); setRunCost(null); setApplyResult(null)
    const runLogs: LogEntry[] = []
    const runId = genId()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setRunning(true)

    // Coût RÉEL du run : la conso serveur est rattachée au runId → on la
    // lit après le run (petit délai : l'écriture est asynchrone côté serveur).
    const settleCost = (status: RunRow['status'], outputs: Record<string, string>, errText: string | null) => {
      void (async () => {
        await new Promise(r => setTimeout(r, 1400))
        let actual = 0
        try {
          const supabase = createClient()
          const { data } = await supabase.from('studio_usage').select('tokens_used').eq('run_id', runId)
          actual = (data ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0)
        } catch { /* best-effort */ }
        const cost = actual > 0 ? actual : estimate
        setRunCost(cost)
        void saveRunHistory(status, runLogs, outputs, errText, cost)
        refreshAccess()   // le solde vient d'être débité côté serveur
      })()
    }

    // Contexte « système vivant » (garde-fou santé + mémoire du dernier cycle),
    // identique aux runs autonomes → comportement cohérent partout.
    let livingContext = ''
    try {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (user) livingContext = await buildLivingContext(supabase, user.id, systemIdRef.current || null)
    } catch { /* best-effort : un run reste possible sans ce contexte */ }

    try {
      const { outputs, errors } = await runGraph(graph, {
        signal: ctrl.signal,
        runId,
        livingContext,
        onStatus: (id, s) => setStatus(prev => ({ ...prev, [id]: s })),
        onChunk:  (id, t) => setNodeText(prev => ({ ...prev, [id]: t })),
        onLog:    (entry) => { runLogs.push(entry); setNodeText(prev => ({ ...prev, [entry.nodeId]: entry.text })); setLogs(prev => [...prev, entry]) },
        requestApproval: (node, content) => new Promise<boolean>(resolve => {
          setTab('chat')
          setApproval({ node, content, resolve: (ok) => { setApproval(null); resolve(ok) } })
        }),
      }, { sourceUid: (scopeTab === 'coach' ? openAthleteId : null) ?? undefined })
      if (errors.length > 0) {
        const errText = errors.map(er => `${er.title} — ${er.message}`).join(' · ')
        setRunErr(t('w1i.err_nodes_failed', { count: errors.length, errText }))
        setTab('chat')
        settleCost('error', outputs, errText)
      } else {
        setTab('rendu')
        settleCost('done', outputs, null)
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setRunErr(e instanceof Error ? e.message : t('w1i.err_during_run'))
      settleCost(ctrl.signal.aborted ? 'stopped' : 'error', {}, e instanceof Error ? e.message : null)
    } finally {
      setRunning(false); abortRef.current = null
    }
  }

  // ── Journal de progression : runs de CE système, du plus récent au plus
  // ancien (l'onglet vit à l'intérieur d'un système → on le scope). ─────────
  useEffect(() => {
    if (tab !== 'runs' || runs !== null) return
    void (async () => {
      try {
        const supabase = createClient()
        let q = supabase
          .from('studio_runs')
          .select('id, system_name, status, renders, tokens_est, created_at')
          .order('created_at', { ascending: false })
          .limit(40)
        const sid = systemIdRef.current
        if (sid) q = q.eq('system_id', sid)
        const { data } = await q
        setRuns((data ?? []) as RunRow[])
      } catch { setRuns([]) }
    })()
  }, [tab, runs])

  const copyRender = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1600)
  }

  // « Ajouter au planning » depuis un rendu : convertit la synthèse en séances
  // puis les écrit au Planning après accord (réutilise la feuille d'accord de
  // l'onglet Chat, comme un nœud d'action). Aucun nœud à câbler.
  const [applyBusy, setApplyBusy] = useState(false)
  const [applyResult, setApplyResult] = useState<{ ok: boolean; text: string } | null>(null)
  const addRenderToPlanning = async (text: string) => {
    if (applyBusy || !text.trim()) return
    setApplyBusy(true); setApplyResult(null)
    const ctrl = new AbortController()
    const runId = genId()
    try {
      const res = await planningFromText(text, {
        runId, signal: ctrl.signal,
        requestApproval: (summary) => new Promise<boolean>(resolve => {
          setTab('chat')
          setApproval({
            node: { id: 'inline_plan', kind: 'action', title: t('w1i.add_to_planning'), x: 0, y: 0, actionKey: 'planning_save' },
            content: summary,
            resolve: (ok) => { setApproval(null); setTab('rendu'); resolve(ok) },
          })
        }),
      })
      setApplyResult({ ok: true, text: t('w1i.render_saved_planning', { n: res.inserted }) })
      refreshAccess()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('w1i.err_during_run')
      if (!/refus/i.test(msg)) setApplyResult({ ok: false, text: msg })
      setTab('rendu')
    } finally {
      setApplyBusy(false)
    }
  }

  // ── Roster : lancer le système sur PLUSIEURS athlètes (fan-out) ──────────
  // Analyse LECTURE SEULE par athlète (aucune écriture), avec tableau de bord.
  const [rosterOpen, setRosterOpen] = useState(false)
  const [rosterSel, setRosterSel] = useState<Set<string>>(new Set())
  const [rosterRunning, setRosterRunning] = useState(false)
  const [rosterResults, setRosterResults] = useState<Record<string, RosterResult>>({})
  const [rosterView, setRosterView] = useState<string | null>(null)   // athlète dont on lit le détail
  const rosterAbort = useRef<AbortController | null>(null)
  const stopRoster = () => { rosterAbort.current?.abort(); setRosterRunning(false) }

  const toggleRoster = (id: string) => setRosterSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allRosterSelected = coachAthletes.length > 0 && coachAthletes.every(a => rosterSel.has(a.id))
  const toggleAllRoster = () => setRosterSel(allRosterSelected ? new Set() : new Set(coachAthletes.map(a => a.id)))

  const runRoster = async () => {
    if (rosterRunning) return
    const ro = readOnlyGraph(graph)
    const v = validateGraph(ro)
    if (v.errors.length > 0) { setIssues({ ...v, canForce: false }); setRosterOpen(false); setTab('canvas'); return }
    const targets = coachAthletes.filter(a => rosterSel.has(a.id))
    if (targets.length === 0) return
    // Coût : estimation × nombre d'athlètes vs solde Studio.
    const estPer = estimateRunTokens(ro.nodes)
    const estTotal = estPer * targets.length
    if (access && access.allowed && estTotal > access.remaining) {
      setIssues({ errors: [t('w1i.err_insufficient_balance', { estimate: formatTokens(estTotal), remaining: formatTokens(access.remaining) })], warnings: [], nodeIssues: {}, canForce: false })
      setRosterOpen(false); setWalletOpen(true); return
    }
    const ctrl = new AbortController(); rosterAbort.current = ctrl
    setRosterRunning(true)
    setRosterResults(Object.fromEntries(targets.map(a => [a.id, { state: 'idle' as RosterState }])))
    const terminals = terminalNodeIds(ro)
    try {
      for (const a of targets) {
        if (ctrl.signal.aborted) break
        setRosterResults(r => ({ ...r, [a.id]: { state: 'running' } }))
        const runId = genId()
        try {
          let living = ''
          try {
            const sb = createClient()
            living = await buildLivingContext(sb, a.id, systemIdRef.current || null)
          } catch { /* best-effort */ }
          const { outputs, errors } = await runGraph(ro, {
            signal: ctrl.signal, runId, livingContext: living,
            onStatus: () => {}, onChunk: () => {}, onLog: () => {},
            requestApproval: () => Promise.resolve(false),   // aucun nœud d'accord dans un graphe lecture seule
          }, { sourceUid: a.id })
          const text = terminals.map(id => outputs[id] ?? '').find(x => x.trim()) ?? ''
          const summary = text.replace(/[#*_`>-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
          if (errors.length > 0 && !text.trim()) {
            setRosterResults(r => ({ ...r, [a.id]: { state: 'error', error: errors.map(e => e.message).join(' · ') } }))
          } else {
            setRosterResults(r => ({ ...r, [a.id]: { state: 'done', summary, text } }))
          }
        } catch (e) {
          if (ctrl.signal.aborted) { setRosterResults(r => ({ ...r, [a.id]: { state: 'idle' } })); break }
          setRosterResults(r => ({ ...r, [a.id]: { state: 'error', error: e instanceof Error ? e.message : t('w1i.err_during_run') } }))
        }
      }
    } finally {
      setRosterRunning(false); rosterAbort.current = null
      refreshAccess()
    }
  }

  // « Continuer avec le coach » : dépose le rendu dans le composer du chat
  // (mécanisme coach_prefill) puis ouvre le coach et ferme le Studio.
  const continueWithCoach = (title: string, text: string) => {
    try {
      sessionStorage.setItem('coach_prefill',
        t('w1i.coach_prefill', { name: graph.name, title, text: text.slice(0, 4000) }))
    } catch { /* ignore */ }
    onClose()
    setTimeout(() => window.dispatchEvent(new CustomEvent('thw:open-coach')), 80)
  }

  const siteUrl = process.env.NEXT_PUBLIC_MARKETING_SITE_URL
    ? `${process.env.NEXT_PUBLIC_MARKETING_SITE_URL.replace(/\/$/, '')}/studio`
    : '/decouvrir'

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13600, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes studio_spin { to { transform: rotate(360deg); } }
        @keyframes studio_dash { to { stroke-dashoffset: -14; } }
        @keyframes studio_in   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes studio_pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes studio_slide_r { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes studio_slide_up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes studio_fade { from { opacity: 0; } to { opacity: 1; } }
        .studio-shimmer { background: linear-gradient(90deg, var(--text-dim) 0%, var(--text) 40%, var(--text) 60%, var(--text-dim) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: studio_shimmer 1.6s linear infinite; }
        @keyframes studio_shimmer { to { background-position: -200% 0; } }
        .studio-node { transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
        .studio-node:hover { transform: translateY(-1px); }
        .studio-port { transition: transform 0.14s ease, box-shadow 0.14s ease; }
        .studio-port:hover { transform: scale(1.35); }
      `}</style>

      {/* ══ Header ══ */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap', padding: 'max(12px, env(safe-area-inset-top)) 14px 10px', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={view === 'canvas' ? backToHome : onClose} aria-label={view === 'canvas' ? t('w1i.back_to_systems') : t('w1i.close')} style={iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        {!isMobile && <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>Studio</div>}
        {/* Aide — sur-page d'explication */}
        <button onClick={() => setHelpOpen(true)} aria-label={t('w1i.how_it_works')} title={t('w1i.how_it_works')}
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
          ?
        </button>
        {view === 'canvas' && (
          <input
            value={graph.name}
            onChange={e => commit({ ...graph, name: e.target.value })}
            aria-label={t('w1i.system_name')}
            style={{ marginLeft: 2, minWidth: 0, flex: '0 1 240px', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }}
          />
        )}

        {/* Solde Studio — clic : détail + packs */}
        {access?.allowed && (
          <button onClick={() => setWalletOpen(true)} title={t('w1i.balance_tooltip')}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            {access.remaining > 1e12 ? t('w1i.unlimited') : t('w1i.tokens_amount', { n: formatTokens(access.remaining) })}
          </button>
        )}

        {view === 'canvas' && (<>
        <div style={{ display: 'flex', gap: 2, marginLeft: isMobile ? 0 : (access?.allowed ? 0 : 'auto'), width: isMobile ? '100%' : 'auto', order: isMobile ? 3 : 0, background: 'var(--bg-alt)', borderRadius: 10, padding: 3 }}>
          {(['canvas', 'chat', 'rendu', 'runs', 'methode'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{ flex: isMobile ? 1 : '0 0 auto', padding: isMobile ? '9px 6px' : '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: isMobile ? 12.5 : 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                background: tab === tb ? 'var(--bg)' : 'transparent', color: tab === tb ? 'var(--text)' : 'var(--text-dim)',
                boxShadow: tab === tb ? 'var(--shadow-card)' : 'none' }}>
              {tb === 'canvas' ? t('w1i.tab_canvas') : tb === 'chat' ? t('w1i.tab_pilotage') : tb === 'rendu' ? t('w1i.tab_rendu') : tb === 'runs' ? t('w1i.tab_journal') : t('w1i.tab_method')}
            </button>
          ))}
        </div>

        {/* Chat Architecte — ouvre la discussion en plein écran */}
        <button onClick={() => { setChatFull(true); if (tab !== 'canvas') setTab('canvas') }} title={t('w1i.chat_architect_full')} aria-label={t('w1i.chat_architect')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '0 9px' : '0 12px', height: 34, borderRadius: 10, border: '1px solid var(--border)', background: chatMsgs.length > 0 ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'var(--bg-alt)', color: chatMsgs.length > 0 ? 'var(--studio-accent)' : 'var(--text-mid)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-8.5 8.5 8.6 8.6 0 01-3.9-.9L3 21l1.9-5.6a8.4 8.4 0 01-.9-3.9A8.4 8.4 0 0112.5 3 8.4 8.4 0 0121 11.5z"/></svg>
          {!isMobile && t('w1i.chat')}
        </button>

        {/* Planifier — run autonome récurrent */}
        <button onClick={() => setScheduleOpen(true)} title={schedule?.enabled ? t('w1i.schedule_active_edit') : t('w1i.schedule_this_system_auto')} aria-label={t('w1i.schedule_this_system')}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: schedule?.enabled ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'var(--bg-alt)', color: schedule?.enabled ? 'var(--studio-accent)' : 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </button>

        {/* Roster — lancer le système sur plusieurs athlètes (coach) */}
        {isCoachSystem && coachAccess && (
          <button onClick={() => { setRosterView(null); setRosterOpen(true) }} title={t('w1i.roster_run_title')} aria-label={t('w1i.roster')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '0 9px' : '0 12px', height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            {!isMobile && t('w1i.roster')}
          </button>
        )}
        {running ? (
          <button onClick={stopRun} style={{ ...cta, background: '#374151' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', display: 'inline-block' }} /> {t('w1i.stop')}
          </button>
        ) : (
          <button onClick={() => void runOnce()} style={cta}
            title={graph.nodes.length ? t('w1i.estimated_cost', { n: formatTokens(estimateRunTokens(graph.nodes)) }) : 'Run once'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Run once
            {graph.nodes.length > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>~{formatTokens(estimateRunTokens(graph.nodes))}</span>
            )}
          </button>
        )}
        </>)}
      </div>

      {/* ══ Corps ══ */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {/* ── Contrôle pré-run : ce qui bloque / ce qui alerte ── */}
        {issues && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 9, width: 330, maxHeight: 'calc(100% - 24px)', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 14px 40px rgba(0,0,0,0.16)', padding: 14, animation: 'studio_in 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, background: issues.errors.length ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.14)', color: issues.errors.length ? '#EF4444' : '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)', flex: 1 }}>
                {issues.errors.length ? t('w1i.system_cannot_run') : t('w1i.check_before_launch')}
              </span>
              <button onClick={() => setIssues(null)} aria-label={t('w1i.close')} style={iconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {issues.errors.map((msg, i) => (
              <div key={`e${i}`} style={{ display: 'flex', gap: 7, padding: '6px 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 5 }} />
                <span>{msg}</span>
              </div>
            ))}
            {issues.warnings.map((msg, i) => (
              <div key={`w${i}`} style={{ display: 'flex', gap: 7, padding: '6px 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 5 }} />
                <span>{msg}</span>
              </div>
            ))}
            {issues.canForce && (
              <button onClick={() => void runOnce(true)}
                style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t('w1i.launch_anyway')}
              </button>
            )}
          </div>
        )}

        {/* ══ CANVAS ══ */}
        {view === 'canvas' && tab === 'canvas' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>

            {/* ── Composeur central — ANCRÉ EN BAS (plus lisible, ne masque plus le
                canvas ni la barre d'outils). Sur mobile il reste au-dessus des
                contrôles de zoom (bas-droite). Le composant IA lui-même est inchangé. ── */}
            {!chatOpen && !chatFull && (
              <div style={{ position: 'absolute', bottom: isMobile ? 'calc(68px + env(safe-area-inset-bottom))' : 'max(16px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 6, width: isMobile ? 'calc(100% - 24px)' : 'min(620px, calc(100% - 220px))' }}>
                {renderComposer({
                  value: desc,
                  onChange: setDesc,
                  onSend: () => void build(),
                  micField: 'desc',
                  placeholder: graph.nodes.length > 0 ? t('w1i.composer_ph_modify') : t('w1i.composer_ph_new'),
                })}
              </div>
            )}

            {/* ── Objectif « en cours » (système vivant) ── */}
            {graph.nodes.length > 0 && (() => {
              const dleft = objDaysLeft()
              const expired = dleft !== null && dleft < 0
              const soon = dleft !== null && dleft >= 0 && dleft <= 7
              const accent = expired ? '#EF4444' : soon ? '#F59E0B' : 'var(--studio-accent)'
              // Composeur désormais en bas → l'objectif remonte tout en haut
              // (en dégageant la barre annuler/rétablir en haut-gauche sur mobile).
              const top = (chatOpen || chatFull) ? 14 : (isMobile ? 58 : 16)
              return (
                <div style={{ position: 'absolute', top, left: '50%', transform: 'translateX(-50%)', zIndex: 5, maxWidth: isMobile ? 'calc(100% - 24px)' : 560 }}>
                  <button onClick={openObjEditor} title={t('w1i.objective_tooltip')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%', padding: '6px 12px', borderRadius: 999, border: `1px solid color-mix(in srgb, ${accent} 45%, var(--border))`, background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', fontFamily: 'var(--font-body)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill={accent}/></svg>
                    {graph.objective?.text ? (
                      <>
                        <span style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{graph.objective.text}</span>
                        {dleft !== null && (
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.02em', color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`, borderRadius: 999, padding: '2px 8px' }}>
                            {expired ? t('w1i.deadline_passed') : soon ? t('w1i.days_left', { n: dleft }) : new Date(graph.objective.deadline + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)' }}>{t('w1i.define_objective')}</span>
                    )}
                  </button>
                  {expired && (
                    <div style={{ marginTop: 6, padding: '7px 11px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11.5, color: '#EF4444', fontFamily: 'var(--font-body)', lineHeight: 1.45 }}>
                      {t('w1i.objective_expired_msg')}
                    </div>
                  )}
                  {healthAlert && (
                    <div title={t('w1i.system_limits_load', { alert: healthAlert })} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', color: '#B45309', fontFamily: 'var(--font-body)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                      <span style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 }}>{t('w1i.safety_mode_load', { alert: healthAlert })}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Barre flottante : annuler · rétablir · exemple · vider ── */}
            <div style={{ position: 'absolute', top: 14, left: 12, zIndex: 8, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              {(graph.nodes.length > 0 || canUndo || canRedo) && (
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, boxShadow: '0 6px 18px rgba(0,0,0,0.10)' }}>
                  <button onClick={undo} disabled={!canUndo} title={t('w1i.undo_shortcut')} aria-label={t('w1i.undo')}
                    style={{ ...zBtn, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 015 5 5 5 0 01-5 5H8"/></svg>
                  </button>
                  <button onClick={redo} disabled={!canRedo} title={t('w1i.redo_shortcut')} aria-label={t('w1i.redo')}
                    style={{ ...zBtn, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 00-5 5 5 5 0 005 5h7"/></svg>
                  </button>
                  {graph.nodes.length > 0 && (
                    <>
                      <div style={{ width: 1, background: 'var(--border)', margin: '2px 1px' }} />
                      <button onClick={() => { if (confirm(t('w1i.confirm_load_example'))) loadExample() }} title={t('w1i.load_example')} style={zBtn}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.2L4 17.2z"/><path d="M8 9h8M8 12h5"/></svg>
                      </button>
                      <button onClick={() => { if (confirm(t('w1i.confirm_clear_canvas'))) clearCanvas() }} title={t('w1i.clear_canvas')} style={zBtn}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Sélecteur « + » façon Make : outils, applications, apps externes ── */}
            {pickerOpen && (() => {
              const q = pickerQuery.trim().toLowerCase()
              const match = (s: string) => !q || s.toLowerCase().includes(q)
              // Depuis une bulle (branche) : on ne propose que des blocs qui
              // acceptent une entrée (agent / synthèse / validation + actions).
              const branchFrom = pickerFrom ? graph.nodes.find(n => n.id === pickerFrom) : undefined
              const branching = !!pickerFrom
              const close = () => { setPickerOpen(false); setPickerFrom(null) }
              const tools = (['trigger', 'agent', 'merge', 'validation'] as StudioNodeKind[])
                .filter(k => !branching || hasStudioInput(k))
                .map(k => ({ k, label: k === 'trigger' ? t('w1i.objective') : KIND_LABEL[k], off: k === 'trigger' && !!trigger }))
                .filter(tl => match(tl.label))
              const apps = APP_CATALOG.filter(a => (!branching || a.kind === 'action') && match(a.label))
              const exts = branching ? [] : EXT_CATALOG.filter(e => match(e.label))
              const bubble = (color: string, node: React.ReactNode, dim?: boolean) => (
                <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 60%, #000))`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.55 : 1, boxShadow: '0 3px 10px rgba(0,0,0,0.2)' }}>{node}</span>
              )
              const row = (key: string, color: string, icon: React.ReactNode, label: string, sub: string | null, onClick: () => void, dim = false, tag?: string) => (
                <button key={key} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '7px 9px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  {bubble(color, icon, dim)}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    {sub && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-dim)' }}>{sub}</span>}
                  </span>
                  {tag && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-dim)', flexShrink: 0 }}>{tag}</span>}
                </button>
              )
              return (
                <>
                  <div onClick={close} style={{ position: 'absolute', inset: 0, zIndex: 9 }} />
                  <div style={{ position: 'absolute', top: 14, left: 70, zIndex: 10, width: 300, maxHeight: 'calc(100% - 28px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.28)', overflow: 'hidden', animation: 'studio_in 0.16s ease' }}>
                    {branching && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(59,146,212,0.06)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v12a3 3 0 003 3h6"/><path d="M15 15l3 3-3 3"/></svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--studio-accent)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t('w1i.branch_from', { name: branchFrom?.title ?? t('w1i.block') })}
                        </span>
                      </div>
                    )}
                    <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                      <input autoFocus value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder={t('w1i.search_tool_app')}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }} />
                    </div>
                    <div style={{ overflowY: 'auto', padding: 6 }}>
                      {tools.length > 0 && <div style={paletteHdr}>{t('w1i.tools')}</div>}
                      {tools.map(tl => row(`t_${tl.k}`, KIND_COLOR[tl.k], <KindIcon kind={tl.k} size={19} />, tl.label,
                        tl.off ? t('w1i.one_per_system') : null,
                        () => { if (!tl.off) { addNode(tl.k, { fromId: pickerFrom ?? undefined }); close() } }, tl.off))}
                      {/* Contexte coach : cibler l'athlète du système (sujet des données). */}
                      {coachAccess && scopeTab === 'coach' && !branching && match(t('w1i.athlete')) && (
                        <>
                          <div style={{ ...paletteHdr, marginTop: 4 }}>{t('w1i.context')}</div>
                          {row('ctx_athlete', 'var(--studio-accent)',
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
                            t('w1i.athlete'),
                            openAthleteName ? t('w1i.targeted_name', { name: openAthleteName }) : t('w1i.choose_system_athlete'),
                            () => { setAthletePickerOpen(true); close() }, false, 'Coach')}
                        </>
                      )}
                      {apps.length > 0 && <div style={{ ...paletteHdr, marginTop: 4 }}>{t('w1i.applications')}</div>}
                      {apps.map(app => row(app.id, app.color, <AppIcon id={app.id} size={19} />, app.label,
                        app.access === 'écriture' ? t('w1i.write_access') : t('w1i.read_access'),
                        () => { addApp(app, pickerFrom ?? undefined); close() }, false))}
                      {exts.length > 0 && <div style={{ ...paletteHdr, marginTop: 4 }}>{t('w1i.external_apps')}</div>}
                      {exts.map(ext => {
                        const on = connectedProviders.has(ext.provider)
                        return row(ext.id, ext.color, <AppIcon id={ext.id} size={19} />, ext.label,
                          on ? t('w1i.connected') : t('w1i.connect_in_connections'),
                          () => { addExt(ext, pickerFrom ?? undefined); close() }, !on)
                      })}
                      {tools.length + apps.length + exts.length === 0 && (
                        <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w1i.no_results')}</div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Contexte athlète ciblé (coach) — chip épinglé en haut du canvas. */}
            {coachAccess && scopeTab === 'coach' && openAthleteName && (
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 12px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.athlete_label', { name: openAthleteName })}</span>
                <button onClick={() => setAthletePickerOpen(true)} title={t('w1i.change_athlete')} style={{ border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)', padding: '2px 4px' }}>{t('w1i.change')}</button>
                <button onClick={() => setSystemAthlete(null)} title={t('w1i.remove')} aria-label={t('w1i.remove_athlete')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}

            {/* ── Zone graphe ── */}
            <div ref={wrapRef} data-bg="1" onPointerDown={startPan}
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: drag.current?.mode === 'pan' ? 'grabbing' : 'default', touchAction: 'none',
                backgroundImage: 'radial-gradient(color-mix(in srgb, var(--text) 9%, transparent) 1px, transparent 1px)', backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}>

              {/* Fils (SVG) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {graph.edges.map(e => {
                    const a = graph.nodes.find(n => n.id === e.from), b = graph.nodes.find(n => n.id === e.to)
                    if (!a || !b) return null
                    const { p1, p2 } = edgeAnchors(a, b)
                    const mid = bezAt(p1, p2, 0.5)
                    const flowing = status[e.from] === 'done' && (status[e.to] === 'running' || status[e.to] === 'waiting')
                    const doneFlow = status[e.from] === 'done' && status[e.to] === 'done'
                    const sel = selEdge === e.id
                    const colA = KIND_COLOR[a.kind], colB = KIND_COLOR[b.kind]
                    // Chapelet de perles façon Make : dégradé de la couleur de A vers
                    // celle de B, perles un peu plus grosses près des bulles.
                    const dx = p2.x - p1.x, dy = p2.y - p1.y
                    const L = Math.hypot(dx, dy) || 1
                    const N = Math.max(4, Math.min(42, Math.round(L / 11)))
                    return (
                      <g key={e.id}>
                        <defs>
                          <linearGradient id={`eg_${e.id}`} gradientUnits="userSpaceOnUse" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}>
                            <stop offset="0" stopColor={colA} />
                            <stop offset="1" stopColor={colB} />
                          </linearGradient>
                        </defs>
                        {/* Zone de clic invisible le long du fil */}
                        <path d={edgePath(p1, p2)} fill="none" stroke="transparent" strokeWidth={16}
                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                          onPointerDown={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelId(null) }} />
                        {flowing || doneFlow ? (
                          // Fil actif : trait animé bien lisible.
                          <path d={edgePath(p1, p2)} fill="none" stroke={doneFlow ? '#22C55E' : KIND_COLOR[a.kind]}
                            strokeWidth={2.4} strokeOpacity={0.95} strokeLinecap="round"
                            strokeDasharray={flowing ? '7 7' : undefined}
                            style={{ pointerEvents: 'none', animation: flowing ? 'studio_dash 0.6s linear infinite' : undefined }} />
                        ) : (
                          // Fil au repos : chapelet de perles dégradées.
                          Array.from({ length: N + 1 }, (_, i) => {
                            const t = i / N
                            const pt = bezAt(p1, p2, t)
                            const r = (sel ? 2.3 : 1.8) + 1.5 * Math.abs(2 * t - 1)
                            return <circle key={i} cx={pt.x} cy={pt.y} r={r}
                              fill={`url(#eg_${e.id})`} opacity={sel ? 1 : 0.85} style={{ pointerEvents: 'none' }} />
                          })
                        )}
                        {sel && (
                          <g transform={`translate(${mid.x},${mid.y})`} style={{ pointerEvents: 'all', cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); deleteEdge(e.id) }}>
                            <circle r="10" fill="#EF4444" style={{ filter: 'drop-shadow(0 2px 6px rgba(239,68,68,0.45))' }} />
                            <path d="M -3.4 -3.4 L 3.4 3.4 M 3.4 -3.4 L -3.4 3.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                          </g>
                        )}
                      </g>
                    )
                  })}
                  {pending && (() => {
                    const a = graph.nodes.find(n => n.id === pending.fromId)
                    if (!a) return null
                    // Le fil provisoire part aussi du bord de la bulle qui fait
                    // face au curseur → il pivote pendant le glisser.
                    const ca = center(a)
                    const dx = pending.x - ca.x, dy = pending.y - ca.y
                    const d = Math.hypot(dx, dy) || 1
                    const start = { x: ca.x + (dx / d) * R, y: ca.y + (dy / d) * R }
                    return <path d={edgePath(start, { x: pending.x, y: pending.y })} fill="none" stroke={KIND_COLOR[a.kind]} strokeWidth={2.2} strokeDasharray="6 5" strokeLinecap="round" style={{ animation: 'studio_dash 0.5s linear infinite' }} />
                  })()}
                </g>
              </svg>

              {/* Nœuds */}
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                {graph.nodes.map(n => {
                  const st = status[n.id] ?? 'idle'
                  const preview = nodeText[n.id]
                  const isTrigger = n.kind === 'trigger'
                  const extEntry = n.kind === 'source' ? EXT_CATALOG.find(e => e.sourceKey === n.sourceKey) : undefined
                  const appEntry = n.kind === 'source'
                    ? APP_CATALOG.find(a => a.kind === 'source' && a.sourceKey === (n.sourceKey ?? 'activities'))
                    : n.kind === 'action'
                    ? APP_CATALOG.find(a => a.kind === 'action' && a.actionKey === (n.actionKey ?? 'planning_save'))
                    : undefined
                  // Nœud d'app externe → couleur de la marque + son icône.
                  const iconId = extEntry?.id ?? appEntry?.id ?? null
                  const isApp = !!(extEntry || appEntry)
                  const col = extEntry?.color ?? KIND_COLOR[n.kind]
                  const subtitle = n.kind === 'source' ? SOURCE_LABEL[n.sourceKey ?? 'activities']
                    : n.kind === 'action' ? ACTION_LABEL[n.actionKey ?? 'planning_save']
                    : undefined
                  // Anneau du contrôle pré-run : rouge = bloquant, ambre = avertissement.
                  const iss = issues?.nodeIssues[n.id]
                  const hasInput = n.kind !== 'trigger' && n.kind !== 'source'
                  const roleBearing = n.kind === 'trigger' || n.kind === 'agent' || n.kind === 'merge' || n.kind === 'validation'
                  const filled = isApp || isTrigger   // bulle pleine (logo blanc) vs contour
                  const open = hoverId === n.id || selId === n.id
                  const rolePh = n.kind === 'trigger' ? t('w1i.role_ph_trigger')
                    : n.kind === 'merge' ? t('w1i.role_ph_merge')
                    : n.kind === 'validation' ? t('w1i.role_ph_validation')
                    : t('w1i.role_ph_agent')
                  const ringColor = st !== 'idle' && STATUS_RING[st] !== 'transparent' ? STATUS_RING[st]
                    : selId === n.id ? `color-mix(in srgb, ${col} 32%, transparent)`
                    : iss === 'error' ? 'rgba(239,68,68,0.22)' : iss === 'warning' ? 'rgba(245,158,11,0.24)' : null
                  return (
                    <div key={n.id} className="studio-node"
                      onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(h => h === n.id ? null : h)}
                      style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_D, userSelect: 'none', zIndex: open ? 6 : 1 }}>
                      {/* Bulle circulaire — juste le logo. La bulle entière est
                          une cible de dépôt de fil (on relâche n'importe où dessus). */}
                      <div onPointerDown={e => startNodeDrag(e, n)} title={n.title}
                        data-portin={hasInput ? n.id : undefined}
                        style={{ width: NODE_D, height: NODE_D, borderRadius: '50%', cursor: 'grab', position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: filled ? `linear-gradient(140deg, ${col}, color-mix(in srgb, ${col} 60%, #000))` : 'var(--bg-card)',
                          color: filled ? '#fff' : col,
                          border: `2px solid ${selId === n.id ? col : filled ? 'transparent' : `color-mix(in srgb, ${col} 55%, transparent)`}`,
                          boxShadow: ringColor ? `0 0 0 4px ${ringColor}, 0 6px 18px rgba(0,0,0,0.22)` : '0 6px 18px rgba(0,0,0,0.22)' }}>
                        {iconId ? <AppIcon id={iconId} size={28} /> : <KindIcon kind={n.kind} size={28} />}
                        {/* Badge de statut (coin haut-droit) */}
                        {st === 'running' && <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid color-mix(in srgb, ${col} 25%, transparent)`, borderTopColor: col, animation: 'studio_spin 0.7s linear infinite' }} />}
                        {st === 'done' && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>}
                        {st === 'waiting' && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'studio_pulse 1.4s ease infinite' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg></span>}
                        {st === 'error' && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
                        {/* Poignée de sortie (glisser pour relier) — à droite, au
                            survol seulement pour garder la bulle épurée. */}
                        {open && hasStudioOutput(n.kind) && (
                          <span onPointerDown={e => startConnect(e, n)} title={t('w1i.link')} className="studio-port"
                            style={{ position: 'absolute', right: -7, top: NODE_D / 2 - 7, width: 14, height: 14, borderRadius: '50%', background: col, border: '2.5px solid var(--bg-card)', cursor: 'crosshair', boxShadow: `0 0 0 2px color-mix(in srgb, ${col} 25%, transparent), 0 1px 3px rgba(0,0,0,0.2)` }} />
                        )}
                        {/* « + » au survol : ouvre une branche (ajoute + relie un bloc). */}
                        {open && hasStudioOutput(n.kind) && (
                          <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setPickerFrom(n.id); setPickerQuery(''); setPickerOpen(true) }}
                            title={t('w1i.add_branch')} className="studio-port"
                            style={{ position: 'absolute', right: -30, top: NODE_D / 2 - 11, width: 22, height: 22, borderRadius: '50%', background: col, color: '#fff', border: '2px solid var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          </button>
                        )}
                      </div>
                      {/* Libellé sous la bulle */}
                      <div style={{ width: NODE_D + 52, marginLeft: -26, marginTop: 6, textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)', lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{n.title}</div>
                        {(n.kind === 'agent' || n.kind === 'merge') && n.model && (
                          <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: col, marginTop: 1 }}>{MODEL_LABEL[n.model]}</div>
                        )}
                      </div>
                      {/* Champ d'objectif/rôle — au survol ou à la sélection */}
                      {open && roleBearing && (
                        <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
                          style={{ position: 'absolute', top: NODE_D + 34, left: NODE_D / 2 - 112, width: 224, zIndex: 8, background: 'var(--bg-card)', border: `1px solid ${col}`, borderRadius: 12, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.28)', animation: 'studio_in 0.14s ease' }}>
                          <textarea value={n.role ?? ''} onChange={e => patchNode(n.id, { role: e.target.value })} placeholder={rolePh}
                            rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, lineHeight: 1.45, fontFamily: 'var(--font-body)' }} />
                          {preview && <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', maxHeight: 60, overflow: 'hidden' }}>{preview.slice(0, 180)}</div>}
                        </div>
                      )}
                      {open && !roleBearing && subtitle && (
                        <div onPointerDown={e => e.stopPropagation()}
                          style={{ position: 'absolute', top: NODE_D + 34, left: NODE_D / 2 - 100, width: 200, zIndex: 8, background: 'var(--bg-card)', border: `1px solid ${col}`, borderRadius: 12, padding: '8px 10px', boxShadow: '0 10px 30px rgba(0,0,0,0.28)', fontSize: 11.5, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>
                          <div style={{ fontWeight: 700, color: col, marginBottom: 2 }}>{subtitle}</div>
                          {n.kind === 'source' ? t('w1i.source_desc') : t('w1i.action_desc')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Toile vide : grosse bulle « + » (façon Make) ── */}
              {graph.nodes.length === 0 && !chatBusy && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 16, padding: 20 }}>
                  <button onClick={() => { setPickerFrom(null); setPickerQuery(''); setPickerOpen(true) }} title={t('w1i.add_block')}
                    style={{ pointerEvents: 'auto', width: 84, height: 84, borderRadius: '50%', cursor: 'pointer',
                      background: 'color-mix(in srgb, var(--studio-accent) 8%, var(--bg-card))', border: '2px dashed color-mix(in srgb, var(--studio-accent) 45%, transparent)',
                      color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 10px 30px rgba(59,146,212,0.14)', transition: 'transform 0.15s, background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <div style={{ textAlign: 'center', maxWidth: 300 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.blank_canvas')}</p>
                    <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                      {t('w1i.blank_canvas_hint_a')}<b style={{ color: 'var(--studio-accent)' }}>+</b>{t('w1i.blank_canvas_hint_b')}
                    </p>
                    <button onClick={loadExample} style={{ pointerEvents: 'auto', marginTop: 12, padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {t('w1i.or_load_example')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Contrôles de la toile : zoom · ajuster · ranger ── */}
              <div style={{ position: 'absolute', right: 12, bottom: 14, zIndex: 5, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.10)' }}>
                <button onClick={() => zoomBy(1 / 1.2)} title={t('w1i.zoom_out')} aria-label={t('w1i.zoom_out')} style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/></svg>
                </button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} title={t('w1i.reset_zoom')} aria-label={t('w1i.reset_zoom')}
                  style={{ ...zBtn, width: 46, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => zoomBy(1.2)} title={t('w1i.zoom_in')} aria-label={t('w1i.zoom_in')} style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
                <button onClick={fitView} title={t('w1i.fit_view')} aria-label={t('w1i.fit_view')} style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg>
                </button>
                <button onClick={tidy} title={t('w1i.tidy_canvas_auto')} aria-label={t('w1i.tidy_canvas')} style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="15" y="4" width="6" height="6" rx="1.5"/><rect x="9" y="14" width="6" height="6" rx="1.5"/><path d="M6 10v2a2 2 0 002 2h1M18 10v2a2 2 0 01-2 2h-1"/></svg>
                </button>
              </div>
            </div>

            {/* ── Panneau Architecte (chat) — colonne droite repliable ── */}
            {chatOpen && !chatFull && (
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 8,
                width: isMobile ? '100%' : CHAT_W, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 34px rgba(0,0,0,0.14)', animation: 'studio_in 0.2s ease' }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <StudioLogo size={17} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)', flex: 1 }}>{t('w1i.architect')}</span>
                  {chatMsgs.length > 0 && (
                    <button onClick={resetChat} title={t('w1i.new_conversation')} aria-label={t('w1i.new_conversation')} style={iconBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  )}
                  <button onClick={() => setChatFull(true)} title={t('w1i.fullscreen')} aria-label={t('w1i.fullscreen')} style={iconBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg>
                  </button>
                  <button onClick={() => setChatOpen(false)} title={t('w1i.minimize')} aria-label={t('w1i.minimize')} style={iconBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </div>
                {chatBody}
              </div>
            )}
            {/* Onglet de réouverture quand le chat est replié mais qu'une conversation existe */}
            {!chatOpen && chatMsgs.length > 0 && (
              <button onClick={() => setChatOpen(true)} title={t('w1i.reopen_architect')}
                style={{ position: 'absolute', top: 70, right: 0, zIndex: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px 9px 14px', borderRadius: '12px 0 0 12px', border: '1px solid var(--border)', borderRight: 'none', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', boxShadow: '-4px 4px 16px rgba(0,0,0,0.12)', fontFamily: 'var(--font-body)' }}>
                <StudioLogo size={15} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t('w1i.architect')}</span>
              </button>
            )}

            {/* ── Inspecteur (colonne droite desktop · sheet bas mobile) ── */}
            {sel && (
              <div style={isMobile
                ? { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '62%', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, overflowY: 'auto', zIndex: 9, boxShadow: '0 -10px 34px rgba(0,0,0,0.20)', animation: 'studio_in 0.18s ease' }
                : { position: 'absolute', top: 0, right: chatOpen ? CHAT_W : 0, bottom: 0, width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto', zIndex: 4, animation: 'studio_in 0.18s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 8, background: `color-mix(in srgb, ${KIND_COLOR[sel.kind]} 13%, transparent)`, color: KIND_COLOR[sel.kind], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KindIcon kind={sel.kind} size={13} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{KIND_LABEL[sel.kind]}</span>
                  <button onClick={() => setSelId(null)} style={{ ...iconBtn, marginLeft: 'auto' }} aria-label={t('w1i.close')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <label style={lbl}>{t('w1i.title')}</label>
                <input value={sel.title} onChange={e => patchNode(sel.id, { title: e.target.value })} style={fld} />

                {/* Connecteur de page (lecture) */}
                {sel.kind === 'source' && (
                  <>
                    <label style={lbl}>{t('w1i.app_page_to_connect')}</label>
                    <select value={sel.sourceKey ?? 'activities'} onChange={e => patchNode(sel.id, { sourceKey: e.target.value as StudioSourceKey })} style={{ ...fld, cursor: 'pointer' }}>
                      {(Object.keys(SOURCE_LABEL) as StudioSourceKey[]).map(k => (
                        <option key={k} value={k}>{SOURCE_LABEL[k]}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 14px' }}>
                      {t('w1i.source_node_desc')}
                    </p>
                  </>
                )}

                {/* Action d'écriture */}
                {sel.kind === 'action' && (
                  <>
                    <label style={lbl}>{t('w1i.action')}</label>
                    <select value={sel.actionKey ?? 'planning_save'} onChange={e => patchNode(sel.id, { actionKey: e.target.value as StudioActionKey, title: ACTION_LABEL[e.target.value as StudioActionKey] })} style={{ ...fld, cursor: 'pointer' }}>
                      {(Object.keys(ACTION_LABEL) as StudioActionKey[]).map(k => (
                        <option key={k} value={k}>{ACTION_LABEL[k]}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 14px' }}>
                      {(sel.actionKey ?? 'planning_save') === 'planning_save'
                        ? t('w1i.action_desc_planning')
                        : (sel.actionKey === 'calendar_race')
                        ? t('w1i.action_desc_calendar')
                        : t('w1i.action_desc_notify')}
                    </p>
                  </>
                )}

                {sel.kind !== 'source' && sel.kind !== 'action' && (
                  <>
                    <label style={lbl}>{sel.kind === 'trigger' ? t('w1i.objective') : sel.kind === 'validation' ? t('w1i.validation_instruction') : t('w1i.agent_role')}</label>
                    <textarea value={sel.role ?? ''} onChange={e => patchNode(sel.id, { role: e.target.value })} rows={7}
                      style={{ ...fld, resize: 'vertical', lineHeight: 1.5 }} placeholder={sel.kind === 'trigger' ? t('w1i.collective_goal_ph') : t('w1i.describe_job_ph')} />
                  </>
                )}

                {(sel.kind === 'agent' || sel.kind === 'merge') && (
                  <>
                    <label style={lbl}>{t('w1i.ai_model_label')}</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['hermes', 'athena', 'zeus'] as StudioModel[]).map(m => (
                        <button key={m} onClick={() => patchNode(sel.id, { model: m })}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${sel.model === m ? KIND_COLOR[sel.kind] : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                            background: sel.model === m ? KIND_COLOR[sel.kind] : 'var(--bg-alt)', color: sel.model === m ? '#fff' : 'var(--text-mid)' }}>
                          {MODEL_LABEL[m]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {sel.kind !== 'trigger' && (
                  <button onClick={() => deleteNode(sel.id)}
                    style={{ marginTop: 18, width: '100%', padding: '10px 0', borderRadius: 9, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.delete_node')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PILOTAGE ══ */}
        {/* ══ MÉTHODE — réglages du coach, appliqués par les agents à chaque run ══ */}
        {view === 'canvas' && tab === 'methode' && (() => {
          const m: StudioMethod = graph.method ?? {}
          const setM = (patch: Partial<StudioMethod>) => commit({ ...graph, method: { ...m, ...patch } })
          const segRow = (label: string, hint: string, current: string, opts: [string, string][], pick: (v: string) => void) => (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{label}</div>
              {hint && <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 9px', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>{hint}</div>}
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
                {opts.map(([v, lbl]) => {
                  const on = current === v
                  return (
                    <button key={v} onClick={() => pick(v)}
                      style={{ padding: '9px 15px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', background: on ? 'var(--studio-accent)' : 'transparent', color: on ? '#fff' : 'var(--text-mid)' }}>{lbl}</button>
                  )
                })}
              </div>
            </div>
          )
          return (
            <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '22px 18px 60px', maxWidth: 680, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: '0 0 4px' }}>{t('w3d.method_title')}</h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 22px', lineHeight: 1.5 }}>{t('w3d.method_hint')}</p>
              {segRow(t('w3d.method_aiwrites'), t('w1i.method_ai_hint'), m.aiWrites ?? 'simple',
                [['none', t('w3d.method_ai_none')], ['simple', t('w3d.method_ai_simple')], ['all', t('w3d.method_ai_all')]],
                v => setM({ aiWrites: v as StudioMethod['aiWrites'] }))}
              {segRow(t('w3d.method_cadence'), '', m.cadence ?? 'weekly',
                [['weekly', t('w3d.method_cad_weekly')], ['biweekly', t('w3d.method_cad_biweekly')], ['triweekly', t('w3d.method_cad_triweekly')], ['block', t('w3d.method_cad_block')]],
                v => setM({ cadence: v as StudioMethod['cadence'] }))}
              {segRow(t('w3d.method_validation'), '', m.validation ?? 'always',
                [['always', t('w3d.method_val_always')], ['auto_simple', t('w3d.method_val_auto')]],
                v => setM({ validation: v as StudioMethod['validation'] }))}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{t('w3d.method_rules')}</div>
                <textarea value={(m.rules ?? []).join('\n')} onChange={e => setM({ rules: e.target.value.split('\n') })}
                  placeholder={t('w3d.method_rules_ph')} rows={5}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.55, outline: 'none' }} />
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'var(--font-body)' }}>{t('w1i.method_autosave')}</div>
              </div>
            </div>
          )
        })()}

        {view === 'canvas' && tab === 'chat' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 760, margin: '0 auto' }}>
            <label style={lbl}>{t('w1i.collective_objective')}</label>
            {trigger ? (
              <textarea value={trigger.role ?? ''} onChange={e => patchNode(trigger.id, { role: e.target.value })} rows={3}
                style={{ ...fld, resize: 'vertical', lineHeight: 1.5, marginBottom: 18 }} placeholder={t('w1i.agents_together_ph')} />
            ) : <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1i.no_trigger_hint')}</p>}

            {runErr && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{runErr}</div>}

            {runCost !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'rgba(59,146,212,0.08)', border: '1px solid rgba(59,146,212,0.25)', marginBottom: 16, fontSize: 12, fontWeight: 700, color: 'var(--studio-accent)', fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                {t('w1i.run_cost', { n: formatTokens(runCost) })}
              </div>
            )}

            {approval && (
              <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(245,158,11,0.45)', boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 14px 40px rgba(0,0,0,0.16)', marginBottom: 18, animation: 'studio_in 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(245,158,11,0.14)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KindIcon kind={approval.node.kind} size={14} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{approval.node.title}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '3px 9px' }}>{t('w1i.your_approval')}</span>
                </div>
                {approval.node.role && <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 10, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{approval.node.role}</div>}
                <div style={{ maxHeight: 420, overflowY: 'auto', padding: '14px 16px', borderRadius: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', marginBottom: 14 }}>
                  {approval.content ? <StudioMarkdown text={approval.content} /> : <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1i.no_input_content')}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approval.resolve(true)} style={{ ...cta, flex: 1, justifyContent: 'center' }}>{t('w1i.validate_continue')}</button>
                  <button onClick={() => approval.resolve(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w1i.refuse')}</button>
                </div>
              </div>
            )}

            <label style={lbl}>{t('w1i.run_journal')}</label>
            {logs.length === 0 && !running && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1i.run_once_to_see')}</p>}
            {running && logs.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>{t('w1i.agents_working')}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map((l, i) => (
                <div key={i} style={{ padding: 13, borderRadius: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'studio_in 0.2s ease' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{l.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{l.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ RENDU ══ */}
        {view === 'canvas' && tab === 'rendu' && (() => {
          const hasAnyText = graph.nodes.some(n => (nodeText[n.id] ?? '').trim())
          const terminals = terminalNodeIds(graph)
          const selId = (renduSelId && graph.nodes.some(n => n.id === renduSelId)) ? renduSelId
            : (terminals.find(id => (nodeText[id] ?? '').trim()) ?? terminals[0] ?? graph.nodes[0]?.id ?? null)
          const selNode = graph.nodes.find(n => n.id === selId) ?? null
          const selText = selNode ? (nodeText[selNode.id] ?? '') : ''
          const sub = (n: StudioNode) => n.kind === 'source' ? SOURCE_LABEL[n.sourceKey ?? 'activities'] : n.kind === 'action' ? ACTION_LABEL[n.actionKey ?? 'planning_save'] : KIND_LABEL[n.kind]
          // Ce qui a été ÉCRIT dans l'app par ce run (actions terminées).
          const writes = graph.nodes.filter(n => n.kind === 'action' && status[n.id] === 'done' && (nodeText[n.id] ?? '').trim()).map(n => {
            const ak = n.actionKey ?? 'planning_save'
            const link = ak === 'calendar_race' ? '/calendar' : ak === 'notify_report' ? '/notifications' : '/planning'
            const linkLabel = ak === 'calendar_race' ? t('w1i.open_calendar') : ak === 'notify_report' ? t('w1i.see_notifications') : t('w1i.open_planning')
            const first = (nodeText[n.id] ?? '').split('\n').find(l => l.trim()) ?? ''
            return { id: n.id, first, link, linkLabel }
          })
          return (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 820, margin: '0 auto' }}>
            {runCost !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'rgba(59,146,212,0.08)', border: '1px solid rgba(59,146,212,0.25)', marginBottom: 14, fontSize: 12, fontWeight: 700, color: 'var(--studio-accent)', fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                {t('w1i.run_cost', { n: formatTokens(runCost) })}
              </div>
            )}
            {/* Bandeau : ce qui a été écrit dans l'app (Planning / Calendrier / Notifs). */}
            {writes.length > 0 && (
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: writes.length ? 6 : 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#16A34A', fontFamily: 'var(--font-body)' }}>{t('w1i.run_wrote_in_app')}</span>
                </div>
                {writes.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.first}</span>
                    <a href={w.link} style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#16A34A', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>{w.linkLabel} →</a>
                  </div>
                ))}
              </div>
            )}
            {applyResult && (
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
                background: applyResult.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                border: `1px solid ${applyResult.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: applyResult.ok ? '#16A34A' : '#EF4444', fontFamily: 'var(--font-body)' }}>{applyResult.text}</span>
                {applyResult.ok && <a href="/planning" style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#16A34A', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>{t('w1i.open_planning')} →</a>}
              </div>
            )}
            {!hasAnyText ? (
              <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', marginTop: 60 }}>
                {t('w1i.rendu_empty')}
              </p>
            ) : (
              <>
                {/* Carte du système — bulles cliquables, statut du run */}
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 2px' }}>{t('w1i.system_tap_bubble')}</div>
                <div style={{ maxWidth: 360 }}>
                  {miniGraph(graph, { height: 220, selectedId: selId, onSelect: setRenduSelId, status })}
                </div>

                {/* Détail du nœud sélectionné : ce qu'il a produit */}
                {selNode && (
                  <div style={{ marginTop: 14, animation: 'studio_in 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in srgb, ${KIND_COLOR[selNode.kind]} 14%, transparent)`, color: KIND_COLOR[selNode.kind], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <KindIcon kind={selNode.kind} size={14} />
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{selNode.title}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>{sub(selNode)}</span>
                      <div style={{ flex: 1 }} />
                      {selText.trim() && (<>
                        {(selNode.kind === 'agent' || selNode.kind === 'merge') && (
                          <button onClick={() => void addRenderToPlanning(selText)} disabled={applyBusy} title={t('w1i.add_to_planning')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: 'none', background: '#16A34A', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: applyBusy ? 'default' : 'pointer', opacity: applyBusy ? 0.6 : 1, fontFamily: 'var(--font-body)' }}>
                            {applyBusy ? (
                              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'studio_spin 0.7s linear infinite' }} />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M9 14l2 2 4-4"/></svg>
                            )}
                            {applyBusy ? t('w1i.adding') : t('w1i.add_to_planning')}
                          </button>
                        )}
                        <button onClick={() => continueWithCoach(selNode.title, selText)} title={t('w1i.continue_with_coach')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          {t('w1i.continue')}
                        </button>
                        <button onClick={() => copyRender(selNode.id, selText)} title={t('w1i.copy')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: copied === selNode.id ? '#22C55E' : 'var(--text-mid)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          {copied === selNode.id ? (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {t('w1i.copied')}</>
                          ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> {t('w1i.copy')}</>
                          )}
                        </button>
                      </>)}
                    </div>
                    {selNode.role && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{selNode.role}</div>}
                    <div style={{ padding: '14px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      {selText.trim()
                        ? <StudioMarkdown text={selText} />
                        : <span style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>{selNode.kind === 'source' ? t('w1i.source_no_text') : t('w1i.no_output_last_run')}</span>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          )
        })()}

        {/* ══ HISTORIQUE DES RUNS ══ */}
        {view === 'canvas' && tab === 'runs' && (() => {
          const allRuns = runs ?? []
          const doneCount = allRuns.filter(r => r.status === 'done').length
          const obj = graph.objective
          // Jours restants avant l'échéance de l'objectif.
          let deadlineChip: { text: string; col: string } | null = null
          if (obj?.deadline) {
            const end = new Date(`${obj.deadline}T23:59:59`)
            if (!isNaN(end.getTime())) {
              const days = Math.ceil((end.getTime() - Date.now()) / 86400_000)
              deadlineChip = days < 0
                ? { text: t('w1i.deadline_passed'), col: '#EF4444' }
                : days === 0 ? { text: t('w1i.today'), col: '#F59E0B' }
                : { text: t('w1i.days_left', { n: days }), col: days <= 14 ? '#F59E0B' : 'var(--studio-accent)' }
            }
          }
          // Prochain run planifié (résumé lisible) si la planification est active.
          let nextRunLabel: string | null = null
          if (schedule?.enabled) {
            const DAYS = [t('w1i.day_monday_lc'), t('w1i.day_tuesday_lc'), t('w1i.day_wednesday_lc'), t('w1i.day_thursday_lc'), t('w1i.day_friday_lc'), t('w1i.day_saturday_lc'), t('w1i.day_sunday_lc')]
            nextRunLabel = schedule.frequency === 'weekly'
              ? t('w1i.each_weekday_at', { day: DAYS[schedule.weekday] ?? t('w1i.week'), hour: schedule.hour })
              : t('w1i.each_day_at', { hour: schedule.hour })
          }
          // Aperçu du dernier cycle réussi (première ligne de son rendu).
          const lastDone = allRuns.find(r => r.status === 'done')
          const lastSnippet = lastDone
            ? ((lastDone.renders ?? []).find(x => x.text)?.text ?? '').replace(/[#*_`>-]/g, '').trim().slice(0, 150)
            : ''
          return (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px 40px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* En-tête : progression vers l'objectif */}
            {(obj?.text || allRuns.length > 0) && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'linear-gradient(150deg, color-mix(in srgb, var(--studio-accent) 8%, var(--bg-card)), var(--bg-card))', border: '1px solid color-mix(in srgb, var(--studio-accent) 22%, var(--border))', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--studio-accent)', display: 'flex', flexShrink: 0 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.7" fill="currentColor"/></svg></span>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{t('w1i.progress_to_objective')}</span>
                  {deadlineChip && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: deadlineChip.col, background: `color-mix(in srgb, ${deadlineChip.col} 12%, transparent)`, borderRadius: 7, padding: '3px 9px', fontFamily: 'var(--font-body)' }}>{deadlineChip.text}</span>}
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)', margin: '8px 0 0', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{obj?.text || graph.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
                  {doneCount > 0 ? <><b style={{ color: 'var(--studio-accent)' }}>{doneCount}</b> {t(doneCount > 1 ? 'w1i.cycles_done_plural' : 'w1i.cycles_done_singular')}</> : t('w1i.no_cycles_done')}
                  {!obj?.text && <span style={{ color: 'var(--text-dim)' }}>{t('w1i.no_objective_suffix')}</span>}
                </div>
                {/* Chips d'état : planification + santé */}
                {(nextRunLabel || healthAlert) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                    {nextRunLabel && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--studio-accent)', background: 'color-mix(in srgb, var(--studio-accent) 10%, transparent)', borderRadius: 8, padding: '4px 9px', fontFamily: 'var(--font-body)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        {t('w1i.next_run', { label: nextRunLabel })}
                      </span>
                    )}
                    {healthAlert && (
                      <span title={healthAlert} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 8, padding: '4px 9px', fontFamily: 'var(--font-body)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                        {t('w1i.safety_mode_active')}
                      </span>
                    )}
                  </div>
                )}
                {lastSnippet && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid color-mix(in srgb, var(--studio-accent) 15%, var(--border))' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3, fontFamily: 'var(--font-body)' }}>{t('w1i.last_cycle')}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{lastSnippet}…</div>
                  </div>
                )}
              </div>
            )}

            {runs === null && <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>{t('w1i.loading_journal')}</p>}
            {runs !== null && allRuns.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>{t('w1i.no_cycles_yet')}</p>
            )}

            {/* Timeline : un point par cycle, du plus récent au plus ancien */}
            <div style={{ position: 'relative' }}>
              {allRuns.length > 1 && <div style={{ position: 'absolute', left: 15, top: 14, bottom: 14, width: 2, background: 'var(--border)' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allRuns.map(r => {
                  const open = openRunId === r.id
                  const stCol = r.status === 'done' ? '#22C55E' : r.status === 'error' ? '#EF4444' : '#F59E0B'
                  const stLbl = r.status === 'done' ? t('w1i.status_done') : r.status === 'error' ? t('w1i.status_error') : t('w1i.status_stopped')
                  return (
                    <div key={r.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      {/* Pastille de la timeline */}
                      <div style={{ flexShrink: 0, width: 32, display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: stCol, border: '3px solid var(--bg)', boxShadow: `0 0 0 1px ${stCol}`, zIndex: 1 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, borderRadius: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'studio_in 0.2s ease' }}>
                        <button onClick={() => setOpenRunId(open ? null : r.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                              {new Date(r.created_at).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                              {stLbl}{r.tokens_est ? t('w1i.tokens_suffix', { n: formatTokens(r.tokens_est) }) : ''}{(r.renders ?? []).filter(x => x.text).length ? t('w1i.renders_suffix', { n: (r.renders ?? []).filter(x => x.text).length }) : ''}
                            </span>
                          </span>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        {open && (
                          <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
                            {(r.renders ?? []).filter(x => x.text).length === 0 && (
                              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>{t('w1i.no_render_kept')}</p>
                            )}
                            {(r.renders ?? []).filter(x => x.text).map((x, i) => (
                              <div key={i} style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-body)' }}>{x.title}</div>
                                <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 10px', borderRadius: 9, background: 'var(--bg-alt)' }}>
                                  <StudioMarkdown text={x.text} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
          </div>
          )
        })()}

        {/* ══ ACCUEIL — paywall / mes systèmes / templates ══ */}
        {view === 'home' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 20px 40px' }}>
            {access && !access.allowed ? (
              /* ── Paywall : Studio réservé Pro/Expert ── */
              <div style={{ maxWidth: 660, margin: '40px auto 0', textAlign: 'center' }}>
                <span style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(59,146,212,0.12)', color: 'var(--studio-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '16px 0 8px', fontFamily: 'var(--font-display)' }}>{t('w1i.paywall_title')}</h2>
                <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 auto 22px', maxWidth: 480, fontFamily: 'var(--font-body)' }}>
                  {t('w1i.paywall_body')}
                </p>
                <a href="/settings/subscription" style={{ ...cta, display: 'inline-flex', textDecoration: 'none' }}>{t('w1i.see_subscriptions')}</a>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 34, opacity: 0.65 }}>
                  {STUDIO_PACKS.map(p => (
                    <div key={p.key} style={{ padding: '16px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{p.label}</div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: '6px 0 2px', fontFamily: 'var(--font-display)' }}>{formatTokens(p.tokens)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{t('w1i.tokens_word')}</span></div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{p.tagline}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10, fontFamily: 'var(--font-body)' }}>{t('w1i.packs_available_site')}</p>
              </div>
            ) : (
              <div style={{ maxWidth: 1020, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 22, alignItems: isMobile ? 'stretch' : 'flex-start' }}>
                {/* ── Rail des dossiers (horizontal sur mobile) ── */}
                <div style={isMobile ? { width: '100%' } : { width: 170, flexShrink: 0, position: 'sticky', top: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '4px 0 10px', fontFamily: 'var(--font-body)' }}>{t('w1i.folders')}</div>
                  {([null, ...Array.from(new Set(systems.map(s => s.folder).filter((f): f is string => Boolean(f)))).sort()] as (string | null)[]).map(f => {
                    const on = activeFolder === f
                    const count = f === null ? systems.length : systems.filter(s => s.folder === f).length
                    return (
                      <button key={f ?? '__all'} onClick={() => setActiveFolder(f)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: on ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'transparent', color: on ? 'var(--studio-accent)' : 'var(--text-mid)',
                          fontSize: 13, fontWeight: on ? 700 : 600, fontFamily: 'var(--font-body)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          {f === null ? <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> : <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>}
                        </svg>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f ?? t('w1i.all_systems')}</span>
                        <span style={{ fontSize: 11, color: on ? 'var(--studio-accent)' : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                      </button>
                    )
                  })}
                  <p style={{ fontSize: 10.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: '10px 10px 0', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.folder_rail_hint')}
                  </p>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                {homeErr && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5, fontFamily: 'var(--font-body)' }}>{homeErr}</div>
                )}

                {/* ── Suggestion proactive : signal santé détecté → système dédié ── */}
                {activeFolder === null && !homeLoading && healthAlert && !systems.some(s => /bless|retour|récup|recup|rééduc|reeduc|prudent/.test(`${s.name} ${s.graph?.objective?.text ?? ''}`.toLowerCase())) && (
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12, padding: '13px 16px', borderRadius: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)', marginBottom: 18 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.ease_off_title')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2, fontFamily: 'var(--font-body)', lineHeight: 1.45 }}>{t('w1i.ease_off_body', { alert: healthAlert })}</div>
                    </div>
                    <button onClick={() => void startFirstSystem(t('w1i.manage_situation_obj', { alert: healthAlert }))}
                      style={{ padding: '10px 16px', borderRadius: 11, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {t('w1i.create_this_system')}
                    </button>
                  </div>
                )}

                {/* ── Onboarding : première fois, aucun système → on démarre ── */}
                {activeFolder === null && !homeLoading && systems.length === 0 && (
                  <div style={{ padding: isMobile ? '20px 16px' : '26px 24px', borderRadius: 20, background: 'linear-gradient(150deg, color-mix(in srgb, var(--studio-accent) 12%, var(--bg-card)), var(--bg-card))', border: '1px solid color-mix(in srgb, var(--studio-accent) 26%, var(--border))', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 18px 44px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <StudioLogo size={26} />
                      <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{t('w1i.your_first_system')}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: 560, fontFamily: 'var(--font-body)' }}>
                      {t('w1i.first_system_intro')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 9, maxWidth: 620 }}>
                      <input value={firstObjective} onChange={e => setFirstObjective(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void startFirstSystem(firstObjective) }}
                        placeholder={t('w1i.first_objective_ph')}
                        style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }} />
                      <button onClick={() => void startFirstSystem(firstObjective)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 20px', borderRadius: 12, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
                        {t('w1i.create_my_system')}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      </button>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '11px 0 0', fontFamily: 'var(--font-body)' }}>{t('w1i.no_precise_objective')}</p>
                  </div>
                )}

                {/* ── Recommandés pour toi : l'IA propose, tu n'as qu'à confirmer ── */}
                {activeFolder === null && (recosLoading || recos.length > 0 || recosError) && (
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 4px' }}>
                      <span style={{ color: 'var(--studio-accent)', display: 'flex' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 14 2 9.4h7.6z"/></svg></span>
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.recommended_for_you')}</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => void loadRecos(true)} disabled={recosLoading} title={t('w1i.regenerate_recos')} aria-label={t('w1i.regenerate')}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: recosLoading ? 'default' : 'pointer', fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={recosLoading ? { animation: 'studio_spin 0.8s linear infinite' } : undefined}><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/></svg>
                        {t('w1i.regenerate')}
                      </button>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 12px', fontFamily: 'var(--font-body)' }}>{t('w1i.recos_hint')}</p>
                    {recosLoading && recos.length === 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ minHeight: 118, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 14, animation: 'studio_pulse 1.4s ease infinite' }}>
                            <div style={{ width: '55%', height: 13, borderRadius: 6, background: 'var(--bg-alt)' }} />
                            <div style={{ width: '92%', height: 9, borderRadius: 6, background: 'var(--bg-alt)', marginTop: 12 }} />
                            <div style={{ width: '80%', height: 9, borderRadius: 6, background: 'var(--bg-alt)', marginTop: 7 }} />
                          </div>
                        ))}
                      </div>
                    ) : recosError && recos.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{t('w1i.recos_error')} <button onClick={() => void loadRecos(true)} style={{ background: 'none', border: 'none', color: 'var(--studio-accent)', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, padding: 0, fontFamily: 'var(--font-body)' }}>{t('w1i.retry')}</button></p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                        {recos.map((r, i) => {
                          const nAgents = r.graph.nodes.filter(n => n.kind === 'agent' || n.kind === 'merge').length
                          return (
                            <button key={i} onClick={() => { setPreviewSel(null); setRecoMockup(r) }}
                              style={{ textAlign: 'left', minHeight: 118, borderRadius: 16, border: '1px solid color-mix(in srgb, var(--studio-accent) 22%, var(--border))', background: 'linear-gradient(150deg, color-mix(in srgb, var(--studio-accent) 6%, var(--bg-card)), var(--bg-card))', cursor: 'pointer', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59,146,212,0.16)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(59,146,212,0.14)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16"/></svg>
                                </span>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.why}</p>
                              <div style={{ flex: 1 }} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                                <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{r.graph.nodes.length} {t('w1i.block_many')} · {nAgents} {t(nAgents !== 1 ? 'w1i.agent_many' : 'w1i.agent_one')}</span>
                                <div style={{ flex: 1 }} />
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', gap: 3 }}>{t('w1i.view')} <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Deux espaces : Pour moi · Pour mes athlètes ── */}
                <div style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 12, background: 'var(--bg-card2)', margin: '0 0 14px' }}>
                  {([['perso', t('w1i.for_me')], ['coach', t('w1i.for_my_athletes')]] as const).map(([v, l]) => {
                    // « Pour mes athlètes » verrouillé sans abonnement coach.
                    const locked = v === 'coach' && !coachAccess
                    return (
                      <button key={v} onClick={() => { if (locked) { setScopeTab('perso'); alert(t('w1i.athletes_space_locked')); return } setScopeTab(v) }}
                        title={locked ? t('w1i.coach_only') : undefined}
                        style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: scopeTab === v ? 'var(--bg-card)' : 'transparent', color: scopeTab === v ? 'var(--studio-accent)' : 'var(--text-mid)', opacity: locked ? 0.55 : 1, boxShadow: scopeTab === v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
                        {l}
                        {locked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>}
                      </button>
                    )
                  })}
                </div>
                {/* ── Mes systèmes ── */}
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '4px 0 10px', fontFamily: 'var(--font-body)' }}>{activeFolder ?? (scopeTab === 'coach' ? t('w1i.systems_for_athletes') : t('w1i.my_systems'))}</div>
                {scopeTab === 'coach' && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '-4px 0 12px', lineHeight: 1.5, fontFamily: 'var(--font-body)', maxWidth: 520 }}>{t('w1i.coach_systems_hint')}</p>
                )}
                {homeLoading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite', fontFamily: 'var(--font-body)' }}>{t('w1i.loading')}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                    {/* Nouveau système → popover (nom + dossier) */}
                    <button onClick={() => { setNewSysName(t('w1i.my_system')); setNewSysFolder(activeFolder); setNewSysNewFolder(''); setNewSysAthlete(null); setNewSysOpen(true) }}
                      style={{ minHeight: 110, borderRadius: 16, border: '2px dashed color-mix(in srgb, var(--studio-accent) 40%, transparent)', background: 'color-mix(in srgb, var(--studio-accent) 5%, var(--bg-card))', color: 'var(--studio-accent)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      {t('w1i.new_system')}
                    </button>
                    {systems.filter(s => s.scope === scopeTab && (activeFolder === null || s.folder === activeFolder)).map(s => {
                      const nAgents = (s.graph?.nodes ?? []).filter(n => n.kind === 'agent' || n.kind === 'merge').length
                      return (
                        <div key={s.id} onClick={() => openSystem(s)} role="button" tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter') openSystem(s) }}
                          style={{ minHeight: 110, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-body)' }}>
                            {(s.graph?.nodes ?? []).length} {t((s.graph?.nodes ?? []).length !== 1 ? 'w1i.block_many' : 'w1i.block_one')} · {nAgents} {t(nAgents !== 1 ? 'w1i.agent_many' : 'w1i.agent_one')}
                          </div>
                          {s.scope === 'coach' && s.athlete_id && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-body)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                              {coachAthletes.find(a => a.id === s.athlete_id)?.name ?? t('w1i.linked_athlete')}
                            </div>
                          )}
                          <div style={{ flex: 1 }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>
                              {new Date(s.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            <div style={{ flex: 1 }} />
                            {/* Ranger dans un dossier */}
                            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setFolderMenuFor(folderMenuFor === s.id ? null : s.id); setNewFolderName('') }}
                                title={s.folder ? t('w1i.folder_named', { folder: s.folder }) : t('w1i.move_to_folder')} aria-label={t('w1i.move_to_folder')}
                                style={{ ...zBtn, width: 26, height: 24, color: s.folder ? 'var(--studio-accent)' : 'var(--text-mid)' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                              </button>
                              {folderMenuFor === s.id && (
                                <div style={{ position: 'absolute', bottom: 30, right: -8, zIndex: 30, width: 210, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 10px 32px rgba(0,0,0,0.18)', padding: 6, animation: 'studio_in 0.15s ease' }}>
                                  {Array.from(new Set(systems.map(x => x.folder).filter((f): f is string => Boolean(f)))).sort().map(f => (
                                    <button key={f} onClick={() => void moveToFolder(s.id, f)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                                      {s.folder === f && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                                    </button>
                                  ))}
                                  {s.folder && (
                                    <button onClick={() => void moveToFolder(s.id, null)}
                                      style={{ display: 'flex', width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>
                                      {t('w1i.remove_from_folder')}
                                    </button>
                                  )}
                                  <div style={{ display: 'flex', gap: 5, padding: '6px 4px 2px', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) void moveToFolder(s.id, newFolderName.trim()) }}
                                      placeholder={t('w1i.new_folder_ph')}
                                      style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none' }} />
                                    <button onClick={() => { if (newFolderName.trim()) void moveToFolder(s.id, newFolderName.trim()) }}
                                      disabled={!newFolderName.trim()}
                                      style={{ padding: '0 10px', borderRadius: 7, border: 'none', background: newFolderName.trim() ? 'var(--studio-accent)' : 'var(--border)', color: newFolderName.trim() ? '#fff' : 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: newFolderName.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>
                                      OK
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <button onClick={e => { e.stopPropagation(); void copySystem(s) }} title={t('w1i.duplicate')} aria-label={t('w1i.duplicate')}
                              style={{ ...zBtn, width: 26, height: 24 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            </button>
                            <button onClick={e => { e.stopPropagation(); void removeSystem(s.id) }} title={t('w1i.delete')} aria-label={t('w1i.delete')}
                              style={{ ...zBtn, width: 26, height: 24, color: '#EF4444' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Modèles pré-construits — nettement séparés de MES systèmes ── */}
                {activeFolder === null && (<>
                <div style={{ borderTop: '1px solid var(--border)', margin: '30px 0 0' }} />
                <div style={{ margin: '18px 0 3px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{t('w1i.start_from_template')}</div>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '3px 0 12px', fontFamily: 'var(--font-body)' }}>{t('w1i.templates_hint')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                  {STUDIO_TEMPLATES.map(tpl => (
                    <button key={tpl.key} onClick={() => void newSystem(tpl.name, tpl.build())}
                      style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', padding: '14px 14px 13px', textAlign: 'left', fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(59,146,212,0.12)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16"/></svg>
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{tpl.name}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, margin: '8px 0 0' }}>{tpl.description}</p>
                    </button>
                  ))}
                </div>
                </>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ Popover « Nouveau système » : nom + dossier ══ */}
        {newSysOpen && (() => {
          const folders = Array.from(new Set(systems.map(s => s.folder).filter((f): f is string => Boolean(f)))).sort()
          const chosen = newSysNewFolder.trim() ? newSysNewFolder.trim() : newSysFolder
          const create = () => { setNewSysOpen(false); void newSystem(newSysName.trim() || t('w1i.my_system'), emptyGraph(), chosen, scopeTab === 'coach' ? newSysAthlete : null) }
          return (
            <div onClick={() => setNewSysOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'studio_in 0.16s ease' }}>
              <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 100%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <StudioLogo size={20} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.new_system')}</span>
                  <button onClick={() => setNewSysOpen(false)} style={iconBtn} aria-label={t('w1i.close')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <label style={lbl}>{t('w1i.system_name')}</label>
                <input value={newSysName} onChange={e => setNewSysName(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') create() }} style={fld} />
                {scopeTab === 'coach' && coachAthletes.length > 0 && (
                  <>
                    <label style={lbl}>{t('w1i.linked_athlete')} <span style={{ fontWeight: 500, color: 'var(--text-dim)' }}>{t('w1i.optional_suffix')}</span></label>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>{t('w1i.link_athlete_hint')}</p>
                    <select value={newSysAthlete ?? ''} onChange={e => setNewSysAthlete(e.target.value || null)} style={{ ...fld, cursor: 'pointer' }}>
                      <option value="">{t('w1i.all_athletes_at_launch')}</option>
                      {coachAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </>
                )}
                <label style={lbl}>{t('w1i.folder')}</label>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>{t('w1i.folder_hint')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <button onClick={() => { setNewSysFolder(null); setNewSysNewFolder('') }}
                    style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${!chosen ? 'var(--studio-accent)' : 'var(--border)'}`, background: !chosen ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'var(--bg-alt)', color: !chosen ? 'var(--studio-accent)' : 'var(--text-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.no_folder')}
                  </button>
                  {folders.map(f => {
                    const on = !newSysNewFolder.trim() && newSysFolder === f
                    return (
                      <button key={f} onClick={() => { setNewSysFolder(f); setNewSysNewFolder('') }}
                        style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${on ? 'var(--studio-accent)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'var(--bg-alt)', color: on ? 'var(--studio-accent)' : 'var(--text-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        {f}
                      </button>
                    )
                  })}
                </div>
                <input value={newSysNewFolder} onChange={e => setNewSysNewFolder(e.target.value)} placeholder={t('w1i.new_folder_plus_ph')}
                  onKeyDown={e => { if (e.key === 'Enter') create() }} style={fld} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={create} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.create')}{chosen ? t('w1i.in_folder_suffix', { folder: chosen }) : ''}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ══ Sélecteur d'athlète cible (coach) ══ */}
        {athletePickerOpen && (
          <div onClick={() => setAthletePickerOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 41, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'studio_in 0.16s ease' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(400px, 100%)', maxHeight: '80%', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.system_athlete')}</span>
                <button onClick={() => setAthletePickerOpen(false)} style={iconBtn} aria-label={t('w1i.close')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{t('w1i.athlete_picker_hint')}</p>
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => { setSystemAthlete(null); setAthletePickerOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, border: 'none', background: !openAthleteId ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', color: !openAthleteId ? 'var(--studio-accent)' : 'var(--text)', fontSize: 13.5, fontWeight: 600 }}>
                  {t('w1i.all_my_athletes')} <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12 }}>{t('w1i.choose_at_launch_suffix')}</span>
                </button>
                {coachAthletes.map(a => {
                  const on = openAthleteId === a.id
                  return (
                    <button key={a.id} onClick={() => { setSystemAthlete(a.id); setAthletePickerOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, border: 'none', background: on ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', color: on ? 'var(--studio-accent)' : 'var(--text)', fontSize: 13.5, fontWeight: 600 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-mid)' }}>{a.name.charAt(0).toUpperCase()}</span>
                      {a.name}
                    </button>
                  )
                })}
                {coachAthletes.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '10px 4px', fontFamily: 'var(--font-body)' }}>{t('w1i.no_athletes')}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ Architecte — chat plein écran ══ */}
      {chatFull && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'studio_in 0.18s ease' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <StudioLogo size={19} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.architect')}</span>
            {chatMsgs.length > 0 && (
              <button onClick={resetChat} title={t('w1i.new_conversation')} aria-label={t('w1i.new_conversation')} style={iconBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )}
            <button onClick={() => { setChatFull(false); setChatOpen(true) }} title={t('w1i.minimize_to_column')} aria-label={t('w1i.minimize')} style={iconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M21 8V5a2 2 0 00-2-2M3 16v3a2 2 0 002 2"/><path d="M9 15l-6 6M21 3l-6 6"/></svg>
            </button>
            <button onClick={() => setChatFull(false)} title={t('w1i.close')} aria-label={t('w1i.close')} style={iconBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
            {chatBody}
          </div>
        </div>
      )}

      {/* ══ Maquette du système — sur-page interactive (chat OU reco) ══ */}
      {(mockupMsgId || recoMockup) && (() => {
        const chatMk = mockupMsgId ? chatMsgs.find(m => m.id === mockupMsgId) : null
        const isChat = !!(chatMk && chatMk.role === 'assistant' && chatMk.kind === 'propose')
        const g = isChat ? (chatMk as { graph: StudioGraph }).graph : recoMockup?.graph
        if (!g) return null
        const mockKey = isChat ? chatMk!.id : 'reco'
        const headTitle = isChat ? t('w1i.system_mockup') : recoMockup!.title
        const why = isChat ? '' : recoMockup!.why
        const showConfirm = isChat ? !(chatMk as { applied?: boolean; declined?: boolean }).applied && !(chatMk as { applied?: boolean; declined?: boolean }).declined : true
        const askLabel = isChat ? t('w1i.confirm_build_short') : t('w1i.launch_for_you')
        const confirmLabel = isChat ? t('w1i.confirm') : t('w1i.create_this_system')
        const sel = previewSel?.msgId === mockKey ? g.nodes.find(n => n.id === previewSel!.nodeId) : null
        const sub = (n: StudioNode) => n.kind === 'source' ? SOURCE_LABEL[n.sourceKey ?? 'activities'] : n.kind === 'action' ? ACTION_LABEL[n.actionKey ?? 'planning_save'] : KIND_LABEL[n.kind]
        const closeMockup = () => { setMockupMsgId(null); setRecoMockup(null); setPreviewSel(null) }
        const doConfirm = isChat ? () => { confirmPlan(chatMk!.id); closeMockup() } : () => { const r = recoMockup!; closeMockup(); void newSystem(r.title, r.graph) }
        const doDecline = isChat ? () => { declinePlan(chatMk!.id); closeMockup() } : closeMockup
        // « Ce que tu recevras » : décrit, sans appel IA, la sortie de chaque
        // nœud terminal (le rendu concret du système).
        const outLabel = (n: StudioNode): string => {
          if (n.kind === 'action') {
            if (n.actionKey === 'notify_report') return t('w1i.out_notify')
            if (n.actionKey === 'planning_replace') return t('w1i.out_planning_replace')
            if (n.actionKey === 'planning_save') return t('w1i.out_planning_save')
            if (n.actionKey === 'calendar_race') return t('w1i.out_calendar')
            if (n.actionKey === 'nutrition_save') return t('w1i.out_nutrition')
          }
          if (n.kind === 'validation') return t('w1i.out_validation')
          return t('w1i.out_report', { title: n.title })
        }
        const outputs = terminalNodeIds(g).map(id => g.nodes.find(n => n.id === id)).filter((n): n is StudioNode => !!n)
        const panelStyle: React.CSSProperties = isMobile
          ? { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', borderTopLeftRadius: 20, borderTopRightRadius: 20, animation: 'studio_slide_up 0.28s cubic-bezier(0.22,0.61,0.36,1)', boxShadow: '0 -12px 40px rgba(0,0,0,0.22)' }
          : { position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(760px, 92%)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'studio_slide_r 0.3s cubic-bezier(0.22,0.61,0.36,1)', boxShadow: '-18px 0 50px rgba(0,0,0,0.24)', borderLeft: '1px solid var(--border)' }
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 32, display: 'flex', justifyContent: 'flex-end', animation: 'studio_fade 0.2s ease' }}>
            {/* Voile : clic hors panneau = fermeture */}
            <div onClick={closeMockup} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }} />
            <div onClick={e => e.stopPropagation()} style={panelStyle}>
              {/* Poignée mobile */}
              {isMobile && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><span style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-mid)' }} /></div>}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'color-mix(in srgb, var(--studio-accent) 12%, transparent)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 6.6 10.6 16.4M17 6.6 13.4 16.4"/></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headTitle}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{g.nodes.length} {t('w1i.block_many')} · {g.nodes.filter(n => n.kind === 'agent' || n.kind === 'merge').length} {t('w1i.agent_many')} · {g.edges.length} {t('w1i.link_many')}</div>
                </div>
                <button onClick={closeMockup} title={t('w1i.close')} aria-label={t('w1i.close')} style={iconBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {why && (
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 13, background: 'color-mix(in srgb, var(--studio-accent) 7%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--studio-accent) 25%, var(--border))', marginBottom: 14 }}>
                      <span style={{ color: 'var(--studio-accent)', flexShrink: 0, marginTop: 1 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 14 2 9.4h7.6z"/></svg></span>
                      <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{why}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px', textAlign: 'center' }}>{t('w1i.tap_bubble_role')}</div>
                  <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 18px 44px rgba(0,0,0,0.08)', padding: '14px 10px' }}>
                    {miniGraph(g, {
                      bare: true, width: 660, height: 400, maxScale: 1,
                      selectedId: sel ? sel.id : null,
                      onSelect: id => setPreviewSel(p => (p?.msgId === mockKey && p.nodeId === id) ? null : { msgId: mockKey, nodeId: id }),
                    })}
                  </div>
                  {outputs.length > 0 && (
                    <div style={{ marginTop: 14, padding: '13px 15px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                        <span style={{ color: '#22C55E', display: 'flex' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{t('w1i.what_you_receive')}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {outputs.map(n => (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 7, background: `color-mix(in srgb, ${KIND_COLOR[n.kind]} 15%, transparent)`, color: KIND_COLOR[n.kind], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><KindIcon kind={n.kind} size={12} /></span>
                            <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>{outLabel(n)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sel && (
                    <div style={{ marginTop: 12, padding: '12px 15px', borderRadius: 14, background: 'var(--bg-card)', border: `1px solid color-mix(in srgb, ${KIND_COLOR[sel.kind]} 40%, var(--border))`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animation: 'studio_in 0.16s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in srgb, ${KIND_COLOR[sel.kind]} 15%, transparent)`, color: KIND_COLOR[sel.kind], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><KindIcon kind={sel.kind} size={14} /></span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{sel.title}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', marginLeft: 'auto' }}>{sub(sel)}</span>
                      </div>
                      {sel.role && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 7, lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{sel.role}</div>}
                      {(sel.kind === 'agent' || sel.kind === 'merge') && sel.model && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: KIND_COLOR[sel.kind], marginTop: 7 }}>{MODEL_LABEL[sel.model]}</div>}
                    </div>
                  )}
                </div>
              </div>
              {showConfirm && (
                <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box' }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--studio-accent)', fontFamily: 'var(--font-body)' }}>{askLabel}</span>
                  <button onClick={doDecline}
                    style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w1i.no')}</button>
                  <button onClick={doConfirm}
                    style={{ padding: '10px 22px', borderRadius: 11, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{confirmLabel}</button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ══ Éditeur d'objectif (système vivant) ══ */}
      {objEditOpen && (
        <div onClick={() => setObjEditOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'studio_in 0.16s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--studio-accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.system_objective')}</span>
              <button onClick={() => setObjEditOpen(false)} style={iconBtn} aria-label={t('w1i.close')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
              {t('w1i.objective_editor_hint')}
            </p>
            <label style={lbl}>{t('w1i.objective_of_moment')}</label>
            <input value={objText} onChange={e => setObjText(e.target.value)} autoFocus placeholder={t('w1i.objective_ph')}
              onKeyDown={e => { if (e.key === 'Enter') saveObjective() }} style={fld} />
            <label style={lbl}>{t('w1i.deadline_optional')}</label>
            <input type="date" value={objDeadline} onChange={e => setObjDeadline(e.target.value)} style={{ ...fld, cursor: 'pointer' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={saveObjective} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t('w1i.save')}
              </button>
              {graph.objective && (
                <button onClick={() => { commit({ ...graph, objective: null }); setObjEditOpen(false) }}
                  style={{ padding: '10px 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {t('w1i.remove')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Planification autonome (sur-page) ══ */}
      {scheduleOpen && (() => {
        // « notify_report » est autorisé en autonome ; écritures/validation non.
        const hasHuman = graph.nodes.some(n => n.kind === 'validation' || (n.kind === 'action' && n.actionKey !== 'notify_report'))
        const cur = schedule ?? { frequency: 'weekly' as const, hour: 18, weekday: 6, enabled: false }
        const DAYS = [t('w1i.day_monday'), t('w1i.day_tuesday'), t('w1i.day_wednesday'), t('w1i.day_thursday'), t('w1i.day_friday'), t('w1i.day_saturday'), t('w1i.day_sunday')]
        const selStyle: React.CSSProperties = { padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }
        return (
          <div onClick={() => setScheduleOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 13700, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: 'min(480px, 100%)', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', padding: '22px 22px 18px', animation: 'studio_in 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,146,212,0.12)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                </span>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.schedule_this_system')}</div>
                <button onClick={() => setScheduleOpen(false)} aria-label={t('w1i.close')} style={iconBtn}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {hasHuman ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 14px', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.autonomy_p1a')}<b>{t('w1i.validation_word')}</b>{t('w1i.autonomy_p1b')}<b>{t('w1i.write_word')}</b>{t('w1i.autonomy_p1c')}<b>{t('w1i.autonomy_word')}</b>{t('w1i.autonomy_p1d')}<b>{t('w1i.notification_word')}</b>{t('w1i.autonomy_p1e')}
                  </p>
                  <button onClick={() => { commit(makeGraphAutonomous(graph)) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    {t('w1i.make_autonomous')}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '10px 0 0', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.reconnect_later')}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55, margin: '0 0 14px', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.schedule_desc', { n: formatTokens(estimateRunTokens(graph.nodes)) })}
                  </p>
                  {/* Activation */}
                  <button onClick={() => void saveSchedule({ ...cur, enabled: !cur.enabled })} disabled={scheduleSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: cur.enabled ? 'color-mix(in srgb, var(--studio-accent) 8%, transparent)' : 'var(--bg-alt)', cursor: 'pointer', marginBottom: 12 }}>
                    <span style={{ width: 38, height: 22, borderRadius: 999, background: cur.enabled ? 'var(--studio-accent)' : 'var(--border-mid)', position: 'relative', transition: 'background 180ms', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: cur.enabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 180ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{cur.enabled ? t('w1i.schedule_active') : t('w1i.schedule_disabled')}</span>
                  </button>
                  {/* Fréquence / jour / heure */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={cur.frequency} onChange={e => void saveSchedule({ ...cur, frequency: e.target.value as 'daily' | 'weekly' })} style={selStyle}>
                      <option value="weekly">{t('w1i.every_week')}</option>
                      <option value="daily">{t('w1i.every_day')}</option>
                    </select>
                    {cur.frequency === 'weekly' && (
                      <select value={cur.weekday} onChange={e => void saveSchedule({ ...cur, weekday: Number(e.target.value) })} style={selStyle}>
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    )}
                    <select value={cur.hour} onChange={e => void saveSchedule({ ...cur, hour: Number(e.target.value) })} style={selStyle}>
                      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')} h</option>)}
                    </select>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '10px 0 0', fontFamily: 'var(--font-body)' }}>
                    {t('w1i.timezone_line', { tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris' })}
                  </p>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ══ Solde Studio + packs (sur-page) ══ */}
      {/* ══ ROSTER : lancer sur N athlètes + tableau de bord ══ */}
      {rosterOpen && (() => {
        const results = rosterResults
        const targets = coachAthletes.filter(a => rosterSel.has(a.id))
        const doneN = targets.filter(a => results[a.id]?.state === 'done').length
        const errN = targets.filter(a => results[a.id]?.state === 'error').length
        const hasResults = Object.keys(results).length > 0
        const detail = rosterView ? results[rosterView] : null
        const detailName = rosterView ? (coachAthletes.find(a => a.id === rosterView)?.name ?? t('w1i.athlete')) : ''
        const chip = (st: RosterState | undefined) => {
          const map: Record<string, { bg: string; col: string; label: string }> = {
            running: { bg: 'rgba(6,182,212,0.14)', col: '#06B6D4', label: t('w1i.roster_running') },
            done:    { bg: 'rgba(34,197,94,0.14)', col: '#16A34A', label: t('w1i.roster_done') },
            error:   { bg: 'rgba(239,68,68,0.14)', col: '#EF4444', label: t('w1i.roster_error') },
            idle:    { bg: 'var(--bg-alt)', col: 'var(--text-dim)', label: t('w1i.roster_pending') },
          }
          const c = map[st ?? 'idle']
          return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: c.col, background: c.bg, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>{c.label}</span>
        }
        return (
          <div onClick={() => { if (!rosterRunning) { setRosterOpen(false); setRosterView(null) } }}
            style={{ position: 'fixed', inset: 0, zIndex: 13700, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: 'min(560px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', animation: 'studio_in 0.2s ease', fontFamily: 'var(--font-body)' }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 12px', flexShrink: 0 }}>
                {rosterView ? (
                  <button onClick={() => setRosterView(null)} aria-label={t('w1i.back')} style={iconBtn}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                ) : (
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: 'color-mix(in srgb, var(--studio-accent) 12%, transparent)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rosterView ? detailName : t('w1i.roster_title')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{rosterView ? graph.name : t('w1i.roster_subtitle', { name: graph.name })}</div>
                </div>
                <button onClick={() => { if (!rosterRunning) { setRosterOpen(false); setRosterView(null) } }} aria-label={t('w1i.close')} style={iconBtn}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Détail d'un athlète */}
              {rosterView && detail ? (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 18px' }}>
                  {detail.state === 'error'
                    ? <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13 }}>{detail.error}</div>
                    : detail.text?.trim()
                      ? <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}><StudioMarkdown text={detail.text} /></div>
                      : <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1i.roster_no_output')}</p>}
                </div>
              ) : (
                <>
                  {/* Sélection / tableau de bord */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
                    {!hasResults && (
                      <button onClick={toggleAllRoster} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--studio-accent)', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-body)', padding: 0 }}>
                        {allRosterSelected ? t('w1i.roster_deselect_all') : t('w1i.roster_select_all')}
                      </button>
                    )}
                    {coachAthletes.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: '20px 0', textAlign: 'center' }}>{t('w1i.roster_no_athletes')}</p>}
                    {coachAthletes.map(a => {
                      const res = results[a.id]
                      const selected = rosterSel.has(a.id)
                      const clickable = hasResults ? res?.state === 'done' || res?.state === 'error' : true
                      return (
                        <div key={a.id}
                          onClick={() => { if (hasResults) { if (clickable) setRosterView(a.id) } else toggleRoster(a.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 6px', borderBottom: '1px solid var(--border)', cursor: clickable ? 'pointer' : 'default' }}>
                          {!hasResults && (
                            <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${selected ? 'var(--studio-accent)' : 'var(--border-mid)'}`, background: selected ? 'var(--studio-accent)' : 'transparent', display: 'grid', placeItems: 'center' }}>
                              {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                            </span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                            {res?.summary && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.summary}…</div>}
                            {res?.state === 'error' && <div style={{ fontSize: 11.5, color: '#EF4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.error}</div>}
                          </div>
                          {hasResults ? chip(res?.state) : null}
                          {hasResults && clickable && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Pied : lancer / arrêter / relancer */}
                  <div style={{ flexShrink: 0, padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid var(--border)' }}>
                    {hasResults && !rosterRunning && (
                      <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
                        {t('w1i.roster_recap', { done: doneN, total: targets.length })}{errN ? ` · ${t('w1i.roster_errors', { n: errN })}` : ''}
                      </div>
                    )}
                    {rosterRunning ? (
                      <button onClick={stopRoster} style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', background: '#374151', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        {t('w1i.roster_stop')} ({doneN}/{targets.length})
                      </button>
                    ) : hasResults ? (
                      <button onClick={() => setRosterResults({})} style={{ width: '100%', height: 50, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        {t('w1i.roster_new')}
                      </button>
                    ) : (
                      <button onClick={() => void runRoster()} disabled={rosterSel.size === 0}
                        style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', background: rosterSel.size ? 'var(--studio-accent)' : 'var(--border)', color: rosterSel.size ? '#fff' : 'var(--text-dim)', fontSize: 15, fontWeight: 800, cursor: rosterSel.size ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>
                        {t('w1i.roster_launch', { n: rosterSel.size })}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {walletOpen && access && (
        <div onClick={() => setWalletOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 13700, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(520px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', padding: '22px 22px 18px', animation: 'studio_in 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,146,212,0.12)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </span>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.studio_tokens')}</div>
              <button onClick={() => setWalletOpen(false)} aria-label={t('w1i.close')} style={iconBtn}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Jauge mensuelle */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-alt)', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>
                <span>{t('w1i.monthly_quota_included', { tier: access.tier === 'expert' ? 'Expert' : 'Pro' })}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTokens(Math.min(access.monthlyUsed, access.monthlyLimit))} / {formatTokens(access.monthlyLimit)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${access.monthlyLimit > 0 ? Math.min(100, (access.monthlyUsed / access.monthlyLimit) * 100) : 0}%`, background: 'var(--studio-accent)', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'var(--font-body)' }}>
                {t('w1i.pack_tokens_label')}<b style={{ color: 'var(--text)' }}>{formatTokens(access.packTokens)}</b>{t('w1i.no_expire')}
              </div>
            </div>

            {/* Les 3 packs — AUCUN prix dans l'app (règle Apple) : l'achat se fait sur le site */}
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '14px 0 8px', fontFamily: 'var(--font-body)' }}>{t('w1i.recharge')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STUDIO_PACKS.map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{p.label} — {formatTokens(p.tokens)} {t('w1i.tokens_word')}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-body)' }}>{p.tagline}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => {
                // Page tokens du site + uid → les liens Stripe portent client_reference_id
                // (crédit instantané, sans dépendre de l'email de paiement).
                void (async () => {
                  const base = (process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? '').replace(/\/$/, '')
                  let uid = ''
                  try { const user = await getCurrentUser(); uid = user?.id ?? '' } catch { /* ignore */ }
                  const url = base ? `${base}/tokens.html${uid ? `?uid=${uid}` : ''}` : '/settings/subscription'
                  window.open(url, '_blank', 'noopener')
                })()
              }}
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 0', borderRadius: 11, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {t('w1i.buy_packs_site')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10, fontFamily: 'var(--font-body)' }}>{t('w1i.pricing_note')}</p>
          </div>
        </div>
      )}

      {/* ══ Sur-page d'aide ══ */}
      {helpOpen && (
        <div onClick={() => setHelpOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 13700, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(560px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', padding: '24px 24px 20px', animation: 'studio_in 0.22s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(59,146,212,0.12)', color: 'var(--studio-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16"/></svg>
              </span>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', flex: 1 }}>{t('w1i.help_title')}</div>
              <button onClick={() => setHelpOpen(false)} aria-label={t('w1i.close')} style={iconBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.65, fontFamily: 'var(--font-body)' }}>
              <p style={{ margin: '0 0 12px' }}>
                {t('w1i.help_p1a')}<strong style={{ color: 'var(--text)' }}>{t('w1i.help_single_assistant')}</strong>{t('w1i.help_p1b')}
                <strong style={{ color: 'var(--text)' }}>{t('w1i.help_team')}</strong>{t('w1i.help_p1c')}
              </p>
              {[
                [t('w1i.help_step1_t'), t('w1i.help_step1_d')],
                [t('w1i.help_step2_t'), t('w1i.help_step2_d')],
                [t('w1i.help_step3_t'), t('w1i.help_step3_d')],
                [t('w1i.help_step4_t'), t('w1i.help_step4_d')],
              ].map(([title, d]) => (
                <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--studio-accent)', whiteSpace: 'nowrap', paddingTop: 1 }}>{title}</span>
                  <span>{d}</span>
                </div>
              ))}
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                {t('w1i.help_example')}
              </p>
            </div>

            <a href={siteUrl} target="_blank" rel="noreferrer"
              style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 11, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
              {t('w1i.full_guide')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>
            </a>
          </div>
        </div>
      )}

      {/* ══ Dictée vocale (barre « Décris ton système ») ══ */}
      {micOpen && (
        <VoiceOverlay
          isDesktop
          onCancel={() => { setMicOpen(false); const base = micBaseRef.current; if (micTarget === 'chat') setChatInput(base); else setDesc(base) }}
          onLiveText={(text) => { const base = micBaseRef.current; const v = text ? (base ? base.trimEnd() + ' ' : '') + text : base; if (micTarget === 'chat') setChatInput(v); else setDesc(v) }}
          onConfirm={(text) => { setMicOpen(false); const base = micBaseRef.current; const v = text ? (base ? base.trimEnd() + ' ' : '') + text.trim() : base; if (micTarget === 'chat') setChatInput(v); else setDesc(v) }}
        />
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }
const zBtn: React.CSSProperties = { width: 30, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
const paletteHdr: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '3px 8px 2px' }
const cta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 5px', display: 'block' }
const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', marginBottom: 14 }
