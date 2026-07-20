/* ════════════════════════════════════════════════════════════════
   THW — Maquettes stylisées de l'app, une par thème.
   Chaque maquette est enveloppée d'un [data-replace] pour un
   remplacement futur par de vraies captures d'écran.
   ════════════════════════════════════════════════════════════════ */

function MkFrame(props) {
  return (
    <div className="mk" data-replace={'screenshot-' + props.slug}
         title={'MOCKUP À REMPLACER : capture d\u2019écran ' + props.title}>
      <div className="mk-bar">
        <span className="mk-dot"></span><span className="mk-dot"></span><span className="mk-dot"></span>
        <span className="mk-title">{props.bar}</span>
      </div>
      <div className="mk-body">{props.children}</div>
      <span className="mk-replace-tag">data-replace</span>
    </div>
  );
}

function Gauge(props) {
  return (
    <div>
      <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="mk-label">{props.label}</span>
        <span className="mk-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{props.val}</span>
      </div>
      <div className="mk-gauge"><i style={{ width: props.pct + '%' }}></i></div>
    </div>
  );
}

/* ── individual mockups ─────────────────────────────────────────── */
var MOCKS = {
  chat: function () {
    return (
      <MkFrame slug="coach-ia" title="Coach IA" bar={<React.Fragment>Coach · <span className="acc">Athéna ×3</span></React.Fragment>}>
        <div className="mk-bubble me">Analyse ma sortie longue d'hier 🚴</div>
        <div className="mk-bubble ai">
          Sortie maîtrisée. Ta FC reste alignée sur ta puissance jusqu'à 2h10, puis dérive de 4 %.
          <div className="mk-row" style={{ gap: 6, marginTop: 9 }}>
            <span className="mk-chip">NP 218 W</span><span className="mk-chip">IF 0.78</span><span className="mk-chip">TSS 142</span>
          </div>
        </div>
        <div className="mk-bubble ai" style={{ background: 'transparent', border: 'none', paddingTop: 0 }}>
          <span className="mk-typing"><i></i><i></i><i></i></span>
        </div>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <span className="mk-label">Modèle</span>
          <div className="mk-row" style={{ gap: 6 }}>
            <span className="mk-tile" style={{ padding: '5px 9px' }}>Hermès ×1</span>
            <span className="mk-tile on" style={{ padding: '5px 9px' }}>Athéna ×3</span>
            <span className="mk-tile" style={{ padding: '5px 9px' }}>Zeus ×8</span>
          </div>
        </div>
      </MkFrame>
    );
  },
  skills: function () {
    var d = [['80/20', 1], ['MAF', 0], ['Norvégien', 1], ['Sweet Spot', 0], ['5/3/1', 1], ['Polarisé', 0], ['Lydiard', 0], ['Canova', 1], ['VK Trail', 0]];
    return (
      <MkFrame slug="competences" title="Compétences" bar={<React.Fragment>70 méthodologies · <span className="acc">9 sports</span></React.Fragment>}>
        <div className="mk-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {['Running', 'Cyclisme', 'Hyrox', 'Force'].map(function (s, i) {
            return <span key={i} className={'mk-tile' + (i === 0 ? ' on' : '')} style={{ padding: '5px 10px' }}>{s}</span>;
          })}
        </div>
        <div className="mk-tiles">
          {d.map(function (t, i) { return <div key={i} className={'mk-tile' + (t[1] ? ' on' : '')}>{t[0]}</div>; })}
        </div>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Actives</span>
          <span className="mk-val" style={{ fontSize: 18 }}>15<span style={{ color: 'var(--text-dim)', fontSize: 13 }}> / 15</span></span>
        </div>
      </MkFrame>
    );
  },
  commands: function () {
    var rows = [['Créer un plan d\u2019entraînement', 'Zeus ×8'], ['Analyser ma semaine', 'Athéna ×3'], ['Stratégie de course', 'Athéna ×3'], ['Conseils sommeil', 'Hermès ×1'], ['Recharge glucidique', 'Athéna ×3']];
    return (
      <MkFrame slug="actions-rapides" title="Actions rapides" bar={<React.Fragment>Command palette · <span className="acc">14 raccourcis</span></React.Fragment>}>
        <div className="mk-card mk-row" style={{ gap: 9, padding: '10px 13px' }}>
          <span style={{ color: 'var(--accent)' }}><UIIcon name="spark" size={14}/></span>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Lance une tâche…</span>
        </div>
        {rows.map(function (r, i) {
          return (
            <div key={i} className="mk-card mk-row" style={{ justifyContent: 'space-between', padding: '11px 13px', borderColor: i === 0 ? 'color-mix(in oklab, var(--accent) 40%, transparent)' : null }}>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r[0]}</span>
              <span className="mk-chip">{r[1]}</span>
            </div>
          );
        })}
      </MkFrame>
    );
  },
  performance: function () {
    var pts = '0,70 18,58 36,60 54,42 72,46 90,30 108,34 126,18 144,22 162,10';
    return (
      <MkFrame slug="performances" title="Performance" bar={<React.Fragment>Niveau · <span className="acc">AHN</span></React.Fragment>}>
        <div className="mk-row" style={{ gap: 12 }}>
          <div className="mk-card" style={{ flex: 1, textAlign: 'center' }}>
            <div className="mk-label">FTP</div><div className="mk-val" style={{ fontSize: 26, color: 'var(--accent)' }}>312<span style={{ fontSize: 12, color: 'var(--text-dim)' }}>W</span></div>
          </div>
          <div className="mk-card" style={{ flex: 1, textAlign: 'center' }}>
            <div className="mk-label">VO2max</div><div className="mk-val" style={{ fontSize: 26 }}>58</div>
          </div>
          <div className="mk-card" style={{ flex: 1, textAlign: 'center' }}>
            <div className="mk-label">Niveau</div><div className="mk-val" style={{ fontSize: 18, color: 'var(--accent)' }}>AHN</div>
          </div>
        </div>
        <div className="mk-card">
          <div className="mk-label" style={{ marginBottom: 8 }}>Courbe de puissance (MMP)</div>
          <svg viewBox="0 0 162 80" width="100%" height="74" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="126" cy="18" r="3.4" fill="var(--accent)"/>
          </svg>
        </div>
      </MkFrame>
    );
  },
  planning: function () {
    var days = [['Lun', 'Force', '#22c55e'], ['Mar', 'Seuil', '#00c8e0'], ['Mer', 'Repos', null], ['Jeu', 'VMA', '#f97316'], ['Ven', 'Facile', '#22c55e'], ['Sam', 'Repos', null], ['Dim', 'Sortie longue', '#5b6fff']];
    return (
      <MkFrame slug="planification" title="Planning" bar={<React.Fragment>Semaine 7 · <span className="acc">Bloc seuil</span></React.Fragment>}>
        {days.map(function (d, i) {
          return (
            <div key={i} className="mk-row" style={{ gap: 10 }}>
              <span className="mk-mono" style={{ width: 30, fontSize: 11, color: 'var(--text-dim)' }}>{d[0]}</span>
              {d[2] ? (
                <div className="mk-card" style={{ flex: 1, padding: '9px 12px', borderLeft: '3px solid ' + d[2], display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{d[1]}</span>
                  <span className="mk-mono" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Z3–Z4</span>
                </div>
              ) : <div style={{ flex: 1, height: 32, borderRadius: 10, border: '1px dashed var(--border)' }}></div>}
            </div>
          );
        })}
      </MkFrame>
    );
  },
  calendar: function () {
    var months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    var races = { 2: '#8B5CF6', 5: '#00c8e0', 9: '#f97316' };
    var cx = 90, cy = 90, R = 66;
    return (
      <MkFrame slug="calendrier" title="Calendrier" bar={<React.Fragment>Vue annuelle · <span className="acc">3 objectifs</span></React.Fragment>}>
        <svg className="mk-wheel" viewBox="0 0 180 180" width="180" height="180">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border-mid)" strokeWidth="1.5"/>
          <circle cx={cx} cy={cy} r={R - 16} fill="none" stroke="var(--border)" strokeWidth="1"/>
          {months.map(function (m, i) {
            var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            var lx = cx + Math.cos(a) * (R + 11), ly = cy + Math.sin(a) * (R + 11);
            var dotx = cx + Math.cos(a) * R, doty = cy + Math.sin(a) * R;
            return (
              <g key={i}>
                <text x={lx} y={ly + 2} textAnchor="middle" className="mk-wheel-month">{m}</text>
                <circle cx={dotx} cy={doty} r={races[i] ? 5 : 2.4} fill={races[i] || 'var(--text-dim)'}/>
              </g>
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>2026</text>
          <text x={cx} y={cy + 12} textAnchor="middle" style={{ fill: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 8 }}>SAISON</text>
        </svg>
        <div className="mk-row" style={{ gap: 6, justifyContent: 'center' }}>
          <span className="mk-tile on" style={{ padding: '4px 9px' }}>Course</span>
          <span className="mk-tile" style={{ padding: '4px 9px' }}>Pro</span>
          <span className="mk-tile" style={{ padding: '4px 9px' }}>Perso</span>
        </div>
      </MkFrame>
    );
  },
  recovery: function () {
    var bars = [60, 75, 45, 80, 70, 30, 55];
    return (
      <MkFrame slug="recuperation" title="Récupération" bar={<React.Fragment>Forme du jour · <span className="acc">Feu vert</span></React.Fragment>}>
        <div className="mk-row" style={{ gap: 12, alignItems: 'center' }}>
          <div className="mk-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg-hover)" strokeWidth="9"/>
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
                      strokeDasharray="251" strokeDashoffset="55" transform="rotate(-90 48 48)"/>
            </svg>
            <div className="mk-ring-c"><span className="mk-val" style={{ fontSize: 26 }}>78</span><span className="mk-label">Forme</span></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Gauge label="HRV" val="62 ms" pct={72}/>
            <Gauge label="Sommeil" val="7h40" pct={84}/>
            <Gauge label="Fatigue" val="Basse" pct={28}/>
          </div>
        </div>
        <div className="mk-card">
          <div className="mk-label" style={{ marginBottom: 8 }}>Hypnogramme</div>
          <div className="mk-bars" style={{ height: 48 }}>
            {bars.map(function (h, i) { return <span key={i} style={{ height: h + '%', opacity: 0.55 + (h / 200) }}></span>; })}
          </div>
        </div>
      </MkFrame>
    );
  },
  nutrition: function () {
    return (
      <MkFrame slug="nutrition" title="Nutrition" bar={<React.Fragment>Aujourd'hui · <span className="acc">Journée dure</span></React.Fragment>}>
        <div className="mk-row" style={{ gap: 12, alignItems: 'center' }}>
          <div className="mk-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg-hover)" strokeWidth="10"/>
              <circle cx="48" cy="48" r="40" fill="none" stroke="#22c55e" strokeWidth="10" strokeDasharray="251" strokeDashoffset="60" transform="rotate(-90 48 48)"/>
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="170" transform="rotate(-90 48 48)"/>
            </svg>
            <div className="mk-ring-c"><span className="mk-val" style={{ fontSize: 22 }}>2 840</span><span className="mk-label">kcal</span></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Gauge label="Glucides" val="380 g" pct={88}/>
            <Gauge label="Protéines" val="155 g" pct={70}/>
            <Gauge label="Lipides" val="72 g" pct={52}/>
          </div>
        </div>
        <div className="mk-card mk-row" style={{ gap: 9, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>📷 Scanner un aliment</span>
          <span className="mk-chip">+ ajouter</span>
        </div>
      </MkFrame>
    );
  },
  connections: function () {
    var apps = [['Strava', 1], ['Polar', 1], ['Wahoo', 1], ['Withings', 1], ['Garmin', 0], ['Whoop', 0]];
    return (
      <MkFrame slug="connexions" title="Connexions" bar={<React.Fragment>4 actives · <span className="acc">sync auto</span></React.Fragment>}>
        {apps.map(function (a, i) {
          return (
            <div key={i} className="mk-card mk-row" style={{ justifyContent: 'space-between', padding: '11px 14px' }}>
              <div className="mk-row" style={{ gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: a[1] ? 'rgba(var(--accent-rgb),0.16)' : 'var(--bg-hover)', display: 'inline-block' }}></span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a[0]}</span>
              </div>
              {a[1]
                ? <span className="mk-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><UIIcon name="check" size={11}/> Connecté</span>
                : <span className="mk-tile" style={{ padding: '4px 10px' }}>Bientôt</span>}
            </div>
          );
        })}
      </MkFrame>
    );
  },
  profile: function () {
    return (
      <MkFrame slug="profil" title="Mon profil" bar={<React.Fragment>Athlète hybride · <span className="acc">Cyclisme + Hyrox</span></React.Fragment>}>
        <div className="mk-card mk-row" style={{ gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--brand-gradient)', display: 'inline-block' }}></span>
          <div><div className="mk-val" style={{ fontSize: 16 }}>Alex M.</div><div style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>72 kg · 34 ans · 1,79 m</div></div>
        </div>
        <div className="mk-row" style={{ gap: 8 }}>
          {['Cyclisme', 'Hyrox', 'Course'].map(function (s, i) { return <span key={i} className={'mk-tile' + (i < 2 ? ' on' : '')} style={{ flex: 1 }}>{s}</span>; })}
        </div>
        <div className="mk-card">
          <div className="mk-label" style={{ marginBottom: 8 }}>Mon matériel</div>
          {[['Canyon Ultimate', '8 240 km'], ['Nike Vaporfly', '612 / 800 km']].map(function (m, i) {
            return (
              <div key={i} style={{ marginBottom: i === 0 ? 9 : 0 }}>
                <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12 }}>{m[0]}</span><span className="mk-mono" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{m[1]}</span>
                </div>
                <div className="mk-gauge"><i style={{ width: i === 0 ? '64%' : '76%' }}></i></div>
              </div>
            );
          })}
        </div>
      </MkFrame>
    );
  },
  tokens: function () {
    return (
      <MkFrame slug="tokens" title="Tokens" bar={<React.Fragment>Consommation · <span className="acc">temps réel</span></React.Fragment>}>
        <div className="mk-card">
          <Gauge label="Quota hebdomadaire" val="438k / 750k" pct={58}/>
          <div style={{ height: 12 }}></div>
          <Gauge label="Garde-fou 6h" val="lissé" pct={34}/>
        </div>
        <div className="mk-row" style={{ gap: 8 }}>
          {[['Hermès', '×1', '#F59E0B'], ['Athéna', '×3', '#00c8e0'], ['Zeus', '×8', '#a855f7']].map(function (m, i) {
            return (
              <div key={i} className="mk-card" style={{ flex: 1, textAlign: 'center', padding: '11px 6px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{m[0]}</div>
                <div className="mk-val" style={{ fontSize: 20, color: m[2] }}>{m[1]}</div>
              </div>
            );
          })}
        </div>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Pack Performance</span>
          <span className="mk-chip">500k · 15 €</span>
        </div>
      </MkFrame>
    );
  },
  pricing: function () {
    var plans = [['Premium', '14 €', 0], ['Pro', '26 €', 1], ['Expert', '49 €', 0]];
    return (
      <MkFrame slug="abonnements" title="Plans" bar={<React.Fragment>3 formules · <span className="acc">essai 14 j</span></React.Fragment>}>
        {plans.map(function (p, i) {
          return (
            <div key={i} className="mk-card mk-row" style={{ justifyContent: 'space-between', padding: '14px',
              borderColor: p[2] ? 'var(--accent)' : null, background: p[2] ? 'rgba(var(--accent-rgb),0.08)' : null }}>
              <div>
                <div className="mk-val" style={{ fontSize: 15 }}>{p[0]} {p[2] ? <span className="mk-chip" style={{ marginLeft: 4 }}>Populaire</span> : null}</div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>Coach {i === 0 ? 'Hermès' : i === 1 ? 'Athéna' : 'Zeus'} par défaut</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="mk-val" style={{ fontSize: 22, color: p[2] ? 'var(--accent)' : 'var(--text)' }}>{p[1]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>/mois</span>
              </div>
            </div>
          );
        })}
      </MkFrame>
    );
  },
  customize: function () {
    return (
      <MkFrame slug="personnalisation" title="Personnalisation" bar={<React.Fragment>Réglages · <span className="acc">à ta main</span></React.Fragment>}>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5 }}>Thème</span>
          <div className="mk-row" style={{ gap: 6 }}>
            <span className="mk-tile" style={{ padding: '5px 10px' }}>Jour</span>
            <span className="mk-tile on" style={{ padding: '5px 10px' }}>Nuit</span>
            <span className="mk-tile" style={{ padding: '5px 10px' }}>Auto</span>
          </div>
        </div>
        <div className="mk-card">
          <div className="mk-label" style={{ marginBottom: 8 }}>Police du chat</div>
          <div className="mk-row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {['DM Sans', 'Inter', 'Système', 'Serif', 'Mono'].map(function (f, i) { return <span key={i} className={'mk-tile' + (i === 0 ? ' on' : '')} style={{ padding: '5px 10px' }}>{f}</span>; })}
          </div>
        </div>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5 }}>Mode économie</span>
          <span style={{ width: 38, height: 21, borderRadius: 999, background: 'var(--accent)', position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', width: 15, height: 15, borderRadius: '50%', background: '#fff', top: 3, right: 3 }}></span>
          </span>
        </div>
      </MkFrame>
    );
  },
  record: function () {
    var sports = ['Vélo', 'Course', 'Trail', 'Natation', 'Muscu', 'Hyrox'];
    return (
      <MkFrame slug="enregistrement" title="Enregistrement" bar={<React.Fragment>Multi-sports · <span className="acc">GPS</span></React.Fragment>}>
        <div className="mk-tiles">
          {sports.map(function (s, i) { return <div key={i} className={'mk-tile' + (i === 0 ? ' on' : '')}>{s}</div>; })}
        </div>
        <div className="mk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none" style={{ display: 'block', background: 'var(--bg-hover)' }}>
            <path d="M10,70 C60,20 110,80 150,45 C190,15 230,60 290,25" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="290" cy="25" r="5" fill="var(--accent)"/>
          </svg>
        </div>
        <div className="mk-card mk-row" style={{ justifyContent: 'space-between' }}>
          <div><div className="mk-label">Briefing du jour</div><div style={{ fontSize: 12.5, marginTop: 3 }}>Seuil 5×5 min · finaliser recharge</div></div>
          <span style={{ color: 'var(--accent)' }}><UIIcon name="play" size={18}/></span>
        </div>
      </MkFrame>
    );
  },
  security: function () {
    return (
      <MkFrame slug="securite" title="Sécurité" bar={<React.Fragment>Compte · <span className="acc">protégé</span></React.Fragment>}>
        <div className="mk-card" style={{ textAlign: 'center', padding: '22px 14px' }}>
          <div style={{ width: 52, height: 52, margin: '0 auto 12px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.14)' }}>
            <ThemeIcon name="shield" size={26}/>
          </div>
          <div className="mk-val" style={{ fontSize: 15 }}>Tes données, à toi seul</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 4 }}>Isolées · chiffrées · privées</div>
        </div>
        <div className="mk-card mk-row" style={{ gap: 8, justifyContent: 'center', padding: '10px' }}>
          <span className="mk-tile" style={{ flex: 1 }}>Email</span>
          <span className="mk-tile on" style={{ flex: 1 }}>Google</span>
          <span className="mk-tile" style={{ flex: 1 }}>Apple</span>
        </div>
      </MkFrame>
    );
  },
  soon: function () {
    return (
      <MkFrame slug="notifications" title="Notifications" bar={<React.Fragment>En développement</React.Fragment>}>
        {[0, 1, 2].map(function (i) {
          return (
            <div key={i} className="mk-card mk-row" style={{ gap: 11, opacity: 0.55 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-hover)', display: 'inline-block' }}></span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="mk-line" style={{ width: '55%' }}></span>
                <span className="mk-line" style={{ width: '80%', height: 6 }}></span>
              </div>
            </div>
          );
        })}
      </MkFrame>
    );
  },
};

function Mockup(props) {
  var fn = MOCKS[props.type] || MOCKS.chat;
  return fn();
}
window.Mockup = Mockup;
