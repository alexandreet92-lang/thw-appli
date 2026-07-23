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
  emptyGraph, sampleGraph, genId, autoLayout, validateGraph,
  MODEL_LABEL, KIND_LABEL, SOURCE_LABEL, ACTION_LABEL,
  type StudioGraph, type StudioNode, type StudioNodeKind, type StudioModel, type StudioSourceKey, type StudioActionKey, type GraphIssues,
} from '@/lib/studio/graph'
import { runGraph, terminalNodeIds, type NodeStatus } from '@/lib/studio/runner'
import { buildGraphFromDescription } from '@/lib/studio/architect'
import { listSystems, createSystem, updateSystem, deleteSystem, duplicateSystem, migrateLocalGraphIfAny, type StudioSystemRow } from '@/lib/studio/store'
import { STUDIO_TEMPLATES } from '@/lib/studio/templates'
import { STUDIO_PACKS, estimateRunTokens, formatTokens, type StudioAccess } from '@/lib/studio/offers'
import { createClient } from '@/lib/supabase/client'
import { VoiceOverlay } from '@/components/ai/VoiceOverlay'

const NODE_W = 216
const PORT_Y = 37   // ancrage vertical des ports (depuis le haut du nœud)

const KIND_COLOR: Record<StudioNodeKind, string> = {
  trigger:    '#8B5CF6',
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
  { id: 'app_recovery',   label: 'Récupération',  color: '#8B5CF6', kind: 'source', sourceKey: 'recovery',   access: 'lecture' },
  { id: 'app_profile',    label: 'Profil',        color: '#F59E0B', kind: 'source', sourceKey: 'profile',    access: 'lecture' },
  { id: 'act_planning',   label: 'Planning',      color: '#EF4444', kind: 'action', actionKey: 'planning_save', access: 'écriture' },
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
    // Apps externes — pictos évocateurs (pas les logos officiels).
    case 'ext_strava':     return <svg {...p} fill="currentColor" stroke="none"><path d="M9 3l5 9h-3l-2-4-2 4H2L9 3zm5 11h3l1.5 3 1.5-3h3l-4.5 8L14 14z"/></svg>
    case 'ext_withings':   return <svg {...p}><circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 2v2"/></svg>
    case 'ext_polar':      return <svg {...p}><path d="M20.8 5.6a5.5 5.5 0 00-8.8 1.4A5.5 5.5 0 003.2 5.6a5.5 5.5 0 000 7.8L12 21l8.8-7.6a5.5 5.5 0 000-7.8z"/><path d="M6 12h3l1.5-3 2 5 1.5-2H18"/></svg>
    default:               return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
  }
}

