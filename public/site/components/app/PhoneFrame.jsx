// Reusable phone shell mock for THW App
function PhoneFrame({ children, style, label }) {
  return (
    <div className="phone-bezel" style={style}>
      <div className="phone-notch"></div>
      <div className="phone-screen">
        {/* Status bar */}
        <div style={{
          height: 36, padding: '8px 22px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
          color: 'var(--text)', position: 'relative', zIndex: 5,
        }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="2" height="4"/><rect x="3" y="4" width="2" height="6"/><rect x="6" y="2" width="2" height="8"/><rect x="9" y="0" width="2" height="10"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M7 7.5l3-3a4 4 0 0 0-6 0z"/><path d="M7 7.5L4.5 5a6 6 0 0 1 5 0z"/><circle cx="7" cy="7.5" r="0.7" fill="currentColor"/></svg>
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" strokeWidth="0.8"><rect x="0.5" y="0.5" width="16" height="9" rx="2"/><rect x="2" y="2" width="11" height="6" fill="currentColor"/><rect x="17" y="3" width="2" height="4" fill="currentColor"/></svg>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

window.PhoneFrame = PhoneFrame;
