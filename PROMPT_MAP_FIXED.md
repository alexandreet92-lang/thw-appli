# PROMPT_MAP_FIXED — Carte mobile pleine largeur via position:fixed

## PROBLÈME
Les paddings des containers parents empêchent la carte d'être
pleine largeur. Solution : position:fixed sort la carte du flux.

## ÉTAPE 1 — Carte en position:fixed (mobile uniquement)
```
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '52vh',
  zIndex: 10,
  width: '100%',
}}
```

## ÉTAPE 2 — Contenu sous la carte
```
style={{
  marginTop: '52vh',
  position: 'relative',
  zIndex: 20,
}}
```

## ÉTAPE 3 — Supprimer les hacks précédents
- Supprimer width:100vw, margin-left:calc(-50vw+50%), overflow:hidden sur la carte
- Garder uniquement position:fixed

## Fichiers
- `src/app/activities/page.tsx`