type Tab = 'canvas' | 'chat' | 'rendu' | 'runs'
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
  const [graph, setGraph] = useState<StudioGraph>(() => emptyGraph())
  const [tab, setTab] = useState<Tab>('canvas')
  // ── Accueil multi-systèmes + accès (offre Pro/Expert) ────────
  const [view, setView] = useState<'home' | 'canvas'>('home')
  const [systems, setSystems] = useState<StudioSystemRow[]>([])
  const [systemId, setSystemId] = useState<string | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [homeErr, setHomeErr] = useState<string | null>(null)
  const [access, setAccess] = useState<StudioAccess | null>(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [runs, setRuns] = useState<RunRow[] | null>(null)
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
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
  const [building, setBuilding] = useState(false)
  const [buildErr, setBuildErr] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [micOpen, setMicOpen] = useState(false)
  const prevGraphRef = useRef<StudioGraph | null>(null)

  // Exécution
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Record<string, NodeStatus>>({})
  const [nodeText, setNodeText] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [approval, setApproval] = useState<Approval | null>(null)
  const [runErr, setRunErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<null | { mode: 'node' | 'pan' | 'conn'; id?: string; dx: number; dy: number }>(null)
  const [pending, setPending] = useState<null | { fromId: string; x: number; y: number }>(null)

  // ── Persistance SERVEUR (debounce) — remplace le localStorage ──
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const systemIdRef = useRef<string | null>(null)
  useEffect(() => { systemIdRef.current = systemId }, [systemId])
  const scheduleSave = useCallback((g: StudioGraph) => {
    const id = systemIdRef.current
    if (!id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void updateSystem(id, { graph: g, name: g.name }).catch(() => { /* réessaiera à la prochaine modif */ })
    }, 700)
  }, [])
  const persist = useCallback((g: StudioGraph) => { setGraph(g); scheduleSave(g) }, [scheduleSave])

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
        setHomeErr('Impossible de charger tes systèmes — vérifie ta connexion.')
      } finally {
        setHomeLoading(false)
      }
    })()
  }, [refreshAccess])

  const sel = graph.nodes.find(n => n.id === selId) ?? null
  const trigger = graph.nodes.find(n => n.kind === 'trigger') ?? null

  // ── Géométrie ──────────────────────────────────────────────
  const portOut = (n: StudioNode) => ({ x: n.x + NODE_W, y: n.y + PORT_Y })
  const portIn  = (n: StudioNode) => ({ x: n.x,          y: n.y + PORT_Y })
  // Courbes : poignées horizontales proportionnelles à la distance, avec un
  // léger amorti vertical — rend les fils souples façon Make/Figma.
  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const dx = Math.max(48, Math.min(160, dist * 0.45))
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`
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
    const d = drag.current
    if (!d) return
    if (d.mode === 'pan') { setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); return }
    if (d.mode === 'node' && d.id) {
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
    const d = drag.current
    if (d?.mode === 'node') scheduleSave(graphRef.current)
    if (d?.mode === 'conn') {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const toId = el?.closest('[data-portin]')?.getAttribute('data-portin') ?? null
      if (toId && d.id && toId !== d.id) {
        setGraph(g => {
          if (g.edges.some(x => x.from === d.id && x.to === toId)) return g
          const next = { ...g, edges: [...g.edges, { id: genId(), from: d.id!, to: toId }] }
          scheduleSave(next); return next
        })
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
    setSelId(null); setSelEdge(null)
    drag.current = { mode: 'pan', dx: 0, dy: 0 }
    arm()
  }

  // ── Mutations ──────────────────────────────────────────────
  const addNode = (kind: StudioNodeKind, opts?: { sourceKey?: StudioSourceKey; actionKey?: StudioActionKey; title?: string }) => {
    // Nouveau bloc placé au centre de la vue courante (pas au hasard hors-écran).
    const rect = wrapRef.current?.getBoundingClientRect()
    const cx = ((rect ? rect.width / 2 : 400) - pan.x) / zoom - NODE_W / 2
    const cy = ((rect ? rect.height / 2 : 300) - pan.y) / zoom - 40 + Math.round((Math.random() - 0.5) * 40)
    const sourceKey = kind === 'source' ? (opts?.sourceKey ?? 'activities') : undefined
    const actionKey = kind === 'action' ? (opts?.actionKey ?? 'planning_save') : undefined
    const n: StudioNode = {
      id: genId(), kind, x: cx, y: cy,
      title: opts?.title
        ?? (kind === 'agent' ? 'Nouvel agent'
          : kind === 'source' ? SOURCE_LABEL[sourceKey ?? 'activities']
          : kind === 'action' ? ACTION_LABEL[actionKey ?? 'planning_save']
          : KIND_LABEL[kind]),
      role: kind === 'trigger' ? '' : kind === 'validation' ? 'Vérifie ce qui précède avant de continuer.' : kind === 'source' || kind === 'action' ? undefined : 'Décris le rôle de cet agent…',
      model: kind === 'agent' || kind === 'merge' ? 'athena' : undefined,
      sourceKey,
      actionKey,
    }
    persist({ ...graph, nodes: [...graph.nodes, n] }); setSelId(n.id); setTab('canvas')
  }
  const addApp = (app: AppEntry) => {
    if (app.kind === 'source') addNode('source', { sourceKey: app.sourceKey, title: app.label })
    else addNode('action', { actionKey: app.actionKey, title: app.label })
  }
  const addExt = (e: ExtEntry) => addNode('source', { sourceKey: e.sourceKey, title: e.label })
  const loadExample = () => { const g = sampleGraph(); persist({ ...g, name: graph.name || g.name }); setSelId(null); setStatus({}); setNodeText({}) }
  const clearCanvas = () => { persist({ ...emptyGraph(), id: graph.id, name: graph.name }); setSelId(null); setSelEdge(null); setStatus({}); setNodeText({}) }

  // ── Accueil : ouvrir / créer / dupliquer / supprimer un système ──
  const openSystem = (row: StudioSystemRow) => {
    const g = row.graph && Array.isArray(row.graph.nodes) ? row.graph : emptyGraph()
    setGraph({ ...g, name: row.name })
    setSystemId(row.id)
    setView('canvas'); setTab('canvas')
    setSelId(null); setSelEdge(null); setStatus({}); setNodeText({}); setLogs([]); setIssues(null)
    setPan({ x: 0, y: 0 }); setZoom(1)
  }
  const newSystem = async (name: string, g: StudioGraph) => {
    try {
      const row = await createSystem(name, { ...g, name })
      setSystems(s => [row, ...s])
      openSystem(row)
    } catch {
      setHomeErr('Création impossible — réessaie.')
    }
  }
  const removeSystem = async (id: string) => {
    if (!confirm('Supprimer ce système ? Cette action est définitive.')) return
    try { await deleteSystem(id); setSystems(s => s.filter(x => x.id !== id)) } catch { setHomeErr('Suppression impossible — réessaie.') }
  }
  const copySystem = async (row: StudioSystemRow) => {
    try { const dup = await duplicateSystem(row); setSystems(s => [dup, ...s]) } catch { setHomeErr('Duplication impossible — réessaie.') }
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

  // ── Packs : achat Stripe (paiement unique) ────────────────────
  const buyPack = async (key: string) => {
    setBuying(key)
    try {
      const r = await fetch('/api/studio/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack: key }) })
      const j = await r.json() as { url?: string; error?: string }
      if (j.url) { window.location.href = j.url; return }
      setHomeErr(j.error ?? 'Achat indisponible pour le moment.')
    } catch {
      setHomeErr('Achat indisponible pour le moment.')
    } finally {
      setBuying(null)
    }
  }
  const patchNode = (id: string, patch: Partial<StudioNode>) =>
    persist({ ...graph, nodes: graph.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })
  const deleteNode = (id: string) => {
    persist({ ...graph, nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) })
    setSelId(null)
  }
  const deleteEdge = (id: string) => { persist({ ...graph, edges: graph.edges.filter(e => e.id !== id) }); setSelEdge(null) }

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
    persist({ ...graph, nodes })
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

  // ── Architecte : décrire → construire ──────────────────────
  const build = async () => {
    const d = desc.trim()
    if (!d || building) return
    setBuilding(true); setBuildErr(null); setExplanation(null)
    try {
      const res = await buildGraphFromDescription(d)
      prevGraphRef.current = graph          // pour « Annuler »
      persist(res.graph)
      setSelId(null); setSelEdge(null); setPan({ x: 0, y: 0 })
      setStatus({}); setNodeText({}); setLogs([])
      setExplanation(res.explanation || 'Système construit — vérifie les nœuds puis lance « Run once ».')
      setDesc('')
    } catch (e) {
      setBuildErr(e instanceof Error ? e.message : 'La construction a échoué — réessaie.')
    } finally { setBuilding(false) }
  }
  const undoBuild = () => {
    if (prevGraphRef.current) { persist(prevGraphRef.current); prevGraphRef.current = null }
    setExplanation(null)
  }

  // ── Run once ───────────────────────────────────────────────
  const stopRun = () => { abortRef.current?.abort(); setRunning(false); setApproval(null) }

  // Historique : enregistre le run en base (best-effort).
  const saveRunHistory = async (status: RunRow['status'], runLogs: LogEntry[], outputs: Record<string, string>, errorText: string | null, estimate: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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
        errors: [`Solde Studio insuffisant : ce run coûte environ ${formatTokens(estimate)} tokens, il t'en reste ${formatTokens(access.remaining)}. Recharge avec un pack Studio.`],
        warnings: [], nodeIssues: {}, canForce: false,
      })
      setWalletOpen(true)
      return
    }
    setIssues(null)
    setRunErr(null); setLogs([]); setNodeText({}); setStatus({})
    const runLogs: LogEntry[] = []
    const ctrl = new AbortController(); abortRef.current = ctrl
    setRunning(true)
    try {
      const { outputs, errors } = await runGraph(graph, {
        signal: ctrl.signal,
        onStatus: (id, s) => setStatus(prev => ({ ...prev, [id]: s })),
        onChunk:  (id, t) => setNodeText(prev => ({ ...prev, [id]: t })),
        onLog:    (entry) => { runLogs.push(entry); setNodeText(prev => ({ ...prev, [entry.nodeId]: entry.text })); setLogs(prev => [...prev, entry]) },
        requestApproval: (node, content) => new Promise<boolean>(resolve => {
          setTab('chat')
          setApproval({ node, content, resolve: (ok) => { setApproval(null); resolve(ok) } })
        }),
      })
      if (errors.length > 0) {
        const errText = errors.map(er => `${er.title} — ${er.message}`).join(' · ')
        setRunErr(`${errors.length} nœud(s) en erreur : ${errText}`)
        setTab('chat')
        void saveRunHistory('error', runLogs, outputs, errText, estimate)
      } else {
        setTab('rendu')
        void saveRunHistory('done', runLogs, outputs, null, estimate)
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setRunErr(e instanceof Error ? e.message : 'Erreur pendant le run')
      void saveRunHistory(ctrl.signal.aborted ? 'stopped' : 'error', runLogs, {}, e instanceof Error ? e.message : null, estimate)
    } finally {
      setRunning(false); abortRef.current = null
      refreshAccess()   // le solde vient d'être débité côté serveur
    }
  }

  // ── Historique : chargement à l'ouverture de l'onglet ─────────
  useEffect(() => {
    if (tab !== 'runs' || runs !== null) return
    void (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('studio_runs')
          .select('id, system_name, status, renders, tokens_est, created_at')
          .order('created_at', { ascending: false })
          .limit(30)
        setRuns((data ?? []) as RunRow[])
      } catch { setRuns([]) }
    })()
  }, [tab, runs])

  const copyRender = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1600)
  }

  const renders = terminalNodeIds(graph).map(id => ({ node: graph.nodes.find(n => n.id === id)!, text: nodeText[id] ?? '' })).filter(r => r.node)
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
        .studio-node { transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
        .studio-node:hover { transform: translateY(-1px); }
        .studio-port { transition: transform 0.14s ease, box-shadow 0.14s ease; }
        .studio-port:hover { transform: scale(1.35); }
      `}</style>

      {/* ══ Header ══ */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(12px, env(safe-area-inset-top)) 14px 10px', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={view === 'canvas' ? backToHome : onClose} aria-label={view === 'canvas' ? 'Retour à mes systèmes' : 'Fermer'} style={iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', whiteSpace: 'nowrap' }}>Studio</div>
        {/* Aide — sur-page d'explication */}
        <button onClick={() => setHelpOpen(true)} aria-label="Comment ça marche ?" title="Comment ça marche ?"
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }}>
          ?
        </button>
        {view === 'canvas' && (
          <input
            value={graph.name}
            onChange={e => persist({ ...graph, name: e.target.value })}
            aria-label="Nom du système"
            style={{ marginLeft: 2, minWidth: 0, flex: '0 1 240px', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none' }}
          />
        )}

        {/* Solde Studio — clic : détail + packs */}
        {access?.allowed && (
          <button onClick={() => setWalletOpen(true)} title="Solde de tokens Studio — voir le détail et recharger"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            {access.remaining > 1e12 ? 'Illimité' : `${formatTokens(access.remaining)} tokens`}
          </button>
        )}

        {view === 'canvas' && (<>
        <div style={{ display: 'flex', gap: 2, marginLeft: access?.allowed ? 0 : 'auto', background: 'var(--bg-alt)', borderRadius: 10, padding: 3 }}>
          {(['canvas', 'chat', 'rendu', 'runs'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
                background: tab === tb ? 'var(--bg)' : 'transparent', color: tab === tb ? 'var(--text)' : 'var(--text-dim)',
                boxShadow: tab === tb ? 'var(--shadow-card)' : 'none' }}>
              {tb === 'canvas' ? 'Canvas' : tb === 'chat' ? 'Pilotage' : tb === 'rendu' ? 'Rendu' : 'Historique'}
            </button>
          ))}
        </div>

        {running ? (
          <button onClick={stopRun} style={{ ...cta, background: '#374151' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', display: 'inline-block' }} /> Arrêter
          </button>
        ) : (
          <button onClick={() => void runOnce()} style={cta}
            title={graph.nodes.length ? `Coût estimé : ~${formatTokens(estimateRunTokens(graph.nodes))} tokens Studio` : 'Run once'}>
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
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', flex: 1 }}>
                {issues.errors.length ? 'Le système ne peut pas tourner' : 'À vérifier avant de lancer'}
              </span>
              <button onClick={() => setIssues(null)} aria-label="Fermer" style={iconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {issues.errors.map((msg, i) => (
              <div key={`e${i}`} style={{ display: 'flex', gap: 7, padding: '6px 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.45, fontFamily: 'DM Sans,sans-serif' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 5 }} />
                <span>{msg}</span>
              </div>
            ))}
            {issues.warnings.map((msg, i) => (
              <div key={`w${i}`} style={{ display: 'flex', gap: 7, padding: '6px 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.45, fontFamily: 'DM Sans,sans-serif' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 5 }} />
                <span>{msg}</span>
              </div>
            ))}
            {issues.canForce && (
              <button onClick={() => void runOnce(true)}
                style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                Lancer quand même
              </button>
            )}
          </div>
        )}

        {/* ══ CANVAS ══ */}
        {view === 'canvas' && tab === 'canvas' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>

            {/* ── Barre « Décris ton système » (texte + dictée) ── */}
            <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 6, width: 'min(620px, calc(100% - 220px))' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 14px',
                borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>
                </svg>
                <input
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void build() }}
                  disabled={building}
                  placeholder="Décris ce que tu veux… l'IA construit le système pour toi"
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13.5, fontFamily: 'DM Sans,sans-serif' }}
                />
                {/* Dictée vocale */}
                <button onClick={() => setMicOpen(true)} disabled={building} title="Décrire à la voix" aria-label="Décrire à la voix"
                  style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>
                  </svg>
                </button>
                <button onClick={() => void build()} disabled={!desc.trim() || building}
                  style={{ height: 32, padding: '0 14px', borderRadius: 10, border: 'none', cursor: desc.trim() && !building ? 'pointer' : 'not-allowed',
                    background: desc.trim() && !building ? '#8B5CF6' : 'var(--border)', color: desc.trim() && !building ? '#fff' : 'var(--text-dim)',
                    fontSize: 12.5, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {building ? (
                    <><span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'studio_spin 0.7s linear infinite', display: 'inline-block' }} /> Construction…</>
                  ) : 'Construire'}
                </button>
              </div>
              {buildErr && (
                <div style={{ marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5, fontFamily: 'DM Sans,sans-serif', animation: 'studio_in 0.2s ease' }}>
                  {buildErr}
                </div>
              )}
              {explanation && (
                <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.3)', animation: 'studio_in 0.25s ease' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>Système construit</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: 'DM Sans,sans-serif' }}>{explanation}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={() => setExplanation(null)} style={{ border: 'none', background: 'transparent', color: '#8B5CF6', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans,sans-serif' }}>OK</button>
                    {prevGraphRef.current && (
                      <button onClick={undoBuild} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans,sans-serif' }}>Annuler (revenir à l'ancien)</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Palette : Outils vs Applications ── */}
            <div style={{ position: 'absolute', top: 14, left: 12, zIndex: 5, width: 186, maxHeight: 'calc(100% - 28px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 7, boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.10)' }}>
              <div style={paletteHdr}>Outils</div>
              {(['trigger', 'agent', 'merge', 'validation'] as StudioNodeKind[]).map(k => {
                // RÈGLE : un seul Objectif par système.
                const off = k === 'trigger' && !!trigger
                return (
                  <button key={k} onClick={() => { if (!off) addNode(k) }} disabled={off}
                    title={off ? 'Un seul Objectif par système' : `Ajouter : ${KIND_LABEL[k]}`}
                    style={{ ...paletteBtn, opacity: off ? 0.4 : 1, cursor: off ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!off) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: `color-mix(in srgb, ${KIND_COLOR[k]} 14%, transparent)`, color: KIND_COLOR[k], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <KindIcon kind={k} size={13} />
                    </span>
                    {k === 'trigger' ? 'Objectif' : KIND_LABEL[k]}
                  </button>
                )
              })}

              <div style={{ ...paletteHdr, marginTop: 6 }}>Applications</div>
              {APP_CATALOG.map(app => (
                <button key={app.id} onClick={() => addApp(app)} title={`Connecter : ${app.label} (${app.access})`}
                  style={paletteBtn}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: `color-mix(in srgb, ${app.color} 15%, transparent)`, color: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AppIcon id={app.id} size={14} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.label}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: app.access === 'écriture' ? '#EF4444' : 'var(--text-dim)', background: app.access === 'écriture' ? 'rgba(239,68,68,0.10)' : 'var(--bg-hover)', padding: '2px 5px', borderRadius: 5, flexShrink: 0 }}>{app.access === 'écriture' ? 'écrit' : 'lit'}</span>
                </button>
              ))}

              <div style={{ ...paletteHdr, marginTop: 6 }}>Apps externes</div>
              {EXT_CATALOG.map(ext => {
                const on = connectedProviders.has(ext.provider)
                return (
                  <button key={ext.id} onClick={() => addExt(ext)}
                    title={on ? `Connecter : ${ext.label}` : `${ext.label} — à connecter dans Connexions`}
                    style={{ ...paletteBtn, opacity: on ? 1 : 0.55 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: `color-mix(in srgb, ${ext.color} 16%, transparent)`, color: ext.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AppIcon id={ext.id} size={14} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ext.label}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: on ? '#22C55E' : 'var(--border-mid)' }} title={on ? 'Connecté' : 'Non connecté'} />
                  </button>
                )
              })}

              <div style={{ height: 1, background: 'var(--border)', margin: '5px 4px 3px' }} />
              <button onClick={() => { if (graph.nodes.length && !confirm('Remplacer le système actuel par l’exemple ?')) return; loadExample() }}
                style={{ ...paletteBtn, color: 'var(--text-dim)', fontSize: 11.5 }}>
                Charger l’exemple
              </button>
              {graph.nodes.length > 0 && (
                <button onClick={() => { if (confirm('Vider la toile ?')) clearCanvas() }}
                  style={{ ...paletteBtn, color: 'var(--text-dim)', fontSize: 11.5 }}>
                  Vider la toile
                </button>
              )}
            </div>

            {/* ── Zone graphe ── */}
            <div ref={wrapRef} data-bg="1" onPointerDown={startPan}
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: drag.current?.mode === 'pan' ? 'grabbing' : 'default',
                backgroundImage: 'radial-gradient(color-mix(in srgb, var(--text) 9%, transparent) 1px, transparent 1px)', backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}>

              {/* Fils (SVG) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {graph.edges.map(e => {
                    const a = graph.nodes.find(n => n.id === e.from), b = graph.nodes.find(n => n.id === e.to)
                    if (!a || !b) return null
                    const p1 = portOut(a), p2 = portIn(b)
                    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
                    const flowing = status[e.from] === 'done' && (status[e.to] === 'running' || status[e.to] === 'waiting')
                    const doneFlow = status[e.from] === 'done' && status[e.to] === 'done'
                    const col = flowing ? KIND_COLOR[a.kind] : doneFlow ? '#22C55E' : 'color-mix(in srgb, var(--text) 30%, transparent)'
                    return (
                      <g key={e.id}>
                        {/* halo doux sous le fil */}
                        <path d={edgePath(p1, p2)} fill="none" stroke={col} strokeWidth={6} strokeOpacity={0.08} strokeLinecap="round" />
                        <path d={edgePath(p1, p2)} fill="none" stroke={col}
                          strokeWidth={selEdge === e.id ? 2.6 : 2} strokeOpacity={flowing || doneFlow ? 0.95 : 0.75} strokeLinecap="round"
                          strokeDasharray={flowing ? '7 7' : undefined}
                          style={{ pointerEvents: 'stroke', cursor: 'pointer', animation: flowing ? 'studio_dash 0.6s linear infinite' : undefined }}
                          onPointerDown={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelId(null) }} />
                        {/* pastille directionnelle au milieu */}
                        {!flowing && !doneFlow && selEdge !== e.id && (
                          <circle cx={mid.x} cy={mid.y} r={2.4} fill="color-mix(in srgb, var(--text) 34%, transparent)" />
                        )}
                        {selEdge === e.id && (
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
                    return <path d={edgePath(portOut(a), { x: pending.x, y: pending.y })} fill="none" stroke={KIND_COLOR[a.kind]} strokeWidth={2.2} strokeDasharray="6 5" strokeLinecap="round" style={{ animation: 'studio_dash 0.5s linear infinite' }} />
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
                    ? APP_CATALOG.find(a => a.kind === 'action')
                    : undefined
                  // Nœud d'app externe → couleur de la marque + son icône.
                  const iconId = extEntry?.id ?? appEntry?.id ?? null
                  const isApp = !!(extEntry || appEntry)
                  const col = extEntry?.color ?? KIND_COLOR[n.kind]
                  // Type affiché en petit (distingue Objectif / Agent / Synthèse /
                  // Validation) — et « App » pour les connecteurs d'applications.
                  const typeTag = isApp ? 'App' : isTrigger ? null : KIND_LABEL[n.kind]
                  const subtitle = n.kind === 'source' ? SOURCE_LABEL[n.sourceKey ?? 'activities']
                    : n.kind === 'action' ? ACTION_LABEL[n.actionKey ?? 'planning_save']
                    : undefined
                  // Anneau du contrôle pré-run : rouge = bloquant, ambre = avertissement.
                  const iss = issues?.nodeIssues[n.id]
                  return (
                    <div key={n.id} className="studio-node"
                      style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_W,
                        background: 'var(--bg-card)',
                        border: `1px solid ${selId === n.id ? col : iss === 'error' ? 'rgba(239,68,68,0.65)' : iss === 'warning' ? 'rgba(245,158,11,0.65)' : 'color-mix(in srgb, var(--text) 12%, transparent)'}`,
                        borderRadius: 15, overflow: 'hidden', userSelect: 'none',
                        boxShadow: st !== 'idle' && STATUS_RING[st] !== 'transparent'
                          ? `0 0 0 3px ${STATUS_RING[st]}, 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.10)`
                          : selId === n.id
                          ? `0 0 0 3px color-mix(in srgb, ${col} 22%, transparent), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.10)`
                          : iss
                          ? `0 0 0 3px ${iss === 'error' ? 'rgba(239,68,68,0.20)' : 'rgba(245,158,11,0.22)'}, 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.10)`
                          : '0 1px 3px rgba(0,0,0,0.06), 0 8px 22px rgba(0,0,0,0.08)' }}>
                      {/* Objectif = en-tête PLEIN (allure de « logo » de départ) ;
                          les autres blocs : simple liseré coloré du type. */}
                      {isTrigger ? (
                        <div style={{ height: 4, background: `linear-gradient(90deg, ${col}, #6366F1)` }} />
                      ) : (
                        <div style={{ height: 3, background: `linear-gradient(90deg, ${col}, color-mix(in srgb, ${col} 35%, transparent))` }} />
                      )}
                      {/* En-tête (poignée) */}
                      <div onPointerDown={e => startNodeDrag(e, n)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isTrigger ? '11px 11px 9px' : '9px 11px 7px', cursor: 'grab',
                          background: isTrigger ? `linear-gradient(135deg, color-mix(in srgb, ${col} 18%, var(--bg-card)), var(--bg-card))` : 'transparent' }}>
                        <span style={{ width: isTrigger ? 30 : 24, height: isTrigger ? 30 : 24, borderRadius: isTrigger ? 10 : 8, background: isTrigger ? `linear-gradient(135deg, ${col}, #6366F1)` : `color-mix(in srgb, ${col} 13%, transparent)`, color: isTrigger ? '#fff' : col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: isTrigger ? `0 3px 10px color-mix(in srgb, ${col} 45%, transparent)` : 'none' }}>
                          {iconId ? <AppIcon id={iconId} size={14} /> : <KindIcon kind={n.kind} size={isTrigger ? 15 : 13} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {typeTag && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: col, lineHeight: 1 }}>{typeTag}</span>}
                          <span style={{ fontSize: isTrigger ? 13.5 : 13, fontWeight: isTrigger ? 750 : 650, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{n.title}</span>
                        </span>
                        {(n.kind === 'agent' || n.kind === 'merge') && n.model && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: col, background: `color-mix(in srgb, ${col} 11%, transparent)`, padding: '2.5px 7px', borderRadius: 7, letterSpacing: '0.02em' }}>{MODEL_LABEL[n.model]}</span>
                        )}
                        {st === 'running' && <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid color-mix(in srgb, ${col} 25%, transparent)`, borderTopColor: col, animation: 'studio_spin 0.7s linear infinite', flexShrink: 0 }} />}
                        {st === 'done' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>}
                        {st === 'waiting' && <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" style={{ flexShrink: 0, animation: 'studio_pulse 1.4s ease infinite' }}><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg>}
                        {st === 'error' && <span style={{ color: '#EF4444', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>!</span>}
                      </div>
                      {/* Sous-titre connecteur */}
                      {subtitle && (
                        <div style={{ padding: '0 11px 4px', fontSize: 10.5, fontWeight: 700, color: col, fontFamily: 'DM Sans,sans-serif' }}>{subtitle}</div>
                      )}
                      {/* Corps : aperçu rôle / streaming */}
                      <div style={{ padding: '2px 11px 10px', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.45, maxHeight: 64, overflow: 'hidden', fontFamily: 'DM Sans,sans-serif' }}>
                        {preview ? preview.slice(0, 200) : (n.role || (n.kind === 'trigger' ? 'Définis l’objectif…' : n.kind === 'source' ? 'Injecte ces données dans le système.' : n.kind === 'action' ? 'Agit sur l’app après ta validation.' : '—'))}
                      </div>
                      {/* Ports */}
                      {n.kind !== 'trigger' && n.kind !== 'source' && (
                        <span data-portin={n.id} className="studio-port" style={{ position: 'absolute', left: -8, top: PORT_Y - 7, width: 14, height: 14, borderRadius: '50%', background: 'var(--bg)', border: `2.5px solid color-mix(in srgb, var(--text) 35%, transparent)`, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                      )}
                      <span onPointerDown={e => startConnect(e, n)} title="Relier" className="studio-port"
                        style={{ position: 'absolute', right: -8, top: PORT_Y - 7, width: 14, height: 14, borderRadius: '50%', background: col, border: '2.5px solid var(--bg-card)', cursor: 'crosshair', boxShadow: `0 0 0 2px color-mix(in srgb, ${col} 25%, transparent), 0 1px 3px rgba(0,0,0,0.2)` }} />
                    </div>
                  )
                })}
              </div>

              {/* ── Toile vide : grosse bulle « + » (façon Make) ── */}
              {graph.nodes.length === 0 && !building && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 16, padding: 20 }}>
                  <button onClick={() => addNode('trigger')} title="Commencer par un Objectif"
                    style={{ pointerEvents: 'auto', width: 84, height: 84, borderRadius: 24, cursor: 'pointer',
                      background: 'color-mix(in srgb, #8B5CF6 8%, var(--bg-card))', border: '2px dashed color-mix(in srgb, #8B5CF6 45%, transparent)',
                      color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 10px 30px rgba(139,92,246,0.14)', transition: 'transform 0.15s, background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <div style={{ textAlign: 'center', maxWidth: 320 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>Toile vierge</p>
                    <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: 'DM Sans,sans-serif' }}>
                      Commence par poser un <b style={{ color: '#8B5CF6' }}>Objectif</b>, puis ajoute des <b>Outils</b> et des <b>Applications</b> depuis la palette à gauche — et relie-les.
                    </p>
                    <button onClick={loadExample} style={{ pointerEvents: 'auto', marginTop: 12, padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      ou charger un exemple
                    </button>
                  </div>
                </div>
              )}

              {/* ── Contrôles de la toile : zoom · ajuster · ranger ── */}
              <div style={{ position: 'absolute', right: 12, bottom: 14, zIndex: 5, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.10)' }}>
                <button onClick={() => zoomBy(1 / 1.2)} title="Zoom arrière" aria-label="Zoom arrière" style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/></svg>
                </button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} title="Réinitialiser le zoom" aria-label="Réinitialiser le zoom"
                  style={{ ...zBtn, width: 46, fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => zoomBy(1.2)} title="Zoom avant" aria-label="Zoom avant" style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
                <button onClick={fitView} title="Ajuster à la vue" aria-label="Ajuster à la vue" style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg>
                </button>
                <button onClick={tidy} title="Ranger la toile (auto-layout)" aria-label="Ranger la toile" style={zBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="15" y="4" width="6" height="6" rx="1.5"/><rect x="9" y="14" width="6" height="6" rx="1.5"/><path d="M6 10v2a2 2 0 002 2h1M18 10v2a2 2 0 01-2 2h-1"/></svg>
                </button>
              </div>
            </div>

            {/* ── Inspecteur ── */}
            {sel && (
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto', zIndex: 4, animation: 'studio_in 0.18s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 8, background: `color-mix(in srgb, ${KIND_COLOR[sel.kind]} 13%, transparent)`, color: KIND_COLOR[sel.kind], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KindIcon kind={sel.kind} size={13} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{KIND_LABEL[sel.kind]}</span>
                  <button onClick={() => setSelId(null)} style={{ ...iconBtn, marginLeft: 'auto' }} aria-label="Fermer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <label style={lbl}>Titre</label>
                <input value={sel.title} onChange={e => patchNode(sel.id, { title: e.target.value })} style={fld} />

                {/* Connecteur de page (lecture) */}
                {sel.kind === 'source' && (
                  <>
                    <label style={lbl}>Page de l’app à connecter</label>
                    <select value={sel.sourceKey ?? 'activities'} onChange={e => patchNode(sel.id, { sourceKey: e.target.value as StudioSourceKey })} style={{ ...fld, cursor: 'pointer' }}>
                      {(Object.keys(SOURCE_LABEL) as StudioSourceKey[]).map(k => (
                        <option key={k} value={k}>{SOURCE_LABEL[k]}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 14px' }}>
                      Ce nœud lit les vraies données de cette page et les transmet aux nœuds reliés en aval.
                    </p>
                  </>
                )}

                {/* Action d'écriture */}
                {sel.kind === 'action' && (
                  <>
                    <label style={lbl}>Action</label>
                    <div style={{ ...fld, background: 'var(--bg-alt)' }}>{ACTION_LABEL[sel.actionKey ?? 'planning_save']}</div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 14px' }}>
                      Convertit ce qu’il reçoit en séances et les enregistre dans ton Planning — toujours après ta validation explicite.
                    </p>
                  </>
                )}

                {sel.kind !== 'source' && sel.kind !== 'action' && (
                  <>
                    <label style={lbl}>{sel.kind === 'trigger' ? 'Objectif' : sel.kind === 'validation' ? 'Consigne de validation' : 'Rôle de l’agent'}</label>
                    <textarea value={sel.role ?? ''} onChange={e => patchNode(sel.id, { role: e.target.value })} rows={7}
                      style={{ ...fld, resize: 'vertical', lineHeight: 1.5 }} placeholder={sel.kind === 'trigger' ? 'Que doit accomplir le collectif ?' : 'Décris précisément le job…'} />
                  </>
                )}

                {(sel.kind === 'agent' || sel.kind === 'merge') && (
                  <>
                    <label style={lbl}>Modèle IA</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['hermes', 'athena', 'zeus'] as StudioModel[]).map(m => (
                        <button key={m} onClick={() => patchNode(sel.id, { model: m })}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${sel.model === m ? KIND_COLOR[sel.kind] : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
                            background: sel.model === m ? KIND_COLOR[sel.kind] : 'var(--bg-alt)', color: sel.model === m ? '#fff' : 'var(--text-mid)' }}>
                          {MODEL_LABEL[m]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {sel.kind !== 'trigger' && (
                  <button onClick={() => deleteNode(sel.id)}
                    style={{ marginTop: 18, width: '100%', padding: '10px 0', borderRadius: 9, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                    Supprimer ce nœud
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PILOTAGE ══ */}
        {view === 'canvas' && tab === 'chat' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 760, margin: '0 auto' }}>
            <label style={lbl}>Objectif du collectif</label>
            {trigger ? (
              <textarea value={trigger.role ?? ''} onChange={e => patchNode(trigger.id, { role: e.target.value })} rows={3}
                style={{ ...fld, resize: 'vertical', lineHeight: 1.5, marginBottom: 18 }} placeholder="Que doivent accomplir les agents ensemble ?" />
            ) : <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Utilise la barre « Décris ton système » du Canvas pour créer un système (le déclencheur portera l’objectif).</p>}

            {runErr && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{runErr}</div>}

            {approval && (
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 18, animation: 'studio_in 0.2s ease' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Ton accord est requis — {approval.node.title}</div>
                {approval.node.role && <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 8 }}>{approval.node.role}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', padding: 10, borderRadius: 8, background: 'var(--bg-alt)', marginBottom: 12, lineHeight: 1.5 }}>{approval.content || '(aucun contenu en entrée)'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approval.resolve(true)} style={{ ...cta, flex: 1, justifyContent: 'center' }}>Valider et continuer</button>
                  <button onClick={() => approval.resolve(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Refuser</button>
                </div>
              </div>
            )}

            <label style={lbl}>Journal du run</label>
            {logs.length === 0 && !running && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Lance un « Run once » pour voir les agents travailler.</p>}
            {running && logs.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Les agents travaillent…</p>}
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
        {view === 'canvas' && tab === 'rendu' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 820, margin: '0 auto' }}>
            {renders.every(r => !r.text) ? (
              <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', marginTop: 60 }}>
                Le rendu apparaîtra ici après un « Run once ».
              </p>
            ) : renders.map(r => (
              <div key={r.node.id} style={{ marginBottom: 22, animation: 'studio_in 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 8, background: `color-mix(in srgb, ${KIND_COLOR[r.node.kind]} 13%, transparent)`, color: KIND_COLOR[r.node.kind], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KindIcon kind={r.node.kind} size={13} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', flex: 1 }}>{r.node.title}</span>
                  {r.text && (
                    <button onClick={() => copyRender(r.node.id, r.text)} title="Copier le résultat"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: copied === r.node.id ? '#22C55E' : 'var(--text-mid)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      {copied === r.node.id ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copié</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copier</>
                      )}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 16, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {r.text || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ HISTORIQUE DES RUNS ══ */}
        {view === 'canvas' && tab === 'runs' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 760, margin: '0 auto' }}>
            {runs === null && <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement de l’historique…</p>}
            {runs !== null && runs.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', marginTop: 60 }}>Aucun run pour l’instant — lance un « Run once » et il apparaîtra ici.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(runs ?? []).map(r => {
                const open = openRunId === r.id
                const stCol = r.status === 'done' ? '#22C55E' : r.status === 'error' ? '#EF4444' : '#F59E0B'
                const stLbl = r.status === 'done' ? 'Terminé' : r.status === 'error' ? 'Erreur' : 'Arrêté'
                return (
                  <div key={r.id} style={{ borderRadius: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'studio_in 0.2s ease' }}>
                    <button onClick={() => setOpenRunId(open ? null : r.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans,sans-serif' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: stCol, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.system_name || 'Système sans nom'}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                          {new Date(r.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {stLbl}{r.tokens_est ? ` · ~${formatTokens(r.tokens_est)} tokens` : ''}
                        </span>
                      </span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {open && (
                      <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
                        {(r.renders ?? []).filter(x => x.text).length === 0 && (
                          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>Aucun rendu conservé pour ce run.</p>
                        )}
                        {(r.renders ?? []).filter(x => x.text).map((x, i) => (
                          <div key={i} style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>{x.title}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'pre-wrap', lineHeight: 1.55, maxHeight: 300, overflowY: 'auto', padding: 10, borderRadius: 9, background: 'var(--bg-alt)', fontFamily: 'DM Sans,sans-serif' }}>{x.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ ACCUEIL — paywall / mes systèmes / templates ══ */}
        {view === 'home' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 20px 40px' }}>
            {access && !access.allowed ? (
              /* ── Paywall : Studio réservé Pro/Expert ── */
              <div style={{ maxWidth: 660, margin: '40px auto 0', textAlign: 'center' }}>
                <span style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '16px 0 8px', fontFamily: 'Syne,DM Sans,sans-serif' }}>Le Studio est réservé aux offres Pro et Expert</h2>
                <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 auto 22px', maxWidth: 480, fontFamily: 'DM Sans,sans-serif' }}>
                  Un run mobilise plusieurs coachs IA en parallèle — c’est une puissance de calcul sans commune mesure avec le chat.
                  Les abonnements Pro et Expert incluent un quota mensuel de tokens Studio dédié, extensible avec des packs.
                </p>
                <a href="/settings/subscription" style={{ ...cta, display: 'inline-flex', textDecoration: 'none' }}>Voir les abonnements</a>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 34, opacity: 0.65 }}>
                  {STUDIO_PACKS.map(p => (
                    <div key={p.key} style={{ padding: '16px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>{p.label}</div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: '6px 0 2px', fontFamily: 'Syne,DM Sans,sans-serif' }}>{formatTokens(p.tokens)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>tokens</span></div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8B5CF6' }}>{p.priceEur.toFixed(2).replace('.', ',')} €</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10, fontFamily: 'DM Sans,sans-serif' }}>Packs disponibles une fois abonné Pro ou Expert.</p>
              </div>
            ) : (
              <div style={{ maxWidth: 860, margin: '0 auto' }}>
                {homeErr && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5, fontFamily: 'DM Sans,sans-serif' }}>{homeErr}</div>
                )}

                {/* ── Mes systèmes ── */}
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '4px 0 10px', fontFamily: 'DM Sans,sans-serif' }}>Mes systèmes</div>
                {homeLoading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite', fontFamily: 'DM Sans,sans-serif' }}>Chargement…</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                    {/* Nouveau système */}
                    <button onClick={() => void newSystem('Mon système', emptyGraph())}
                      style={{ minHeight: 110, borderRadius: 16, border: '2px dashed color-mix(in srgb, #8B5CF6 40%, transparent)', background: 'color-mix(in srgb, #8B5CF6 5%, var(--bg-card))', color: '#8B5CF6', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'DM Sans,sans-serif', fontSize: 13.5, fontWeight: 700 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Nouveau système
                    </button>
                    {systems.map(s => {
                      const nAgents = (s.graph?.nodes ?? []).filter(n => n.kind === 'agent' || n.kind === 'merge').length
                      return (
                        <div key={s.id} onClick={() => openSystem(s)} role="button" tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter') openSystem(s) }}
                          style={{ minHeight: 110, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'DM Sans,sans-serif' }}>
                            {(s.graph?.nodes ?? []).length} bloc{(s.graph?.nodes ?? []).length !== 1 ? 's' : ''} · {nAgents} agent{nAgents !== 1 ? 's' : ''}
                          </div>
                          <div style={{ flex: 1 }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>
                              {new Date(s.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            <div style={{ flex: 1 }} />
                            <button onClick={e => { e.stopPropagation(); void copySystem(s) }} title="Dupliquer" aria-label="Dupliquer"
                              style={{ ...zBtn, width: 26, height: 24 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            </button>
                            <button onClick={e => { e.stopPropagation(); void removeSystem(s.id) }} title="Supprimer" aria-label="Supprimer"
                              style={{ ...zBtn, width: 26, height: 24, color: '#EF4444' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Templates ── */}
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '28px 0 10px', fontFamily: 'DM Sans,sans-serif' }}>Partir d’un modèle</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                  {STUDIO_TEMPLATES.map(t => (
                    <button key={t.key} onClick={() => void newSystem(t.name, t.build())}
                      style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', padding: '14px 14px 13px', textAlign: 'left', fontFamily: 'DM Sans,sans-serif', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16"/></svg>
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, margin: '8px 0 0' }}>{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ Solde Studio + packs (sur-page) ══ */}
      {walletOpen && access && (
        <div onClick={() => setWalletOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 13700, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(520px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', padding: '22px 22px 18px', animation: 'studio_in 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </span>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', flex: 1 }}>Tokens Studio</div>
              <button onClick={() => setWalletOpen(false)} aria-label="Fermer" style={iconBtn}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Jauge mensuelle */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-alt)', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif' }}>
                <span>Quota mensuel inclus ({access.tier === 'expert' ? 'Expert' : 'Pro'})</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTokens(Math.min(access.monthlyUsed, access.monthlyLimit))} / {formatTokens(access.monthlyLimit)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${access.monthlyLimit > 0 ? Math.min(100, (access.monthlyUsed / access.monthlyLimit) * 100) : 0}%`, background: '#8B5CF6', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'DM Sans,sans-serif' }}>
                Tokens de packs : <b style={{ color: 'var(--text)' }}>{formatTokens(access.packTokens)}</b> (n’expirent pas)
              </div>
            </div>

            {/* Les 3 packs */}
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '14px 0 8px', fontFamily: 'DM Sans,sans-serif' }}>Recharger</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STUDIO_PACKS.map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>{p.label} — {formatTokens(p.tokens)} tokens</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'DM Sans,sans-serif' }}>{p.tagline}</div>
                  </div>
                  <button onClick={() => void buyPack(p.key)} disabled={!access.packsAvailable || buying !== null}
                    title={access.packsAvailable ? `Acheter ${p.label}` : 'Bientôt disponible'}
                    style={{ padding: '8px 14px', borderRadius: 9, border: 'none', flexShrink: 0, cursor: access.packsAvailable && !buying ? 'pointer' : 'default',
                      background: access.packsAvailable ? '#8B5CF6' : 'var(--border)', color: access.packsAvailable ? '#fff' : 'var(--text-dim)',
                      fontSize: 12.5, fontWeight: 700, fontFamily: 'DM Sans,sans-serif' }}>
                    {buying === p.key ? '…' : `${p.priceEur.toFixed(2).replace('.', ',')} €`}
                  </button>
                </div>
              ))}
            </div>
            {!access.packsAvailable && (
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10, fontFamily: 'DM Sans,sans-serif' }}>L’achat de packs arrive très bientôt — ton quota mensuel se recharge automatiquement chaque mois.</p>
            )}
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
              <span style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16"/></svg>
              </span>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', flex: 1 }}>Le Studio, c’est quoi ?</div>
              <button onClick={() => setHelpOpen(false)} aria-label="Fermer" style={iconBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.65, fontFamily: 'DM Sans,sans-serif' }}>
              <p style={{ margin: '0 0 12px' }}>
                Au lieu de parler à <strong style={{ color: 'var(--text)' }}>un seul assistant</strong>, le Studio te donne
                <strong style={{ color: 'var(--text)' }}> une équipe de coachs IA</strong> qui travaillent ensemble sur une tâche :
                chacun a son métier (endurance, force, prévention…), ils bossent en parallèle, et une synthèse assemble le tout.
              </p>
              {[
                ['1. Décris', 'Écris (ou dicte à la voix) ce que tu veux dans la barre du Canvas — l’IA construit le système toute seule : les agents, les connexions, tout.'],
                ['2. Branche tes pages', 'Les nœuds verts « Page » lisent tes vraies données (Activités, Planning, Blessures, Récupération, Profil) et les injectent dans le système.'],
                ['3. Lance', '« Run once » : les agents travaillent en même temps, tu suis tout dans Pilotage, le résultat arrive dans Rendu.'],
                ['4. Tu gardes la main', 'Pour toute action importante (ex. enregistrer des séances dans ton Planning), le système se met en pause et attend TON accord.'],
              ].map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#8B5CF6', whiteSpace: 'nowrap', paddingTop: 1 }}>{t}</span>
                  <span>{d}</span>
                </div>
              ))}
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                Exemple : « Analyse mes 30 derniers jours et construis-moi une semaine équilibrée, puis enregistre-la dans mon planning » → un système complet se monte et s’exécute sous tes yeux.
              </p>
            </div>

            <a href={siteUrl} target="_blank" rel="noreferrer"
              style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 11, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'DM Sans,sans-serif' }}>
              Guide complet : bien utiliser le Studio
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>
            </a>
          </div>
        </div>
      )}

      {/* ══ Dictée vocale (barre « Décris ton système ») ══ */}
      {micOpen && (
        <VoiceOverlay
          isDesktop
          onCancel={() => setMicOpen(false)}
          onConfirm={(text) => { setMicOpen(false); if (text.trim()) setDesc(prev => (prev ? prev + ' ' : '') + text.trim()) }}
        />
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }
const zBtn: React.CSSProperties = { width: 30, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
const paletteHdr: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '3px 8px 2px' }
const paletteBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'left' }
const cta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 5px', display: 'block' }
const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none', marginBottom: 14 }
