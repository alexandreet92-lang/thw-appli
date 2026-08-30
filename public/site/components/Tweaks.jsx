// Tweaks.jsx — THW Landing page expressive controls
// Loaded after tweaks-panel.jsx

function LandingTweaks() {
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "ambiance": "nuit",
    "densite": 50,
    "intensite": 60
  }/*EDITMODE-END*/;

  const { tweaks, setTweak } = useTweaks(DEFAULTS);

  // ── Apply ambiance (gradient palette) ─────────────────────────────────
  React.useEffect(() => {
    const palettes = {
      nuit:   { a: '#00c8e0', b: '#5b6fff', atmoA: 'rgba(0,200,224,0.08)',   atmoB: 'rgba(91,111,255,0.09)' },
      braise: { a: '#f97316', b: '#ef4444', atmoA: 'rgba(249,115,22,0.10)',  atmoB: 'rgba(239,68,68,0.08)'  },
      forge:  { a: '#a855f7', b: '#5b6fff', atmoA: 'rgba(168,85,247,0.10)',  atmoB: 'rgba(91,111,255,0.12)' },
    };
    const p = palettes[tweaks.ambiance] || palettes.nuit;
    const root = document.documentElement;
    root.style.setProperty('--brand',          p.a);
    root.style.setProperty('--brand-vivid',    p.a);
    root.style.setProperty('--brand-alt',      p.b);
    root.style.setProperty('--brand-purple',   p.b);
    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${p.a}, ${p.b})`);
    root.style.setProperty('--brand-gradient-h',`linear-gradient(90deg,  ${p.a}, ${p.b})`);
    root.style.setProperty('--shadow-brand',   `0 0 24px ${p.a}38`);
    root.style.setProperty('--shadow-brand-sm',`0 0 10px ${p.a}2e`);

    // Recolor atmosphere div
    const atmo = document.querySelector('.atmosphere');
    if (atmo) {
      atmo.style.background = `
        radial-gradient(ellipse 70% 60% at 15% 20%, ${p.atmoA} 0%, transparent 60%),
        radial-gradient(ellipse 60% 60% at 85% 80%, ${p.atmoB} 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 50%  0%, ${p.atmoA} 0%, transparent 70%)
      `;
    }
  }, [tweaks.ambiance]);

  // ── Apply densité ──────────────────────────────────────────────────────
  React.useEffect(() => {
    // 0 = compact (80px sections, tight type), 100 = aéré (160px, big type)
    const d = tweaks.densite / 100; // 0–1
    const sectionPad = Math.round(80 + d * 80);   // 80–160px
    const heroSize   = Math.round(52 + d * 32);    // 52–84px (matches clamp)
    const sectionEls = document.querySelectorAll('section');
    sectionEls.forEach(s => {
      s.style.paddingTop    = `${sectionPad}px`;
      s.style.paddingBottom = `${sectionPad}px`;
    });
    // Hero h1 — override the clamp
    const h1 = document.querySelector('#hero h1');
    if (h1) h1.style.fontSize = `${heroSize}px`;
  }, [tweaks.densite]);

  // ── Apply intensité visuelle ───────────────────────────────────────────
  React.useEffect(() => {
    const t = tweaks.intensite / 100; // 0–1
    const root = document.documentElement;

    // Grid overlay opacity
    const grid = document.querySelector('.grid-overlay');
    if (grid) grid.style.opacity = t < 0.2 ? '0' : String(0.4 + t * 0.6);

    // Glow multiplier on atmosphere
    const atmo = document.querySelector('.atmosphere');
    if (atmo) atmo.style.opacity = String(0.5 + t * 0.8);

    // Card border brightness
    root.style.setProperty('--border',     `rgba(255,255,255,${0.04 + t * 0.12})`);
    root.style.setProperty('--border-mid', `rgba(255,255,255,${0.08 + t * 0.18})`);

    // Float animation speed
    const floaters = document.querySelectorAll('[style*="float"]');
    floaters.forEach(el => {
      const dur = t < 0.3 ? '12s' : t < 0.6 ? '6s' : '3.5s';
      el.style.animationDuration = dur;
    });

    // Body background darkness (intensité basse = un peu plus clair)
    const bgL = t < 0.3 ? '#0e1520' : '#070b0f';
    root.style.setProperty('--bg', bgL);
    document.body.style.background = bgL;
  }, [tweaks.intensite]);

  // ── Panel ──────────────────────────────────────────────────────────────
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Ambiance">
        <TweakRadio
          id="ambiance"
          value={tweaks.ambiance}
          onChange={v => setTweak('ambiance', v)}
          options={[
            { value: 'nuit',   label: 'Nuit'   },
            { value: 'braise', label: 'Braise' },
            { value: 'forge',  label: 'Forge'  },
          ]}
        />
      </TweakSection>

      <TweakSection label="Densité">
        <TweakSlider
          id="densite"
          value={tweaks.densite}
          onChange={v => setTweak('densite', v)}
          min={0} max={100} step={5}
          label={tweaks.densite < 33 ? 'Compact' : tweaks.densite < 66 ? 'Standard' : 'Aéré'}
        />
      </TweakSection>

      <TweakSection label="Intensité visuelle">
        <TweakSlider
          id="intensite"
          value={tweaks.intensite}
          onChange={v => setTweak('intensite', v)}
          min={0} max={100} step={5}
          label={tweaks.intensite < 33 ? 'Sobre' : tweaks.intensite < 66 ? 'Équilibré' : 'Maximal'}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

window.LandingTweaks = LandingTweaks;
