# PROMPT IA EMERGENCY

## Audit complet effectué

Après audit ligne par ligne :

- `grep -rE "bg-gray|bg-neutral|bg-slate|bg-muted|bg-accent"` dans AISidebar.tsx + AIPanel.tsx → **0 résultat**
- Items conv : `bg-transparent` par défaut (implicite, aucune classe `bg-*` sans hover/actif)
- Borders entre items / NavItems : **aucune** (vérifié, gap-0.5 + mb-px seulement)
- Sidebar : `bg-[#F7F7F7] dark:bg-[#1A1A1A]`
- Input bar : `max-w-[680px] mx-auto bg-white dark:bg-[#1E1E1E]` + border + shadow
- Textarea : `bg-transparent text-[15px]`
- Wrapper principal : `var(--ai-bg)` = `white / #0A0A0A` (theme-aware via CSS var)

Le code en main correspond déjà au spec demandé. Si le fond gris est visible en prod :
1. **Cache Vercel ou navigateur** — faire un hard refresh (Cmd+Shift+R) en navigation privée
2. Le déploiement Vercel du dernier commit n'a peut-être pas encore propagé

## Modifications défensives appliquées

Même si le code est déjà conforme, deux nettoyages utiles :

### 1. Suppression de 2 règles CSS obsolètes dans AIPanel.tsx

Lignes 18779-18780 contiennent des règles ciblant l'ancienne sidebar (`aiq-conv-btn`, `aiq-sidebar`) qui n'existe plus depuis la rewrite. Suppression pour éviter toute interférence future.

```css
/* Avant */
html.dark .aip-root .aiq-conv-btn:hover { background: rgba(255,255,255,0.05) !important; }
html.dark .aip-root .aiq-sidebar { background: #141414 !important; }

/* Après : supprimé */
```

### 2. `bg-transparent` explicite sur conv items default

Bien que techniquement inutile (l'absence de classe `bg-*` donne déjà transparent), ajout pour ceinture+bretelles contre toute règle CSS résiduelle qui pourrait s'appliquer.

```tsx
// itemCls :
isActive
  ? 'bg-black/[0.06] dark:bg-white/10'
  : 'bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/5'
```

## Aucun autre changement

Logique, agents, API, autres fichiers : inchangés.

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
