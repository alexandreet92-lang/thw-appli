# PROMPT_LAPS_DETAIL_DIAGNOSTIC — Diagnostic LapsDetailView

**Mode : lecture / grep uniquement. Aucune modification.**

---

## 1. Résultat des commandes

### `ls -la PROMPT_LAPS_DETAIL_VIEW.md`
```
-rw-r--r-- 1 free staff 8546 Jun 8 11:29 PROMPT_LAPS_DETAIL_VIEW.md
```
✅ Fichier markdown présent.

### Composants `LapsDetailView` / `LapDetailsSheet`
```
src/app/activities/page.tsx
src/components/activity/LapsDetailView.tsx
```
✅ Le composant a bien été créé dans `src/components/activity/LapsDetailView.tsx`. Importé dans `activities/page.tsx`.

### Handlers de tap (`onLapTap`, `onLapClick`)
**Aucun match.** L'API `onLapTap` n'a pas été ajoutée à `LapsBikeChart`. Le clic sur une barre déclenche toujours le handler INTERNE existant.

### Slide depuis la droite / `laps-detail` / `laps-scroller`
```
src/components/activity/LapsDetailView.tsx:525  @keyframes lapsViewIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
src/components/activity/LapsDetailView.tsx:526  @keyframes lapsViewOut { from{transform:translateX(0)} to{transform:translateX(100%)} }
src/components/activity/LapsDetailView.tsx:527  .laps-scroller::-webkit-scrollbar { display: none; }
src/components/activity/LapsDetailView.tsx:607  className="laps-scroller"
```
✅ Animations slide-right et le scroller existent dans le composant.

---

## 2. Code de la fiche activité — branchement actuel

### Branche mobile (`src/app/activities/page.tsx` l. 7352-7377)
```tsx
{a.laps && a.laps.length > 1 && (
  <Section title={`Intervalles — ${a.laps.length} tours`}>
    {isBike && a.streams?.watts && a.streams.watts.length >= 2 ? (
      <>
        <LapsBikeChart
          activityId={a.id}
          cachedLaps={a.laps}
          avgWatts={a.avg_watts}
          streams={a.streams}
          ftp={bikeZoneRow?.ftp_watts ?? null}
        />
        <button
          onClick={() => { setLapsViewInitial(0); setLapsViewOpen(true) }}
          style={{
            marginTop: 12, width: '100%',
            padding: '12px 16px',
            background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Voir tous les tours ›
        </button>
      </>
    ) : ( /* table fallback */ )}
  </Section>
)}
```

### Mount unique de la vue (l. 7970-7984)
```tsx
<LapsDetailView
  open={lapsViewOpen}
  onClose={() => setLapsViewOpen(false)}
  initialActiveLap={lapsViewInitial}
  laps={a.laps ?? []}
  streams={a.streams ?? null}
  …
/>
```

### Tap interne de `LapsBikeChart` (l. 301 du composant)
```tsx
<g
  key={i}
  onClick={() => setSelectedLap(sel ? null : i)}  // ← toggle interne, ouvre la carte inline
  …
>
```
**Le handler `setSelectedLap` reste actif et n'a pas été overridé.** C'est lui qui ouvre la carte inline `LapDetailPanel` que l'utilisateur voit.

### Label T1/T2/T3 sous les barres (l. 335 de `LapsBikeChart`)
```tsx
<text … fontSize="10" …>
  T{i + 1}
</text>
```
**Le préfixe "T" est hard-codé dans `LapsBikeChart`.** La spec demandait les numéros sans préfixe (`1, 2, 3, …`), mais cette demande s'applique au **nouveau** graphique de `LapsDetailView`. Dans `LapsDetailView.tsx` l. 668, le rendu est bien `{i + 1}` sans préfixe.

---

## 3. Checklist d'implémentation

