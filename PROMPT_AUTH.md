# Auth premium + onboarding — Hybrid

Deux écrans à livrer **dans cet ordre** : (1) connexion/inscription, puis (2) questionnaire d'onboarding post-inscription. Livre et valide le login en prod **avant** d'attaquer l'onboarding.

## Contexte
- App Hybrid (THW) : Next.js 15 (App Router), TS strict, Tailwind, Supabase Auth, Vercel.
- Maquettes visuelles cibles (référence de RENDU uniquement, **ne copie pas le CSS**) : `hybrid-login.html` et `hybrid-questionnaire.html`. Garde-les dans le repo comme image cible.

## Avant de coder (ne fais pas confiance aveugle à ce prompt)
Vérifie dans le repo : lib d'icônes réellement utilisée, système de thème, setup i18n, config Supabase (providers OAuth activés), mécanisme d'essai 14 jours, schéma du profil athlète, disponibilité de la connexion Strava à ce stade, primitives UI existantes (Button, Input, Checkbox). Réutilise l'existant ; signale tout écart au lieu de l'inventer.

## Règles non négociables (les deux écrans)
1. **Tokens existants, zéro hex en dur.** Mappe couleurs (primaire cyan, dégradé CTA, accent IA, fonds, bordures, inputs) sur les variables CSS du design system ; token manquant → ajoute-le là où vivent les autres, jamais en inline.
2. **Réutilise le composant logo existant** (pas de SVG recréé).
3. **Icônes via la lib du projet** (eye/eye-off, chevron, check, mail, arrow-right).
4. **Typo** Fraunces (titres) / Inter (UI), déjà configurées.
5. **Thème monochrome** : tout sombre OU tout clair, jamais les deux. **Force le fond sur `html`** (valeurs sombres par défaut + `color-scheme`) — aucun champ sombre ne doit apparaître sur un fond clair.
6. Mobile-first 375px, `prefers-reduced-motion` respecté, focus clavier visible partout.
7. i18n en clés de traduction si le système existe, pas de texte en dur.

---

## Partie 1 — Connexion / inscription

### Layout
- Desktop ≥ 860px : 2 colonnes **même fond** séparées par un hairline. Gauche = hero, droite = formulaire.
- Mobile : hero empilé au-dessus du formulaire, fond continu.
- Hero : logo + wordmark + tagline « Endurance × Force », accroche Fraunces « Une seule app pour l'effort total. », 3 métriques (2 scores · Métab/Neuro / 8 sports / 1 plan). Motif (anneaux + tracé) en **linework** sur le fond, pas une zone d'une autre couleur.

### Composants & états
- Segmented control Connexion / Créer un compte (thumb glissant).
- Champs e-mail, mot de passe (+ confirmer en inscription) : label capitales, h48, rayon 8, focus ring cyan 3px discret, état erreur (bordure + message), bouton œil afficher/masquer.
- Jauge de robustesse mot de passe (8 segments, inscription seulement), indicative — ne bloque pas.
- « Rester connecté » → `persistSession`. « Mot de passe oublié ? » → flux reset.
- CTA principal 50px, dégradé cyan→indigo, reflet interne. États : défaut / hover / loading (spinner) / disabled.
- Séparateur « ou » + boutons Google et Apple (OAuth Supabase).
- Lien alternatif « Pas de compte ? Créer un compte » / « Déjà un compte ? ».
- Case CGU (inscription) : liens CGU + Politique de confidentialité ; bloque l'inscription tant que non cochée.
- Écran « Vérifie ta boîte mail » après inscription, avec « Renvoyer le lien ».

### Auth (Supabase)
- Connexion `signInWithPassword` ; erreurs mappées en messages FR clairs.
- Inscription `signUp` → écran « vérifie ta boîte mail » ; à la confirmation, déclenche l'**essai 14 jours via le mécanisme existant** (ne le duplique pas).
- OAuth `signInWithOAuth({ provider })` avec `redirectTo` vers la route callback existante.
- Reset `resetPasswordForEmail`.
- **RGPD** : enregistre l'acceptation CGU + confidentialité (date + version) ; la politique doit exister et être liée (bloqueur de lancement).

### Validation
E-mail valide ; mot de passe ≥ 8 ; inscription : confirmation === mot de passe **et** CGU cochées. CTA `disabled` sinon.

---

## Partie 2 — Questionnaire d'onboarding (après confirmation du compte)

### Structure
- Carte unique surélevée sur fond uni. En-tête : barre de progression + pagination « N sur M » + « Passer ». Question Fraunces. Options = titre + description séparés par hairlines ; option « Autre » avec champ libre optionnel. Bouton bas-droite « Suivant » puis « Terminer ».
- Une question par écran, **défilement horizontal fluide** (transition `transform` + hauteur de carte animée), **swipe tactile** gauche/droite, retour possible, progression toujours visible.
- Écran final : animation de validation (le check se dessine, pop élastique), récap des réponses, CTA « Entrer dans Hybrid » → dashboard.

### Questions (data-driven, éditables en une ligne)
1. Objectif principal — unique : Endurance / Force & puissance / Hybride / Santé & régularité.
2. Sports — multiple : Running, Vélo, Natation, Trail, Triathlon, Aviron, Boxe, Force/Muscu.
3. Volume hebdo — unique : < 4 h / 4–7 h / 7–12 h / > 12 h.
4. Niveau — unique : Débutant / Intermédiaire / Confirmé / Élite.
5. Ton du coach IA — unique : Direct & technique / Pédagogue / Motivant.

### Friction & complétion
- Q1 (objectif) **non-skippable** ; les autres « Passer » avec valeur par défaut sensée.
- **Pré-remplir niveau/volume depuis Strava** si déjà connecté ; ne redemande pas ce qu'on peut mesurer.
- **Q5 à n'afficher que si le réglage de ton est réellement câblé** côté agents (Hermès/Athéna/Zeus) ; sinon retire-la.

### Données
- Persiste sur le profil athlète : `objectif`, `sports[]`, `volume`, `niveau`, `coach_tone` (migration si besoin). Pose `onboarding_completed = true`.
- Idempotent : reprise là où l'utilisateur s'était arrêté ; redirige vers le dashboard si déjà complété.

---

## Definition of Done (global)
- Les deux thèmes monochromes et lisibles (zéro champ sombre sur fond clair).
- Login : connexion, inscription (+ vérif mail), OAuth Google/Apple, reset — fonctionnels en local contre Supabase.
- Onboarding : flux complet jouable (swipe + boutons + retour + anim finale), réponses persistées, `onboarding_completed` posé, redirection dashboard ; Q5 seulement si le ton est implémenté ; pré-remplissage Strava si dispo.
- Mobile 375 + desktop OK, focus clavier visible, reduced-motion respecté.
- Aucun hex en dur ; logo, tokens et icônes existants réutilisés.
- `lint` et `typecheck` passent.
