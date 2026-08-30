// QComponents.jsx — Shared UI primitives for THW questionnaire

// ── Tooltip ────────────────────────────────────────────────────────────────
function QTooltip({ text }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 6, flexShrink: 0 }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 17, height: 17, borderRadius: '50%',
          background: 'rgba(0,200,224,0.12)',
          border: '1px solid rgba(0,200,224,0.38)',
          color: '#00c8e0',
          fontFamily: "'DM Mono', monospace",
          fontSize: 9, fontWeight: 700, lineHeight: 1,
          cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          boxShadow: open ? '0 0 8px rgba(0,200,224,0.35)' : 'none',
        }}>?</button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 300,
          background: 'rgba(8,13,22,0.97)',
          border: '1px solid rgba(0,200,224,0.22)',
          borderRadius: 10, padding: '10px 14px',
          width: 250, textAlign: 'left',
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(238,242,247,0.75)',
          lineHeight: 1.6,
          boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
          animation: 'qFadeIn 0.15s ease',
          whiteSpace: 'normal',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', marginLeft: -5, width: 9, height: 9, background: 'rgba(8,13,22,0.97)', border: '1px solid rgba(0,200,224,0.22)', borderTop: 'none', borderLeft: 'none', transform: 'rotate(45deg)' }}/>
          {text}
        </div>
      )}
    </span>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function QField({ label, tooltip, required, hint, children, compact }) {
  return (
    <div style={{ marginBottom: compact ? 0 : 20 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {label}
            {required && <span style={{ color: '#00c8e0', marginLeft: 3 }}>*</span>}
          </label>
          {tooltip && <QTooltip text={tooltip}/>}
        </div>
      )}
      {hint && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', margin: '0 0 8px', lineHeight: 1.55 }}>{hint}</p>
      )}
      {children}
    </div>
  );
}

// ── Text Input ─────────────────────────────────────────────────────────────
function QInput({ value, onChange, placeholder, type = 'text', disabled }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      type={type} value={value || ''} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: focused ? 'rgba(0,200,224,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.10)'}`,
        color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
        boxShadow: focused ? '0 0 0 3px rgba(0,200,224,0.08)' : 'none',
        opacity: disabled ? 0.45 : 1,
      }}
    />
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────
function QTextarea({ value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      value={value || ''} rows={rows}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: focused ? 'rgba(0,200,224,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.10)'}`,
        color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        outline: 'none', transition: 'all 0.18s', resize: 'vertical', lineHeight: 1.55,
        boxSizing: 'border-box',
        boxShadow: focused ? '0 0 0 3px rgba(0,200,224,0.08)' : 'none',
      }}
    />
  );
}