| # | Élément | État |
|---|---|---|
| 1 | `PROMPT_LAPS_DETAIL_VIEW.md` présent | ✅ **OUI** |
| 2 | Composant `LapsDetailView` créé | ✅ **OUI** — `src/components/activity/LapsDetailView.tsx` (~750 lignes) |
| 3 | Tap sur une barre du graphique ouvre la nouvelle vue | ❌ **NON** — le tap déclenche toujours `setSelectedLap` interne de `LapsBikeChart`. **Seul le bouton "Voir tous les tours ›"** ouvre la nouvelle vue. |
| 4 | Vue contient le gros graphique scrollable horizontal | ✅ **OUI** — `LapsDetailView.tsx` l. 593-655 (`BAR_WIDTH=50`, scroller, container `laps.length × 50`) |
| 5 | Profil altitude en zone grise pleine en arrière-plan | ✅ **OUI** — l. 612-619 (SVG `viewBox`/`preserveAspectRatio="none"` dans un parent `overflow: hidden`) |
| 6 | Numéros sous les barres sans préfixe "T" | ⚠️ **PARTIEL** — dans `LapsDetailView` les numéros sont bien sans T (l. 668). Mais dans **`LapsBikeChart`** (le chart de la fiche), le préfixe "T" est toujours là (l. 335). L'utilisateur voit le chart `LapsBikeChart` car la nouvelle vue ne s'ouvre pas au tap. |
| 7 | Bandeau récap "Tour X · W · Zone · Cadence" présent | ✅ **OUI** — l. 568-585 |
| 8 | Bouton "Détails du tour X ›" sticky en bas de la vue | ✅ **OUI** — l. 755-779 |
| 9 | Bottom sheet au tap Détails (Hero 2×2 + 6 détails + 4 donuts) | ✅ **OUI** — `LapDetailsSheet` dans le même fichier l. 314-455 |
| 10 | Ouvertures via `createPortal(node, document.body)` | ✅ **OUI** — vue (l. 526-786) et sheet (l. 411-455) portalisés |

---

## 4. Hypothèse de cause

**Cause B + amorce de C** :

### B — La nouvelle vue existe mais le tap sur les barres ne l'ouvre PAS

Le branchement actuel n'a câblé **que le bouton "Voir tous les tours ›"** qui apparaît SOUS le `LapsBikeChart`. Le clic sur une barre dans `LapsBikeChart` reste géré par son state interne `setSelectedLap` (l. 301 du composant), qui ouvre une carte inline `LapDetailPanel` sous le graphique (comportement pré-existant non modifié).

**Pourquoi** : le précédent prompt (`PROMPT_LAPS_DETAIL_VIEW.md`) précisait explicitement dans la section "Non implémenté (out of scope MVP)" :
> "Tap direct sur une barre du `LapsBikeChart` original → ouvre la vue : nécessiterait de modifier `LapsBikeChart` (panneau de détail interne existant). Pour l'instant, l'entrée est le bouton 'Voir tous les tours' placé juste sous le chart."

Ce choix était documenté mais pas conforme à la spec implicite ("Tap sur une barre du graphique des laps OU sur 'Voir tous les tours'") — d'où la confusion observée.

### C — La carte inline pré-existante n'a pas été supprimée

Le composant `LapDetailPanel` interne de `LapsBikeChart` (l. ~110-135) est toujours rendu quand `selectedLap !== null`. Aucune modification n'a touché à cette logique → l'ancien comportement subsiste.

### Pour fixer

Deux options de correctif possibles (à laisser au futur prompt) :

1. **Ajouter une prop `onLapTap` à `LapsBikeChart`** : si fournie, le clic sur une barre appelle cette callback AU LIEU de `setSelectedLap(i)`. Câbler dans `activities/page.tsx` : `onLapTap={(i) => { setLapsViewInitial(i); setLapsViewOpen(true) }}`. Optionnellement masquer le `LapDetailPanel` interne quand `onLapTap` est fourni.
2. **Supprimer entièrement le `LapDetailPanel` interne** et remplacer par l'ouverture de `LapsDetailView` à chaque tap. Plus radical mais cohérent avec la nouvelle architecture.

Le préfixe "T" dans `LapsBikeChart` (l. 335) reste un détail visuel séparé : le user voit `T1, T2, T3…` parce qu'il regarde le chart original — une fois la nouvelle vue ouverte au tap, il verra les numéros sans préfixe (déjà OK dans `LapsDetailView` l. 668).

**Aucune modification effectuée.**
