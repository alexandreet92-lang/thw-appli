# PROMPT_MOBILE_FIX5 — Header + texte dark mode page activité mobile

## FIX 1 — Masquer le header via useEffect + classe CSS
- useEffect: `document.body.classList.add('hide-app-header')` au mount, remove au unmount
- globals.css: `body.hide-app-header [data-app-header] { display: none !important; ... }`
- `data-app-header=""` sur le header mobile dans Sidebar.tsx (déjà présent)

## FIX 2 — Texte visible en dark mode
- sheetRef sur le div data-bottom-sheet
- useEffect: détecte dark mode, force couleurs par JS
- Attributs data-stat-label, data-stat-value, data-activity-title, data-activity-subtitle

## Fichiers modifiés
- `src/app/activities/page.tsx`
- `src/app/globals.css`
