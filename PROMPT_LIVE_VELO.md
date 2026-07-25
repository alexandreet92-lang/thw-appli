# PROMPT_LIVE_VELO.md

Spécification de refonte de l'écran d'enregistrement LIVE (Vélo en priorité, architecture réutilisable).
Référence visuelle : `docs/design/maquette-live-velo.html` (source de vérité pour proportions, états, micro-interactions — prototype HTML/JS vanilla, la cible est React/Next).

## 0. Objectif

Refondre l'écran d'enregistrement LIVE et implémenter le cycle complet jusqu'à la redirection vers la page Training :

`avant démarrage → enregistrement → pause / auto-pause / verrouillage → arrêt → écran de résumé → envoi avec jauge → confirmation → page Training`

## 1. Phase de découverte — AVANT toute écriture de code

1. Localiser l'écran live actuel (composants, route, hooks GPS, store d'état).
2. Localiser hooks/services : géolocalisation, Bluetooth LE (FC, puissance, cadence), calcul SM/SN, upload d'activité Supabase, page Training.
3. Localiser le système de thème (dark/light) et les tokens Tailwind.
4. Lister les tables Supabase concernées (activités, laps, points GPS).
5. Rendre un plan d'implémentation (fichiers à créer/modifier/supprimer) et attendre validation avant d'écrire.

Si un élément de cette spec entre en conflit avec l'architecture existante, le signaler au lieu de contourner silencieusement.

## 2. Design tokens

À déclarer une seule fois (variables CSS + extension Tailwind), jamais de hex en dur dans les composants.

### Thème sombre (défaut)

| Token | Valeur |
|---|---|
| `bg` | `#09090B` |
| `surface` | `#141417` |
| `surface-2` | `#1A1A1E` |
| `hairline` | `rgba(255,255,255,.07)` |
| `hairline-2` | `rgba(255,255,255,.12)` |
| `text` | `#FAFAFA` |
| `text-2` | `#A1A1AA` |
| `label` | `#71717A` |
| `dim` | `#3F3F46` |
| `accent` | `#06B6D4` |
| `accent-on` | `#04262E` |
| `accent-track` | `#155E6E` |
| `success` | `#10B981` |
| `warn` | `#F59E0B` |
| `danger` | `#EF4444` |
| `float` | `rgba(13,13,16,.88)` + `backdrop-blur(14px)` |

### Thème clair (override du même jeu de tokens)

| Token | Valeur |
|---|---|
| `bg` | `#F6F6F7` |
| `surface` | `#FFFFFF` |
| `surface-2` | `#EBEBED` |
| `hairline` | `rgba(0,0,0,.08)` |
| `hairline-2` | `rgba(0,0,0,.13)` |
| `text` | `#131316` |
| `text-2` | `#4B4B55` |
| `label` | `#6E6E78` |
| `dim` | `#C6C6CC` |
| `float` | `rgba(255,255,255,.92)` |

`accent`, `accent-on`, `success`, `warn`, `danger` inchangés dans les deux thèmes. Fonds de carte, scrims et surfaces flottantes en variante claire (fond carte `#EDEDEB`, routes `#D8D8D4`, eau `#CFE3EC`, labels `#8A8A92`).

**Contrainte non négociable** : jamais de texte blanc sur `accent`. Tout contenu posé sur cyan utilise `accent-on`.

### Typographie

Inter. `font-variant-numeric: tabular-nums` sur TOUTE valeur numérique.

| Rôle | Taille · graisse |
|---|---|
| Héro live | 112 · 800 (`104` si vitesse, `76` si inactif) |
| Héro lap | 88–92 · 800 |
| Valeur de tuile | 40 · 800 |
| Valeur résumé | 29 · 800 |
| Valeur bandeau carte | 26 · 800 |
| Vitesse capsule carte | 32 · 800 |
| Unité | 13 · 600 · `label` |
| Label métrique | 11 · 700 · MAJ · letter-spacing `.16em` · `label` |
| Sous-ligne | 13 · 500 · `text-2` |
| Titre header | 15 · 600 |
| Titre page/sheet | 19 · 800 |
| Label bouton principal | 13 · 800 · MAJ · `.19em` |

