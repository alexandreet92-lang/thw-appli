// QSteps.jsx — Step content components for THW questionnaire

const SPORT_OPTIONS_MINI = [
  { value: 'running',   label: 'Running'   },
  { value: 'cycling',   label: 'Cyclisme'  },
  { value: 'triathlon', label: 'Triathlon' },
];

const IMPORTANCE_OPTIONS = [
  { value: 'prep',      label: 'Secondaire / Préparatif' },
  { value: 'important', label: 'Important'               },
  { value: 'principal', label: 'Principal'               },
];

// Mini race card for the "courses" list
function CourseCard({ course, idx, onUpdate, onDelete }) {
  return (
    <div style={{ position: 'relative', padding: '18px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', marginBottom: 12 }}>
      <button onClick={() => onDelete(idx)} style={{
        position: 'absolute', top: 12, right: 12,
        width: 22, height: 22, borderRadius: '50%', border: 'none',
        background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: 14, lineHeight: 1, transition: 'all 0.15s',
      }}>×</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <QField label="Nom de la course" compact>
          <QInput value={course.nom} onChange={v => onUpdate(idx, 'nom', v)} placeholder="Ex : Trail du Beaujolais"/>
        </QField>
        <QField label="Date" compact>
          <QDateInput value={course.date} onChange={v => onUpdate(idx, 'date', v)}/>
        </QField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <QField label="Sport" compact>
          <QRadioGroup value={course.sport} onChange={v => onUpdate(idx, 'sport', v)} columns={3} options={SPORT_OPTIONS_MINI}/>
        </QField>
        <QField label="Temps visé (facultatif)" compact>
          <QInput value={course.temps} onChange={v => onUpdate(idx, 'temps', v)} placeholder="Ex : sub-2h"/>
        </QField>
      </div>

      <QField label="Importance" compact>
        <QRadioGroup value={course.importance} onChange={v => onUpdate(idx, 'importance', v)} columns={3} options={IMPORTANCE_OPTIONS}/>
      </QField>
    </div>
  );
}

