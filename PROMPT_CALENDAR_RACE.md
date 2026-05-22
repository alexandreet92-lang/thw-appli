# CALENDAR — Onglet Race

## ⚠️ Contrainte d'implémentation obligatoire
Ne jamais écrire plus de 200 lignes dans un seul fichier en une seule fois.
Décomposer en composants séparés dans ce dossier :
`app/(dashboard)/calendar/components/`

Fichiers à créer dans cet ordre, un par un, en validant chaque fichier avant de passer au suivant :
1. `GoalBanner.tsx`
2. `NextRaceBar.tsx`
3. `AnnualView.tsx`
4. `MonthlyView.tsx`
5. `RaceModal.tsx`
6. `EventModal.tsx`
7. `page.tsx` (importe tous les composants ci-dessus)

---

## Contexte
Page Calendar existante avec onglets Race / Pro / Perso / All.
Vérifier le fichier page.tsx existant avant d'écrire quoi que ce soit.
Rester cohérent avec le design existant de l'app (couleurs, typographie, spacing).
Ne pas casser les autres onglets.

---

## 1. Supabase — Schéma
Vérifier d'abord les tables existantes avant toute migration.
Créer uniquement ce qui manque.

### Table `races`
- id : uuid pk
- user_id : uuid fk auth.users
- name : text
- date : date
- sport : text — 'running' / 'cycling' / 'swimming' / 'hyrox' / 'triathlon' / 'rowing'
- level : text — 'GTY' / 'principal' / 'important' / 'secondaire'
- status : text — 'upcoming' / 'completed', default 'upcoming'
- distance : text
- time_goal : text — HH:MM:SS
- performance_data : jsonb
- nutrition_strategy : jsonb
- notes : text
- created_at : timestamptz default now()

### Table `race_files`
- id : uuid pk
- race_id : uuid fk races on delete cascade
- file_url : text
- file_name : text
- file_type : text
- label : text — ex: "Parcours vélo", "Parcours run"
- created_at : timestamptz

### Table `race_events`
- id : uuid pk
- user_id : uuid fk auth.users
- name : text
- start_date : date
- end_date : date
- description : text
- daily_program : jsonb — array de { date: string, content: string }
- created_at : timestamptz

### Table `race_event_files`
- id : uuid pk
- event_id : uuid fk race_events on delete cascade
- file_url : text
- file_name : text
- created_at : timestamptz

RLS activé sur toutes les tables.
Policy standard : lecture/écriture pour user_id = auth.uid().
Storage bucket `race-files` pour tous les fichiers.

---

## 2. GoalBanner.tsx
Bandeau plein largeur, fond noir.
Affiche la course avec level = 'GTY' de l'année en cours.
- Gauche : label "GOAL OF THE YEAR" (petit, gris clair) + nom (grand, blanc, gras) + time_goal
- Droite : nombre de jours restants (grand, blanc) + "jours restants" (petit)
Si aucune course GTY : message "Aucun objectif principal défini" centré, gris.

---

## 3. NextRaceBar.tsx
Barre fixée en bas de l'onglet Race.
Prochaine course dont date > aujourd'hui et status = 'upcoming'.
- Carré rouge à gauche : nombre de jours + "jours"
- Nom de la course + date complète format "dimanche 7 juin" + distance ou classement cible
- Bouton "Modifier" à droite (ouvre RaceModal en mode édition)
Masqué si aucune course à venir.

---

## 4. AnnualView.tsx
Grid 4 colonnes × 3 lignes, Jan à Déc.
Chaque carte de mois :
- Nom du mois abrégé en haut à gauche
- Courses du mois triées par date :
  - Point coloré + nom + jour/mois en petit
  - Si status = 'completed' : icône checkmark gris à droite
- Événements (race_events) : même affichage, fond bleu pâle, bordure bleue
- Si vide : texte "Aucun" en gris

Couleurs par level :
- GTY : fond noir, texte blanc
- principal : fond rose clair, texte rouge
- important : fond orange clair, texte orange
- secondaire : fond vert clair, texte vert

Clic sur une course : ouvre RaceModal en mode édition.
Clic sur checkmark quand date passée : appelle Supabase pour passer status = 'completed'.

---

## 5. MonthlyView.tsx
Grid calendrier 7 colonnes (lundi → dimanche).
Navigation mois précédent / suivant avec flèches.
Courses positionnées sur leur jour : point coloré + nom court.
Événements multi-jours : s'étalent sur les jours concernés.
Jours sans événement : vides.

