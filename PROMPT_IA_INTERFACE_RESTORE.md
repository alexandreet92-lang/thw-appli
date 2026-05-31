# Restauration interface IA — retour état stable

## Contexte

Les commits `ed639d0` (feat: redesign AI Coach) et `4c5f591` (fix: CSS cibles)
ont introduit des régressions visuelles dans l'interface IA.

Les reverts `56b2b76` et `f1f7fac` ont annulé ces deux commits.

## Vérification post-revert

Comparaison `git diff 5091fc5 HEAD` sur tous les composants AI :

| Fichier | Diff |
|---|---|
| `src/components/ai/AIPanel.tsx` | ✅ Identique à 5091fc5 |
| `src/components/ai/AISidebar.tsx` | ✅ Identique |
| `src/components/ai/AIMessageBubble.tsx` | ✅ Identique |
| `src/components/ai/AIHeader.tsx` | ✅ Identique |
| `src/components/ai/AIInputBar.tsx` | ✅ Identique |
| `src/app/globals.css` | ✅ Additions légitimes postérieures conservées |

## Référence commit stable

`5091fc5` — fix(ai): header transparent + aiq-bg dark (2026-05-24)

## Correction appliquée

**Logo Hermès manquant** : le fichier `/logos/logo_3bras.png` existe mais n'était
pas mappé pour le modèle `hermes`.

- Avant : `model === 'zeus' ? logo_6bras : logo_4bras`
- Après : `model === 'zeus' ? logo_6bras : model === 'hermes' ? logo_3bras : logo_4bras`

Les 2 occurrences dans AIPanel.tsx ont été mises à jour (écran vide + pill input).

## État final de l'interface IA

- **Sidebar desktop** : "Hybrid" + nav Projets/Training/Networks + liste convs + pill "Nouvelle conversation"
- **Header** : hamburger (mobile) + nom agent centré + boutons droite
- **Écran vide** : logo PNG par agent + salutation heure + actions rapides
- **Logos** : Hermès → logo_3bras.png · Athena → logo_4bras.png · Zeus → logo_6bras.png
- **Input bar** : bouton + · pill agent PNG · micro (Web Speech) · bouton envoi