// ── Step 1: Bienvenue ──────────────────────────────────────────────────────
function QStep1({ data, set }) {
  function addCourse() {
    const courses = Array.isArray(data.courses) ? data.courses : [];
    set('courses', [...courses, { id: Date.now(), nom: '', sport: '', date: '', temps: '', importance: '' }]);
  }
  function updateCourse(idx, key, val) {
    const courses = [...(data.courses || [])];
    courses[idx] = { ...courses[idx], [key]: val };
    set('courses', courses);
  }
  function deleteCourse(idx) {
    const courses = [...(data.courses || [])];
    courses.splice(idx, 1);
    set('courses', courses);
  }

  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      {/* Intro banner */}
      <div style={{ marginBottom: 28, padding: '16px 20px', borderRadius: 12, background: 'rgba(0,200,224,0.06)', border: '1px solid rgba(0,200,224,0.18)' }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65, margin: 0 }}>
          Ce questionnaire nous permet de construire ton programme sur mesure.{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>10 minutes pour transformer ta saison.</span>
        </p>
      </div>

      {/* Identity */}
      <QSection title="Identité">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="Prénom" required>
            <QInput value={data.prenom} onChange={v => set('prenom', v)} placeholder="Thomas"/>
          </QField>
          <QField label="Nom" required>
            <QInput value={data.nom} onChange={v => set('nom', v)} placeholder="Dupont"/>
          </QField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="Âge">
            <QInput value={data.age} onChange={v => set('age', v)} placeholder="Ex : 34" type="number"/>
          </QField>
          <QField label="Sexe">
            <QRadioGroup value={data.sexe} onChange={v => set('sexe', v)} columns={3}
              options={[{ value: 'homme', label: 'Homme' }, { value: 'femme', label: 'Femme' }, { value: 'autre', label: 'Autre' }]}/>
          </QField>
        </div>
        <QField label="Email" required>
          <QInput value={data.email} onChange={v => set('email', v)} placeholder="thomas@email.com" type="email"/>
        </QField>
        <QField label="Ton objectif principal" required hint="En une phrase : qu'est-ce qui te motive à faire appel à un coach ?">
          <QTextarea value={data.objectif} onChange={v => set('objectif', v)}
            placeholder="Ex : terminer mon premier marathon en moins de 4h30 en avril" rows={2}/>
        </QField>
      </QSection>

      {/* GTY — Goal of the Year */}
      <QSection title="Course principale — GTY">
        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,200,224,0.07)', border: '1px solid rgba(0,200,224,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c8e0', boxShadow: '0 0 8px #00c8e0' }}/>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#00c8e0', letterSpacing: '0.1em', fontWeight: 600 }}>GTY — GOAL OF THE YEAR · Ton objectif ultime de la saison</span>
        </div>

        <QField label="Nom de la course / événement" required>
          <QInput value={data.gty_nom} onChange={v => set('gty_nom', v)} placeholder="Ex : Marathon de Paris · Ironman 70.3 Vichy · La Marmotte"/>
        </QField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="Sport" required>
            <QRadioGroup value={data.gty_sport} onChange={v => set('gty_sport', v)} columns={3} options={SPORT_OPTIONS_MINI}/>
          </QField>
          <QField label="Date de l'événement">
            <QDateInput value={data.gty_date} onChange={v => set('gty_date', v)}/>
          </QField>
        </div>
        <QField label="Temps visé">
          <QInput value={data.gty_temps} onChange={v => set('gty_temps', v)} placeholder="Ex : sub-4h · 1h42 · 5h30"/>
        </QField>
      </QSection>

      {/* Autres courses */}
      <QSection title="Autres courses de la saison">
        {(data.courses || []).map((c, i) => (
          <CourseCard key={c.id || i} course={c} idx={i} onUpdate={updateCourse} onDelete={deleteCourse}/>
        ))}
        <button onClick={addCourse} style={{
          width: '100%', padding: '12px', borderRadius: 10,
          background: 'rgba(0,200,224,0.05)', border: '1px dashed rgba(0,200,224,0.3)',
          cursor: 'pointer', transition: 'all 0.18s', color: '#00c8e0',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Ajouter une course
        </button>
      </QSection>
    </div>
  );
}

// ── Step 2: Mode de vie ────────────────────────────────────────────────────
function QStep2({ data, set }) {
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Disponibilités">
        <QField label="Combien d'heures par semaine peux-tu t'entraîner ?" required>
          <QHoursSlider value={data.heures_semaine} onChange={v => set('heures_semaine', v)}/>
        </QField>
      </QSection>

      <QSection title="Contraintes">
        <QField label="Contraintes professionnelles" hint="Horaires fixes, déplacements fréquents, travail physique ?">
          <QTextarea value={data.contraintes_pro} onChange={v => set('contraintes_pro', v)}
            placeholder="Ex : réunions fixes le lundi matin · déplacements 1 semaine/mois · travail debout..." rows={2}/>
        </QField>
        <QField label="Contraintes personnelles" hint="Famille, voyages, périodes chargées ?">
          <QTextarea value={data.contraintes_perso} onChange={v => set('contraintes_perso', v)}
            placeholder="Ex : enfants en bas âge · semaines chargées en décembre · vacances familiales en été..." rows={2}/>
        </QField>
      </QSection>

      <QSection title="Santé">
        <QField
          label="Blessures ou antécédents médicaux"
          tooltip="Fractures, tendinites, problèmes cardiaques, opérations récentes... Toute information qui nous permettra d'adapter ton programme en toute sécurité."
        >
          <QTextarea value={data.blessures} onChange={v => set('blessures', v)}
            placeholder="Ex : tendinite rotule genou droit 2023 · opération épaule 2022 — ou 'RAS' si rien à signaler" rows={2}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 3: Matériel ───────────────────────────────────────────────────────
function QStep3({ data, set }) {
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Technologie">
        <QField label="Montre GPS" required>
          <QRadioGroup value={data.montre} onChange={v => set('montre', v)} columns={3}
            options={[
              { value: 'garmin',  label: 'Garmin'      },
              { value: 'polar',   label: 'Polar'       },
              { value: 'apple',   label: 'Apple Watch' },
              { value: 'suunto',  label: 'Suunto'      },
              { value: 'autre',   label: 'Autre'       },
              { value: 'aucune',  label: 'Aucune'      },
            ]}/>
        </QField>

        <QField label="Capteur de puissance vélo"
          tooltip="Permet une analyse précise de tes watts à la pédale — indispensable pour un entraînement structuré par zones en cyclisme.">
          <QYesNo value={data.capteur_puissance} onChange={v => set('capteur_puissance', v)}/>
        </QField>
      </QSection>

      <QSection title="Équipement">
        <QField label="Home trainer">
          <QYesNo value={data.home_trainer} onChange={v => set('home_trainer', v)}/>
        </QField>
        <QField label="Accès salle de musculation">
          <QYesNo value={data.salle} onChange={v => set('salle', v)}/>
        </QField>
      </QSection>

      <QSection title="Connectivité">
        <QField label="Compte Strava actif">
          <QYesNo value={data.strava} onChange={v => set('strava', v)}/>
        </QField>
        {data.strava === 'oui' && (
          <QField label="Nom / lien profil Strava">
            <QInput value={data.nom_strava} onChange={v => set('nom_strava', v)} placeholder="Ex : Thomas Dupont ou https://www.strava.com/athletes/..."/>
          </QField>
        )}
      </QSection>
    </div>
  );
}

// ── Step 4: Coaching ───────────────────────────────────────────────────────
function QStep4({ data, set }) {
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Formule">
        <QField label="Pack ou Abonnement ?" required>
          <QRadioGroup value={data.type_coaching}
            onChange={v => { set('type_coaching', v); if (v === 'pack') set('duree_abo', ''); }}
            columns={2}
            options={[
              { value: 'pack', label: 'Pack 4 semaines', desc: 'Sans engagement · résiliable à tout moment · 1ère semaine offerte' },
              { value: 'abo',  label: 'Abonnement',      desc: '3, 6 ou 12 mois · tarif avantageux jusqu\'à −20%' },
            ]}/>
        </QField>

        {data.type_coaching === 'abo' && (
          <QField label="Durée d'engagement" required>
            <QRadioGroup value={data.duree_abo} onChange={v => set('duree_abo', v)} columns={3}
              options={[
                { value: '3m',  label: '3 mois',  desc: '−10% sur le pack' },
                { value: '6m',  label: '6 mois',  desc: '−15% sur le pack' },
                { value: '1an', label: '1 an',    desc: '−20% · meilleur prix' },
              ]}/>
          </QField>
        )}
      </QSection>

      <QSection title="Discipline">
        <QField label="Ton sport principal" required>
          <QRadioGroup value={data.sport} onChange={v => set('sport', v)} columns={3}
            options={[
              { value: 'running',   label: 'Running',   desc: 'Course à pied' },
              { value: 'cycling',   label: 'Cyclisme',  desc: 'Route · Gravel · VTT' },
              { value: 'triathlon', label: 'Triathlon', desc: 'Sprint · M · 70.3' },
            ]}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 5A: Profil Running ────────────────────────────────────────────────
function QStep5Running({ data, set }) {
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Objectif">
        <QField label="Distance cible" required>
          <QRadioGroup value={data.run_objectif} onChange={v => set('run_objectif', v)} columns={3}
            options={[
              { value: '5-10km',   label: '5 – 10 km'    },
              { value: 'semi',     label: 'Semi-marathon' },
              { value: 'marathon', label: 'Marathon'      },
            ]}/>
        </QField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="Temps visé">
            <QInput value={data.run_temps_vise} onChange={v => set('run_temps_vise', v)} placeholder="Ex : sub-4h ou 1h45"/>
          </QField>
          <QField label="Depuis combien de temps tu cours ?">
            <QInput value={data.run_depuis} onChange={v => set('run_depuis', v)} placeholder="Ex : 2 ans"/>
          </QField>
        </div>
      </QSection>

      <QSection title="Volume">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <QField label="Volume actuel (km/sem)">
            <QInput value={data.run_volume_actuel} onChange={v => set('run_volume_actuel', v)} placeholder="Ex : 40"/>
          </QField>
          <QField label="Volume habituel (km/sem)">
            <QInput value={data.run_volume_habituel} onChange={v => set('run_volume_habituel', v)} placeholder="Ex : 55"/>
          </QField>
          <QField label="Max réalisé (km/sem)">
            <QInput value={data.run_volume_max} onChange={v => set('run_volume_max', v)} placeholder="Ex : 80"/>
          </QField>
        </div>
        <QField label="Souhaites-tu augmenter ton volume ?">
          <QYesNo value={data.run_augmenter} onChange={v => set('run_augmenter', v)}/>
        </QField>
        {data.run_augmenter === 'oui' && (
          <QField label="Pourquoi ?">
            <QTextarea value={data.run_augmenter_pourquoi} onChange={v => set('run_augmenter_pourquoi', v)}
              placeholder="Ex : je veux construire une base solide avant d'intensifier..." rows={2}/>
          </QField>
        )}
      </QSection>

      <QSection title="Performances">
        <QField label="As-tu un PR sur ta distance cible ?"
          tooltip="PR = Personal Record, ton meilleur temps officiel sur cette distance, idéalement en compétition.">
          <QYesNo value={data.run_pr} onChange={v => set('run_pr', v)}/>
        </QField>
        {data.run_pr === 'oui' && (
          <QField label="Lequel ?">
            <QInput value={data.run_pr_quoi} onChange={v => set('run_pr_quoi', v)} placeholder="Ex : 1h52 Semi de Lyon 2024 · 4h08 Marathon Paris 2023"/>
          </QField>
        )}
        <QField label="Chronos sur autres distances" hint="Facultatif — tout ce qui nous renseigne sur ton niveau global.">
          <QTextarea value={data.run_autres_chronos} onChange={v => set('run_autres_chronos', v)}
            placeholder="Ex : 5km 21:30 · 10km 44:50 · Semi 1h52" rows={2}/>
        </QField>
      </QSection>

      <QSection title="Contexte">
        <QField label="Ta semaine type actuelle" hint="Nombre de séances, contenu, intensités.">
          <QTextarea value={data.run_semaine_type} onChange={v => set('run_semaine_type', v)}
            placeholder="Ex : lun repos · mer fractionné 6×1km · jeu récup 6km · sam sortie longue 20km Z2..." rows={3}/>
        </QField>
        <QField label="Connaissances en entraînement" hint="Planification, zones, méthodes... Sois honnête, c'est pour mieux te servir !">
          <QTextarea value={data.run_connaissances} onChange={v => set('run_connaissances', v)}
            placeholder="Ex : je connais les zones FC, j'ai suivi des plans Garmin mais sans vraiment comprendre..." rows={2}/>
        </QField>
        <QField label="Pourquoi faire appel à un coach maintenant ?">
          <QTextarea value={data.run_pourquoi_coach} onChange={v => set('run_pourquoi_coach', v)}
            placeholder="Ex : plateau depuis 6 mois · blessures récurrentes · besoin de structure et de progression..." rows={2}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 5B: Profil Cyclisme ───────────────────────────────────────────────
function QStep5Cycling({ data, set }) {
  const hasPower = data.capteur_puissance !== 'non';
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Objectif">
        <QField label="Type d'objectif" required>
          <QRadioGroup value={data.velo_objectif} onChange={v => set('velo_objectif', v)} columns={3}
            options={[
              { value: 'cyclosport', label: 'Cyclosportive', desc: 'Montagne · Gran Fondo' },
              { value: 'course',     label: 'Course FFC',    desc: 'Coupe de France' },
              { value: 'ftp',        label: 'Performance',   desc: 'FTP · Level up' },
            ]}/>
        </QField>
        {data.velo_objectif === 'cyclosport' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <QField label="Distance (km)">
              <QInput value={data.velo_distance} onChange={v => set('velo_distance', v)} placeholder="Ex : 170"/>
            </QField>
            <QField label="Dénivelé positif (D+)">
              <QInput value={data.velo_deniv} onChange={v => set('velo_deniv', v)} placeholder="Ex : 4 200"/>
            </QField>
          </div>
        )}
        <QField label="Depuis combien de temps tu pratiques ?">
          <QInput value={data.velo_depuis} onChange={v => set('velo_depuis', v)} placeholder="Ex : 5 ans"/>
        </QField>
      </QSection>

      <QSection title="Puissance">
        <QField label="Ton FTP"
          tooltip="Functional Threshold Power : la puissance maximale que tu peux maintenir pendant 1 heure environ. Indicateur clé de ta performance en cyclisme.">
          <QInput value={data.velo_ftp} onChange={v => set('velo_ftp', v)} placeholder="Ex : 247 W ou 3.8 W/kg — laissez vide si inconnu"/>
        </QField>
        {hasPower && (
          <QField label="Puissances maximales" hint="Si tu as un capteur — indiquez ce dont vous disposez.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[['velo_5min','5 min'],['velo_10min','10 min'],['velo_20min','20 min'],['velo_2h','2 h'],['velo_5h','5 h']].map(([k,l]) => (
                <QField key={k} label={l} compact>
                  <QInput value={data[k]} onChange={v => set(k, v)} placeholder="W"/>
                </QField>
              ))}
            </div>
          </QField>
        )}
      </QSection>

      <QSection title="Volume">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {[['velo_km_mois','km / mois'],['velo_km_an','km / an'],['velo_h_mois','h / mois'],['velo_h_an','h / an']].map(([k,l]) => (
            <QField key={k} label={l} compact>
              <QInput value={data[k]} onChange={v => set(k, v)} placeholder="—"/>
            </QField>
          ))}
        </div>
      </QSection>

      <QSection title="Profil et contexte">
        <QField label="Ton profil de coureur"
          tooltip="Grimpeur : à l'aise en montée sur longue durée · Sprinteur : puissant sur effort court · Rouleur : efficace sur terrain plat · Puncheur : explosif sur courtes difficultés répétées">
          <QRadioGroup value={data.velo_profil} onChange={v => set('velo_profil', v)} columns={4}
            options={[
              { value: 'grimpeur',  label: 'Grimpeur'  },
              { value: 'sprinteur', label: 'Sprinteur' },
              { value: 'rouleur',   label: 'Rouleur'   },
              { value: 'puncheur',  label: 'Puncheur'  },
            ]}/>
        </QField>
        <QField label="Axes d'amélioration selon toi">
          <QTextarea value={data.velo_axes} onChange={v => set('velo_axes', v)}
            placeholder="Ex : je manque d'endurance fondamentale · mes relances en côte sont trop lentes..." rows={2}/>
        </QField>
        <QField label="Pourquoi faire appel à un coach maintenant ?">
          <QTextarea value={data.velo_pourquoi_coach} onChange={v => set('velo_pourquoi_coach', v)}
            placeholder="Ex : objectif Marmotte cette année · plateau FTP depuis 1 an · besoin de structure..." rows={2}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 5C: Profil Triathlon ──────────────────────────────────────────────
