# Refonte page IA (agent / chat) — THW Coaching

Périmètre STRICT : uniquement la page de l'agent IA (le chat avec
sidebar des conversations + zone centrale + composer). Ne touche à
AUCUN autre écran. Ne fais QUE les changements ci-dessous.

## 1. Police des réponses de l'IA
- Le texte des RÉPONSES de l'assistant doit utiliser exactement la
  même police que celle des titres de l'app (le serif des h1/h2, ex.
  "Bonjour Alex", "Ironman Leeds").
- Récupère le token/variable de police déjà défini pour ces titres
  (ex. --font-heading ou la classe Tailwind correspondante). Ne devine
  pas un nom de police, n'importe rien de nouveau, n'ajoute aucune
  dépendance.
- Line-height confortable (~1.6), taille >= 16px.
- Les messages de l'utilisateur RESTENT dans la police sans-serif
  actuelle. Seules les réponses de l'IA passent en serif.

## 2. Composer (champ d'écriture)
- Supprime le sélecteur de police (le "T DM Sans" / icône police).
  Plus aucun choix de police dans le champ.
- Garde le "+", la dictée (micro) et le bouton envoyer.

## 3. Sidebar — titre
- Supprime complètement le texte "Hybrid Training".
- Affiche "Hybrid" en gros, en tête de sidebar, dans la police serif
  des titres (même token qu'au point 1).

## 4. Sidebar — liste des discussions
- Les titres de discussions sont trop pâles. Monte le poids à 600 ET
  assombris la couleur (utilise --fg ou un gris foncé, pas le gris
  clair actuel). La date reste discrète (gris moyen).

## 5. Zone centrale
- Supprime TOUTES les cartes d'actions rapides du centre (Créer un
  plan d'entraînement, Identifier mes points faibles, Créer un plan
  nutritionnel, Comprendre l'application, Training Analyse). Elles
  restent accessibles via le "+" du composer, on ne les duplique pas.

## 6. État vide (conversation sans aucun message)
- Quand la conversation courante n'a AUCUN message : centre le
  composer verticalement ET horizontalement dans la zone principale.
- Au-dessus du composer, dans cet ordre : le logo shuriken, puis un
  salut.
- Supprime "Comment puis-je t'aider aujourd'hui ?".
- Salut horaire, basé sur l'heure locale du client :
  - si heure >= 18h : "Bonsoir, {prénom}"
  - sinon : "Bonjour, {prénom}"
  - Réutilise la source du prénom déjà utilisée ailleurs (ex. le
    "Bonjour Alex" du dashboard). Ne refetch pas inutilement.
  - Le salut est dans la police serif des titres.
- Dès qu'il y a >= 1 message : comportement normal (fil de messages +
  composer ancré en bas). Ne casse pas cet état.

## Garde-fous
- CSS variables pour bg/fg/border, pas de couleurs en dur nouvelles.
- Aucun emoji.
- Aucune nouvelle police importée, aucune nouvelle dépendance.
- Garde chaque fichier modifié sous 200 lignes si possible.
- `npm run build` doit passer avant tout commit.
