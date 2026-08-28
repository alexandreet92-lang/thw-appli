'use client'
// ══════════════════════════════════════════════════════════════
// StudioMarkdown — rendu markdown LÉGER pour les rendus du Studio.
// Titres, gras/italique/code, listes, tableaux, liens (les liens
// internes /… naviguent dans l'app → interconnexion des pages).
// Volontairement compact : pas de lib externe, pas de HTML brut.
// ══════════════════════════════════════════════════════════════

import React from 'react'
import { parseAdvancedSpec, AdvancedChartCard } from '@/components/ai/AdvancedChart'

const FB = 'var(--font-body)'

// ── Inline : **gras**, *italique*, `code`, [texte](url) ────────
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tk = m[0]
    const k = `${keyBase}-${i++}`
    if (tk.startsWith('**')) out.push(<strong key={k}>{tk.slice(2, -2)}</strong>)
    else if (tk.startsWith('`')) out.push(<code key={k} style={{ background: 'var(--bg-alt)', borderRadius: 4, padding: '1px 5px', fontSize: '0.92em' }}>{tk.slice(1, -1)}</code>)
    else if (tk.startsWith('[')) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tk)
      if (mm) {
        const internal = mm[2].startsWith('/')
        out.push(
          <a key={k} href={mm[2]} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noreferrer'}
            style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)' }}>
            {mm[1]}
          </a>,
        )
      } else out.push(tk)
    } else out.push(<em key={k}>{tk.slice(1, -1)}</em>)
    last = m.index + tk.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const H_STYLE: Record<number, React.CSSProperties> = {
  1: { fontSize: 16, fontWeight: 800, margin: '14px 0 6px' },
  2: { fontSize: 14.5, fontWeight: 700, margin: '12px 0 5px' },
  3: { fontSize: 13.5, fontWeight: 700, margin: '10px 0 4px' },
  4: { fontSize: 12.5, fontWeight: 600, margin: '8px 0 3px', color: 'var(--text-mid)' },
}

export default function StudioMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Bloc de code cloturé ```lang … ``` — en particulier ```thw-chart {json}```
    // que l'on transforme en graphe du kit (donut/gauge/radar/pmc/courbe/zones),
    // exactement comme dans le chat coach. Sinon : bloc de code monospace.
    const fence = /^\s*```(\w[\w-]*)?\s*$/.exec(line)
    if (fence) {
      const lang = (fence[1] ?? '').toLowerCase()
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { code.push(lines[i]); i++ }
      i++ // saute la clôture ```
      const raw = code.join('\n')
      if (lang === 'thw-chart' || lang === 'chart') {
        const adv = parseAdvancedSpec(raw)
        if (adv) { blocks.push(<AdvancedChartCard key={key++} spec={adv} />); continue }
      }
      blocks.push(
        <pre key={key++} style={{ overflowX: 'auto', margin: '8px 0', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-mid)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{raw}</pre>,
      )
      continue
    }

    // Tableau : lignes | … | consécutives
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (!cells.every(c => /^:?-{2,}:?$/.test(c))) rows.push(cells)   // saute la ligne de séparation
        i++
      }
      if (rows.length) {
        blocks.push(
          <div key={key++} style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12.5, fontFamily: FB, minWidth: 280 }}>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => ri === 0
                      ? <th key={ci} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1.5px solid var(--border-mid)', color: 'var(--text)', fontWeight: 700, whiteSpace: 'nowrap' }}>{renderInline(c, `t${key}-${ri}-${ci}`)}</th>
                      : <td key={ci} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-mid)' }}>{renderInline(c, `t${key}-${ri}-${ci}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    // Titres
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const lvl = h[1].length
      blocks.push(<div key={key++} style={{ ...H_STYLE[lvl], color: H_STYLE[lvl].color ?? 'var(--text)', fontFamily: FB }}>{renderInline(h[2], `h${key}`)}</div>)
      i++
      continue
    }

    // Listes (à puces ou numérotées) : lignes consécutives
    if (/^\s*([-•*]|\d+[.)])\s+/.test(line)) {
      const items: { txt: string; num: boolean }[] = []
      while (i < lines.length && /^\s*([-•*]|\d+[.)])\s+/.test(lines[i])) {
        const mm = /^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/.exec(lines[i])!
        items.push({ txt: mm[2], num: Boolean(mm[1]) })
        i++
      }
      blocks.push(
        <ul key={key++} style={{ margin: '4px 0 8px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, fontFamily: FB, listStyleType: it.num ? 'decimal' : 'disc' }}>
              {renderInline(it.txt, `l${key}-${ii}`)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Paragraphe (lignes vides = séparation)
    if (line.trim() === '') { i++; continue }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4})\s/.test(lines[i]) && !/^\s*([-•*]|\d+[.)])\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i])) {
      para.push(lines[i]); i++
    }
    blocks.push(
      <p key={key++} style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 8px', fontFamily: FB, whiteSpace: 'pre-wrap' }}>
        {renderInline(para.join('\n'), `p${key}`)}
      </p>,
    )
  }

  return <div>{blocks}</div>
}
