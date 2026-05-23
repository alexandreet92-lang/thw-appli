# PROMPT IA INTERFACE FINAL

## Diagnostic

- Le système de thème global utilise `darkMode: 'class'` (toggle de `.dark` sur `<html>`)
- Les CSS vars `--ai-bg`, `--ai-bg2`, `--ai-text`, `--ai-mid`, `--ai-border`, `--aiq-bg`, `--aiq-sidebar-bg` sont définies en light + dark dans `.aip-root` (style inline AIPanel ~l.18690)
- Le contenu principal de l'IA (textes, messages, input wrapper) suit déjà le thème
- **Cassé : la sidebar IA était hardcodée `#1A1A1A`**, d'où "moitié blanc / moitié noir"
- **Cassé : les boutons inline `+`, pill agent, micro, envoyer** dans la barre input utilisent `rgba(0,0,0,0.06)` (visible en light, invisible en dark)

## Plan de correction minimal

1. **CSS vars AIPanel** : passer `--aiq-sidebar-bg` dark de `#141414` à `#1A1A1A` (spec utilisateur exacte). Ajouter `--ai-btn-bg` et `--ai-btn-bg-hover` (light/dark) pour les boutons d'input bar.
2. **AISidebar / NavItem / ConvList / AIHeader** : rewrite en Tailwind avec `dark:` partout, supprimer tout color hardcodé.
3. **AIPanel input bar buttons** : remplacer `rgba(0,0,0,0.06)` → `var(--ai-btn-bg)` (et hover).
4. **AIPanel empty state** : déjà OK (utilise `var(--ai-text)`).
5. **globals.css** : ajouter keyframes `sidebar-in` pour l'overlay mobile.

## Mapping de couleurs (Tailwind)

| Élément              | Light                | Dark                       |
|----------------------|----------------------|----------------------------|
| Fond sidebar         | `bg-[#F7F7F7]`       | `dark:bg-[#1A1A1A]`        |
| Fond contenu         | `bg-white`           | `dark:bg-[#0A0A0A]`        |
| Texte principal      | `text-[#0A0A0A]`     | `dark:text-white`          |
| Texte secondaire     | `text-[#8C8C8C]`     | identique                  |
| Hover item           | `hover:bg-black/5`   | `dark:hover:bg-white/6`    |
| Item actif           | `bg-black/8`         | `dark:bg-white/10`         |
| Séparateur          | `border-[#E5E5E5]`   | `dark:border-[#2A2A2A]`    |
| Avatar bg            | `bg-[#E5E5E5]`       | `dark:bg-[#2A2A2A]`        |
| Bouton "Nouvelle conv." | `bg-white text-[#0A0A0A]` (pill blanche identique en light et dark) |

## Logos PNG (rappel V3)

- `/logos/logo_4bras.png` → Training (Athéna)
- `/logos/logo_6bras.png` → Networks (Zeus)
- `/logos/logo_3bras.png` → Hermès (interne)

Note : le prompt utilisateur indique `/logo-Xbras.png` à la racine — chemins inexistants.

## Icônes sidebar nav (SVG, 16px)

- Projets → dossier
- Training → haltère (`TrainingIcon`)
- Networks → globe (`NetworksIcon`)

## Tailles shuriken

- Empty state : 52px
- Pill input : 14px
- Header : **aucun shuriken** (texte seul)

## Règles de merge

- Merge direct sur main, jamais de PR
- `npm run build` doit passer avant push
- Chaque fichier modifié < 200 lignes
- Pas d'emoji dans l'interface
- Ne pas modifier la logique des agents (API, system prompts)
