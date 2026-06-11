'use client'
// Frise de périodisation (lecture seule). 12 semaines : bande mois + numéros de semaine +
// trait « aujourd'hui ». Une pilule par sport, positionnée d'après weekCurrent/weekTotal
// du bloc (donnée réelle, relative à aujourd'hui). Pas de mock. SVG/CSS brut, tokens +
// var(--primary) pour le cyan. (Courses + édition = lot Gantt dédié.)
const FB = 'var(--font-body)'
const COLS = 12
const TODAY_COL = 4
const LABEL_W = 64

export interface FriseBloc { sport: string; weekCurrent: number; weekTotal: number; focus: string[]; color: string; label: string }

function mondayOf(d: Date): Date { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x }
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - dn + 3); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((t.getTime() - y0.getTime()) / 86400000 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7)
}
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export function FriseV1({ blocs }: { blocs: FriseBloc[] }) {
  const base = mondayOf(new Date())
  const weeks = Array.from({ length: COLS }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + (i - TODAY_COL) * 7); return d })
  const colW = `calc((100% - ${LABEL_W}px) / ${COLS})`
  // Bornes mois : 1re colonne de chaque mois
  const monthSpans: { month: number; start: number; span: number }[] = []
  weeks.forEach((d, i) => { const last = monthSpans[monthSpans.length - 1]; if (last && weeks[last.start].getMonth() === d.getMonth()) last.span++; else monthSpans.push({ month: d.getMonth(), start: i, span: 1 }) })

  const cell: React.CSSProperties = { width: colW, flexShrink: 0, textAlign: 'center', fontFamily: FB }

  return (
    <div style={{ minWidth: 680, position: 'relative' }}>
      {/* Mois */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        <span style={{ width: LABEL_W, flexShrink: 0 }} />
        {monthSpans.map(m => (
          <span key={m.start} style={{ width: `calc(${colW} * ${m.span})`, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: FB, textAlign: 'left', paddingLeft: 2 }}>{MONTHS[m.month]}</span>
        ))}
      </div>
      {/* Semaines */}
      <div style={{ display: 'flex', marginBottom: 8 }}>
        <span style={{ width: LABEL_W, flexShrink: 0 }} />
        {weeks.map((d, i) => (
          <span key={i} style={{ ...cell, fontSize: 10 }}>
            <span className="tnum" style={{ display: 'inline-block', padding: '1px 4px', borderRadius: 5, fontWeight: i === TODAY_COL ? 700 : 400, background: i === TODAY_COL ? 'var(--primary)' : 'transparent', color: i === TODAY_COL ? 'var(--on-primary)' : 'var(--text-dim)' }}>{isoWeek(d)}</span>
          </span>
        ))}
      </div>

      {/* Pistes sport */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocs.map(b => {
          const startCol = Math.max(0, TODAY_COL - (b.weekCurrent - 1))
          const endCol = Math.min(COLS, startCol + b.weekTotal)
          const span = Math.max(1, endCol - startCol)
          return (
            <div key={b.sport} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ width: LABEL_W, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>{b.label}</span>
              <div style={{ flex: 1, position: 'relative', height: 34, background: 'var(--bg-card2)', borderRadius: 7 }}>
                <div style={{ position: 'absolute', top: 5, bottom: 5, left: `${(startCol / COLS) * 100}%`, width: `${(span / COLS) * 100}%`, borderRadius: 14, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', overflow: 'hidden' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FB }}>{b.focus[0] ?? b.label}</span>
                  <span className="tnum" style={{ fontSize: 8.5, color: 'var(--on-primary)', opacity: 0.7, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0, fontFamily: FB }}>S{b.weekCurrent}/{b.weekTotal}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aujourd'hui */}
      <div style={{ position: 'absolute', top: 18, bottom: 0, left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(TODAY_COL + 0.5) / COLS})`, width: 2, background: 'var(--primary)', borderRadius: 2, pointerEvents: 'none' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 0 3px var(--primary-dim)', marginLeft: -4, marginTop: -5 }} />
      </div>
    </div>
  )
}
