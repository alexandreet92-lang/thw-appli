# PROMPT — SessionEditor : refonte esthétique (bottom sheet)

## Règle absolue
Aucune logique / état / calcul / handler modifié. Uniquement layout, couleurs,
animations, espacements. Toutes les props et callbacks intactes.

## Phase 0 (diagnostic — confirmé)
1. `SessionEditor` = **composant inline** dans `src/app/planning/page.tsx` (l. 6185–8460,
   ~2275 lignes), pas un fichier séparé.
2. Sous-composants : `ExerciseListBuilder` (l. 1021), `BlockBuilder` (l. 1771),
   `SessionExecute` (l. 5480). Sidebar métriques + section parcours = inline dans l'éditeur.
3. Conteneur racine actuel (l. 7223) : `position:fixed; inset:0; zIndex:999;
   background:var(--bg); overflowY:auto` + petite anim `slideUpModal`. Header sticky (l. 7234).
   Le composant utilise DÉJÀ les tokens de thème (`var(--bg)`, `var(--bg-card)`, `var(--text)`,
   `var(--text-dim)`, `var(--border)`) et une variable `accent` = couleur du sport.
4. Montage : `create` rend `SessionEditor` nu (l. 3842) ; `edit` l'enveloppait dans un
   backdrop centré (l. 3852). Test « TEST123 » posé sur le label du header, confirmé, annulé.
5. Tokens projet : pas de `--card/--muted/--foreground` (shadcn) → on utilise les tokens RÉELS
   (`--bg`, `--bg-card`, `--bg-card2`, `--border`, `--text`, `--text-mid`, `--text-dim`).

## Implémenté (lot 1 — coque bottom sheet, zéro changement fonctionnel)
- Conteneur racine transformé en **bottom sheet** : `position:fixed; bottom:0; height:96dvh;
  borderRadius:20px 20px 0 0; box-shadow` + **coulisse depuis le bas** (`@keyframes sheetUp`
  translateY 100%→0).
- **Backdrop flouté** ajouté derrière (rgba + blur, fade-in, clic = `onClose`).
- **Poignée** (36×4) en haut de la sheet.
- Header sticky : coins supérieurs arrondis pour épouser la sheet.
- Montage `edit` simplifié : le backdrop dupliqué est retiré (la sheet fournit le sien) ;
  `SessionEditor` est rendu nu comme en mode `create`. Tous les handlers (`onClose`, `onSave`,
  `onDelete`, `onValidate`, `onAutoSave`, `onDuplicate`) inchangés.

## Pourquoi le reste du mockup est différé (et non bâclé)
Le mockup décrit une structure (footer à 4 boutons Supprimer/Plan A-B/Valider/Enregistrer,
sidebar 240px sticky, RPE en 28px, filet de zone sur chaque carte de bloc) qui **ne
correspond pas** à la structure réelle du composant : pas de barre d'action en bas (sauvegarde
via header + auto-save), layout et sidebar déjà existants mais agencés autrement. Retrofitter
ces sections à l'aveugle (impossible de rendre l'écran ici) sur 2275 lignes inline risquerait
de casser le layout/build et de violer la règle « zéro changement fonctionnel ». La coque
bottom sheet est livrée et **build vert** ; les restyles section par section (header chip,
onglets couleur sport, RPE-grand, cartes de bloc, sidebar, footer) sont à faire ensuite, idéalement
après extraction du composant dans son propre fichier pour les réaliser/vérifier en sécurité.

## Vérifs
`tsc --noEmit` clean · `npm run build` ✓.

## Contraintes
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
