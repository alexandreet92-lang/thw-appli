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


  /* ── Sources : liste cliquable sous chaque acte ─────────────────────── */
  function Sources(props) {
    return (
      <details className="cad-src" open>
        <summary>Sources et articles ({props.items.length}) ▾</summary>
        <ol>
          {props.items.map(function (s, i) {
            return <li key={i}>{s.t}{s.u ? <span> — <a href={s.u} target="_blank" rel="noopener noreferrer">{s.u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a></span> : null}</li>;
          })}
        </ol>
        {props.note ? <p className="note">{props.note}</p> : null}
      </details>
    );
  }

  function Fig(props) {
    return (
      <div className={'cad-card cad-fig' + (props.className ? ' ' + props.className : '')} style={props.style}>
        {props.k ? <div className="cad-fig-k">{props.k}</div> : null}
        {props.t ? <div className="cad-fig-t">{props.t}</div> : null}
        {props.children}
        {props.c ? <div className="cad-fig-c">{props.c}</div> : null}
      </div>
    );
  }

  /* ════════ ACTE 1 — Le constat ════════ */
  var GEN_STATS = [
    { v: 17, pre: '−', suf: ' %', l: 'de force de poigne chez les hommes de 20-24 ans, par rapport à 1985' },
    { v: 7.3, dec: 1, pre: '−', suf: ' %', l: 'd’endurance cardio chez les enfants entre 1981 et 2014' },
    { v: 81, suf: ' %', l: 'des 11-17 ans dans le monde ne font pas leur heure d’activité par jour' },
    { v: 31, suf: ' %', l: 'des adultes sous le minimum OMS en 2022, soit 1,8 milliard de personnes' },
  ];
  function StatCards() {
    var CU = window.CadCountUp;
    return (
      <div className="cad-statrow cad-statrow--4">
        {GEN_STATS.map(function (s, i) {
          return <div key={i} className="cad-stat-big"><b>{CU ? <CU value={s.v} decimals={s.dec} prefix={s.pre} suffix={s.suf} /> : (s.pre || '') + s.v + s.suf}</b><span>{s.l}</span></div>;
        })}
      </div>
    );
  }

  // Force de poigne (main droite, 20-24 ans) : normes 1985 vs mesures 2016
  // (121 → 101 lb chez l'homme, ~70 → 60 lb chez la femme), converties en kg.
  var GRIP = [
    { label: 'Hommes', a: 54.9, b: 45.8 },
    { label: 'Femmes', a: 31.8, b: 27.2 },
  ];

  // Inactivité des adultes : % insuffisamment actifs (critère OMS).
  // Année indiquée sur chaque barre : 2022 (Strain 2024) ou 2016 (Guthold 2018).
  var COUNTRIES = [
    { key: 'kw', label: 'Koweït', value: 67, tag: '2016', group: 'Moyen-Orient' },
    { key: 'in', label: 'Inde', value: 49.4, tag: '2022', group: 'Asie' },
    { key: 'r-apac', label: 'Japon · Corée · Singapour', value: 48, tag: '2022', groups: ['Asie', 'Régions'], region: true, muted: true },
    { key: 'br', label: 'Brésil', value: 47, tag: '2016', group: 'Amériques' },
    { key: 'ph', label: 'Philippines', value: 46, tag: '2022', group: 'Asie' },
    { key: 'pk', label: 'Pakistan', value: 45.7, tag: '2022', group: 'Asie' },
    { key: 'r-sas', label: 'Asie du Sud', value: 45, tag: '2022', groups: ['Asie', 'Régions'], region: true, muted: true },
    { key: 'us', label: 'États-Unis', value: 40, tag: '2016', group: 'Amériques' },
    { key: 'ca', label: 'Canada', value: 37.2, tag: '2022', group: 'Amériques' },
    { key: 'uk', label: 'Royaume-Uni', value: 35.9, tag: '2016', group: 'Europe' },
    { key: 'fr', label: 'France', value: 29, tag: '2016', group: 'Europe', hl: true },
    { key: 'r-west', label: 'Occident riche', value: 28, tag: '2022', groups: ['Europe', 'Amériques', 'Océanie', 'Régions'], region: true, muted: true },
    { key: 'r-afr', label: 'Afrique (région OMS)', value: 16, tag: '2022', groups: ['Afrique', 'Régions'], region: true, muted: true },
    { key: 'cn', label: 'Chine', value: 14, tag: '2016', group: 'Asie' },
    { key: 'r-oce', label: 'Océanie (îles)', value: 14, tag: '2022', groups: ['Océanie', 'Régions'], region: true, muted: true },
    { key: 'de', label: 'Allemagne', value: 12, tag: '2022', group: 'Europe' },
  ];
  var COUNTRY_GROUPS = ['Tous', 'Europe', 'Amériques', 'Asie', 'Moyen-Orient', 'Afrique', 'Océanie', 'Régions'];

  function InactivityTrend() {
    var LC = window.CadLineChart;
    return (
      <Fig k="Le monde" t="Adultes qui ne bougent pas assez (%)"
           c={<span>+8 points en 22 ans. Si rien ne change, <strong>~35 % en 2030</strong> : l’objectif OMS de baisse de 15 % est hors d’atteinte.</span>}>
        {LC ? <LC xUnit="" draw={true} hover={true} cursorLabel="Année" height={240}
                  series={[{ key: 'ina', label: 'Inactivité', color: '#ef4444', points: [[2000, 23.4], [2010, 26.4], [2016, 27.5], [2022, 31.3], [2030, 35]] }]}
                  markers={[{ x: 2000, y: 23.4, color: '#ef4444', label: '23 %', below: true }, { x: 2022, y: 31.3, color: '#ef4444', label: '31 %', below: true }]}
                  xDomain={[2000, 2030]} xTicks={[2000, 2010, 2020, 2030]} yDomain={[0, 40]} yTicks={[0, 10, 20, 30, 40]}
                  aria="Inactivité physique mondiale 2000-2030" /> : null}
      </Fig>
    );
  }
  function KidsTrend() {
    var LC = window.CadLineChart;
    return (
      <Fig k="Les enfants" t="Endurance cardio des enfants (indice 100 = 1981)"
           c={<span>965 000 enfants, 19 pays : <strong>−7,3 % en 33 ans</strong>. La baisse a été la plus rapide avant 2000, puis a ralenti — sans jamais s’inverser.</span>}>
        {LC ? <LC xUnit="" draw={true} hover={true} cursorLabel="Année" height={240}
                  series={[{ key: 'crf', label: 'Endurance', color: '#00c8e0', endLabel: '−7,3 %', points: [[1981, 100], [2014, 92.7]] }]}
                  markers={[{ x: 1981, y: 100, color: '#00c8e0', label: '100', below: true }, { x: 2014, y: 92.7, color: '#00c8e0', label: '92,7', below: true }]}
                  xDomain={[1980, 2015]} xTicks={[1980, 1990, 2000, 2010]} yDomain={[88, 101]} yTicks={[88, 92, 96, 100]}
                  aria="Endurance cardio-respiratoire des enfants 1981-2014" /> : null}
      </Fig>
    );
  }

  var SRC_CONSTAT = [
    { t: 'Fain & Weatherford, « Comparative study of millennials’ grip and lateral pinch with the norms », Journal of Hand Therapy, 2016 (237 personnes de 20-34 ans)', u: 'https://www.wgbh.org/news/2016-06-13/millennials-may-be-losing-their-grip' },
    { t: 'Tomkinson et al., « Temporal trends in the cardiorespiratory fitness of children and adolescents », British Journal of Sports Medicine, 2019 (965 264 jeunes, 19 pays, 1981-2014)', u: 'https://bjsm.bmj.com/content/53/8/478' },
    { t: 'Tomkinson — les enfants ~15 % moins endurants que leurs parents (Université d’Australie-Méridionale)', u: 'https://www.unisa.edu.au/Media-Centre/Releases/2018/Is-the-tide-turning-for-kids-fitness' },
    { t: 'Guthold et al., « Global trends in insufficient physical activity among adolescents », Lancet Child & Adolescent Health, 2019 (1,6 M d’élèves, 146 pays)', u: 'https://www.thelancet.com/journals/lanchi/article/PIIS2352-4642(19)30323-2/fulltext' },
    { t: 'Strain et al., « National, regional, and global trends in insufficient physical activity among adults from 2000 to 2022 », Lancet Global Health, 2024 (507 enquêtes, 5,7 M de personnes)', u: 'https://www.thelancet.com/journals/langlo/article/PIIS2214-109X(24)00150-5/fulltext' },
    { t: 'OMS — « Nearly 1.8 billion adults at risk of disease from not doing enough physical activity » (régions 2022), 26 juin 2024', u: 'https://www.who.int/news/item/26-06-2024-nearly-1.8-billion-adults-at-risk-of-disease-from-not-doing-enough-physical-activity' },
    { t: 'Guthold et al., « Worldwide trends in insufficient physical activity from 2001 to 2016 », Lancet Global Health, 2018 (168 pays — valeurs 2016)', u: 'https://www.thelancet.com/journals/langlo/article/PIIS2214-109X(18)30357-7/fulltext' },
    { t: 'Inde : 22,3 % (2000) → 49,4 % (2022), d’après Strain 2024', u: 'https://thesouthfirst.com/south-shots/half-of-indian-adult-population-lacks-physical-activity-lancet-study/' },
    { t: 'Philippines : 46 % (2022), d’après Strain 2024', u: 'https://tribune.net.ph/2024/06/26/sedentary-world' },
    { t: 'Canada : 37,2 % (2022), contre 25,6 % en 2000', u: 'https://globalnews.ca/news/10587001/physical-inactivity-who-report-canada' },
    { t: 'Allemagne : 12 % (2022), l’un des rares pays en bonne voie', u: 'https://www.apotheken-umschau.de/news/die-menschen-sind-faul-die-deutschen-nicht-1117885.html' },
    { t: 'Afrique (région OMS) : 16 % (2022)', u: 'https://africanews.com/2024/06/27/one-third-of-adults-worldwide-at-risk-of-disease-from-not-doing-enough-physical-activity/' },
    { t: 'Pentagone, Qualified Military Available Study 2020 : 77 % des 17-24 ans inaptes sans dérogation', u: 'https://www.moaa.org/content/publications-and-media/news-articles/2022-news-articles/new-study-finds-even-more-young-americans-are-unfit-to-serve/' },
  ];

  /* ════════ ACTE 2 — Ce que ça coûte ════════ */
  function MortalityBars() {
    var COLS = window.CadColumns;
    return (
      <Fig k="Le cardio" t="Risque de décès selon le niveau d’endurance (× vs élite)"
           c={<span>122 007 patients testés sur tapis : un cardio faible = <strong>×5 de risque</strong> par rapport à l’élite. Aucun autre facteur suivi (tabac, diabète, tension) ne pesait autant.</span>}>
        {COLS ? <COLS data={[{ label: 'Cardio élite', value: 1, display: '×1 (réf.)', color: '#22c55e' }, { label: 'Cardio faible', value: 5.04, display: '×5', hl: true }]} max={5.04} color="#ef4444" height={200} aria="Risque de décès : cardio faible contre élite" /> : null}
      </Fig>
    );
  }
  var AREM = [
    { label: 'Inactif', value: 0, display: 'réf.' },
    { label: '< 1×', value: 20, display: '−20 %' },
    { label: '1-2×', value: 31, display: '−31 %' },
    { label: '2-3×', value: 37, display: '−37 %' },
    { label: '3-5×', value: 39, display: '−39 %', hl: true },
    { label: '≥ 10×', value: 31, display: '−31 %' },
  ];
  var PUSHUPS = [
    { label: 'Moins de 10 pompes', value: 100, display: 'référence' },
    { label: 'Plus de 40 pompes', value: 4, display: '−96 %', hl: true },
  ];
  var SITRISE = [
    { from: 0, to: 3, color: '#ef4444', text: 'Risque de décès ≈ ×5,4 par rapport au groupe 8-10.' },
    { from: 3.5, to: 5.5, color: '#f59e0b', text: 'Risque de décès ≈ ×3,4 par rapport au groupe 8-10.' },
    { from: 6, to: 7.5, color: '#eab308', text: 'Risque de décès ≈ ×1,8 par rapport au groupe 8-10.' },
    { from: 8, to: 10, color: '#22c55e', text: 'Groupe de référence : le risque le plus bas.' },
  ];
  var SRC_COUT = [
    { t: 'Mandsager et al., « Association of cardiorespiratory fitness with long-term mortality », JAMA Network Open, 2018 (122 007 patients)', u: 'https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428' },
    { t: 'Leong et al., « Prognostic value of grip strength » (étude PURE), The Lancet, 2015 (≈ 140 000 adultes, 17 pays)', u: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)62000-6/fulltext' },
    { t: 'Yang et al., « Association between push-up exercise capacity and future cardiovascular events », JAMA Network Open, 2019 (1 104 pompiers, 10 ans)', u: 'https://hsph.harvard.edu/news/push-up-capacity-cardiovascular-disease-events-men' },
    { t: 'Harvard Gazette — « Pushup capacity may be inexpensive way to assess cardiovascular disease risk »', u: 'https://content.news.harvard.edu/gazette/story/2019/02/pushup-capacity-may-be-inexpensive-way-to-assess-cardiovascular-disease-risk/' },
    { t: 'Araújo et al., « Ability to sit and rise from the floor as a predictor of all-cause mortality », European Journal of Preventive Cardiology (2 002 adultes de 51-80 ans)', u: 'https://www.sciencedaily.com/releases/2012/12/121213085202.htm' },
    { t: 'Arem et al., « Leisure time physical activity and mortality: a detailed pooled analysis of the dose-response relationship », JAMA Internal Medicine, 2015 (661 137 personnes)', u: 'https://ascopost.com/issues/may-25-2015/just-engaging-in-some-leisure-time-physical-activity-reduces-overall-and-cancer-specific-mortality' },
    { t: 'BMJ Heart blog — « Relationship between physical activity and mortality » (Arem 2015)', u: 'https://blogs.bmj.com/heart/2015/05/05/relationship-between-physical-activity-and-mortality/' },
    { t: 'Momma et al., « Muscle-strengthening activities are associated with lower risk and mortality », British Journal of Sports Medicine, 2022 (méta-analyse)', u: 'https://bjsm.bmj.com/content/56/13/755' },
    { t: 'OMS — Rapport mondial sur l’activité physique 2022 : ~500 M de nouveaux cas évitables d’ici 2030, ~27 Md$ par an', u: 'https://www.who.int/news/item/19-10-2022-who-highlights-high-cost-of-physical-inactivity-in-first-ever-global-report' },
  ];

  /* ════════ ACTE 3 — Comment le corps vieillit ════════ */
  var DECLINE = [
    { key: 'testo', label: 'Testostérone', value: 10, display: '≈ −10 %' },
    { key: 'vo2', label: 'VO₂max (sédentaire)', value: 10, display: '≈ −10 %' },
    { key: 'pow', label: 'Puissance de saut', value: 9.5, display: '−9,5 %' },
    { key: 'spr', label: 'Vitesse de sprint', value: 5.5, display: '−5 à 6 %' },
    { key: 'mus', label: 'Masse musculaire', value: 5.5, display: '−3 à 8 %' },
  ];
  var FACTS = [
    { k: 'Muscle', n: '−3 à 8 %', l: 'de masse par décennie dès 30 ans, plus vite après 60.' },
    { k: 'VO₂max', n: '≈ −10 %', l: 'par décennie chez le sédentaire — environ moitié moins chez l’entraîné.' },
    { k: 'Puissance', n: 'en 1er', l: 'Les fibres rapides partent avant la force : on perd le « jus » avant le « moteur ».' },
    { k: 'Os', n: 'pic ~30 ans', l: 'Ensuite on ne fait que préserver — d’où l’intérêt de charger tôt et longtemps.' },
    { k: 'Hormones', n: '≈ −1 %/an', l: 'de testostérone après 30-40 ans ; chute brutale des œstrogènes à la ménopause.' },
  ];
  var SRC_AGE = [
    { t: 'Why are masters sprinters slower than their younger counterparts? (sprint −5 à 6 %/décennie, 17-88 ans)', u: 'https://pure.ul.ie/en/publications/why-are-masters-sprinters-slower-than-their-younger-counterparts-/' },
    { t: 'Étude longitudinale sur 10 ans de sprinteurs masters : puissance de saut −9,5 % (Université de Jyväskylä)', u: 'https://jyx.jyu.fi/handle/123456789/101704' },
    { t: 'Déclin du VO₂max : athlètes masters vs sédentaires (environ deux fois plus lent chez l’entraîné)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9517884/' },
    { t: 'Speed training for veterans — pourquoi la vitesse et la puissance partent en premier', u: 'https://www.sportsperformancebulletin.com/training/masters/speed-training-for-veterans-how-to-combat-the-decline-of-speed-and-power' },
  ];

  /* ════════ ACTE 4 — Pas une fatalité ════════ */
  var SRC_MAIS = [
    { t: 'Déclin du VO₂max environ deux fois plus lent chez les athlètes masters', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9517884/' },
    { t: 'Duggal et al., Aging Cell, 2018 — cyclistes de 55-79 ans pratiquant à vie : immunité et profil d’un adulte jeune', u: 'https://doi.org/10.1111/acel.12750' },
  ];

  /* ════════ ACTE 7 — Que faire concrètement ════════ */
  var PILLARS = [
    { key: 'force', name: 'Force', color: COL.muscle, why: 'Le muscle, c’est ton assurance-vie.',
      what: 'Soulever lourd et maîtriser ton poids de corps.',
      ex: ['Charges : squat, soulevé de terre, développé, rowing, fentes', 'Poids du corps : pompes, tractions, dips, gainage', '3 à 5 séries de 5 à 12 répétitions, proche de l’échec'],
      min: '2 séances · 60 min', ideal: '3 séances · 2 h' },
    { key: 'vit', name: 'Vitesse & explosivité', color: COL.brain, why: 'Ce qui part en premier.',
      what: 'Aller vite, changer de rythme, sauter.',
      ex: ['Sprints : 6 à 10 × 10-30 m, récupération complète', 'Changements de rythme (fartlek), côtes courtes', 'Sauts : bonds, sauts pieds joints, box jumps, corde'],
      min: '1 bloc · 15 min', ideal: '2 blocs · 30 min' },
    { key: 'end', name: 'Endurance', color: COL.vo2, why: 'Le cœur, premier prédicteur de longévité.',
      what: 'Course, vélo, natation, rameur, marche rapide.',
      ex: ['80 % du temps en aisance (tu peux parler)', '20 % plus dur : fractionné, seuil', 'Une sortie longue le week-end'],
      min: '150 min modéré', ideal: '240 min, dont 1-2 séances intenses' },
    { key: 'mob', name: 'Souplesse & mobilité', color: COL.os, why: 'Garder l’amplitude, éviter les blessures.',
      what: 'Étirements et mobilité articulaire.',
      ex: ['Hanches, épaules, chevilles, colonne', '30-60 s par groupe musculaire', 'Idéal en fin de séance ou le soir'],
      min: '2 × 10 min', ideal: '5 × 10 min' },
  ];
  var PCOL = { force: COL.muscle, vit: COL.brain, end: COL.vo2, mob: COL.os };
  var PNAME = { force: 'Force', vit: 'Vitesse', end: 'Endurance', mob: 'Mobilité' };
  var WEEK = {
    min: [
      [{ p: 'force', m: 30, t: 'Force — haut + bas' }],
      [{ p: 'end', m: 50, t: 'Footing / vélo' }],
      [{ p: 'mob', m: 10, t: 'Mobilité' }],
      [{ p: 'force', m: 30, t: 'Force — poids du corps' }, { p: 'mob', m: 10, t: 'Mobilité' }],
      [],
      [{ p: 'end', m: 50, t: 'Endurance' }, { p: 'vit', m: 15, t: 'Sprints + sauts' }],
      [{ p: 'end', m: 50, t: 'Sortie tranquille' }],
    ],
    ideal: [
      [{ p: 'force', m: 40, t: 'Force — bas du corps' }, { p: 'mob', m: 10, t: 'Mobilité' }],
      [{ p: 'end', m: 60, t: 'Fractionné' }, { p: 'vit', m: 15, t: 'Sprints' }],
      [{ p: 'force', m: 40, t: 'Force — haut du corps' }, { p: 'mob', m: 10, t: 'Mobilité' }],
      [{ p: 'end', m: 60, t: 'Endurance' }, { p: 'mob', m: 10, t: 'Mobilité' }],
      [{ p: 'force', m: 40, t: 'Force — complet' }, { p: 'vit', m: 15, t: 'Sauts + côtes' }],
      [{ p: 'end', m: 90, t: 'Sortie longue' }, { p: 'mob', m: 10, t: 'Mobilité' }],
      [{ p: 'end', m: 30, t: 'Récup active' }, { p: 'mob', m: 10, t: 'Mobilité' }],
    ],
  };
  var DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  function fmtH(min) { var h = Math.floor(min / 60), m = min % 60; return h + ' h ' + (m < 10 ? '0' : '') + m; }

  function Pillars() {
    var hook = window.CadUseInView;
    var iv = hook ? hook({ threshold: 0.15 }) : [null, true];
    return (
      <div ref={iv[0]} className="cad-pillars">
        {PILLARS.map(function (p, i) {
          return (
            <div key={p.key} className={'cad-pillar' + (iv[1] ? ' is-on' : '')} style={{ '--pc': p.color, transitionDelay: (i * 120) + 'ms' }}>
              <h4>{p.name}</h4>
              <div className="why">{p.why}</div>
              <p>{p.what}</p>
              <ul>{p.ex.map(function (e, j) { return <li key={j}>{e}</li>; })}</ul>
              <div className="dose">
                <div><small>Minimum</small><span>{p.min}</span></div>
                <div><small>Idéal</small><span>{p.ideal}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function WeekPlanner() {
    var ms = React.useState('min'); var mode = ms[0], setMode = ms[1];
    var hook = window.CadUseInView;
    var iv = hook ? hook({ threshold: 0.25 }) : [null, true];
    var week = WEEK[mode];
    var tot = { force: 0, vit: 0, end: 0, mob: 0 };
    week.forEach(function (d) { d.forEach(function (s) { tot[s.p] += s.m; }); });
    var all = tot.force + tot.vit + tot.end + tot.mob;
    var SCALE = 480;
    return (
      <div ref={iv[0]} className="cad-card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
          <button type="button" className="cad-pill" aria-pressed={mode === 'min'} onClick={function () { setMode('min'); }}>Minimum</button>
          <button type="button" className="cad-pill" aria-pressed={mode === 'ideal'} onClick={function () { setMode('ideal'); }}>Idéal</button>
        </div>
        <div className="cad-plan-tot">
          <b>{fmtH(all)}</b>
          <span>par semaine · {mode === 'min' ? 'pour rester en bonne santé et garder ses qualités' : 'pour être en très bonne forme, à tout âge'}</span>
        </div>
        <div className="cad-stack" role="img" aria-label={'Répartition hebdomadaire : ' + fmtH(all)}>
          {['force', 'vit', 'end', 'mob'].map(function (k) {
            return <i key={k} style={{ width: (iv[1] ? tot[k] / SCALE * 100 : 0) + '%', background: PCOL[k] }}></i>;
          })}
        </div>
        <div className="cad-legend">
          {['force', 'vit', 'end', 'mob'].map(function (k) {
            return <span key={k}><i style={{ background: PCOL[k] }}></i>{PNAME[k]} · {tot[k]} min</span>;
          })}
        </div>
        <div className="cad-week">
          {week.map(function (d, i) {
            return (
              <div key={mode + i} className="cad-wday">
                <small>{DAYS[i]}</small>
                {d.length ? d.map(function (s, j) {
                  return <div key={j} className="cad-sess" style={{ background: PCOL[s.p], animationDelay: (i * 60 + j * 40) + 'ms' }}>{s.t}<small>{s.m} min</small></div>;
                }) : <span className="cad-rest">Repos</span>}
              </div>
            );
          })}
        </div>
        <div className="cad-fig-c">
          {mode === 'min'
            ? <span>C’est le plancher OMS (150 min d’endurance + 2 séances de renfort), complété par un peu de vitesse et de mobilité — les deux qualités que personne ne travaille et qui partent en premier.</span>
            : <span>L’endurance passe à 4 h, dont 1-2 séances intenses qui <strong>comptent double</strong> pour l’OMS ; la force passe à 3 séances, la vitesse à 2 blocs. Tu te rapproches de la zone où le bénéfice sur la mortalité plafonne (3-5× le minimum, −39 %).</span>}
        </div>
      </div>
    );
  }

  var SRC_FAIRE = [
    { t: 'OMS — Lignes directrices 2020 : 150-300 min d’activité modérée (ou 75-150 min intense) + renforcement musculaire ≥ 2 jours/semaine', u: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
    { t: 'Arem et al., JAMA Internal Medicine, 2015 — bénéfice maximal à 3-5× le minimum', u: 'https://blogs.bmj.com/heart/2015/05/05/relationship-between-physical-activity-and-mortality/' },
    { t: 'Momma et al., BJSM, 2022 — 30-60 min/semaine de renforcement : −10 à −20 % de mortalité ; le combiné force + endurance fait mieux', u: 'https://bjsm.bmj.com/content/56/13/755' },
    { t: 'Garber et al., ACSM Position Stand, Medicine & Science in Sports & Exercise, 2011 — souplesse ≥ 2-3 jours/semaine', u: 'https://pubmed.ncbi.nlm.nih.gov/21694556/' },
    { t: 'Sprinteurs masters : la vitesse et la puissance partent en premier', u: 'https://pure.ul.ie/en/publications/why-are-masters-sprinters-slower-than-their-younger-counterparts-/' },
    { t: 'Cappuccio et al., « Sleep duration and all-cause mortality », Sleep, 2010 (1,38 M de personnes, 16 études)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2864873/' },
    { t: 'Morton et al., « Protein supplementation and resistance training », British Journal of Sports Medicine, 2018 (49 essais, 1 863 participants)', u: 'https://bjsm.bmj.com/content/52/6/376' },
  ];

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
        <section className="cad-act">
          <div className="cad-act--split">
            <div className="cad-act-col">{head}</div>
            <div className="cad-act-media">{props.media}</div>
          </div>
          {props.after || null}
        </section>
      );
    }
    return <section className="cad-act">{head}{props.after || null}</section>;
  }

  function CadManifesto(props) {
    var sv = React.useState('M'); var sex = sv[0], setSex = sv[1];
    var ov = React.useState(false); var open = ov[0], setOpen = ov[1];
    var rpv = React.useState(0); var rp = rpv[0], setRp = rpv[1];
    var sys = sex === 'F' ? SYS_F : SYS_M;
    var LC = window.CadLineChart, DB = window.CadDumbbell, WF = window.CadWaffle, HB = window.CadHBars, COLS = window.CadColumns, GA = window.CadGauge;

    return (
      <div className="cad-manifesto">
        {/* 1. Le constat */}
        <Act eye="Le constat" title="On vit plus vieux. Pas plus fort."
             lead={<span>On n’a jamais vécu aussi longtemps. Et on n’a jamais été aussi peu capables physiquement. Ce n’est pas un « c’était mieux avant » : <strong>c’est mesuré, sur des millions de personnes, dans des dizaines de pays.</strong></span>}>
          <StatCards />

          <p className="cad-act-p"><strong>Les adultes d’abord.</strong> En 2016, des chercheurs américains ont refait les mesures de force de poigne de 1985 sur des jeunes de 20 à 34 ans. Résultat : un homme de 20-24 ans serre aujourd’hui <strong>environ 46 kg</strong>, contre <strong>55 kg</strong> pour son père au même âge. Les femmes ont suivi la même pente. La poigne n’est pas un détail de laboratoire : c’est un <strong>indicateur de la force de tout le corps</strong> — et, on va le voir, de l’espérance de vie.</p>
          <div className="cad-grid2">
            <Fig k="La force" t="Force de poigne, 20-24 ans (kg, main droite)"
                 c={<span>Plus grands, plus lourds — et pourtant plus faibles. La différence vient du mode de vie : moins de travail manuel, moins de jeu dehors, plus d’écrans.</span>}>
              {DB ? <DB rows={GRIP} domain={[20, 60]} unit="kg" aLabel="1985" bLabel="2016" aria="Force de poigne 1985 contre 2016" /> : null}
            </Fig>
            <KidsTrend />
          </div>

          <p className="cad-act-p"><strong>Les enfants ensuite.</strong> Leur endurance baisse d’environ <strong>5 % par décennie</strong> depuis les années 70. Un enfant d’aujourd’hui est <strong>~15 % moins endurant</strong> que ses parents au même âge : sur 1,6 km, ça représente <strong>environ 1 min 30 de plus</strong>. Et à l’adolescence, le décrochage s’installe : dans le monde, <strong>4 ados sur 5</strong> ne font pas l’heure d’activité quotidienne recommandée — les filles encore plus que les garçons.</p>
          <div className="cad-grid2">
            <Fig k="Les ados" t="11-17 ans qui ne bougent pas assez (sur 100)"
                 c={<span>1,6 million d’élèves dans 146 pays. De 66 % au Bangladesh à 94 % en Corée du Sud : <strong>aucun pays</strong> n’a une majorité d’ados assez actifs.</span>}>
              {WF ? <WF caption="n’atteignent pas 60 min d’activité par jour" options={[{ label: 'Tous', value: 81 }, { label: 'Filles', value: 85 }, { label: 'Garçons', value: 78 }]} /> : null}
            </Fig>
            <InactivityTrend />
          </div>

          <p className="cad-act-p"><strong>Et partout dans le monde.</strong> Près d’<strong>1 adulte sur 3</strong> n’atteint pas le minimum OMS (150 min d’activité modérée par semaine). Les pays riches et urbanisés ne sont pas épargnés, au contraire : en Asie-Pacifique riche (Japon, Corée, Singapour), c’est presque un adulte sur deux. En Inde, la part d’adultes insuffisamment actifs a <strong>plus que doublé</strong> en 22 ans (22 % → 49 %). Au Koweït, en Arabie saoudite ou en Irak, c’est plus d’un adulte sur deux. À l’inverse, l’Allemagne fait figure d’exception (12 %), et l’Afrique et l’Océanie restent les régions les plus actives.</p>
          <Fig k="Tous les continents" t="Adultes insuffisamment actifs, par pays et par région (%)" style={{ marginTop: 18 }}
               c={<span>Filtre par continent ; survole une barre pour voir son rang. Chaque barre porte l’<strong>année de l’estimation OMS</strong> : 2022 (dernière vague, 197 pays) ou 2016 (vague précédente, 168 pays) quand la valeur 2022 du pays n’est pas publiée en accès libre. Les barres grises en italique sont des moyennes régionales. La ligne pointillée : moyenne mondiale 2022.</span>}>
            {HB ? <HB data={COUNTRIES} groups={COUNTRY_GROUPS} refLine={{ value: 31.3, label: 'Monde 31 %' }} max={70} unit=" %" /> : null}
          </Fig>

          <p className="cad-act-p">Conséquence très concrète : aux États-Unis, <strong>77 % des 17-24 ans</strong> ne pourraient pas entrer dans l’armée sans dérogation — surpoids, condition physique, santé. Six points de plus qu’en 2017.</p>
          <div className="cad-callrow">
            <div className="cad-callout-big"><b>77 %</b><span>des jeunes Américains inaptes au service militaire sans dérogation (Pentagone, 2020)</span></div>
            <div className="cad-callout-big"><b>×2,2</b><span>d’adultes inactifs en Inde entre 2000 et 2022 (22 % → 49 %)</span></div>
            <div className="cad-callout-big"><b>~35 %</b><span>d’adultes inactifs dans le monde en 2030 si la tendance continue</span></div>
          </div>
          <p className="cad-act-p">Le pire ? On mesure tout — poids, tension, cholestérol — <strong>sauf</strong> notre condition physique. On ne sait pas vraiment où on en est. Or, c’est elle qui décide de la suite.</p>
          <Sources items={SRC_CONSTAT} />
        </Act>

        {/* 2. Ce que ça coûte */}
        <Act eye="Ce que ça coûte" title="La condition physique, c’est de la santé mesurable."
             lead={<span>Le cardio et la force sont parmi les <strong>meilleurs prédicteurs</strong> de santé, d’autonomie et de longévité — souvent plus que les examens de routine. Et quelques exercices simples suffisent à les lire.</span>}>
          <p className="cad-act-p"><strong>Le cardio, d’abord.</strong> À la Cleveland Clinic, 122 007 patients ont passé un test d’effort, puis ont été suivis pendant des années. Les moins endurants avaient <strong>5 fois plus de risque de mourir</strong> que les plus endurants — un écart comparable, voire supérieur, à celui du tabac, du diabète ou de la maladie coronarienne. Chaque palier de forme gagné (+1 MET) ≈ <strong>−13 % de mortalité</strong>. Et il n’y a pas de plafond : l’élite fait mieux que les « bons ».</p>
          <p className="cad-act-p"><strong>La dose compte — mais pas besoin d’être un marathonien.</strong> Sur 661 137 personnes, faire ne serait-ce qu’<em>un peu</em> d’activité réduit déjà le risque de 20 %. Atteindre le minimum OMS : −31 %. Le bénéfice plafonne vers <strong>3 à 5 fois le minimum</strong> (−39 %) — environ 2 h 15 de course ou 7 h de marche rapide par semaine. Au-delà, aucun danger, mais plus de gain.</p>
          <div className="cad-grid2">
            <MortalityBars />
            <Fig k="La dose" t="Baisse du risque de décès selon l’activité (× minimum OMS)"
                 c={<span>Le gros du bénéfice arrive <strong>dès qu’on s’y met</strong>. La zone 3-5× est l’optimum : on y revient dans « Que faire concrètement ».</span>}>
              {COLS ? <COLS data={AREM} max={45} aria="Baisse du risque de décès selon la dose d'activité" /> : null}
            </Fig>
          </div>

          <p className="cad-act-p"><strong>La force, ensuite.</strong> Dans l’étude PURE (≈ 140 000 adultes, 17 pays), chaque <strong>−5 kg de force de poigne</strong> était associé à <strong>+16 % de mortalité</strong> toutes causes — un meilleur prédicteur que la tension artérielle. Et 30 à 60 minutes de renforcement par semaine suffisent pour faire baisser la mortalité de <strong>10 à 20 %</strong> ; combiné à l’endurance, c’est encore mieux.</p>
          <p className="cad-act-p"><strong>Des tests de salon qui en disent long.</strong> Chez 1 104 pompiers suivis 10 ans, ceux qui enchaînaient <strong>plus de 40 pompes</strong> avaient <strong>96 % d’accidents cardio-vasculaires en moins</strong> que ceux qui en faisaient moins de 10. Et le <strong>test assis-debout</strong> — s’asseoir au sol et se relever sans appui — prédit la mortalité des 51-80 ans : <strong>chaque point gagné sur 10 ≈ −21 % de risque</strong>. Essaie : déplace le curseur sur ton score.</p>
          <div className="cad-grid2">
            <Fig k="Pompes" t="Accidents cardio-vasculaires sur 10 ans (base 100)"
                 c={<span>Risque relatif ≈ 0,04 au-delà de 40 pompes. Un test gratuit, faisable partout — et plus parlant qu’un test sur tapis pour prédire le risque.</span>}>
              {COLS ? <COLS data={PUSHUPS} max={100} height={200} aria="Pompes et risque cardio-vasculaire" /> : null}
            </Fig>
            <Fig k="Assis-debout" t="Ton score au test assis-debout (sur 10)"
                 c={<span><strong>Comment faire :</strong> pieds nus, croise les jambes et assieds-toi au sol, puis relève-toi — sans les mains si possible. 5 points pour descendre, 5 pour remonter ; <strong>−1 par appui</strong> (main, genou, avant-bras), −0,5 si tu perds l’équilibre.</span>}>
              {GA ? <GA zones={SITRISE} max={10} initial={6} aria="Score assis-debout" inputLabel="Ton score assis-debout" /> : null}
            </Fig>
          </div>

          <div className="cad-callrow">
            <div className="cad-callout-big"><b>−13 %</b><span>de mortalité par palier de cardio gagné (+1 MET)</span></div>
            <div className="cad-callout-big"><b>+16 %</b><span>de mortalité par −5 kg de force de poigne</span></div>
            <div className="cad-callout-big"><b>−10 à −20 %</b><span>de mortalité avec 30-60 min de renforcement par semaine</span></div>
            <div className="cad-callout-big"><b>~500 M</b><span>de nouveaux cas de maladies évitables d’ici 2030 liés à l’inactivité (OMS) — ~27 Md$ par an</span></div>
          </div>
          <p className="cad-act-p">Ces chiffres ne tombent pas du ciel : ils suivent la façon dont le corps vieillit — et surtout, <strong>l’ordre dans lequel il lâche</strong>.</p>
          <Sources items={SRC_COUT} />
        </Act>

        {/* 3. Comment ton corps vieillit */}
        <Act eye="Comment ton corps vieillit" title="Ton corps a un pic. Puis il décline."
             lead={<span>VO₂max, muscle, hormones, os, vitesse du cerveau : chaque système culmine entre 25 et 35 ans, puis baisse. <strong>C’est inévitable</strong> — mais pas au même rythme pour tout le monde, ni pour chaque qualité.</span>}
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
                 <div className="cad-note-src">Courbes illustratives (moyennes de population), construites à partir des taux de déclin publiés — sources ci-dessous.</div>
               </div>
             }
             after={
               <React.Fragment>
                 <div className="cad-facts">
                   {FACTS.map(function (f) { return <div key={f.k} className="cad-fact"><i>{f.k}</i><b>{f.n}</b><span>{f.l}</span></div>; })}
                 </div>
                 <div className="cad-grid2">
                   <Fig k="Ce qui part en premier" t="Perte par décennie, à partir de ~30-40 ans"
                        c={<span>Même chez des <strong>sprinteurs entraînés</strong>, la vitesse recule de 5-6 % par décennie et la puissance de saut de près de 10 % en 10 ans : les fibres rapides sont les plus fragiles. C’est pour ça qu’on doit les travailler <strong>exprès</strong>.</span>}>
                     {HB ? <HB data={DECLINE} max={12} rowHeight={38} /> : null}
                   </Fig>
                   <Fig k="Ce que ça change" t="Pourquoi c’est grave"
                        c={null}>
                     <p className="cad-p">On ne perd pas « un peu de muscle ». On perd, dans cet ordre : la capacité à <strong>sprinter</strong> pour attraper un bus, à <strong>sauter</strong> un obstacle, à <strong>se rattraper</strong> quand on trébuche, à <strong>monter un escalier</strong> sans souffler, puis à <strong>se relever du sol</strong> seul.</p>
                     <p className="cad-p">Ce sont exactement les qualités que mesurent les tests de l’acte précédent — pompes, assis-debout, poigne, cardio. Et ce sont celles que le quotidien moderne ne sollicite plus jamais.</p>
                     <p className="cad-p" style={{ margin: 0 }}>Chez la femme, la chute des œstrogènes à la ménopause accélère la perte osseuse et musculaire : le travail de force devient encore plus décisif.</p>
                   </Fig>
                 </div>
                 <Sources items={SRC_AGE} />
               </React.Fragment>
             }>
          <p className="cad-act-p">Tout grimpe jusqu’à ~25-30 ans, puis redescend — mais pas au même rythme. <strong>La puissance, la vitesse et le VO₂max lâchent les premiers</strong> ; l’os et la coordination tiennent plus longtemps. Passe la souris sur la courbe pour lire chaque système à l’âge voulu, et compare homme / femme.</p>
          <p className="cad-act-p">Le plus trompeur : jusqu’à 40 ans, on ne sent presque rien. Le déclin est lent, silencieux, et il se cumule. Quand on s’en rend compte, on a souvent déjà perdu 10 à 20 % de ce qu’on avait.</p>
        </Act>

        {/* 4. Pas une fatalité — sédentaire vs entraîné */}
        <Act eye="Mais" title="La vitesse du déclin n’est pas une fatalité."
             lead={<span>Un entraînement <strong>régulier et structuré</strong> — du cardio et du muscle, répétés dans le temps — ralentit extraordinairement cette baisse. On ne supprime pas le déclin : <strong>on le freine.</strong></span>}
             media={
               <div className="cad-card">
                 {LC ? <LC series={COMPARE} xDomain={[25, 80]} xTicks={[30, 40, 50, 60, 70, 80]} yTicks={[40, 60, 80, 100]} yDomain={[30, 100]} areaBetween={{ a: 'entr', b: 'sed', color: '#00c8e0' }} aria="VO2max : sédentaire contre entraîné" /> : null}
                 <div className="cad-note-src">VO₂max en % du pic — courbes illustratives.</div>
               </div>
             }
             after={<Sources items={SRC_MAIS} />}>
          <p className="cad-act-p">La question n’est pas <em>si</em> on décline, mais <strong>à quelle vitesse</strong>. Et là, on a une vraie prise. À 80 ans, l’entraîné garde le VO₂max que le sédentaire avait <strong>~20 ans plus tôt</strong> : l’aire grise, ce sont ces <strong>années gagnées</strong> — pas sur un exploit, mais sur la régularité.</p>
          <div className="cad-callrow">
            <div className="cad-callout-big"><b>~2× plus lent</b><span>le déclin du VO₂max, entraînement maintenu vs sédentaire</span></div>
            <div className="cad-callout-big"><b>+9 ans</b><span>d’âge biologique gagnés chez les pratiquants réguliers à vie</span></div>
          </div>
        </Act>

        {/* 5. Les deux garçons */}
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

        {/* 6. Trajectoire A vs B */}
        <Act eye="Trajectoire A vs B" title="Capacité physique globale, de 5 à 80 ans"
             media={
               <div className="cad-card">
                 {LC ? <LC series={LIFE} markers={LIFE_MARKERS} xDomain={[5, 80]} xTicks={[10, 20, 30, 40, 50, 60, 70, 80]} aria="Capacité physique de deux parcours de vie" /> : null}
                 <div className="cad-note-src">Récit et courbes illustratifs.</div>
               </div>
             }>
          <p className="cad-act-p">Les courbes divergent tôt et ne se rejoignent jamais. À 80 ans, <strong>A</strong> a la capacité d’un sexagénaire et vit en autonomie ; <strong>B</strong> a basculé dans la dépendance. Même capital de départ, deux façons de le dépenser.</p>
          <p className="cad-act-p">La différence ne s’est pas jouée à la salle un jour donné, mais sur <strong>des milliers de petites séances</strong>, répétées pendant soixante ans.</p>
        </Act>

        {/* 7. Que faire concrètement */}
        <Act eye="Que faire concrètement" title="Le minimum pour rester fort. L’idéal pour être en très bonne forme."
             lead={<span>La bonne nouvelle : la recette est connue, et elle tient en <strong>quelques heures par semaine</strong>. Quatre piliers d’entraînement — puis deux piliers de soutien.</span>}>
          <p className="cad-act-p">Beaucoup ne font qu’une seule chose : courir, <em>ou</em> soulever, <em>ou</em> s’étirer. Or chaque qualité vieillit à sa façon — et celles qu’on ne travaille pas partent quand même. Un corps en très bonne forme, c’est un corps <strong>fort, rapide, endurant et mobile</strong>.</p>
          <div className="cad-tier">1 · L’entraînement — le moteur</div>
          <Pillars />
          <p className="cad-act-p" style={{ marginTop: 20 }}><strong>Combien d’heures ?</strong> Bascule entre la semaine minimum et la semaine idéale : le total, la répartition et un exemple de semaine.</p>
          <WeekPlanner />
          <p className="cad-act-p">Les repères à viser ? Tu les as vus plus haut : <strong>plus de 40 pompes</strong>, <strong>8 sur 10 ou plus</strong> au test assis-debout, une poigne qui ne baisse pas d’une année sur l’autre. CADENCES les mesure toutes, avec un barème détaillé pour chaque épreuve.</p>

          <div className="cad-tier">2 · Le sommeil et la nutrition — le carburant</div>
          <div className="cad-support">
            <div>
              <h4>Sommeil</h4>
              <p><strong>7 à 9 h par nuit.</strong> Sur 1,38 million de personnes, dormir régulièrement <strong>moins de 6 h</strong> est associé à <strong>+12 % de mortalité</strong> prématurée. Dormir beaucoup plus que 9 h l’est aussi — souvent le signe d’un autre problème de santé.</p>
              <p>C’est la nuit que le muscle se reconstruit et que les hormones se rééquilibrent : sans sommeil, l’entraînement ne « paie » pas.</p>
            </div>
            <div>
              <h4>Nutrition</h4>
              <p><strong>Protéines : ~1,6 g/kg/jour</strong> si tu t’entraînes en force — au-delà, 49 essais n’ont pas trouvé de gain supplémentaire sur le muscle ou la force.</p>
              <p>Pour le reste : des aliments peu transformés, des légumes et des fruits à chaque repas, de l’eau. Pas de régime miracle — de la régularité, comme pour l’entraînement.</p>
            </div>
          </div>
          <div className="cad-quote">Bien dormir et bien manger sans s’entraîner ne construit rien. S’entraîner sans dormir ni manger ne construit pas longtemps.</div>
          <Sources items={SRC_FAIRE} />
        </Act>

        {/* 8. La réponse */}
        <Act eye="Pourquoi CADENCES" title="Pour piloter ça, il faut mesurer."
             lead={<span>Tu sais maintenant quoi travailler. CADENCES te dit <strong>où tu en es</strong> sur chacune de ces qualités — et te le redit dans 3 mois, puis chaque année : où tu progresses, où tu déclines, et <strong>comment ralentir la baisse</strong>.</span>}>
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