### Formes

Marges latérales 20 (grille) / 16 (flottants carte). Rayons : pills = h/2 · bandeau nav & capsule vitesse 16–18 · carte résumé 20 · cartes Training 18 · sheet coins hauts 28. Aucune ombre portée sur les tuiles ; seul le bouton principal porte un glow (3 anneaux cyan, opacités .05/.032/.017 à +10/+20/+30 px). Séparateur vertical de grille : s'arrête à 18 px des traits horizontaux. Zones tactiles ≥ 44×44.

## 3. Écran LIVE — 3 pages en scroll snap horizontal

Header commun (croix gauche 36⌀, titre sport centré, engrenage droite 36⌀). En enregistrement : point rouge 7⌀ + halo à gauche du titre, seul indicateur REC. Pagination : 3 points centrés, actif 7⌀ cyan.

### Page 1 — Données

Héro = Puissance 3 s (lissée, jamais l'instantanée). Label `PUISSANCE · 3 S`, sous-ligne `moy X W · NP Y W`.

**Fallback obligatoire** : sans capteur puissance appairé, ou après 10 s sans données puissance, le héro bascule sur Vitesse et la tuile `VITESSE` devient `WATTS`. Un héro affichant `—` est un bug.

Avant démarrage : héro = `DURÉE 00:00:00` en `dim`, chips capteurs sous le header (`● GPS ±2 m` vert / `● FC` vert / `○ Puissance` gris — tap sur chip gris ouvre l'appairage).

Grille 2×3, ordre gelé : DURÉE/DISTANCE · VITESSE (ou WATTS)/FC · D+/CADENCE.

### Page 2 — Carte

Carte plein écran, style sombre obligatoire en thème dark ; tout flotte au-dessus avec scrims haut (150 px) et bas.

- Bandeau de guidage en haut, à droite de la croix (§4).
- Bouton couches unique (40⌀, haut droite) : menu Standard/Satellite/Hybride (pas 3 boutons empilés).
- Flèches ‹ › (32⌀) à mi-hauteur pour changer de page, en plus des points.
- Capsule vitesse bas-gauche (140×72, r 18).
- Mini-pause flottant bas-droite (48⌀, bordure cyan) : tap → pause + bascule page 1.
- Bandeau stats bas fixe (h 160) : `D+ RESTANT` / `RESTANT` / `TEMPS EST.`, valeur 26 px + sous-ligne `fait X` en `#52525B`.
- Trace parcourue en `accent-track`, restant en `accent`. Position : blanc 18⌀ + cœur cyan + halo pulsé.
- Avant démarrage : chip `Itinéraire · 42,5 km · 380 m D+` au-dessus des points.

Engrenage masqué sur la page carte ; accessible pages 1 et 3.

### Page 3 — Laps

Héro = durée du lap courant (`LAP n · DURÉE`), sous-ligne `total H:MM:SS · X km`. Grille 2×2 : `WATTS LAP` / `FC LAP` / `CADENCE` / `ALTITUDE`.

Historique des laps en bas : label `LAPS PRÉCÉDENTS`, lignes 40 px `Lap n · durée · W moy · FC moy`, 3 visibles, scroll au-delà, plus récent en haut. Avant démarrage : `Aucun lap terminé`.

## 4. Guidage virage-par-virage

Deux niveaux, comme Plans.

**Compact** — bandeau 54 px min sur la carte : icône manœuvre (36 px, carré r 10 sur `rgba(6,182,212,.14)`), distance + instruction 15/700, sous-ligne = manœuvre suivante 12 `text-2`, chevron.

États : parcours chargé avant départ → `Rejoignez l'itinéraire` + `Départ du parcours à X m` · en roulant → `250 m · Tournez à droite` + badge route, sous-ligne `puis D 103 à droite dans 600 m` · aucun parcours → icône grisée `Guidage indisponible` / `Aucun parcours chargé`, chevron/tracé/chip masqués.

**Déplié** — tap sur bandeau → panneau (top 56, bottom 150, r 24, fond `rgba(16,16,19,.92)` blur 22) : en-tête icône 44 + `Suivez l'itinéraire` 20/800 ; liste manœuvres (icône 40, distance 27/800, libellé 15/600 `text-2`) ; badges route (départementale `#EAB308`/`#1C1400` · autoroute `#B91C1C`/blanc · h 19 r 5 11.5/800) ; chips de sortie à droite (h 22 r 7 `rgba(255,255,255,.09)`) ; opacité dégressive 1/1/1/.72/.5/.34 ; chevron de repli.

Icônes de manœuvre en SVG inline (stroke currentColor, 2.6–2.8) : droite/gauche, rond-point sortie droite/gauche, tout droit, rejoindre. Pas de librairie d'icônes.

## 5. États pendant l'effort

**Auto-pause** — pill 140×30 sous header : fond `rgba(245,158,11,.10)`, bordure `.35`, point + `En pause auto` 12.5/700 orange. Valeurs en `dim`, vitesse/cadence 0, FC dimmée mais à jour. Bouton central → play. Aucun clignotement.

**Verrouillage** — cadenas 52⌀ à gauche de pause. Verrouillé : cadenas fermé cyan 56⌀ au centre, hint `Double tap pour déverrouiller`. Déverrouillage double tap (400 ms) ; tap simple → pulse (scale 1→1.1, 250 ms). Swipe de page désactivé.

**Contrôles enregistrement** — cadenas gauche 52⌀ · pause centre 84⌀ cyan + glow · LAP droite 52⌀. Permutation Pause/Lap réglable, défaut ci-dessus.

**Lap appui long — OPT-IN, DÉSACTIVÉ PAR DÉFAUT.** Maintien 2 s hors bouton → overlay noir 60 % + anneau progression 132⌀ (piste `rgba(255,255,255,.14)` 6 px, arc cyan) autour de `LAP`, légende `Maintenez 2 s pour marquer un lap`. Relâcher avant la fin annule. Le verrouillage prime.

**Feedback lap** : haptique + flash 300 ms contour écran `rgba(6,182,212,.55)` + héro lap → `00:00`.

**Ligne GPS** au-dessus de Démarrer : vert `Bon signal (±2 m)` · orange `Signal moyen (±12 m)` · rouge `Recherche GPS…` (Démarrer désactivé, opacité 40 %). GPS perdu en cours → vitesse/distance en `dim` jusqu'au retour.

**Capteur déconnecté** : valeur `—` en `dim` + toast (`FC déconnectée`).

**Toasts** : capsule sous header (h 36, r 18, fond `surface` 94 %, bordure `hairline-2`), auto-dismiss 2.6 s. Interdiction `alert()`/`confirm()`.

## 6. Arrêt de séance → Résumé

Croix pendant l'enregistrement → bottom sheet (r 28, h ~288, poignée 36×4) : `Enregistrement en cours` 19/800 · `H:MM:SS · X,X km — activité non sauvegardée` · **Reprendre** (pill cyan, aussi tap hors sheet) · **Terminer et sauvegarder** (outline) · **Supprimer l'activité** (texte `danger`, deux temps : 1er tap → `Confirmer — supprimer X,X km ?` fond danger 3 s, 2e tap exécute).

`Terminer et sauvegarder` n'envoie rien : ouvre le résumé.

### Écran de résumé (vue plein écran)

Entrée fade + translateY 14 px 250 ms.

1. En-tête `Résumé de la séance` + date longue FR + heure.
2. Mini-carte du tracé : h 186, marges 16, r 20, thème courant. Tracé complet `accent` 4.5 px, départ vert `success`, arrivée rouge `danger` (6⌀ + cœur blanc 2.6). Tracé depuis les points GPS réels, cadrage auto (bounding box + padding).
3. Grille 2×5 (29/800) : DURÉE/DISTANCE · D+/VITESSE MOY · WATTS MOY/WATTS NORM. · FC MOY/CADENCE MOY + 5ᵉ rangée SM/SN (réutiliser le calcul existant). Sans capteur → `—` (légitime ici).
4. Pied : `Enregistrer la séance` (pill cyan) + `Supprimer l'activité` (deux temps).

## 7. Envoi → confirmation → Training

`Enregistrer la séance` remplace les boutons par la zone de progression (même emplacement) :

1. Jauge : `Envoi de la séance…` + `X %` 800, piste 8 px r 4 `surface-2`, remplissage `accent` (width 120 ms linear). Pourcentage = progression réelle (création activité → points → laps → agrégats), pas un timer décoratif.
2. 100 % puis 350 ms → confirmation : pastille 52⌀ `rgba(16,185,129,.13)` coche `success`, `Séance enregistrée` 15.5/700, bouton `Voir l'entraînement` (pill cyan).
3. `Voir l'entraînement` → page Training existante, scrolle sur la séance créée mise en avant : liseré cyan 4 px + badge `NOUVEAU` (10/800, `accent` sur `rgba(6,182,212,.12)`, r 8). Passer l'ID de l'activité dans la navigation.

**Échec — obligatoire** : perte réseau/erreur → jauge stoppée, `Envoi interrompu` + `Réessayer`, activité conservée localement. Reprise d'upload au relancement si activité locale non envoyée. Résumé et envoi bloquent la navigation arrière tant que l'activité n'est ni enregistrée ni supprimée.

## 8. Contraintes techniques

- Next.js 15 App Router, TypeScript strict, Tailwind. Pas de `any`.
- Machine à états unique : `idle → recording → paused → autopaused → locked → stopping → summary → uploading → uploaded`.
- Calculs (moyennes, NP, lissage 3 s) en fonctions pures testables.
- Un composant par page, un par overlay ; hooks session/GPS/capteurs/upload.
- Wake lock pendant l'enregistrement.
- Ne pas casser Strava, Polar, Supabase, ni les autres sports.

## 9. Points à remonter, pas à contourner

1. Enregistrement en arrière-plan (throttling navigateur) : dire ce qui est faisable en web pur vs plugins natifs.
2. Timer reconstruit depuis des timestamps absolus, jamais par incrément.
3. Style de carte sombre indisponible chez le fournisseur → le dire avant de coder.
4. Métrique absente du schéma Supabase → lister les migrations nécessaires avant.

## 10. Critères d'acceptation

- [ ] 3 pages, points et flèches synchronisés
- [ ] Héro jamais `—` : bascule watts → vitesse
- [ ] Auto-pause : badge orange + dim + play
- [ ] Verrouillage : double tap seul déverrouille, tap simple pulse, swipe bloqué
- [ ] Guidage : compact + déplié + badges + chips + `Guidage indisponible`
- [ ] Historique des laps alimenté
- [ ] Aucun `alert()`/`confirm()` ; suppression deux temps
- [ ] Résumé : tracé réel cadré, départ vert/arrivée rouge, 10 métriques
- [ ] Jauge d'envoi réelle, 100 % → confirmation → `Voir l'entraînement`
- [ ] Redirection Training avec séance mise en avant (liseré + NOUVEAU)
- [ ] Échec d'envoi : activité conservée + `Réessayer`
- [ ] Thème clair complet
- [ ] `tabular-nums` partout ; jamais de blanc sur cyan
- [ ] Aucune régression autres sports / Strava / Polar
