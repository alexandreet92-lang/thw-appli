'use client'
// ══════════════════════════════════════════════════════════════
// STUDIO D'AGENTS — interface plein écran (façon Make).
// ──────────────────────────────────────────────────────────────
// 3 vues :
//  • Canvas — on pose des nœuds (agents-coachs avec un job) et on les relie.
//  • Chat   — pilotage : objectif, journal du run, et validations humaines.
//  • Rendu  — le résultat produit par le collectif d'agents.
//
// MVP : construction du graphe + « Run once » côté navigateur (runner.ts).
// L'autonomie planifiée (serveur) et le chat conversationnel complet viennent
// dans les phases suivantes.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadGraph, saveGraph, resetGraph, genId, MODEL_LABEL, KIND_LABEL,
  type StudioGraph, type StudioNode, type StudioNodeKind, type StudioModel,
} from '@/lib/studio/graph'
import { runGraph, terminalNodeIds, type NodeStatus } from '@/lib/studio/runner'

const NODE_W = 208
const PORT_Y = 34   // ancrage vertical des ports (depuis le haut du nœud)

const KIND_COLOR: Record<StudioNodeKind, string> = {
  trigger:    '#8B5CF6',
  agent:      '#06B6D4',
  merge:      '#F59E0B',
  validation: '#EC4899',
}
const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: 'var(--border)', running: '#06B6D4', waiting: '#F59E0B',
  done: '#22C55E', error: '#EF4444', skipped: 'var(--border)',
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

  // Persistance auto à chaque mutation du graphe.
  const persist = useCallback((g: StudioGraph) => { setGraph(g); saveGraph(g) }, [])

  const sel = graph.nodes.find(n => n.id === selId) ?? null
  const trigger = graph.nodes.find(n => n.kind === 'trigger') ?? null

  // ── Géométrie ──────────────────────────────────────────────
  const portOut = (n: StudioNode) => ({ x: n.x + NODE_W, y: n.y + PORT_Y })
  const portIn  = (n: StudioNode) => ({ x: n.x,          y: n.y + PORT_Y })
  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5)
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
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  // garde une réf du graphe courant pour la sauvegarde en fin de drag
  const graphRef = useRef(graph)
  useEffect(() => { graphRef.current = graph }, [graph])

  const arm = () => { window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp) }

  const startNodeDrag = (e: React.PointerEvent, n: StudioNode) => {
    e.stopPropagation()
    setSelId(n.id); setSelEdge(null)
    const pt = canvasPoint(e.clientX, e.clientY)
    drag.current = { mode: 'node', id: n.id, dx: pt.x - n.x, dy: pt.y - n.y }
    arm()
  }
  const startConnect = (e: React.PointerEvent, n: StudioNode) => {
    e.stopPropagation()
    const a = portOut(n)
    drag.current = { mode: 'conn', id: n.id, dx: 0, dy: 0 }
    setPending({ fromId: n.id, x: a.x, y: a.y })
    arm()
  }
  const startPan = (e: React.PointerEvent) => {
    if (e.target !== wrapRef.current && !(e.target as HTMLElement).dataset.bg) return
    setSelId(null); setSelEdge(null)
    drag.current = { mode: 'pan', dx: 0, dy: 0 }
    arm()
  }

  // ── Mutations ──────────────────────────────────────────────
  const addNode = (kind: StudioNodeKind) => {
    const base = { x: -pan.x + 140 + Math.round(Math.random() * 40), y: -pan.y + 140 + Math.round(Math.random() * 40) }
    const n: StudioNode = {
      id: genId(), kind, x: base.x, y: base.y,
      title: kind === 'agent' ? 'Nouvel agent' : KIND_LABEL[kind],
      role: kind === 'trigger' ? '' : kind === 'validation' ? 'Vérifie ce qui précède avant de continuer.' : 'Décris le rôle de cet agent…',
      model: kind === 'agent' || kind === 'merge' ? 'athena' : undefined,
    }
    const next = { ...graph, nodes: [...graph.nodes, n] }
    persist(next); setSelId(n.id); setTab('canvas')
  }
  const patchNode = (id: string, patch: Partial<StudioNode>) =>
    persist({ ...graph, nodes: graph.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })
  const deleteNode = (id: string) => {
    persist({ ...graph, nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) })
    setSelId(null)
  }
  const deleteEdge = (id: string) => { persist({ ...graph, edges: graph.edges.filter(e => e.id !== id) }); setSelEdge(null) }

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

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13600, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(12px, env(safe-area-inset-top)) 14px 10px', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={onClose} aria-label="Fermer" style={iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', whiteSpace: 'nowrap' }}>Studio</div>
        <input
          value={graph.name}
          onChange={e => persist({ ...graph, name: e.target.value })}
          aria-label="Nom du graphe"
          style={{ marginLeft: 4, minWidth: 0, flex: '0 1 260px', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none' }}
        />

        {/* Onglets */}
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

      {/* Corps */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {/* ══ CANVAS ══ */}
        {tab === 'canvas' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {/* Palette */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5, display: 'flex', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, boxShadow: 'var(--shadow-card)' }}>
              {(['agent', 'merge', 'validation'] as StudioNodeKind[]).map(k => (
                <button key={k} onClick={() => addNode(k)} title={`Ajouter : ${KIND_LABEL[k]}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: KIND_COLOR[k] }} /> {KIND_LABEL[k]}
                </button>
              ))}
              <div style={{ width: 1, background: 'var(--border)', margin: '2px 2px' }} />
              <button onClick={() => { if (confirm('Réinitialiser le graphe sur l’exemple ?')) { const g = resetGraph(); setGraph(g); setSelId(null) } }}
                title="Réinitialiser" style={{ padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 12.5, fontFamily: 'DM Sans,sans-serif' }}>
                Réinitialiser
              </button>
            </div>

            {/* Zone graphe */}
            <div ref={wrapRef} data-bg="1" onPointerDown={startPan}
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: drag.current?.mode === 'pan' ? 'grabbing' : 'default',
                backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: `${pan.x}px ${pan.y}px` }}>

              {/* Fils (SVG) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <g transform={`translate(${pan.x},${pan.y})`}>
                  {graph.edges.map(e => {
                    const a = graph.nodes.find(n => n.id === e.from), b = graph.nodes.find(n => n.id === e.to)
                    if (!a || !b) return null
                    const p1 = portOut(a), p2 = portIn(b)
                    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
                    const active = status[e.from] === 'done' && (status[e.to] === 'running' || status[e.to] === 'done')
                    return (
                      <g key={e.id}>
                        <path d={edgePath(p1, p2)} fill="none" stroke={active ? '#06B6D4' : 'var(--text-dim)'} strokeWidth={selEdge === e.id ? 3 : 2} strokeOpacity={active ? 0.9 : 0.5}
                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelId(null) }} />
                        {selEdge === e.id && (
                          <g transform={`translate(${mid.x},${mid.y})`} style={{ pointerEvents: 'all', cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); deleteEdge(e.id) }}>
                            <circle r="9" fill="#EF4444" />
                            <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                          </g>
                        )}
                      </g>
                    )
                  })}
                  {pending && (() => {
                    const a = graph.nodes.find(n => n.id === pending.fromId)
                    if (!a) return null
                    return <path d={edgePath(portOut(a), { x: pending.x, y: pending.y })} fill="none" stroke="#06B6D4" strokeWidth={2} strokeDasharray="5 4" />
                  })()}
                </g>
              </svg>

              {/* Nœuds */}
              <div style={{ position: 'absolute', left: pan.x, top: pan.y }}>
                {graph.nodes.map(n => {
                  const st = status[n.id] ?? 'idle'
                  const preview = nodeText[n.id]
                  return (
                    <div key={n.id}
                      style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_W,
                        background: 'var(--bg-card)', border: `1.5px solid ${selId === n.id ? KIND_COLOR[n.kind] : STATUS_COLOR[st]}`,
                        borderRadius: 12, boxShadow: 'var(--shadow-card)', userSelect: 'none' }}>
                      {/* En-tête (poignée de déplacement) */}
                      <div onPointerDown={e => startNodeDrag(e, n)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', cursor: 'grab', borderBottom: '0.5px solid var(--border)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: KIND_COLOR[n.kind], flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                        {(n.kind === 'agent' || n.kind === 'merge') && n.model && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: KIND_COLOR[n.kind] }}>{MODEL_LABEL[n.model]}</span>
                        )}
                        {st === 'running' && <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(6,182,212,0.3)', borderTopColor: '#06B6D4', animation: 'spin 0.7s linear infinite' }} />}
                        {st === 'done' && <span style={{ color: '#22C55E', fontSize: 13 }}>✓</span>}
                        {st === 'waiting' && <span style={{ color: '#F59E0B', fontSize: 13 }}>⏸</span>}
                        {st === 'error' && <span style={{ color: '#EF4444', fontSize: 13 }}>!</span>}
                      </div>
                      {/* Corps : aperçu rôle / streaming */}
                      <div style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 66, overflow: 'hidden' }}>
                        {preview ? preview.slice(0, 220) : (n.role || (n.kind === 'trigger' ? 'Définis l’objectif…' : '—'))}
                      </div>
                      {/* Ports */}
                      {n.kind !== 'trigger' && (
                        <span data-portin={n.id} style={{ position: 'absolute', left: -7, top: PORT_Y - 6, width: 13, height: 13, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--text-dim)' }} />
                      )}
                      <span onPointerDown={e => startConnect(e, n)} title="Relier"
                        style={{ position: 'absolute', right: -7, top: PORT_Y - 6, width: 13, height: 13, borderRadius: '50%', background: KIND_COLOR[n.kind], border: '2px solid var(--bg-card)', cursor: 'crosshair' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Inspecteur */}
            {sel && (
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto', zIndex: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: KIND_COLOR[sel.kind] }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{KIND_LABEL[sel.kind]}</span>
                  <button onClick={() => setSelId(null)} style={{ ...iconBtn, marginLeft: 'auto' }} aria-label="Fermer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <label style={lbl}>Titre</label>
                <input value={sel.title} onChange={e => patchNode(sel.id, { title: e.target.value })} style={fld} />
                <label style={lbl}>{sel.kind === 'trigger' ? 'Objectif' : sel.kind === 'validation' ? 'Consigne de validation' : 'Rôle de l’agent'}</label>
                <textarea value={sel.role ?? ''} onChange={e => patchNode(sel.id, { role: e.target.value })} rows={7}
                  style={{ ...fld, resize: 'vertical', lineHeight: 1.5 }} placeholder={sel.kind === 'trigger' ? 'Que doit accomplir le collectif ?' : 'Décris précisément le job…'} />
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

        {/* ══ PILOTAGE (chat) ══ */}
        {tab === 'chat' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 18px', maxWidth: 760, margin: '0 auto' }}>
            <label style={lbl}>Objectif du collectif</label>
            {trigger ? (
              <textarea value={trigger.role ?? ''} onChange={e => patchNode(trigger.id, { role: e.target.value })} rows={3}
                style={{ ...fld, resize: 'vertical', lineHeight: 1.5, marginBottom: 18 }} placeholder="Que doivent accomplir les agents ensemble ?" />
            ) : <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Ajoute un nœud « Déclencheur » sur le canvas pour définir l’objectif.</p>}

            {runErr && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>⚠️ {runErr}</div>}

            {/* Validation humaine en attente */}
            {approval && (
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>⏸ Validation requise — {approval.node.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 8 }}>{approval.node.role}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', padding: 10, borderRadius: 8, background: 'var(--bg-alt)', marginBottom: 12 }}>{approval.content || '(aucun contenu en entrée)'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approval.resolve(true)} style={{ ...cta, flex: 1, justifyContent: 'center' }}>Valider et continuer</button>
                  <button onClick={() => approval.resolve(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Refuser</button>
                </div>
              </div>
            )}

            <label style={lbl}>Journal du run</label>
            {logs.length === 0 && !running && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Lance un « Run once » pour voir les agents travailler.</p>}
            {running && logs.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Les agents travaillent…</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map((l, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
              <div key={r.node.id} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: KIND_COLOR[r.node.kind] }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{r.node.title}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 16, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {r.text || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }
const cta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 5px', display: 'block' }
const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none', marginBottom: 14 }
