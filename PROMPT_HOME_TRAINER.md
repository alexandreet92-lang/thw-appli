# Écran « Séance home trainer » (vélo indoor)

## Objectif
Construire l'écran de séance vélo home trainer : affichage temps réel de la puissance,
de la fréquence cardiaque, de la cadence, et du profil d'intervalles de la séance.
Une maquette HTML de référence est fournie (`thw-home-trainer.html`) : c'est la **cible
visuelle et comportementale**. Reproduis sa hiérarchie, ses graphes et ses transitions —
pas son code (elle est en HTML/JS inline, on réimplémente proprement dans le stack).

## Principe directeur (ne pas s'en écarter)
L'app **ne pilote pas** le home trainer. Pas d'ERG, pas de contrôle de résistance,
pas de bias. L'app **lit** les capteurs et **enregistre**. L'athlète tient la cible lui-même.
Conséquence de design : l'**écart à la cible** (suis-je au-dessus / en-dessous des watts
prescrits ?) est l'information n°2 après la puissance. C'est pour ça que la jauge d'écart
colorée existe.

Ce n'est pas un clone de Zwift. Pas de monde virtuel, pas d'avatar, pas de vitesse ni de
distance virtuelles (c'est du bruit sur home trainer).

## Périmètre de CE lot
- Écran de séance vélo home trainer, en direct.
- Deux formats : **mobile** (portrait, 4 pages qu'on fait défiler horizontalement) et
  **ordinateur** (tableau de bord dense, tout visible d'un coup).
- Thème **sombre** et thème **clair**, commutables.
- Source de données : **Web Bluetooth** (fonctionne aujourd'hui sur Chrome desktop et
  Android). Voir la section Capteurs : c'est le point d'architecture le plus important.

## Capteurs — ARCHITECTURE CRITIQUE

Crée une abstraction `SensorSource` avec une implémentation par plateforme. Ne code JAMAIS
en dur contre `navigator.bluetooth`.

```ts
interface SensorSample { power?: number; cadence?: number; heartRate?: number; ts: number }
interface SensorSource {
  isAvailable(): Promise<boolean>;
  connect(kind: 'trainer' | 'hr' | 'cadence'): Promise<SensorDevice>;
  disconnect(d: SensorDevice): Promise<void>;
  subscribe(cb: (s: SensorSample) => void): () => void;
}
```

Implémentations :
1. **`WebBluetoothSource`** — `navigator.bluetooth`. À implémenter MAINTENANT.
   Fonctionne sur Chrome/Edge desktop, Chrome Android. C'est la cible livrable de ce lot.
2. **`CapacitorBleSource`** — `@capacitor-community/bluetooth-le`. **NE PAS L'IMPLÉMENTER
   dans ce lot.** Crée seulement le fichier avec l'interface et un `throw new Error('non
   implémenté')`. Sa faisabilité sur notre config iOS n'est pas encore vérifiée.
3. **`UnavailableSource`** — quand aucune des deux n'est disponible (Safari iOS aujourd'hui) :
   `isAvailable()` retourne false. L'UI affiche un état « capteurs indisponibles sur ce
   navigateur » clair et non intrusif, et l'écran reste consultable.

Le choix de l'implémentation se fait au runtime par détection de capacité, pas par
détection de user-agent.

Profils BLE standards à lire (UUID 16 bits) :
- `0x180D` Heart Rate → caractéristique `0x2A37` Heart Rate Measurement
- `0x1818` Cycling Power → `0x2A63` Cycling Power Measurement (puissance + cadence via
  crank revolution data)
- `0x1826` FTMS → `0x2AD2` Indoor Bike Data (puissance, cadence)
- `0x1816` CSC → `0x2A5B` (cadence seule)
Lecture uniquement : abonnement aux notifications. **Aucune écriture de contrôle.**

## Données (RÈGLE : zéro mock, zéro valeur athlète en dur)

### INTERDICTION ABSOLUE — valeurs athlète
FTP, LTHR et FC max **doivent venir du profil athlète en base de données**, pour chaque
utilisateur. Il est **interdit** de les coder en dur, de les mettre dans un fichier de
constantes, ou de prévoir une valeur « par défaut » de repli.

La maquette de référence affiche FTP 250 / FC max 190 : ce sont des **valeurs de démo
arbitraires**, modifiables en direct dans la barre de démo justement pour prouver que tout
l'écran est paramétrique. Ce ne sont PAS des constantes à reprendre. Aucun nombre lu dans
la maquette ne doit se retrouver en dur dans le code.

Tout ce qui dépend du FTP se recalcule par utilisateur : bornes de zones, watts cibles de
chaque intervalle, échelle des graphes, IF, jauge d'écart.

Si le FTP de l'athlète est absent en base, l'écran doit le dire explicitement et proposer de
le renseigner — il ne doit pas deviner ni retomber sur une valeur arbitraire.

### Le reste
- Le **profil d'intervalles vient de la séance planifiée réelle**. Chaque bloc a au minimum :
  nom, durée, cible (% FTP ou watts absolus). Si ce contrat de données n'existe pas dans le
  schéma ou est ambigu, **arrête-toi et liste précisément ce qui manque** — ne comble pas
  avec des valeurs en dur.
- La séance doit être **enregistrée** (échantillons 1 Hz : puissance, FC, cadence) et
  persistée via le même chemin de données que le reste de l'app (Supabase). Si ce chemin
  n'existe pas, signale-le.
- Zones de puissance calculées **depuis le FTP de l'athlète** : Z1 <55 %, Z2 56-75 %,
  Z3 76-90 %, Z4 91-105 %, Z5 106-120 %, Z6 121-150 %, Z7 >150 %.
- Métriques calculées : puissance lissée 3 s (**c'est la valeur affichée**, pas la brute —
  la brute saute de ±40 W et est illisible), moyenne, NP (moyenne d'ordre 4), IF (NP/FTP),
  kJ, FC moy/max, cadence moy, SM estimé via le système existant du repo (ne pas réinventer
  la formule : réutiliser le calcul SM/SN déjà en place).

## Écrans

### Mobile — 4 pages, défilement horizontal avec accroche (scroll-snap) + points de pagination
Barre haute persistante : pause, nom de séance, chrono total, état des capteurs (pastilles).
Barre basse persistante : écoulé, travail (kJ), SM est., bouton Terminer.

1. **Pilotage** — bloc en cours + n° de répétition ; compte à rebours de l'intervalle ;
   **puissance en géant** ; cible + % FTP ; **jauge d'écart** (curseur ; vert dans la
   fourchette ±12 W, ambre jusqu'à ±25 W, rouge au-delà) ; cadence et FC ; mini-graphe.
2. **Flux** — graphe live puissance + FC sur 5 min, ligne FTP en pointillés ; barre de zones
   Z1→Z7 avec zone active allumée ; temps passé dans la zone en cours.
3. **Profil** — profil complet de la séance (barres colorées par zone) avec la **trace réelle
   superposée** à la cible et un curseur de position ; liste des intervalles (en cours
   surligné, faits estompés).
4. **Données** — moyennes, NP, IF, kJ, FC moy/max, cadence moy, temps restant ; état détaillé
   des capteurs.

### Ordinateur — tableau de bord, tout visible
Colonne gauche : puissance + jauge d'écart, bloc en cours + compte à rebours, barre de zones.
Centre : graphe live (10 min) + profil de séance.
Colonne droite : pile de métriques.
Bas : frise horizontale des intervalles, recentrée automatiquement sur le bloc en cours.

### Surcouche
Pause : gèle les chronos ET suspend l'enregistrement. Reprendre / Terminer.

## Thème clair
Tokens dédiés, commutables par attribut de thème, **sans réécrire les composants**.
Attention : les couleurs de tracé des graphes (grille, axes, ligne FTP, trace réelle) doivent
elles aussi être des tokens — sinon elles disparaissent en thème clair. Voir la maquette,
qui les tokenise déjà (`--grid`, `--axis`, `--trace`, `--fill-a/b`, `--scrim`).

## Contraintes techniques (non négociables)
- Next.js 15 / TypeScript strict / Tailwind. Mobile-first.
- **Max 200 lignes par fichier** → découper. Découpage proposé (à ajuster) :
  - `sensors/types.ts`, `sensors/WebBluetoothSource.ts`, `sensors/CapacitorBleSource.ts`
    (stub), `sensors/UnavailableSource.ts`, `sensors/index.ts` (sélection runtime)
  - `sensors/parsers.ts` (décodage des caractéristiques BLE — c'est du binaire, isole-le
    et teste-le)
  - `useRideEngine.ts` (état, chrono, agrégats), `useRideRecorder.ts` (échantillons +
    persistance), `useRidePlan.ts` (profil d'intervalles depuis la séance planifiée)
  - `RideMobile.tsx` + `pages/RidePilot.tsx`, `RideFlux.tsx`, `RideProfile.tsx`,
    `RideData.tsx`
  - `RideDesktop.tsx`
  - `charts/LiveChart.tsx`, `charts/ProfileChart.tsx`, `charts/MiniChart.tsx`
  - `RidePause.tsx`
- **Graphes en canvas**, pas de dépendance de charting supplémentaire. Gérer le
  `devicePixelRatio` (sinon c'est flou sur écran Retina).
- **Aucun emoji** dans l'UI. Icônes **Tabler** uniquement.
- **CSS via design tokens** — aucun code couleur hexadécimal en dur.
- `npm run build` DOIT passer. TypeScript strict, pas de `any` de complaisance.
- Empêcher la mise en veille de l'écran pendant la séance (Wake Lock API si disponible,
  dégradation propre sinon).
- Commit local uniquement, pas de push sur main sans validation.
- Ne pas toucher `src/lib/sync/strava.ts`.

## Hors périmètre explicite (à NE PAS faire)
- `CapacitorBleSource` (stub uniquement — faisabilité iOS non vérifiée).
- Tout contrôle du trainer : ERG, résistance, bias, pente.
- Vitesse et distance virtuelles.
- Édition de la séance en cours.
- Export FIT / envoi Strava (lot ultérieur).
