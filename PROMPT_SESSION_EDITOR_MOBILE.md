# PROMPT — SessionEditor mobile (refonte « Éditorial clair »)

## PÉRIMÈTRE : MOBILE UNIQUEMENT
Le desktop sera fait plus tard — **ne PAS toucher au rendu desktop** du `SessionEditor`
(`src/components/planning/SessionEditor.tsx`). Refonte visuelle + builder de blocs adaptatif.
Ne pas casser la logique existante (calcul SM/SN, sauvegarde, plan A/B).

## §0 — Barre d'onglets du bas
Masquer la `MobileTabBar` (`.mobile-tab-bar`) tant que la feuille SessionEditor est montée sur
mobile (elle chevauche le footer de la feuille). La réafficher à la fermeture. Footer sticky,
aucun bouton (Fermer / PDF / Favori / Enregistrer) masqué.

## §1 — Style « Éditorial clair »
Thème clair : fond `#faf9f6`, cartes `#fff`, texte `#1a1a1a`, atténué `#8a8a82`,
filets `#e7e5df`. **Mappé sur des variables CSS** (pas de hex dans les composants ;
tokens ajoutés au besoin). Fraunces (`--font-display`) pour titres / grands nombres,
sans du projet (`--font-body`) pour le corps. Aéré, filets fins, rayon ~13-14px.

## §2 — Header
Un seul titre : puce sport colorée + UN champ titre (Fraunces) + badge Plan A + ✕.

## §3 — Sélecteur de sport
7 sports sur une ligne, icône Tabler ~23px + label ~9px dessous. Pas de gros cercle de fond.
Sélectionné = icône pleine couleur + petit soulignement couleur ; non sélectionné = icône
opacité .4, label gris. Couleurs : run vert, bike bleu, swim cyan, hyrox rouge, gym orange,
row violet, ellip rose.

## §4 — Écran principal
Sous-discipline (chips segmentées) ; type de séance (pills) ; Date / Heure (2 champs) ;
Effort perçu (grand nombre Fraunces + descripteur + barre dégradé) ; Durée (carte stepper
− valeur +) ; SM/SN (grands nombres + barre zones + légende) ; mini-stats (Watts moy/FTP/LTHR
selon sport) ; Description (textarea).

## §5 — Builder de blocs adaptatif (cœur)
Header « Construction de la séance » + toggle Manuel / +IA ; bandeau résumé 4 cellules
(SM · SN · Durée/Distance · 4ᵉ métrique par sport) ; PROFIL D'INTENSITÉ = barres verticales
colorées par zone (pastilles Z1..Z7 à gauche, hauteur=intensité, largeur≈durée), SVG/CSS sans
lib ; liste de blocs (Échauffement / Intervalle(Série) / Récup) repliés (filet couleur zone à
gauche, badge Zx, nom+cible, durée/distance à droite, ⋮) + dépliés (steppers par sport).
Boutons + Bloc simple / ↺ Intervalle(Série).
- **VÉLO** : 4ᵉ = Intensité moy W ; toggle Watts/Zone ; intervalles Reps·Durée effort·Watts(%FTP→Z) ou Zone·FC opt ; récup Durée·Watts.
- **COURSE** : 4ᵉ = Allure min/km ; toggle Allure/%VMA ; Distance OU Temps ; intervalles Reps·Distance·Allure(≈%VMA·Z) ou %VMA·FC opt ; récup durée/distance·type trot/marche.
- **NATATION** : 4ᵉ = Allure /100m + Distance totale m ; toggle Distance/Temps ; séries Reps·Distance(m)·Allure/100m(→zone)·Nage opt ; REPOS départ/récup·mode.
- Autres sports (hyrox/gym/row/ellip) : builder générique conservé, ne pas casser.
- Équivalences (%FTP / %VMA / /100m → zone) via réfs athlète en base ; réf manquante ⇒ équivalent masqué (pas de fausse valeur).

## §6 — Footer
Sticky bas de feuille : ‹ Fermer · PDF · ★ Favori · (espace) · Enregistrer (accent).
Entièrement visible barre d'onglets masquée.

## Contraintes
Mobile only ; variables CSS, pas de hex dans les composants ; pas d'emoji ; icônes Tabler ;
TS strict, pas de `any` ; max ~200 lignes/fichier ⇒ extraire `SessionBlockBuilder.tsx` et
`BlockCard.tsx` ; logique métier (SM/SN, sauvegarde, plan A/B) INCHANGÉE — seulement rendu +
champs de saisie des blocs.