// ── Radio cards ────────────────────────────────────────────────────────────
function QRadioGroup({ options, value, onChange, columns = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: '11px 14px', borderRadius: 10,
            background: active ? 'linear-gradient(135deg,rgba(0,200,224,0.13),rgba(91,111,255,0.09))' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.08)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
            boxShadow: active ? '0 0 18px rgba(0,200,224,0.13)' : 'none',
            position: 'relative', overflow: 'hidden',
          }}>
            {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#00c8e0,#5b6fff)' }}/>}
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${active ? '#00c8e0' : 'rgba(255,255,255,0.22)'}`,
              background: active ? '#00c8e0' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: active ? '0 0 8px rgba(0,200,224,0.5)' : 'none',
              transition: 'all 0.15s',
            }}>
              {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#00c8e0' : 'var(--text)' }}>
                {opt.label}
              </div>
              {opt.desc && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Yes / No toggle ────────────────────────────────────────────────────────
function QYesNo({ value, onChange }) {
  return (
    <QRadioGroup
      value={value} onChange={onChange} columns={2}
      options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
    />
  );
}

// ── Hours slider ───────────────────────────────────────────────────────────
function QHoursSlider({ value, onChange }) {
  const val = parseFloat(value) || 8;
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 52, fontWeight: 800, letterSpacing: '-0.06em', color: '#00c8e0', lineHeight: 1 }}>
          {val % 1 === 0 ? val : val.toFixed(1)}
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: 'var(--text-dim)', marginLeft: 10 }}>h / semaine</span>
      </div>
      <input type="range" min={3} max={20} step={0.5} value={val}
        onChange={e => onChange(parseFloat(e.target.value))}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {[3, 5, 8, 10, 12, 15, 18, 20].map(h => (
          <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: Math.abs(val - h) < 0.3 ? '#00c8e0' : 'var(--text-dim)', transition: 'color 0.2s' }}>{h}h</span>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(0,200,224,0.07)', border: '1px solid rgba(0,200,224,0.18)', textAlign: 'center' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-mid)' }}>
          {val <= 6 ? 'Programme allégé · Qualité primée sur quantité'
           : val <= 10 ? 'Programme standard · Bon équilibre vie/sport'
           : val <= 14 ? 'Programme ambitieux · Périodisation rigoureuse'
           : 'Programme intensif · Récupération prioritaire'}
        </span>
      </div>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────
function QSection({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00c8e0', whiteSpace: 'nowrap' }}>{title}</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,200,224,0.2), transparent)' }}/>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
function QProgressBar({ step, total, titles }) {
  const pct = ((step - 1) / (total - 1)) * 100;
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#00c8e0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Étape {step} / {total}
        </span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {titles[step - 1]}
        </span>
      </div>

      {/* Track + fill */}
      <div style={{ position: 'relative', height: 4, marginBottom: 6 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#00c8e0,#5b6fff)', borderRadius: 2, transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }}/>

        {/* Dots */}
        {Array.from({ length: total }, (_, i) => i + 1).map(n => {
          const left = ((n - 1) / (total - 1)) * 100;
          const done = n < step, active = n === step;
          return (
            <div key={n} style={{
              position: 'absolute', top: '50%', left: `${left}%`,
              transform: 'translate(-50%, -50%)',
              width: active ? 14 : 10, height: active ? 14 : 10,
              borderRadius: '50%',
              background: done ? '#00c8e0' : active ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'rgba(255,255,255,0.12)',
              border: `2px solid ${done || active ? '#00c8e0' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: active ? '0 0 12px rgba(0,200,224,0.7)' : 'none',
              transition: 'all 0.4s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done && (
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Date Input ─────────────────────────────────────────────────────────────
function QDateInput({ value, onChange }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input type="date" value={value || ''}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: focused ? 'rgba(0,200,224,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.10)'}`,
        color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 13,
        outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
        colorScheme: 'dark',
        boxShadow: focused ? '0 0 0 3px rgba(0,200,224,0.08)' : 'none',
      }}
    />
  );
}

// ── Checkbox group (multi-select cards) ────────────────────────────────────
function QCheckboxGroup({ options, value = [], onChange, columns = 2 }) {
  const arr = Array.isArray(value) ? value : [];
  function toggle(v) {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 8 }}>
      {options.map(opt => {
        const checked = arr.includes(opt.value);
        return (
          <button key={opt.value} onClick={() => toggle(opt.value)} style={{
            padding: '11px 14px', borderRadius: 10,
            background: checked ? 'linear-gradient(135deg,rgba(0,200,224,0.13),rgba(91,111,255,0.09))' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${checked ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.08)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
            boxShadow: checked ? '0 0 16px rgba(0,200,224,0.13)' : 'none',
            position: 'relative', overflow: 'hidden',
          }}>
            {checked && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#00c8e0,#5b6fff)' }}/>}
            {/* Checkbox square */}
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: `2px solid ${checked ? '#00c8e0' : 'rgba(255,255,255,0.22)'}`,
              background: checked ? '#00c8e0' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: checked ? '0 0 8px rgba(0,200,224,0.5)' : 'none',
              transition: 'all 0.15s',
            }}>
              {checked && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? '#00c8e0' : 'var(--text)' }}>
                {opt.label}
              </div>
              {opt.desc && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  QTooltip, QField, QInput, QTextarea, QRadioGroup, QYesNo,
  QHoursSlider, QSection, QProgressBar, QDateInput, QCheckboxGroup,
});
