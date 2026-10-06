/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — Manifeste d'ouverture « Pourquoi ce test ».
   Intro déroulante AU-DESSUS des onglets : le constat du vieillissement,
   graphiques animés (systèmes par âge, sédentaire vs entraîné), l'histoire
   des deux garçons A/B (frise + récit dépliable), puis « pourquoi mesurer ».
   Courbes illustratives (moyennes de population) — sources en bas.
   Publie window.CadManifesto. Design du site (Syne/DM Sans, cyan).
   ════════════════════════════════════════════════════════════════ */
(function () {
  // Palette fonctionnelle des systèmes (sanctionnée, comme les couleurs sport) —
  // alignée sur les repères visuels : os vert, muscle or, VO2max rouge,
  // testostérone/œstrogènes bleu, vitesse cérébrale violet.
  var COL = { os: '#16a34a', muscle: '#d9a400', vo2: '#dc2626', hormone: '#2563eb', brain: '#7c3aed' };

  // Systèmes en % du pic de vie, par âge [age, %]. Ancré sur les repères connus
  // (pic ~29 ; déclin ~59) et les taux de déclin de la littérature.
  var SYS_M = [
    { key: 'os', label: 'Os', color: COL.os, points: [[0, 18], [10, 55], [20, 92], [30, 100], [40, 98], [50, 93], [59, 87], [70, 80], [80, 72]] },
    { key: 'muscle', label: 'Muscle', color: COL.muscle, points: [[0, 12], [10, 45], [20, 88], [30, 100], [40, 96], [50, 88], [59, 78], [70, 66], [80, 55]] },
    { key: 'vo2', label: 'VO₂max', color: COL.vo2, points: [[0, 32], [10, 60], [18, 96], [23, 100], [29, 92], [40, 82], [50, 69], [59, 57], [70, 45], [80, 36]] },
    { key: 'hormone', label: 'Testostérone', color: COL.hormone, points: [[0, 20], [10, 35], [18, 92], [25, 100], [29, 98], [40, 88], [50, 78], [59, 69], [70, 60], [80, 51]] },
    { key: 'brain', label: 'Vitesse cérébrale', color: COL.brain, points: [[0, 20], [10, 70], [20, 98], [25, 100], [29, 96], [40, 88], [50, 77], [59, 66], [70, 55], [80, 44]] },
  ];
  var SYS_F = [
    { key: 'os', label: 'Os', color: COL.os, points: [[0, 18], [10, 55], [20, 92], [30, 100], [40, 97], [48, 92], [52, 84], [59, 74], [70, 62], [80, 52]] },
    { key: 'muscle', label: 'Muscle', color: COL.muscle, points: [[0, 12], [10, 44], [20, 86], [30, 100], [40, 95], [50, 86], [59, 75], [70, 62], [80, 50]] },
    { key: 'vo2', label: 'VO₂max', color: COL.vo2, points: [[0, 30], [10, 58], [18, 96], [24, 100], [29, 93], [40, 83], [50, 70], [59, 58], [70, 46], [80, 37]] },
    { key: 'hormone', label: 'Œstrogènes', color: COL.hormone, points: [[0, 18], [10, 40], [18, 95], [25, 100], [35, 97], [45, 90], [50, 78], [52, 60], [55, 45], [60, 38], [70, 32], [80, 28]] },
    { key: 'brain', label: 'Vitesse cérébrale', color: COL.brain, points: [[0, 20], [10, 70], [20, 98], [25, 100], [29, 96], [40, 88], [50, 77], [59, 66], [70, 55], [80, 45]] },
  ];

  // Sédentaire vs entraîné — VO2max en % du pic (25→80 ans). ~−11 %/décennie
  // sédentaire, ~−5,5 %/décennie entraîné (≈ moitié).
  var COMPARE = [
    { key: 'entr', label: 'Entraîné', endLabel: 'Entraîné', color: '#00c8e0', points: [[25, 100], [35, 95], [45, 89], [55, 83], [65, 77], [75, 71], [80, 68]] },
    { key: 'sed', label: 'Sédentaire', endLabel: 'Sédentaire', color: '#94a3b8', dash: '5 4', points: [[25, 100], [35, 89], [45, 78], [55, 66], [65, 54], [75, 43], [80, 38]] },
  ];

  // Trajectoire de capacité physique globale A vs B (5→80 ans).
  var LIFE = [
    { key: 'A', label: 'Garçon A', endLabel: 'A', color: '#00c8e0', points: [[5, 25], [10, 45], [15, 62], [20, 82], [30, 92], [40, 90], [50, 86], [55, 83], [65, 76], [75, 67], [80, 63]] },
    { key: 'B', label: 'Garçon B', endLabel: 'B', color: '#f43f5e', points: [[5, 25], [10, 40], [15, 55], [20, 66], [25, 64], [30, 58], [40, 48], [50, 38], [60, 28], [70, 20], [80, 14]] },
  ];
  var LIFE_MARKERS = [
    { x: 20, y: 82, color: '#00c8e0', label: 'routine' },
    { x: 40, y: 48, color: '#f43f5e', label: 'dos & genoux', below: true },
    { x: 50, y: 38, color: '#f43f5e', label: 'essoufflé', below: true },
    { x: 60, y: 28, color: '#f43f5e', label: 'médicaments', below: true },
    { x: 80, y: 14, color: '#f43f5e', label: 'fragile', below: true },
  ];

  // Frise condensée des deux parcours.
  var TL_A = [
    { age: '5', l: 'Multi-loisirs : foot, tennis' },
    { age: '10', l: 'Exos en chambre + cardio' },
    { age: '15', l: 'Salle de sport' },
    { age: '20→80', l: 'Routine : 2 run · 2 muscu · 1 autre · mobilité · test chaque année' },
    { age: '80', l: 'Marche comme à 60 — pompes, squats, tractions le matin' },
  ];
  var TL_B = [
    { age: '10', l: 'Tennis 1-2×/sem' },
    { age: '15', l: 'Salle avec A, mais zappe' },
    { age: '20', l: 'Sport selon l’envie' },
    { age: '40', l: 'Dos & genoux' },
    { age: '50', l: 'Essoufflé dans les escaliers' },
    { age: '60', l: 'Premiers médicaments' },
    { age: '80', l: 'Se relève à peine · ~5 médicaments/matin' },
  ];

  function Legend(items) {
    return (
      <div className="cad-legend">
        {items.map(function (s) {
          return <span key={s.key}><i style={{ background: s.color }}></i>{s.label}</span>;
        })}
      </div>
    );
  }

  function Timeline(props) {
    function row(who, color, nodes, sub) {
      return (
        <div>
          <div className="cad-tl-h"><span className="cad-tl-dot" style={{ background: color }}></span>Garçon {who} — <span style={{ color: 'var(--text-mid)', fontWeight: 500 }}>{sub}</span></div>
          <div className="cad-tl-row">
            {nodes.map(function (n, i) {
              return (
                <div className="cad-tl-node" key={i}>
                  <i style={{ background: color }}></i>
                  <span className="cad-tl-age">{n.age} ans</span>
                  <span className="cad-tl-lab">{n.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="cad-tl">
        {row('A', '#00c8e0', TL_A, 'la régularité, toute la vie')}
        {row('B', '#f43f5e', TL_B, 'quand l’envie et le temps le permettent')}
      </div>
    );
  }

  function Recit() {
    return (
      <div className="cad-reveal-body">
        <p className="cad-p"><strong>Garçon A.</strong> À 5 ans, ses parents l’inscrivent à plusieurs loisirs — foot, tennis — et lui transmettent l’idée qu’une pratique physique régulière compte. À 10 ans, il ajoute des exercices basiques dans sa chambre, en gardant une activité cardio à côté. À 15 ans, la salle de sport. De 20 à 80 ans, il installe une routine qu’il répète chaque jour, semaine, mois et année : <strong>2 séances de course</strong> pour le souffle (VO₂max) et la vitesse, <strong>2 séances de muscu</strong> pour la force, la puissance et un corps gainé et équilibré, et <strong>1 activité libre</strong> (foot, natation, tennis, vélo). Il s’étire et travaille sa mobilité 10-15 min, 3 à 4 fois par semaine. Et surtout, <strong>il teste ses qualités physiques chaque année, avec le même protocole, de 20 à 80 ans</strong> : pour voir où il progresse, mais aussi quand et dans quel domaine il décline — et comment ralentir au mieux cette baisse. Sa routine évolue avec le temps (disponibilités, pépins), mais il garde toujours du cardio et du muscle. À 80 ans, il marche comme quelqu’un de 60 ; chaque matin, étirements, quelques pompes, squats, abdos, parfois des tractions.</p>
        <p className="cad-p"><strong>Garçon B.</strong> Même âge, même ossature, même taille et poids, des qualités de départ proches. Ses parents l’inscrivent au tennis à 10 ans, une à deux fois par semaine. À 15 ans, il va à la salle avec son ami A, mais zappe vite des séances et n’y va que lorsqu’il en a envie — sans la même discipline ni la même envie de se dépasser. À partir de 20 ans, il bouge quand l’envie et le temps sont là. À 40 ans apparaissent les problèmes de dos et de genoux. À 50 ans, il est essoufflé après quelques étages. À 60 ans, il commence à prendre des médicaments pour ses soucis de santé. À 80 ans, il se relève seul avec peine, marche difficilement, et avale près de cinq médicaments chaque matin.</p>
        <p className="cad-p" style={{ margin: 0 }}>Même départ. Deux trajectoires. La différence ne s’est pas jouée sur un exploit — mais sur <strong>la régularité, répétée pendant soixante ans</strong>.</p>
      </div>
    );
  }

  function Sources() {
    return (
      <div className="cad-note-src">
        Courbes illustratives · moyennes de population. Repères : déclin du VO₂max environ deux fois plus lent chez
        les athlètes masters que chez les sédentaires ; perte musculaire de 3 à 8 %/décennie après 30 ans ;
        testostérone ~−1 %/an après 30 ; pic de densité osseuse vers 30 ans ; pratiquants de 57-80 ans à vie
        conservant masse musculaire, immunité et cholestérol d’un jeune (≈ +9 ans d’âge biologique).
      </div>
    );
  }

  // Constat générationnel — grands chiffres + comparaison + sources.
  var GEN_STATS = [
    { n: '−15 %', l: 'd’endurance chez les enfants d’aujourd’hui, vs leurs parents au même âge' },
    { n: '−16 %', l: 'de force de poigne chez les hommes de 20-34 ans, vs 1985' },
    { n: '1 / 3', l: 'adulte dans le monde ne bouge pas assez (OMS, 2022)' },
  ];
  function StatCards() {
    return (
      <div className="cad-statrow">
        {GEN_STATS.map(function (s, i) {
          return <div key={i} className="cad-stat-big"><b>{s.n}</b><span>{s.l}</span></div>;
        })}
      </div>
    );
  }
  function GripBars() {
    var PF = window.CadPointsByFamily;
    return (
      <div className="cad-card" style={{ maxWidth: 580 }}>
        <div className="cad-h3" style={{ marginBottom: 12 }}>Force de poigne — homme 20-34 ans (kg)</div>
        {PF ? <PF data={[{ label: '1985', pts: 53, color: '#94a3b8' }, { label: 'Aujourd’hui', pts: 44, color: '#00c8e0' }]} /> : null}
      </div>
    );
  }
  function SourcesGen() {
    return (
      <div className="cad-note-src">
        Sources : endurance cardio-respiratoire des enfants −5 %/décennie depuis ~1970 et ≈ 15 % sous la génération
        précédente (méta-analyses Tomkinson) ; force de poigne des hommes 20-34 ans ~117 lb en 1985 (≈ 53 kg) → ~98 lb
        aujourd’hui (≈ 44 kg), soit ≈ −16 % (Journal of Hand Therapy) ; 31 % des adultes sous le minimum d’activité OMS (2022).
      </div>
    );
  }

  function Act(props) {
    var head = (
      <React.Fragment>
        {props.eye ? <div className="cad-act-eye">{props.eye}</div> : null}
        {props.title ? <h2 className="cad-act-t">{props.title}</h2> : null}
        {props.lead ? <p className="cad-act-lead">{props.lead}</p> : null}
        {props.children}
      </React.Fragment>
    );
    if (props.media) {
      return (
        <section className="cad-act cad-act--split">
          <div className="cad-act-col">{head}</div>
          <div className="cad-act-media">{props.media}</div>
        </section>
      );
    }
    return <section className="cad-act">{head}</section>;
  }

  function CadManifesto(props) {
    var sv = React.useState('M'); var sex = sv[0], setSex = sv[1];
    var ov = React.useState(false); var open = ov[0], setOpen = ov[1];
    var rpv = React.useState(0); var rp = rpv[0], setRp = rpv[1];
    var sys = sex === 'F' ? SYS_F : SYS_M;
    var LC = window.CadLineChart;

    return (
      <div className="cad-manifesto">
        {/* 1. Le constat générationnel */}
        <Act eye="Le constat" title="On vit plus vieux. Pas plus fort.">
          <p className="cad-act-p">On n’a jamais vécu aussi longtemps. Et pourtant, en une seule génération, le <strong>niveau physique moyen a reculé</strong> — chez les enfants comme chez les adultes.</p>
          <StatCards />
          <p className="cad-act-p">Les enfants d’aujourd’hui mettent <strong>~1 min 30 de plus</strong> pour courir un kilomètre que leurs parents au même âge. Leur endurance baisse d’<strong>environ 5 % par décennie</strong> depuis les années 70 ; ils sont <strong>~15 % moins endurants</strong>. Plus grands, plus lourds — mais plus faibles : <strong>−10 %</strong> de force de poigne chez un garçon de 12 ans entre 1981 et 2007.</p>
          <p className="cad-act-p">Chez l’adulte, même pente : un homme de 20-34 ans a <strong>~16 % de poigne en moins</strong> qu’en 1985. Et <strong>1 adulte sur 3</strong> dans le monde ne bouge pas assez — un chiffre qui grimpe encore.</p>
          <GripBars />
          <p className="cad-act-p">Le pire ? On mesure tout — poids, tension, cholestérol — <strong>sauf</strong> notre condition physique. On ne sait pas vraiment où on en est. <strong>CADENCES comble ce trou.</strong></p>
          <SourcesGen />
        </Act>

        {/* 2. Ce que ça coûte */}
        <Act eye="Ce que ça coûte" title="La condition physique, c’est de la santé mesurable."
             lead={<span>Le VO₂max et la force comptent parmi les <strong>meilleurs prédicteurs</strong> de santé, d’autonomie et de longévité — souvent plus que les examens de routine.</span>}>
          <p className="cad-act-p">Pourtant, on surveille son poids, sa tension, son cholestérol… presque jamais sa condition physique. On navigue à l’aveugle. CADENCES donne enfin <strong>un chiffre clair, à suivre dans le temps.</strong></p>
        </Act>

        {/* 3. Comment ton corps vieillit */}
        <Act eye="Comment ton corps vieillit" title="Ton corps a un pic. Puis il décline."
             lead={<span>VO₂max, muscle, hormones, os, vitesse du cerveau : chaque système culmine autour de la trentaine, puis baisse. <strong>C’est inévitable.</strong></span>}
             media={
               <div className="cad-card" style={{ position: 'relative' }}>
                 <div style={{ display: 'flex', gap: 8, maxWidth: 260, marginBottom: 14 }}>
                   <button type="button" className="cad-pill" aria-pressed={sex === 'M'} onClick={function () { setSex('M'); }}>Homme</button>
                   <button type="button" className="cad-pill" aria-pressed={sex === 'F'} onClick={function () { setSex('F'); }}>Femme</button>
                 </div>
                 {LC ? <LC key={'aging-' + sex} series={sys} sweep={true} hover={true} focusX={59} xDomain={[0, 80]} replayNonce={rp} aria="Déclin des systèmes du corps avec l'âge" /> : null}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                   {Legend(sys)}
                   <button type="button" className="cad-link" onClick={function () { setRp(rp + 1); }}>↻ Rejouer</button>
                 </div>
                 <Sources />
               </div>
             }>
          <p className="cad-act-p">Tout grimpe jusqu’à ~25-30 ans, puis redescend — mais pas au même rythme. <strong>Le VO₂max et le muscle lâchent les premiers</strong> ; l’os et la coordination tiennent plus longtemps. Passe la souris sur la courbe pour lire chaque système à l’âge voulu, et compare homme / femme (chez la femme, la chute des œstrogènes et de l’os s’accélère à la ménopause).</p>
        </Act>

        {/* 4. Pas une fatalité — sédentaire vs entraîné */}
        <Act eye="Mais" title="La vitesse du déclin n’est pas une fatalité."
             lead={<span>Un entraînement <strong>régulier et structuré</strong> — du cardio et du muscle, répétés dans le temps — ralentit extraordinairement cette baisse. On ne supprime pas le déclin : <strong>on le freine.</strong></span>}
             media={
               <div className="cad-card">
                 {LC ? <LC series={COMPARE} xDomain={[25, 80]} xTicks={[30, 40, 50, 60, 70, 80]} yTicks={[40, 60, 80, 100]} yDomain={[30, 100]} areaBetween={{ a: 'entr', b: 'sed', color: '#00c8e0' }} aria="VO2max : sédentaire contre entraîné" /> : null}
                 <Sources />
               </div>
             }>
          <p className="cad-act-p">La question n’est pas <em>si</em> on décline, mais <strong>à quelle vitesse</strong>. Et là, on a une vraie prise. À 80 ans, l’entraîné garde le VO₂max que le sédentaire avait <strong>~20 ans plus tôt</strong> : l’aire grise, ce sont ces <strong>années gagnées</strong> — pas sur un exploit, mais sur la régularité.</p>
          <div className="cad-callrow">
            <div className="cad-callout-big"><b>~2× plus lent</b><span>le déclin du VO₂max, entraînement maintenu vs sédentaire</span></div>
            <div className="cad-callout-big"><b>+9 ans</b><span>d’âge biologique gagnés chez les pratiquants réguliers à vie</span></div>
          </div>
        </Act>

        {/* e. Les deux garçons */}
        <Act eye="Deux garçons, même départ" title="La régularité, pendant soixante ans"
             lead={<span>Même âge, même ossature, mêmes qualités de départ. Un seul détail les sépare : <strong>la constance.</strong></span>}>
          <p className="cad-act-p">Pour rendre ça concret, suivons deux parcours de vie opposés — les mêmes gènes au départ, deux façons de les dépenser.</p>
          <Timeline />
          <div className="cad-reveal">
            <button type="button" className="cad-link" onClick={function () { setOpen(!open); }} aria-expanded={open}>
              {open ? 'Masquer l’histoire complète' : 'Lire l’histoire complète'} {open ? '▴' : '▾'}
            </button>
            {open ? <Recit /> : null}
          </div>
        </Act>

        {/* f. Trajectoire A vs B */}
        <Act eye="Trajectoire A vs B" title="Capacité physique globale, de 5 à 80 ans"
             media={
               <div className="cad-card">
                 {LC ? <LC series={LIFE} markers={LIFE_MARKERS} xDomain={[5, 80]} xTicks={[10, 20, 30, 40, 50, 60, 70, 80]} aria="Capacité physique de deux parcours de vie" /> : null}
               </div>
             }>
          <p className="cad-act-p">Les courbes divergent tôt et ne se rejoignent jamais. À 80 ans, <strong>A</strong> a la capacité d’un sexagénaire et vit en autonomie ; <strong>B</strong> a basculé dans la dépendance. Même capital de départ, deux façons de le dépenser.</p>
          <p className="cad-act-p">La différence ne s’est pas jouée à la salle un jour donné, mais sur <strong>des milliers de petites séances</strong>, répétées pendant soixante ans.</p>
        </Act>

        {/* g. La réponse */}
        <Act eye="Pourquoi CADENCES" title="Pour piloter ça, il faut mesurer."
             lead={<span>Chaque année, le même protocole : voir où tu progresses, où tu déclines, et <strong>comment ralentir la baisse</strong>. C’est exactement ce que fait CADENCES.</span>}>
          <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {props.makeCta ? props.makeCta() : null}
            <span className="cad-scrollcue">↓ Le test en détail, juste en dessous</span>
          </div>
        </Act>
      </div>
    );
  }

  window.CadManifesto = CadManifesto;
})();