---

## 6. RaceModal.tsx
Modal scrollable, max-width 600px.
Titre : "Ajouter une course" ou "Modifier une course".

### Champs dans l'ordre :

**SPORT** — pills à sélection unique :
Course à pied | Cyclisme | Natation | Hyrox | Triathlon | Aviron

**NIVEAU** — grille 2×2 :
GTY (vert) | Principal
Important (orange) | Secondaire
Sélection unique, état actif = fond coloré.

**NOM + DATE** — côte à côte

**Champs dynamiques selon sport :**

Course à pied :
- Distance : pills (5 km / 10 km / Semi-marathon / Marathon / Autre)
- Objectif temps : HH:MM:SS
- Allure : calculée auto (lecture seule, min/km)
- FC cible : input numérique bpm
- Classement cible : input texte

Cyclisme :
- Distance : input texte km
- Objectif temps : HH:MM:SS
- Watts moyen cible : input numérique
- Classement cible : input texte

Natation (cascade) :
- Étape 1 — Nage : Nage libre | Dos | Brasse | Papillon | Quatre nages
- Étape 2 — Distance selon nage :
  - Nage libre : 50 / 100 / 200 / 400 / 800 / 1500 m
  - Dos / Brasse / Papillon : 50 / 100 / 200 m
  - Quatre nages : 200 / 400 m
- Étape 3 — Objectif : deux inputs côte à côte (secondes | millisecondes)
- Bouton "← Retour" pour revenir à l'étape précédente

Hyrox :
- Objectif temps total : HH:MM:SS
- 8 stations dans cet ordre, un input MM:SS chacune :
  SkiErg / Sled Push / Sled Pull / Burpee Broad Jump / Rowing / Farmers Carry / Sandbag Lunges / Wall Balls
- Temps Roxzone cumulé : MM:SS
- Temps run cumulé des 8 runs : MM:SS

Triathlon :
- Temps natation : HH:MM:SS → allure /100m calculée auto
- T1 : MM:SS
- Temps vélo : HH:MM:SS + distance km → vitesse km/h calculée auto + watts moyen cible
- T2 : MM:SS
- Temps run : HH:MM:SS + distance km → allure min/km calculée auto

Aviron :
- Distance : pills (500 m / 1000 m / 2000 m / 5000 m / Autre)
- Objectif temps : MM:SS
- Split /500m : calculé auto, lecture seule
- Classement cible : input texte

**Upload parcours :**
Zone drag & drop + bouton "Parcourir". Tous formats acceptés.
Triathlon uniquement : deux zones séparées "Parcours vélo" et "Parcours run".
Liste des fichiers uploadés avec bouton suppression.
Upload vers Supabase Storage bucket `race-files`.

**Stratégie nutritionnelle :**
Réutiliser le composant nutrition existant de Planning.
Trouver ce composant dans le code existant et l'importer directement.

**Notes :** textarea libre.

**Boutons :** Annuler (outline) | + Ajouter / Enregistrer (bleu plein)

Toutes les données sauvegardées dans table `races` + `race_files`.
performance_data stocké en jsonb avec la structure adaptée au sport.

---

## 7. EventModal.tsx
Modal scrollable, même style que RaceModal.
Titre : "Ajouter un événement".

Champs :
- Nom : input texte
- Date début + Date fin : deux date pickers côte à côte
- Description : textarea
- Programme par jour : générer dynamiquement un textarea par jour dans la plage.
  Label : "Lundi 7 juillet". Se régénère quand les dates changent.
- Upload fichiers : drag & drop, tous formats

Boutons : Annuler | + Ajouter
Données sauvegardées dans `race_events` + `race_event_files`.

---

## 8. page.tsx
Importer et assembler tous les composants.
Structure :
- Tabs Race / Pro / Perso / All (existants)
- Onglet Race :
  - GoalBanner
  - Contrôles : toggle "Vue annuelle" / "Vue mensuelle" à gauche + boutons "Événement" et "+ Course" à droite
  - AnnualView ou MonthlyView selon le toggle
  - NextRaceBar
- Ouvrir RaceModal au clic sur "+ Course" ou sur une course existante
- Ouvrir EventModal au clic sur "Événement"

Fetch Supabase : races + race_events filtrés par user_id = auth.uid() et année en cours.
Gestion loading et erreurs.
