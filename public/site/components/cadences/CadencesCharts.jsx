/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — graphiques SVG bruts (aucune lib de chart).
   Au design du site : anneaux colorés par NIVEAU (palette fonctionnelle),
   nombres en Syne / DM Mono. Publie CadScoreDonut, CadQualityRings, CadTestBar.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var e = React.createElement;

  /* G1 — donut du score global (total / max). Au-delà du max : anneau plein. */
  function CadScoreDonut(props) {
    var size = props.size || 200;
    var total = props.total || 0;
    var max = props.totalMax || 1000;
    var color = props.color || '#00c8e0';
    var r = size / 2 - 14;
    var c = 2 * Math.PI * r;
    var frac = Math.max(0, Math.min(1, total / max));
    var over = Math.max(0, Math.round(total - max));
    var cx = size / 2;
    return (
      <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img"
               aria-label={'Score ' + Math.round(total) + ' sur ' + max + ', niveau ' + props.level}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-mid)" strokeWidth={12}/>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
                    strokeDasharray={(c * frac) + ' ' + c} transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
                    style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1)' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.04em', fontSize: size * 0.24, lineHeight: 1, color: 'var(--text)' }}>{Math.round(total)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>/ {max}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 7, color: color }}>{props.level}</div>
            </div>
          </div>
        </div>
        {over > 0 ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: color }}>+{over} au-delà du Max</span> : null}
      </div>
    );
  }

  /* G3 — 7 mini-anneaux, un par qualité (plein = Exceptionnel, pct/1.2). */
  function CadQualityRings(props) {
    var items = props.items || [];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 16 }}>
        {items.map(function (q) { return e(Ring, { key: q.key, q: q }); })}
      </div>
    );
  }
  function Ring(props) {
    var q = props.q;
    var size = 74, r = size / 2 - 6, c = 2 * Math.PI * r, cx = size / 2;
    var frac = Math.max(0, Math.min(1, (q.pct || 0) / 1.2));
    return (
      <div style={{ display: 'grid', placeItems: 'center', gap: 4, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img"
               aria-label={q.label + ' : ' + Math.round((q.pct || 0) * 100) + ' %, ' + q.level}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-mid)" strokeWidth={6}/>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={q.color} strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={(c * frac) + ' ' + c} transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
                    style={{ transition: 'stroke-dasharray .6s cubic-bezier(.22,1,.36,1)' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>{Math.round((q.pct || 0) * 100)}%</span>
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-dim)' }}>{q.level}</span>
      </div>
    );
  }

  /* G5 — barre points/% d'une épreuve, repères 60 % (Réf) et 100 % (Max). */
  function CadTestBar(props) {
    var w = Math.max(0, Math.min(100, (props.pct || 0) * 100));
    return (
      <svg width="100%" height={12} viewBox="0 0 100 12" preserveAspectRatio="none" role="img"
           aria-label={Math.round((props.pct || 0) * 100) + ' %'}>
        <rect x={0} y={3} width={100} height={6} rx={3} fill="var(--border-mid)"/>
        <rect x={0} y={3} width={w} height={6} rx={3} fill={props.color}
              style={{ transition: 'width .6s cubic-bezier(.22,1,.36,1)' }}/>
        <line x1={60} y1={1} x2={60} y2={11} stroke="var(--text-dim)" strokeWidth={0.6}/>
        <line x1={99.4} y1={1} x2={99.4} y2={11} stroke="var(--text-dim)" strokeWidth={0.6}/>
      </svg>
    );
  }

  Object.assign(window, { CadScoreDonut: CadScoreDonut, CadQualityRings: CadQualityRings, CadTestBar: CadTestBar });
})();