function QStep5Triathlon({ data, set }) {
  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      <QSection title="Objectif">
        <QField label="Distance cible" required>
          <QRadioGroup value={data.tri_objectif} onChange={v => set('tri_objectif', v)} columns={3}
            options={[
              { value: 'sprint',    label: 'Sprint (S)',      desc: '750m · 20km · 5km' },
              { value: 'olympique', label: 'Olympique (M)',   desc: '1.5km · 40km · 10km' },
              { value: '703',       label: 'Ironman 70.3',    desc: '1.9km · 90km · 21km' },
            ]}/>
        </QField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="PR sur cette distance" hint="Si déjà réalisée.">
            <QInput value={data.tri_pr} onChange={v => set('tri_pr', v)} placeholder="Ex : 2h12 · Sprint Nice 2024"/>
          </QField>
          <QField label="Temps visé">
            <QInput value={data.tri_temps_vise} onChange={v => set('tri_temps_vise', v)} placeholder="Ex : sub-5h30"/>
          </QField>
        </div>
      </QSection>

      <QSection title="Volume actuel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <QField label="Heures / semaine">
            <QInput value={data.tri_h_semaine} onChange={v => set('tri_h_semaine', v)} placeholder="Ex : 10"/>
          </QField>
          <QField label="Séances / semaine">
            <QInput value={data.tri_seances_semaine} onChange={v => set('tri_seances_semaine', v)} placeholder="Ex : 7"/>
          </QField>
        </div>
      </QSection>

      <QSection title="Natation">
        <QField label="Chronos en piscine (sans plongeon)"
          tooltip="Indiquez les distances que vous connaissez. Le 400m est le plus courant pour évaluer le niveau triathlon. Le 1900m correspond à la distance 70.3.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['tri_nage_100','100 m'],['tri_nage_400','400 m'],['tri_nage_1900','1 900 m']].map(([k,l]) => (
              <QField key={k} label={l} compact>
                <QInput value={data[k]} onChange={v => set(k, v)} placeholder="min:sec"/>
              </QField>
            ))}
          </div>
        </QField>
      </QSection>

      <QSection title="Cyclisme">
        <QField label="Données puissance"
          tooltip="FTP = puissance que tu peux maintenir sur 1 heure. Indiquez ce dont vous disposez — laissez vide si vous n'avez pas de capteur.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['tri_velo_ftp','FTP'],['tri_velo_5min','5 min'],['tri_velo_10min','10 min'],['tri_velo_20min','20 min']].map(([k,l]) => (
              <QField key={k} label={l} compact>
                <QInput value={data[k]} onChange={v => set(k, v)} placeholder="W"/>
              </QField>
            ))}
          </div>
        </QField>
      </QSection>

      <QSection title="Course à pied">
        <QField label="Chronos CAP" hint="Indiquez ce dont vous disposez.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[['tri_cap_1500','1 500 m'],['tri_cap_5km','5 km'],['tri_cap_10km','10 km'],['tri_cap_semi','Semi'],['tri_cap_marathon','Marathon']].map(([k,l]) => (
              <QField key={k} label={l} compact>
                <QInput value={data[k]} onChange={v => set(k, v)} placeholder="—"/>
              </QField>
            ))}
          </div>
        </QField>
      </QSection>

      <QSection title="Analyse">
        <QField label="Tes points faibles identifiés" tooltip="Les disciplines qui freinent le plus ta progression globale. Tu peux en sélectionner plusieurs.">
          <QCheckboxGroup value={data.tri_point_faible} onChange={v => set('tri_point_faible', v)} columns={5}
            options={[
              { value: 'natation',    label: 'Natation'    },
              { value: 'velo',        label: 'Vélo'        },
              { value: 'course',      label: 'Course'      },
              { value: 'transitions', label: 'Transitions' },
              { value: 'global',      label: 'Global'      },
            ]}/>
        </QField>
        <QField label="Pourquoi faire appel à un coach maintenant ?">
          <QTextarea value={data.tri_pourquoi_coach} onChange={v => set('tri_pourquoi_coach', v)}
            placeholder="Ex : première 70.3, besoin de structurer les 3 disciplines · manque de temps et d'organisation..." rows={2}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 6: Options ────────────────────────────────────────────────────────
