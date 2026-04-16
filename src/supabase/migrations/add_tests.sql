-- ══════════════════════════════════════════════════════════════
-- MIGRATION : Tests de performance — THW Coaching
-- Tables : test_definitions · test_results · test_files
-- RLS activé, indexes sur user_id + date
-- ══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- TYPE : catégorie de test
-- ────────────────────────────────────────────────────────────────
CREATE TYPE test_categorie AS ENUM (
  'physiologie',
  'performance',
  'endurance',
  'technique'
);

-- ────────────────────────────────────────────────────────────────
-- TYPE : sport (aligné sur les sports supportés de l'app)
-- ────────────────────────────────────────────────────────────────
CREATE TYPE test_sport AS ENUM (
  'running',
  'cycling',
  'natation',
  'aviron',
  'hyrox',
  'gym'
);

-- ────────────────────────────────────────────────────────────────
-- TYPE : format fichier test
-- ────────────────────────────────────────────────────────────────
CREATE TYPE test_file_type AS ENUM (
  'fit',
  'gpx',
  'csv',
  'pdf'
);

-- ══════════════════════════════════════════════════════════════
-- 1. test_definitions
--    Catalogue des protocoles de test (données de référence).
--    Pas de user_id : partagé entre tous les utilisateurs.
--    Extensible via jsonb pour matériel et variables mesurées.
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS test_definitions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sport                  test_sport       NOT NULL,
  categorie              test_categorie   NOT NULL,

  nom                    text             NOT NULL,
  description            text             NOT NULL,

  -- Protocole complet (texte libre, markdown accepté)
  protocole              text,

  -- Ex: [{"nom": "Ergomètre Concept2", "obligatoire": true}, ...]
  materiel               jsonb            NOT NULL DEFAULT '[]'::jsonb,

  -- Ex: [{"cle": "puissance_moyenne", "unite": "W", "type": "number"}, ...]
  donnees_a_enregistrer  jsonb            NOT NULL DEFAULT '[]'::jsonb,

  -- Durée indicative en minutes (null = variable)
  duree_indicative_min   integer,

  -- Niveau de difficulté : 1 = modéré, 2 = intense, 3 = maximal
  niveau_difficulte      smallint         CHECK (niveau_difficulte BETWEEN 1 AND 3),

  created_at             timestamptz      NOT NULL DEFAULT now(),
  updated_at             timestamptz      NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER test_definitions_updated_at
  BEFORE UPDATE ON test_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index
CREATE INDEX idx_test_definitions_sport
  ON test_definitions (sport);

CREATE INDEX idx_test_definitions_categorie
  ON test_definitions (categorie);

-- RLS
ALTER TABLE test_definitions ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut lire le catalogue
CREATE POLICY "test_definitions_select"
  ON test_definitions FOR SELECT
  TO authenticated
  USING (true);

-- Seul le service role peut insérer / modifier les définitions
CREATE POLICY "test_definitions_insert_service"
  ON test_definitions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "test_definitions_update_service"
  ON test_definitions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 2. test_results
--    Résultats d'un test réalisé par un athlète.
--    valeurs (jsonb) stocke les mesures spécifiques au test.
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS test_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id              uuid        NOT NULL
                                   REFERENCES auth.users (id)
                                   ON DELETE CASCADE,

  test_definition_id   uuid        NOT NULL
                                   REFERENCES test_definitions (id)
                                   ON DELETE RESTRICT,

  -- Date à laquelle le test a été réalisé (pas forcément now())
  date                 date        NOT NULL,

  -- Mesures libres : {"vo2max": 62, "puissance_pic": 380, ...}
  valeurs              jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Notes libres de l'athlète ou du coach
  notes                text,

  -- URL vers un fichier externe (Strava, Garmin Connect, etc.)
  fichier_url          text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER test_results_updated_at
  BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index principaux
CREATE INDEX idx_test_results_user_id
  ON test_results (user_id);

CREATE INDEX idx_test_results_date
  ON test_results (date DESC);

-- Index composite pour les requêtes user × date (dashboard, tri)
CREATE INDEX idx_test_results_user_date
  ON test_results (user_id, date DESC);

-- Index composite pour les requêtes user × définition (historique d'un test)
CREATE INDEX idx_test_results_user_definition
  ON test_results (user_id, test_definition_id);

-- RLS
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_results_select_own"
  ON test_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "test_results_insert_own"
  ON test_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "test_results_update_own"
  ON test_results FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "test_results_delete_own"
  ON test_results FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- 3. test_files
--    Fichiers attachés à un résultat de test (.fit, .gpx, etc.)
--    Séparé de test_results pour gérer N fichiers par résultat.
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS test_files (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id          uuid           NOT NULL
                                  REFERENCES auth.users (id)
                                  ON DELETE CASCADE,

  test_result_id   uuid           NOT NULL
                                  REFERENCES test_results (id)
                                  ON DELETE CASCADE,

  nom_fichier      text           NOT NULL,
  type             test_file_type NOT NULL,

  -- URL Supabase Storage (bucket "test-files")
  url              text           NOT NULL,

  -- Taille en octets
  taille           bigint         CHECK (taille > 0),

  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_test_files_user_id
  ON test_files (user_id);

CREATE INDEX idx_test_files_result_id
  ON test_files (test_result_id);

-- RLS
ALTER TABLE test_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_files_select_own"
  ON test_files FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "test_files_insert_own"
  ON test_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "test_files_delete_own"
  ON test_files FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- DONNÉES DE RÉFÉRENCE — test_definitions
-- Catalogue initial aligné sur les tests de la page Performance
-- ══════════════════════════════════════════════════════════════
INSERT INTO test_definitions
  (sport, categorie, nom, description, protocole, materiel, donnees_a_enregistrer, duree_indicative_min, niveau_difficulte)
VALUES

-- ── RUNNING ──────────────────────────────────────────────────
(
  'running', 'physiologie', 'VO2max',
  'Test d''effort gradué pour mesurer la consommation maximale d''oxygène. Paliers progressifs jusqu''à épuisement.',
  'Protocole par paliers de 1 km/h toutes les 2 min sur tapis. Arrêt à épuisement volontaire ou FC max atteinte.',
  '[{"nom": "Tapis de course ou piste", "obligatoire": true}, {"nom": "Analyseur de gaz (optionnel)", "obligatoire": false}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "vo2max", "label": "VO2max", "unite": "ml/kg/min", "type": "number"}, {"cle": "fc_max", "label": "FC max atteinte", "unite": "bpm", "type": "number"}, {"cle": "vitesse_max", "label": "Vitesse maximale", "unite": "km/h", "type": "number"}]',
  30, 3
),
(
  'running', 'performance', 'VMA',
  'Vitesse Maximale Aérobie sur piste. Détermine ton allure plafond pour calibrer toutes tes zones.',
  'Test de 6 min à allure maximale sur piste. Calculer : VMA (km/h) = distance (m) / 100.',
  '[{"nom": "Piste d''athlétisme 400m", "obligatoire": true}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "vma", "label": "VMA", "unite": "km/h", "type": "number"}, {"cle": "distance_6min", "label": "Distance en 6 min", "unite": "m", "type": "number"}, {"cle": "fc_max_atteinte", "label": "FC max atteinte", "unite": "bpm", "type": "number"}]',
  6, 3
),
(
  'running', 'physiologie', 'Test lactate',
  'Mesure de la lactatémie à différentes intensités. Zones précises, identification du seuil SL1 et SL2.',
  'Paliers de 5 min de 8 km/h à +1 km/h par palier. Prise de sang au lobe de l''oreille en fin de chaque palier.',
  '[{"nom": "Tapis de course", "obligatoire": true}, {"nom": "Lactatomètre", "obligatoire": true}, {"nom": "Bandelettes de test lactate", "obligatoire": true}]',
  '[{"cle": "sl1_vitesse", "label": "Vitesse SL1", "unite": "km/h", "type": "number"}, {"cle": "sl2_vitesse", "label": "Vitesse SL2", "unite": "km/h", "type": "number"}, {"cle": "courbe_lactate", "label": "Courbe lactate", "unite": null, "type": "json"}]',
  75, 1
),
(
  'running', 'endurance', 'Cooper',
  '12 minutes d''effort maximal en continu. Distance parcourue → estimation VO2max selon la formule Cooper.',
  'Courir la plus grande distance possible en 12 min sur piste. VO2max estimé = (distance m − 504.9) / 44.73.',
  '[{"nom": "Piste d''athlétisme 400m", "obligatoire": true}]',
  '[{"cle": "distance_12min", "label": "Distance en 12 min", "unite": "m", "type": "number"}, {"cle": "vo2max_estime", "label": "VO2max estimé", "unite": "ml/kg/min", "type": "number"}]',
  12, 3
),
(
  'running', 'endurance', 'TMI',
  'Test de Maintien d''Intensité. Mesure la capacité à tenir une allure au seuil lactate sur durée prolongée.',
  'Courir 30 min à l''allure seuil lactate (SL2). Mesurer la dérive cardiaque et le maintien de l''allure.',
  '[{"nom": "Tapis ou piste", "obligatoire": true}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "allure_seuil", "label": "Allure seuil maintenue", "unite": "min/km", "type": "string"}, {"cle": "fc_debut", "label": "FC début", "unite": "bpm", "type": "number"}, {"cle": "fc_fin", "label": "FC fin", "unite": "bpm", "type": "number"}, {"cle": "derive_cardiaque", "label": "Dérive cardiaque", "unite": "%", "type": "number"}]',
  30, 2
),

-- ── CYCLING ──────────────────────────────────────────────────
(
  'cycling', 'performance', 'CP20',
  'Critical Power sur 20 minutes — puissance moyenne × 0.95 = estimation FTP. Le test vélo de référence.',
  'Après 20 min d''échauffement, effort maximal soutenu pendant 20 min. FTP = puissance moyenne × 0.95.',
  '[{"nom": "Home trainer ou vélo de route", "obligatoire": true}, {"nom": "Capteur de puissance", "obligatoire": true}]',
  '[{"cle": "puissance_moyenne_20min", "label": "Puissance moyenne 20 min", "unite": "W", "type": "number"}, {"cle": "ftp_estime", "label": "FTP estimé (×0.95)", "unite": "W", "type": "number"}, {"cle": "wkg", "label": "W/kg", "unite": "W/kg", "type": "number"}]',
  40, 3
),
(
  'cycling', 'performance', 'Critical Power',
  'Modèle multi-durées pour tracer la courbe puissance-durée et calculer W'' et CP.',
  'Réaliser 3 efforts max sur des durées différentes (3 min, 8 min, 20 min) sur 2 séances. Modéliser P = CP + W''/t.',
  '[{"nom": "Home trainer ou vélo de route", "obligatoire": true}, {"nom": "Capteur de puissance", "obligatoire": true}]',
  '[{"cle": "cp", "label": "Critical Power", "unite": "W", "type": "number"}, {"cle": "w_prime", "label": "W'' (capacité anaérobie)", "unite": "kJ", "type": "number"}, {"cle": "puissance_3min", "label": "Puissance 3 min", "unite": "W", "type": "number"}, {"cle": "puissance_8min", "label": "Puissance 8 min", "unite": "W", "type": "number"}, {"cle": "puissance_20min", "label": "Puissance 20 min", "unite": "W", "type": "number"}]',
  null, 3
),
(
  'cycling', 'physiologie', 'Lactate',
  'Profil lactatémique sur ergocycle. Paliers de 5 min, prise de sang au doigt. Zones ultra-précises.',
  'Paliers de 5 min de 100W à +25W par palier. Prise de sang au doigt en fin de chaque palier. Arrêt à 4 mmol/L ou épuisement.',
  '[{"nom": "Ergocycle ou home trainer", "obligatoire": true}, {"nom": "Capteur de puissance", "obligatoire": true}, {"nom": "Lactatomètre", "obligatoire": true}]',
  '[{"cle": "ftp_lactate", "label": "FTP via lactatémie", "unite": "W", "type": "number"}, {"cle": "seuil1_puissance", "label": "Puissance seuil 1", "unite": "W", "type": "number"}, {"cle": "seuil2_puissance", "label": "Puissance seuil 2", "unite": "W", "type": "number"}, {"cle": "courbe_lactate", "label": "Courbe lactate", "unite": null, "type": "json"}]',
  80, 1
),
(
  'cycling', 'endurance', 'Endurance',
  'Test de 2h à puissance modérée (60–65% FTP). Calibration de la zone 2 et mesure de la dérive cardiaque.',
  'Rouler 2h à 60–65% du FTP. Enregistrer la FC toutes les 15 min. Calculer la dérive cardiaque = (FC60–FC30)/FC30.',
  '[{"nom": "Home trainer ou route", "obligatoire": true}, {"nom": "Capteur de puissance", "obligatoire": false}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "puissance_zone2", "label": "Puissance zone 2", "unite": "W", "type": "number"}, {"cle": "derive_cardiaque", "label": "Dérive cardiaque", "unite": "%", "type": "number"}, {"cle": "fc_z2_stable", "label": "FC zone 2 stable", "unite": "bpm", "type": "number"}]',
  120, 1
),
(
  'cycling', 'physiologie', 'VO2max / PMA',
  'Test rampe sur ergocycle. Paliers de 1 min, +20W à chaque étape. Détermine la Puissance Maximale Aérobie.',
  'Partir de 100W, augmenter de 20W toutes les minutes jusqu''à épuisement. PMA = dernière puissance tenue ≥ 45 sec.',
  '[{"nom": "Ergocycle ou home trainer", "obligatoire": true}, {"nom": "Capteur de puissance", "obligatoire": true}]',
  '[{"cle": "pma", "label": "PMA", "unite": "W", "type": "number"}, {"cle": "vo2max_estime", "label": "VO2max estimé", "unite": "ml/kg/min", "type": "number"}, {"cle": "fc_max", "label": "FC max", "unite": "bpm", "type": "number"}]',
  20, 3
),
(
  'cycling', 'performance', 'Wingate',
  'Sprint anaérobie de 30 secondes à résistance maximale. Mesure puissance de crête et capacité anaérobie.',
  'Sprint maximal de 30 sec sur ergocycle à résistance fixe (7.5% poids corporel). Capturer puissance toutes les 5 sec.',
  '[{"nom": "Ergocycle Wingate (Monark ou équivalent)", "obligatoire": true}]',
  '[{"cle": "puissance_pic", "label": "Puissance de crête", "unite": "W", "type": "number"}, {"cle": "puissance_moyenne", "label": "Puissance moyenne 30s", "unite": "W", "type": "number"}, {"cle": "indice_fatigue", "label": "Indice de fatigue", "unite": "%", "type": "number"}, {"cle": "travail_total", "label": "Travail total", "unite": "J", "type": "number"}]',
  1, 3
),

-- ── NATATION ─────────────────────────────────────────────────
(
  'natation', 'performance', 'CSS',
  'Critical Swim Speed — allure au seuil lactate en natation. Calculée depuis le 400m et le 200m.',
  'Récupération 30 min entre efforts. CSS (m/min) = (400 − 200) / (T400 − T200).',
  '[{"nom": "Piscine 25m ou 50m", "obligatoire": true}]',
  '[{"cle": "css", "label": "CSS", "unite": "/100m", "type": "string"}, {"cle": "temps_200m", "label": "Temps 200m", "unite": "min:sec", "type": "string"}, {"cle": "temps_400m", "label": "Temps 400m", "unite": "min:sec", "type": "string"}]',
  30, 2
),
(
  'natation', 'performance', 'VMax',
  'Vitesse maximale sur 25 ou 50m. Mesure la puissance explosive en eau et le sprint nage.',
  '3 répétitions de 25m (ou 50m) sprint maximal, récupération complète (5 min) entre chaque. Prendre le meilleur temps.',
  '[{"nom": "Piscine 25m ou 50m", "obligatoire": true}, {"nom": "Chronomètre (ou capteur de nage)", "obligatoire": true}]',
  '[{"cle": "vmax_25m", "label": "Temps 25m", "unite": "sec", "type": "number"}, {"cle": "vitesse_max", "label": "Vitesse max", "unite": "m/s", "type": "number"}]',
  15, 3
),

-- ── AVIRON ───────────────────────────────────────────────────
(
  'aviron', 'performance', '2000m',
  'Test référence Concept2. Effort anaérobie lactique de ~7 min. Comparaison mondiale via le classement Concept2.',
  'Après 20 min d''échauffement, effort maximal sur 2000m. Prendre le split /500m moyen et le score Concept2.',
  '[{"nom": "Ergomètre Concept2 (RowErg)", "obligatoire": true}]',
  '[{"cle": "temps_total", "label": "Temps total", "unite": "min:sec", "type": "string"}, {"cle": "split_500m", "label": "Split /500m moyen", "unite": "min:sec", "type": "string"}, {"cle": "puissance_moyenne", "label": "Puissance moyenne", "unite": "W", "type": "number"}, {"cle": "spm_moyen", "label": "Cadence moyenne", "unite": "spm", "type": "number"}]',
  7, 3
),
(
  'aviron', 'endurance', 'Endurance 10000m',
  'Capacité aérobie et gestion de l''allure sur longue durée. Mesure de la dérive technique et cardiaque.',
  'Ramer 10000m à allure modérée (zone 2). Maintenir une cadence stable (18–22 spm). Noter split tous les 2000m.',
  '[{"nom": "Ergomètre Concept2", "obligatoire": true}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "temps_total", "label": "Temps total", "unite": "min:sec", "type": "string"}, {"cle": "split_500m_moyen", "label": "Split /500m moyen", "unite": "min:sec", "type": "string"}, {"cle": "derive_cardiaque", "label": "Dérive cardiaque", "unite": "%", "type": "number"}]',
  40, 1
),
(
  'aviron', 'endurance', '30 minutes',
  'Distance maximale parcourue en 30 minutes. Estimateur direct du FTP aviron (split /500m de référence).',
  'Effort maximal soutenu pendant 30 min. FTP aviron = split /500m moyen obtenu.',
  '[{"nom": "Ergomètre Concept2", "obligatoire": true}]',
  '[{"cle": "distance_30min", "label": "Distance en 30 min", "unite": "m", "type": "number"}, {"cle": "split_500m_ftp", "label": "Split FTP /500m", "unite": "min:sec", "type": "string"}, {"cle": "puissance_ftp", "label": "Puissance FTP", "unite": "W", "type": "number"}]',
  30, 2
),
(
  'aviron', 'performance', 'Power',
  'Test de puissance explosive sur ergomètre. Sprint de 10 secondes à résistance maximale.',
  'Sprint maximal de 10 sec. Partir d''un arrêt complet. Capturer la puissance de crête.',
  '[{"nom": "Ergomètre Concept2", "obligatoire": true}]',
  '[{"cle": "puissance_pic", "label": "Puissance de crête", "unite": "W", "type": "number"}, {"cle": "split_min", "label": "Split minimal atteint", "unite": "min:sec", "type": "string"}]',
  1, 3
),
(
  'aviron', 'physiologie', 'VO2max',
  'Test rampe sur ergomètre. Résistance croissante toutes les 60 secondes jusqu''à épuisement.',
  'Partir à 150W, augmenter de 25W toutes les 60 sec. Arrêt à épuisement ou impossibilité de maintenir le rythme.',
  '[{"nom": "Ergomètre Concept2", "obligatoire": true}, {"nom": "Cardiofréquencemètre", "obligatoire": true}]',
  '[{"cle": "pma", "label": "PMA aviron", "unite": "W", "type": "number"}, {"cle": "vo2max_estime", "label": "VO2max estimé", "unite": "ml/kg/min", "type": "number"}, {"cle": "fc_max", "label": "FC max", "unite": "bpm", "type": "number"}]',
  18, 3
),

-- ── HYROX ────────────────────────────────────────────────────
(
  'hyrox', 'performance', 'PFT',
  'Performance Fitness Test — circuit Hyrox complet chronométré. Référence globale pour évaluer ton niveau.',
  'Circuit complet : 8 × (1km run + 1 station). Stations standard Hyrox. Chronométrage global et par station.',
  '[{"nom": "Box Hyrox ou salle équipée", "obligatoire": true}, {"nom": "SkiErg, Sled, Burpee zone, Rowing, Farmer carries, Sandbags, Wall balls", "obligatoire": true}]',
  '[{"cle": "temps_total", "label": "Temps total", "unite": "min:sec", "type": "string"}, {"cle": "roxzone", "label": "Roxzone", "unite": "min:sec", "type": "string"}, {"cle": "total_running", "label": "Total running", "unite": "min:sec", "type": "string"}, {"cle": "stations", "label": "Temps par station", "unite": null, "type": "json"}]',
  70, 3
),
(
  'hyrox', 'technique', 'Station isolée',
  'Test chronométré sur une station Hyrox spécifique au choix. Identifie tes points faibles.',
  'Réaliser la station choisie dans les conditions standard Hyrox (distance, poids). Chronométrer.',
  '[{"nom": "Équipement de la station choisie", "obligatoire": true}]',
  '[{"cle": "station_nom", "label": "Station testée", "unite": null, "type": "string"}, {"cle": "temps", "label": "Temps", "unite": "min:sec", "type": "string"}, {"cle": "poids_utilise", "label": "Poids utilisé", "unite": "kg", "type": "number"}]',
  5, 2
),
(
  'hyrox', 'performance', 'BBJ',
  'Burpee Broad Jump — 20 répétitions chronométrées ou distance maximale sur série standardisée.',
  '20 BBJ consécutifs, chronométrer le temps total. Ou distance totale sur 20 répétitions.',
  '[{"nom": "Sol plat, espace de 10m minimum", "obligatoire": true}]',
  '[{"cle": "temps_20reps", "label": "Temps 20 reps", "unite": "sec", "type": "number"}, {"cle": "distance_totale", "label": "Distance totale", "unite": "m", "type": "number"}]',
  4, 2
),
(
  'hyrox', 'endurance', 'Farmer Carry',
  'Charges standardisées Hyrox (24/32 kg). Distance maximale ou chrono sur 200m.',
  '200m de Farmer Carry (2 × 24 kg femme, 2 × 32 kg homme). Chronométrer. Pénalité si pose.',
  '[{"nom": "Kettlebells ou farmer carry handles", "obligatoire": true}]',
  '[{"cle": "temps_200m", "label": "Temps 200m", "unite": "sec", "type": "number"}, {"cle": "poids_par_main", "label": "Poids par main", "unite": "kg", "type": "number"}, {"cle": "poses", "label": "Nombre de poses", "unite": null, "type": "number"}]',
  3, 2
),
(
  'hyrox', 'endurance', 'Wall Ball',
  'Nombre maximal de répétitions en 5 min ou chrono sur 100 reps.',
  'Wall Ball standard (6 kg femme, 9 kg homme, cible à 3m). Max reps en 5 min ou chrono 100 reps.',
  '[{"nom": "Wall ball (6 ou 9 kg)", "obligatoire": true}, {"nom": "Cible murale à 3m", "obligatoire": true}]',
  '[{"cle": "reps_5min", "label": "Reps en 5 min", "unite": null, "type": "number"}, {"cle": "temps_100reps", "label": "Temps 100 reps", "unite": "sec", "type": "number"}, {"cle": "poids_balle", "label": "Poids balle", "unite": "kg", "type": "number"}]',
  5, 2
),
(
  'hyrox', 'performance', 'Sled Push',
  'Poids maximal poussé sur 25m × 4 allers-retours. Test de force-vitesse sur sled Hyrox standardisé.',
  '4 × 25m de sled push. Chrono global. Poids standard : 102 kg femme, 152 kg homme (sled inclus).',
  '[{"nom": "Sled Hyrox", "obligatoire": true}, {"nom": "Couloir de 25m minimum", "obligatoire": true}]',
  '[{"cle": "temps_total", "label": "Temps total", "unite": "sec", "type": "number"}, {"cle": "poids_total", "label": "Poids total (sled + charge)", "unite": "kg", "type": "number"}]',
  3, 3
),
(
  'hyrox', 'performance', 'Sled Pull',
  'Poids maximal tiré sur 25m × 4 allers-retours avec corde. Test de force de traction.',
  '4 × 25m de sled pull à la corde (longueur 10m). Poids standard : 78 kg femme, 103 kg homme.',
  '[{"nom": "Sled Hyrox + corde 10m", "obligatoire": true}, {"nom": "Couloir de 25m minimum", "obligatoire": true}]',
  '[{"cle": "temps_total", "label": "Temps total", "unite": "sec", "type": "number"}, {"cle": "poids_total", "label": "Poids total", "unite": "kg", "type": "number"}]',
  3, 3
),
(
  'hyrox', 'technique', 'Run Compromised',
  'Allure de course mesurée immédiatement après une station Hyrox. Quantifie l''impact de la fatigue sur la foulée.',
  'Réaliser 1 station Hyrox, puis enchaîner immédiatement 1km de course chronométrée. Comparer à un 1km à froid.',
  '[{"nom": "Équipement de la station choisie", "obligatoire": true}, {"nom": "Couloir ou piste 1km", "obligatoire": true}]',
  '[{"cle": "temps_1km_compromis", "label": "Temps 1km compromised", "unite": "min:sec", "type": "string"}, {"cle": "temps_1km_frais", "label": "Temps 1km à froid (référence)", "unite": "min:sec", "type": "string"}, {"cle": "perte_performance", "label": "Perte de performance", "unite": "%", "type": "number"}, {"cle": "station_prealable", "label": "Station préalable", "unite": null, "type": "string"}]',
  15, 2
);
