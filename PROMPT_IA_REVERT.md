# PROMPT IA REVERT

## Objectif

Revenir à l'état stable de l'interface IA d'avant les modifications du 2026-05-23.
Le commit stable est `af80891` (Merge branch 'claude/amazing-wilbur-2e6b95').

## Commits à révoquer (ordre du plus récent au plus ancien)

1. `5b12c6c` — feat(ai): support light/dark complet sur sidebar + input bar
2. `5ff41ad` — feat(ai): sidebar nav icônes neutres + header sans shuriken
3. `24f6f6f` — feat(ai): logos PNG par agent + tailles Claude-like + hover 0.06
4. `001c405` — feat(ai): model picker pill — logo officiel + label "Training"
5. `08eb3a5` — **Merge pull request #55** (introduit la sidebar Claude avec items arrondis blancs) — merge commit, requires `-m 1`

Le commit `b1a7bb6` était sur la branche `claude/busy-merkle-26ed0d` qui a été mergée via `08eb3a5`. Reverter le merge avec `-m 1` annule l'intégralité des changements du PR #55.

## Procédure

```bash
git revert --no-edit 5b12c6c
git revert --no-edit 5ff41ad
git revert --no-edit 24f6f6f
git revert --no-edit 001c405
git revert --no-edit -m 1 08eb3a5
npm run build  # doit passer
git push origin main
```

## Conséquence connue

Après ce revert :
- L'interface IA revient à son état du 2026-05-22 (avant la refonte sidebar Claude-style)
- Le panneau AIPanel utilise l'ancien design avec AgentIcon SVG et l'ancienne AISidebar
- Le composant `src/components/ai/sidebar/` (LogoOfficial, NavItem, NavIcons, ConvList) disparaît
- Si on veut un jour re-merger la PR #55, il faudra reverter ce revert de merge

## Règles

- Aucune modification de fichier source manuelle. Seulement `git revert`.
- `npm run build` doit passer avant push.
- Push direct sur main, pas de PR.