function QStep6({ data, set }) {
  const formule    = data.type_coaching; // 'pack' | 'abo'
  const duree      = data.duree_abo;     // '3m' | '6m' | '1an'

  // Determine renfo locked state based on formule
  const renfoClassiqueLocked  = formule === 'abo' && (duree === '6m' || duree === '1an');
  const renfoPuissanceLocked  = formule === 'abo' && (duree === '6m' || duree === '1an');

  // On mount / when formule changes, auto-set locked values
  React.useEffect(() => {
    if (renfoClassiqueLocked && renfoPuissanceLocked) {
      // 6m & 1an → both included, force 'puissance' (highest, includes classique)
      set('renfo', 'puissance_inclus');
    } else if (formule === 'abo' && duree === '3m') {
      // 3m → classique included by default
      if (!data.renfo || data.renfo === 'puissance_inclus') set('renfo', 'classique');
    } else if (formule === 'pack') {
      // Pack → free choice, clear if was a locked value
      if (data.renfo === 'puissance_inclus') set('renfo', '');
    }
  }, [formule, duree]);

  // Suivi: default to 'avance' if not set
  React.useEffect(() => {
    if (!data.suivi) set('suivi', 'avance');
  }, []);

  function handleSuivi(v) {
    // Mutually exclusive: selecting one deselects the other
    set('suivi', v);
  }

  // ── Renfo card renderer ────────────────────────────────────────────────
  function RenfoCard({ value, label, desc, locked, checked, onSelect }) {
    const active = checked;
    return (
      <button
        onClick={() => !locked && onSelect(value)}
        disabled={locked}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 10, marginBottom: 8,
          background: active
            ? 'linear-gradient(135deg,rgba(0,200,224,0.13),rgba(91,111,255,0.09))'
            : locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${active ? 'rgba(0,200,224,0.48)' : locked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'}`,
          cursor: locked ? 'default' : 'pointer',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
          boxShadow: active ? '0 0 18px rgba(0,200,224,0.13)' : 'none',
          position: 'relative', overflow: 'hidden',
          opacity: locked && !active ? 0.55 : 1,
        }}>
        {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#00c8e0,#5b6fff)' }}/>}
        {/* Radio dot */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          border: `2px solid ${active ? '#00c8e0' : 'rgba(255,255,255,0.22)'}`,
          background: active ? '#00c8e0' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: active ? '0 0 8px rgba(0,200,224,0.5)' : 'none',
          transition: 'all 0.15s',
        }}>
          {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#00c8e0' : locked ? 'var(--text-dim)' : 'var(--text)' }}>
              {label}
            </span>
            {locked && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00c8e0', background: 'rgba(0,200,224,0.12)', border: '1px solid rgba(0,200,224,0.28)', borderRadius: 4, padding: '2px 6px' }}>
                Inclus
              </span>
            )}
          </div>
          {desc && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.45 }}>
              {desc}
            </div>
          )}
        </div>
      </button>
    );
  }

  // ── Suivi card renderer ────────────────────────────────────────────────
  function SuiviCard({ value, label, desc, active, onSelect }) {
    return (
      <button
        onClick={() => onSelect(value)}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 10, marginBottom: 8,
          background: active
            ? 'linear-gradient(135deg,rgba(0,200,224,0.13),rgba(91,111,255,0.09))'
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${active ? 'rgba(0,200,224,0.48)' : 'rgba(255,255,255,0.08)'}`,
          cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
          boxShadow: active ? '0 0 18px rgba(0,200,224,0.13)' : 'none',
          position: 'relative', overflow: 'hidden',
        }}>
        {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#00c8e0,#5b6fff)' }}/>}
        <div style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          border: `2px solid ${active ? '#00c8e0' : 'rgba(255,255,255,0.22)'}`,
          background: active ? '#00c8e0' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: active ? '0 0 8px rgba(0,200,224,0.5)' : 'none',
          transition: 'all 0.15s',
        }}>
          {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#00c8e0' : 'var(--text)' }}>
              {label}
            </span>
            {value === 'avance' && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00c8e0', background: 'rgba(0,200,224,0.12)', border: '1px solid rgba(0,200,224,0.28)', borderRadius: 4, padding: '2px 6px' }}>
                Inclus
              </span>
            )}
          </div>
          {desc && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.45 }}>
              {desc}
            </div>
          )}
        </div>
      </button>
    );
  }

  // ── Renfo logic ────────────────────────────────────────────────────────
  // Pack → free choice (classique or puissance or empty)
  // Abo 3m → classique locked+checked, puissance free
  // Abo 6m / 1an → both locked+checked (stored as 'puissance_inclus')
  const isAbo3m    = formule === 'abo' && duree === '3m';
  const isAbo6m1an = formule === 'abo' && (duree === '6m' || duree === '1an');

  const renfoClassiqueChecked  = isAbo6m1an || isAbo3m || data.renfo === 'classique' || data.renfo === 'puissance';
  const renfoPuissanceChecked  = isAbo6m1an || data.renfo === 'puissance';

  function handleRenfoClassique() {
    if (isAbo3m) return; // locked
    if (isAbo6m1an) return; // locked
    // Pack: toggle classique (deselect puissance if selecting classique)
    if (data.renfo === 'classique') set('renfo', '');
    else set('renfo', 'classique');
  }

  function handleRenfoPuissance() {
    if (isAbo6m1an) return; // locked
    if (data.renfo === 'puissance') set('renfo', isAbo3m ? 'classique' : '');
    else set('renfo', 'puissance');
  }

  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>

      <QSection title="Renforcement musculaire">
        <QField label="Quel niveau de renforcement souhaites-tu ?">
          <RenfoCard
            value="classique"
            label="Renfo Classique — +10€/bloc"
            desc="2 séances/semaine · Gainage · Posture · Pliométrie · Prévention blessures"
            locked={isAbo3m || isAbo6m1an}
            checked={renfoClassiqueChecked}
            onSelect={handleRenfoClassique}
          />
          <RenfoCard
            value="puissance"
            label="Renfo Puissance / Explosivité — +20€/bloc"
            desc="Inclut Renfo Classique + travail neuromusculaire · Puissance et explosivité athlétique"
            locked={isAbo6m1an}
            checked={renfoPuissanceChecked}
            onSelect={handleRenfoPuissance}
          />
        </QField>
      </QSection>

      <QSection title="Niveau de suivi coach">
        <QField label="Quel accompagnement tu préfères ?">
          <SuiviCard
            value="avance"
            label="Suivi Avancé — inclus dans tous les plans"
            desc="4 échanges/semaine · Appel tous les 15 jours · Plan A / Plan B · Ajustements hebdomadaires"
            active={data.suivi === 'avance' || !data.suivi}
            onSelect={handleSuivi}
          />
          <SuiviCard
            value="pro"
            label="Suivi Pro — +25€/bloc"
            desc="Échanges quotidiens · 1 appel/semaine · Ajustements jusqu'à 3×/semaine · Réponses prioritaires 24h/24"
            active={data.suivi === 'pro'}
            onSelect={handleSuivi}
          />
        </QField>
      </QSection>

      <QSection title="Informations complémentaires">
        <QField label="Quelque chose d'important à nous dire ?" hint="Tout ce qui n'a pas été couvert et qui pourrait nous aider à mieux te comprendre et t'accompagner.">
          <QTextarea value={data.infos_complementaires} onChange={v => set('infos_complementaires', v)}
            placeholder="Ex : je suis coach sportif moi-même · nutrition spécifique · voyages fréquents · objectif secret..." rows={4}/>
        </QField>
      </QSection>
    </div>
  );
}

// ── Step 7: Confirmation ───────────────────────────────────────────────────
function QStep7({ data, onSubmit }) {
  const [sent, setSent] = React.useState(false);
  const prenom = data.prenom || 'Athlète';

  const sportLabel = { running: 'Running', cycling: 'Cyclisme', triathlon: 'Triathlon' }[data.sport] || data.sport;
  const coachingLabel = data.type_coaching === 'pack'
    ? 'Pack 4 semaines'
    : data.type_coaching === 'abo'
    ? `Abonnement ${data.duree_abo === '3m' ? '3 mois' : data.duree_abo === '6m' ? '6 mois' : '1 an'}`
    : null;

  const sections = [
    { title: 'Identité', rows: [
      { l: 'Nom', v: `${data.prenom || ''} ${data.nom || ''}`.trim() || null },
      { l: 'Email', v: data.email },
      { l: 'Objectif', v: data.objectif },
      { l: 'Échéances', v: data.echeances },
    ]},
    { title: 'Mode de vie', rows: [
      { l: 'Disponibilités', v: data.heures_semaine ? `${data.heures_semaine}h / semaine` : null },
      { l: 'Contraintes pro', v: data.contraintes_pro },
      { l: 'Contraintes perso', v: data.contraintes_perso },
      { l: 'Blessures / santé', v: data.blessures },
    ]},
    { title: 'Matériel', rows: [
      { l: 'Montre GPS', v: data.montre },
      { l: 'Capteur puissance', v: data.capteur_puissance },
      { l: 'Home trainer', v: data.home_trainer },
      { l: 'Salle de muscu', v: data.salle },
      { l: 'Strava', v: data.strava === 'oui' ? `Oui${data.nom_strava ? ` · ${data.nom_strava}` : ''}` : data.strava },
    ]},
    { title: 'Coaching', rows: [
      { l: 'Formule', v: coachingLabel },
      { l: 'Sport', v: sportLabel },
      { l: 'Renforcement', v: data.renfo === 'classique' ? 'Renfo Classique (+10€/bloc)' : data.renfo === 'puissance' ? 'Renfo Puissance (+20€/bloc)' : data.renfo === 'non' ? 'Aucun' : null },
      { l: 'Suivi', v: data.suivi === 'pro' ? 'Suivi Pro (+25€/bloc)' : data.suivi === 'avance' ? 'Suivi Avancé (inclus)' : null },
    ]},
  ];

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', animation: 'qFadeUp 0.4s ease both' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(0,200,224,0.4)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px' }}>Candidature envoyée !</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 28px' }}>
          Tu recevras un email de confirmation sous <strong style={{ color: 'var(--text)' }}>24h</strong>. Ton appel découverte de <strong style={{ color: 'var(--text)' }}>30 minutes</strong> sera planifié rapidement. On a hâte de travailler avec toi.
        </p>
        <a href="index.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', color: '#fff', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,200,224,0.35)' }}>
          ← Retour à l'accueil
        </a>
      </div>
    );
  }

  return (
    <div style={{ animation: 'qFadeUp 0.35s ease both' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,200,224,0.38)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
          Merci {prenom}.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65, maxWidth: 480, margin: '0 auto' }}>
          Ton dossier est entre de bonnes mains. Vérifie les informations ci-dessous avant d'envoyer ta candidature.
        </p>
      </div>

      {/* Recap sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {sections.map((s, i) => {
          const rows = s.rows.filter(r => r.v);
          if (!rows.length) return null;
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#00c8e0,transparent)' }}/>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00c8e0', marginBottom: 12 }}>{s.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rows.map((r, j) => (
                  <div key={j} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-dim)', minWidth: 130, flexShrink: 0, paddingTop: 1 }}>{r.l}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reassurance */}
      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(0,200,224,0.06)', border: '1px solid rgba(0,200,224,0.18)', marginBottom: 8 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.65 }}>
          Tu recevras un email de confirmation sous <strong style={{ color: 'var(--text)' }}>24h</strong>. Ton appel découverte gratuit de <strong style={{ color: 'var(--text)' }}>30 minutes</strong> sera planifié rapidement.
        </div>
      </div>

      {/* Submit handled by parent via onSubmit prop — button rendered in QApp nav */}
    </div>
  );
}

Object.assign(window, {
  QStep1, QStep2, QStep3, QStep4,
  QStep5Running, QStep5Cycling, QStep5Triathlon,
  QStep6, QStep7,
});
