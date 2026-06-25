# Prompt pour Claude Chat — Refonte visuelle de la page de connexion (app « Hybrid »)

Copie-colle tout ce qui suit dans Claude Chat.

---

Tu es **designer UI senior**. Conçois la **refonte visuelle haut de gamme** de la
**page de connexion** d'une application mobile de coaching sportif. Je veux quelque
chose de **premium, sportif, épuré et adulte** — surtout PAS simpliste ni enfantin.
Références d'exigence : Strava, Whoop, Linear, Apple. 

**Livrable :** pour CHAQUE partie listée plus bas, une **maquette HTML/CSS autonome**
(un seul fichier `.html` par partie, CSS inclus, aucune dépendance externe sauf les
polices Google), en **thème sombre ET thème clair**, vue **mobile (375 px) d'abord**
puis desktop. Donne si possible **2 variantes** par partie. Je vais screenshoter tes
maquettes et les envoyer à mon développeur pour intégration 1:1.

## Contexte produit & marque
- App **« Hybrid » (THW Coaching)** : coaching sportif **hybride** (endurance + force).
- Logo : **shuriken 4 branches** (cyan, fichier `logo_4bras.png`) + mot-symbole
  **« Hybrid »** + tagline « by The Hybrid Way ».
- Ambiance : performance, précision, énergie maîtrisée. Pas de couleurs criardes,
  pas d'arrondis exagérés, pas d'emojis décoratifs.

## Système de design À RESPECTER (sinon ce sera non implémentable)
**Polices :** titres = **Fraunces** (serif display, weight 600) · corps/UI = **Inter**
(400/500/600/700). (Google Fonts.)

**Couleurs — thème SOMBRE :**
- fond `#080A0F`, fond carte `#0F1117`, fond carte 2 `#0D1219`, surface élevée `#161C26`
- texte `#EEF2F7`, texte secondaire `rgba(238,242,247,0.65)`, texte atténué `rgba(238,242,247,0.38)`
- bordure `#1E2533`, bordure médium `#263042`, fond input `#0B0E15`

**Couleurs — thème CLAIR :**
- fond `#ffffff`, fond carte `#ffffff`, fond carte 2 `#f8fafc`
- texte `#0d1117`, texte secondaire `rgba(13,17,23,0.60)`, texte atténué `rgba(13,17,23,0.38)`
- bordure `rgba(0,0,0,0.07)`, bordure médium `rgba(0,0,0,0.12)`, fond input `#f0f6f9`

**Marque (communs aux 2 thèmes) :**
- primaire **cyan `#06B6D4`**
- **dégradé CTA principal : `linear-gradient(135deg, #06B6D4, #5b6fff)`** (cyan → indigo)
- accent IA violet `#9D7DFF`
- erreur `#ef4444`, succès `#22c55e`

**Échelles fermées (à utiliser) :**
- rayons : 8 px (petit), 14 px (moyen), 20 px (grand)
- espacements : 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 px

## Ce qui ne va PAS dans la version actuelle (à corriger absolument)
- Rendu « trop simple / enfantin ». Il faut du **raffinement** : hiérarchie typo
  soignée, micro-détails, ombres douces, espacement maîtrisé.
- **Bouton principal trop gros et lourd** → le veux **élégant et proportionné**
  (hauteur ~48–52 px, pas pleine hauteur écrasante, dégradé subtil, état pressé).
- **Champs de saisie moches** → champs élégants : hauteur ~48–52 px, bordure fine,
  fond `input`, **focus discret** (anneau cyan léger), label clair, icône œil
  afficher/masquer pour le mot de passe.
- **« bulles » (onglets/pills) horribles** → onglets Connexion/Créer un compte
  nets et premium (segmented control raffiné, pas de gros boutons ronds criards).

## Parties à maquetter (une maquette par partie, sombre + clair)
1. **Écran de connexion complet** (vue d'ensemble : fond/ambiance + carte centrée).
2. **En-tête** : shuriken + « Hybrid » (Fraunces) + tagline.
3. **Sélecteur de langue** : menu **déroulant** en **haut à droite** (FR/EN/ES),
   animé à l'ouverture ET à la fermeture (décris l'animation), drapeau + libellé + chevron.
4. **Onglets** « Connexion » / « Créer un compte » (segmented control).
5. **Champs** : email · mot de passe (avec œil) · confirmer le mot de passe — états
   normal / focus / erreur.
6. **Indicateur de force du mot de passe** (4 segments, discret).
7. **Ligne d'options** : case « Rester connecté » + lien « Mot de passe oublié ? ».
8. **Bouton principal** : « Se connecter » / « Créer mon compte » (dégradé cyan→indigo,
   élégant, états hover/pressé/désactivé/chargement).
9. **Lien secondaire** : « Pas de compte ? **Créer un compte** » (et inversement).
10. **Séparateur « ou » + connexions sociales** : boutons **Apple** (fond clair) et
    **Google** (contour), sobres.
11. **Case CGU** (à l'inscription) : « J'accepte les conditions… ».
12. **Écran « Vérifie ta boîte mail »** (après inscription : icône, email mis en valeur,
    bouton « Renvoyer l'email », retour connexion).

## Contraintes techniques (pour l'intégration)
- Implémentable en **React + styles inline/CSS** ; **SVG inline** pour les icônes
  (pas de librairie d'icônes/charts).
- **Aucune autre police** que Fraunces + Inter.
- **Mobile-first** (375 px) puis desktop ; respecter `prefers-reduced-motion`.
- Pas de dégradés multicolores hasardeux : s'en tenir à la palette ci-dessus.

## Format de réponse attendu
Pour chaque partie : un titre, un court paragraphe d'intention, puis le **bloc de code
HTML/CSS complet** (thème sombre + thème clair côte à côte si possible). Mentionne les
valeurs exactes utilisées (couleurs/rayons/espacements de la palette).
