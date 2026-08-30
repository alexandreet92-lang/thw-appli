// Top navigation
function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-mid)',
    padding: '8px 4px',
    transition: 'color 0.18s',
    cursor: 'pointer',
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      padding: '16px 32px',
      backdropFilter: scrolled ? 'blur(14px)' : 'blur(0)',
      WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'blur(0)',
      background: scrolled ? 'var(--nav-bg)' : 'transparent',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      transition: 'all 0.24s ease',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Logo */}
        <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThwLogo size={32} radius={8}/>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
            letterSpacing: '-0.01em', color: 'var(--text)',
          }}>THW Coaching</span>
        </a>

        {/* Links */}
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="nav-links">
          <a href="#philosophy" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>Philosophie</a>
          <a href="#offers" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>Coaching</a>
          <a href="#testimonials" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>Athlètes</a>
          <a href="app.html" style={{...linkStyle, display: 'inline-flex', alignItems: 'center', gap: 6}}
             onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
             onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 22v-4h6v4M12 6h.01"/></svg>
            App THW
          </a>
          <a href="#faq" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>FAQ</a>
        </nav>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeToggle/>
          <a href="#login" style={{ ...linkStyle, padding: '8px 12px' }} className="nav-login"
             onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
             onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}>
            Se connecter
          </a>
          <a href="#offers" className="thw-btn-primary" style={{
            background: 'var(--brand-gradient)', color: '#fff',
            padding: '9px 16px', fontSize: 13, fontWeight: 500,
            borderRadius: 10,
            boxShadow: '0 2px 12px rgba(0,200,224,0.28)',
          }}>
            Démarrer →
          </a>
        </div>
      </div>
    </header>
  );
}

window.Nav = Nav;
