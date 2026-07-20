/* ════════════════════════════════════════════════════════════════
   <ThemeToggle /> — Jour / Nuit / Auto switcher
   ────────────────────────────────────────────────────────────────
   Drives window.THWTheme (defined by the inline boot script in each
   page <head>, so the theme is applied before first paint — no flash).

     • Jour  → forces the light theme   (adds `light` class to <html>)
     • Nuit  → forces the dark theme    (adds `dark`  class to <html>)
     • Auto  → follows the time of day  (day = light, night = dark),
               re-evaluated every minute.

   The active mode is persisted in localStorage. <ThwLogo /> and every
   `var(--…)` token react automatically when the class changes.
   ════════════════════════════════════════════════════════════════ */

function ThwSunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
    </svg>
  );
}

function ThwMoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
    </svg>
  );
}

// Circle split light/dark — reads as "automatic".
function ThwAutoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function ThemeToggle(props) {
  const compact = !!(props && props.compact);
  const getMode = function () {
    return (window.THWTheme && window.THWTheme.getMode()) || 'dark';
  };
  const [mode, setMode] = React.useState(getMode);

  React.useEffect(function () {
    setMode(getMode());
    if (!window.THWTheme) return undefined;
    return window.THWTheme.onChange(function (m) { setMode(m); });
  }, []);

  const choose = function (m) {
    if (window.THWTheme) window.THWTheme.setMode(m);
    else setMode(m);
  };

  const opts = [
    { id: 'light', label: 'Jour', Icon: ThwSunIcon },
    { id: 'dark', label: 'Nuit', Icon: ThwMoonIcon },
    { id: 'auto', label: 'Auto', Icon: ThwAutoIcon },
  ];

  return (
    <div
      role="group"
      aria-label="Thème de l'interface"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-mid)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {opts.map(function (o) {
        const active = mode === o.id;
        const Icon = o.Icon;
        return (
          <button
            key={o.id}
            type="button"
            onClick={function () { choose(o.id); }}
            title={'Mode ' + o.label.toLowerCase()}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: compact ? '7px' : '6px 11px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 999,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
              color: active ? '#fff' : 'var(--text-mid)',
              background: active ? 'var(--brand-gradient)' : 'transparent',
              boxShadow: active ? '0 2px 10px rgba(0,200,224,0.30)' : 'none',
              transition: 'color 0.18s, background 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={function (e) { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={function (e) { if (!active) e.currentTarget.style.color = 'var(--text-mid)'; }}
          >
            <Icon/>
            {!compact && <span className="theme-toggle-label">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

window.ThemeToggle = ThemeToggle;
