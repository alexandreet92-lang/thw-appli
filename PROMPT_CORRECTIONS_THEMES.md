# Corrections de CONTENU_SITE_THEMES.md

5 corrections à appliquer au fichier de contenu des 16 thèmes.

## Correction 1 — Limites compétences par plan
Vraies valeurs : **Premium 5 · Pro 15 · Expert 30**.
Aligner PARTOUT (thème 2 « Limites par plan », thème 12 tableau comparatif,
exemple « 30 compétences actives », et toute autre mention). Remplacer les
anciennes valeurs (3 / 7 / 20) par 5 / 15 / 30.

## Correction 2 — Vider le thème 13 (Notifications)
Garder la section dans le sommaire, mais remplacer son contenu par :
```
## 13. 🔔 Notifications
### Bientôt disponible
Le système de notifications est en cours de développement.
Il sera enrichi avec le lancement de l'application native iOS et Android.
[↑ Retour au sommaire](#sommaire)
```

## Correction 3 — Supprimer le suivi des blessures (thème 15)
Retirer toute mention : sous-thème « Suivi des blessures », modèle 3D,
cartographie des douleurs, évolution des blessures, exemples/cas d'usage liés.
Le thème 15 ne garde que l'enregistrement multi-sports + le briefing du jour.
Ne rien inventer pour compenser.

## Correction 4 — Cohérence globale
- Sommaire : toujours 16 thèmes (13 et 15 présents, contenu modifié).
- Liens d'ancres internes fonctionnels.
- Aucun autre thème ne mentionne le suivi des blessures / modèle 3D / des
  notifications détaillées → supprimer/neutraliser le cas échéant.

## Correction 5 — Ne pas toucher
Recherche web (thèmes 1 & 14), scan code-barres nutrition (thème 8), score de
readiness (thème 7), prix 14/26/49 €, quotas 250k/750k/2M, multiplicateurs
×1/×3/×8.

## Livrable
Fichier corrigé + commit « docs: fix themes content (competences limits +
remove blessures + empty notifications) ».
