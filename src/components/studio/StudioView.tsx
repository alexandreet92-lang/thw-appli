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
  loadGraph, saveGraph, resetGraph, genId, MODEL_LABEL, KIND_LABEL, SOURCE_LABEL, ACTION_LABEL,
  type StudioGraph, type StudioNode, type StudioNodeKind, type StudioModel, type StudioSourceKey,
} from '@/lib/studio/graph'
import { runGraph, terminalNodeIds, type NodeStatus } from '@/lib/studio/runner'
import { buildGraphFromDescription } from '@/lib/studio/architect'
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

type Tab = 'canvas' | 'chat' | 'rendu'
type LogEntry = { nodeId: string; title: string; text: string }
type Approval = { node: StudioNode; content: string; resolve: (ok: boolean) => void }

export default function StudioView({ onClose }: { onClose: () => void }) {
  const [graph, setGraph] = useState<StudioGraph>(() => (typeof window !== 'undefined' ? loadGraph() : { id: '', name: '', nodes: [], edges: [], updatedAt: 0 }))
  const [tab, setTab] = useState<Tab>('canvas')
  const [selId, setSelId] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [helpOpen, setHelpOpen] = useState(false)

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

  const persist = useCallback((g: StudioGraph) => { setGraph(g); saveGraph(g) }, [])

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
  const canvasPoint = (clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect()
    return { x: clientX - (r?.left ?? 0) - pan.x, y: clientY - (r?.top ?? 0) - pan.y }
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
  }, [pan])

  const graphRef = useRef(graph)
  useEffect(() => { graphRef.current = graph }, [graph])

  const onPointerUp = useCallback((e: PointerEvent) => {
    const d = drag.current
    if (d?.mode === 'node') saveGraph(graphRef.current)
    if (d?.mode === 'conn') {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const toId = el?.closest('[data-portin]')?.getAttribute('data-portin') ?? null
      if (toId && d.id && toId !== d.id) {
        setGraph(g => {
          if (g.edges.some(x => x.from === d.id && x.to === toId)) return g
          const next = { ...g, edges: [...g.edges, { id: genId(), from: d.id!, to: toId }] }
          saveGraph(next); return next
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
  const addNode = (kind: StudioNodeKind) => {
    const base = { x: -pan.x + 160 + Math.round(Math.random() * 40), y: -pan.y + 180 + Math.round(Math.random() * 40) }
    const n: StudioNode = {
      id: genId(), kind, x: base.x, y: base.y,
      title: kind === 'agent' ? 'Nouvel agent' : kind === 'source' ? 'Page connectée' : KIND_LABEL[kind],
      role: kind === 'trigger' ? '' : kind === 'validation' ? 'Vérifie ce qui précède avant de continuer.' : kind === 'source' || kind === 'action' ? undefined : 'Décris le rôle de cet agent…',
      model: kind === 'agent' || kind === 'merge' ? 'athena' : undefined,
      sourceKey: kind === 'source' ? 'activities' : undefined,
      actionKey: kind === 'action' ? 'planning_save' : undefined,
    }
    persist({ ...graph, nodes: [...graph.nodes, n] }); setSelId(n.id); setTab('canvas')
  }
  const patchNode = (id: string, patch: Partial<StudioNode>) =>
    persist({ ...graph, nodes: graph.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })
  const deleteNode = (id: string) => {
    persist({ ...graph, nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) })
    setSelId(null)
  }
  const deleteEdge = (id: string) => { persist({ ...graph, edges: graph.edges.filter(e => e.id !== id) }); setSelEdge(null) }

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
  const runOnce = async () => {
    if (running) return
    setRunErr(null); setLogs([]); setNodeText({}); setStatus({})
    const ctrl = new AbortController(); abortRef.current = ctrl
    setRunning(true)
    try {
      await runGraph(graph, {
        signal: ctrl.signal,
        onStatus: (id, s) => setStatus(prev => ({ ...prev, [id]: s })),
        onChunk:  (id, t) => setNodeText(prev => ({ ...prev, [id]: t })),
        onLog:    (entry) => { setNodeText(prev => ({ ...prev, [entry.nodeId]: entry.text })); setLogs(prev => [...prev, entry]) },
        requestApproval: (node, content) => new Promise<boolean>(resolve => {
          setTab('chat')
          setApproval({ node, content, resolve: (ok) => { setApproval(null); resolve(ok) } })
        }),
      })
      setTab('rendu')
    } catch (e) {
      if (!ctrl.signal.aborted) setRunErr(e instanceof Error ? e.message : 'Erreur pendant le run')
    } finally {
      setRunning(false); abortRef.current = null
    }
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
        <button onClick={onClose} aria-label="Fermer" style={iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', whiteSpace: 'nowrap' }}>Studio</div>
        {/* Aide — sur-page d'explication */}
        <button onClick={() => setHelpOpen(true)} aria-label="Comment ça marche ?" title="Comment ça marche ?"
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }}>
          ?
        </button>
        <input
          value={graph.name}
          onChange={e => persist({ ...graph, name: e.target.value })}
          aria-label="Nom du système"
          style={{ marginLeft: 2, minWidth: 0, flex: '0 1 240px', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none' }}
        />

        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', background: 'var(--bg-alt)', borderRadius: 10, padding: 3 }}>
          {(['canvas', 'chat', 'rendu'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
                background: tab === tb ? 'var(--bg)' : 'transparent', color: tab === tb ? 'var(--text)' : 'var(--text-dim)',
                boxShadow: tab === tb ? 'var(--shadow-card)' : 'none' }}>
              {tb === 'canvas' ? 'Canvas' : tb === 'chat' ? 'Pilotage' : 'Rendu'}
            </button>
          ))}
        </div>

        {running ? (
          <button onClick={stopRun} style={{ ...cta, background: '#374151' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', display: 'inline-block' }} /> Arrêter
          </button>
        ) : (
          <button onClick={runOnce} style={cta}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Run once
          </button>
        )}
      </div>

      {/* ══ Corps ══ */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {/* ══ CANVAS ══ */}
        {tab === 'canvas' && (
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
                  ⚠️ {buildErr}
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

            {/* ── Palette ── */}
            <div style={{ position: 'absolute', top: 14, left: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.10)' }}>
              {(['agent', 'merge', 'validation', 'source', 'action'] as StudioNodeKind[]).map(k => (
                <button key={k} onClick={() => addNode(k)} title={`Ajouter : ${KIND_LABEL[k]}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'left' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, background: `color-mix(in srgb, ${KIND_COLOR[k]} 14%, transparent)`, color: KIND_COLOR[k], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KindIcon kind={k} size={12} />
                  </span>
                  {KIND_LABEL[k]}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px' }} />
              <button onClick={() => { if (confirm('Réinitialiser le système sur l’exemple ?')) { const g = resetGraph(); setGraph(g); setSelId(null); setStatus({}); setNodeText({}) } }}
                style={{ padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, fontFamily: 'DM Sans,sans-serif', textAlign: 'left' }}>
                Réinitialiser
              </button>
            </div>

            {/* ── Zone graphe ── */}
            <div ref={wrapRef} data-bg="1" onPointerDown={startPan}
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: drag.current?.mode === 'pan' ? 'grabbing' : 'default',
                backgroundImage: 'radial-gradient(color-mix(in srgb, var(--text) 9%, transparent) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: `${pan.x}px ${pan.y}px` }}>

              {/* Fils (SVG) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <g transform={`translate(${pan.x},${pan.y})`}>
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
              <div style={{ position: 'absolute', left: pan.x, top: pan.y }}>
                {graph.nodes.map(n => {
                  const st = status[n.id] ?? 'idle'
                  const preview = nodeText[n.id]
                  const col = KIND_COLOR[n.kind]
                  const subtitle = n.kind === 'source' ? SOURCE_LABEL[n.sourceKey ?? 'activities']
                    : n.kind === 'action' ? ACTION_LABEL[n.actionKey ?? 'planning_save']
                    : undefined
                  return (
                    <div key={n.id} className="studio-node"
                      style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_W,
                        background: 'var(--bg-card)',
                        border: `1px solid ${selId === n.id ? col : 'color-mix(in srgb, var(--text) 12%, transparent)'}`,
                        borderRadius: 15, overflow: 'hidden', userSelect: 'none',
                        boxShadow: st !== 'idle' && STATUS_RING[st] !== 'transparent'
                          ? `0 0 0 3px ${STATUS_RING[st]}, 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.10)`
                          : selId === n.id
                          ? `0 0 0 3px color-mix(in srgb, ${col} 22%, transparent), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.10)`
                          : '0 1px 3px rgba(0,0,0,0.06), 0 8px 22px rgba(0,0,0,0.08)' }}>
                      {/* liseré coloré du type */}
                      <div style={{ height: 3, background: `linear-gradient(90deg, ${col}, color-mix(in srgb, ${col} 35%, transparent))` }} />
                      {/* En-tête (poignée) */}
                      <div onPointerDown={e => startNodeDrag(e, n)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px 7px', cursor: 'grab' }}>
                        <span style={{ width: 24, height: 24, borderRadius: 8, background: `color-mix(in srgb, ${col} 13%, transparent)`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <KindIcon kind={n.kind} size={13} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 650, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{n.title}</span>
                        {(n.kind === 'agent' || n.kind === 'merge') && n.model && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: col, background: `color-mix(in srgb, ${col} 11%, transparent)`, padding: '2.5px 7px', borderRadius: 7, letterSpacing: '0.02em' }}>{MODEL_LABEL[n.model]}</span>
                        )}
                        {st === 'running' && <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid color-mix(in srgb, ${col} 25%, transparent)`, borderTopColor: col, animation: 'studio_spin 0.7s linear infinite', flexShrink: 0 }} />}
                        {st === 'done' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>}
                        {st === 'waiting' && <span style={{ color: '#F59E0B', fontSize: 12, flexShrink: 0, animation: 'studio_pulse 1.4s ease infinite' }}>⏸</span>}
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
        {tab === 'chat' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 760, margin: '0 auto' }}>
            <label style={lbl}>Objectif du collectif</label>
            {trigger ? (
              <textarea value={trigger.role ?? ''} onChange={e => patchNode(trigger.id, { role: e.target.value })} rows={3}
                style={{ ...fld, resize: 'vertical', lineHeight: 1.5, marginBottom: 18 }} placeholder="Que doivent accomplir les agents ensemble ?" />
            ) : <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Utilise la barre « Décris ton système » du Canvas pour créer un système (le déclencheur portera l’objectif).</p>}

            {runErr && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>⚠️ {runErr}</div>}

            {approval && (
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 18, animation: 'studio_in 0.2s ease' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>⏸ Ton accord est requis — {approval.node.title}</div>
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
        {tab === 'rendu' && (
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
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{r.node.title}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 16, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {r.text || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                ['1. Décris', 'Écris (ou dicte 🎙️) ce que tu veux dans la barre du Canvas — l’IA construit le système toute seule : les agents, les connexions, tout.'],
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
const cta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 5px', display: 'block' }
const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none', marginBottom: 14 }
