# Navigation latérale unifiée — SectionLayout partagé (Profil · Planning · Calendar)

## Lecture préalable
- Système de réf = `ProfileContent` dans `src/app/profile/page.tsx` :
  desktop = rail sticky 56px→232px au hover (spacer + aside overlay), item actif
  = barre cyan 3px + fond `rgba(6,182,212,0.10)` ; mobile = onglets pleine largeur
  + soulignement gradient cyan + slide du contenu (`profile-slide-*`, 280ms). Sync
  URL `?tab=` (deep-link `?tab=ia` utilisé par le bouton Upgrader).
- `Planning` (`src/app/planning/page.tsx`, ~11k lignes) : `tab: 'training'|'week'`,
  pills lignes 11401-11412, contenu `TrainingTab` / `WeekTab`. Pas de sync URL.
- `Calendar` (`src/app/calendar/page.tsx`) : `tab: 'race'|'pro'|'perso'|'all'`,
  pills 1485-1492, contenu `RaceTab` / `CategoryTab` / `AllTab`. Pas de sync URL.
- Performance : NON concernée (laissée telle quelle).

## Composant extrait — `src/components/navigation/SectionLayout.tsx`
Un seul composant réutilisable (sidebar + onglets + slide combinés), props :
```ts
interface SectionDef { id; label; short?; subtitle?; icon: LucideIcon; content: ReactNode }
interface Props { sections; defaultSection?; header?; urlParam?; contentMaxWidth? }
```
- **Desktop (≥1024px)** : spacer 56px + `aside` sticky overlay (56↔220px au hover,
  transition 200ms), **fond `var(--bg)`** (se fond dans la page, noir/blanc pur),
  bordure droite `0.5px solid var(--border)`. Item : icône 18px + label/subtitle
  (opacité 0→1 au hover). Actif = barre cyan 3px gauche + fond cyan léger.
- **Mobile** : onglets `flex:1` pleine largeur, label centré, soulignement
  `linear-gradient(90deg,#06B6D4,#5b6fff)` 3px sous l'actif. Police 12px si ≥4
  onglets (Course/Pro/Perso/Tout tiennent), sinon 13px.
- **Slide** : `key={activeId}` + classe `sl-slide-right/left` selon le sens
  (index croissant → droite), 280ms `cubic-bezier(0.32,0.72,0,1)`.
- **URL** : si `urlParam` fourni, lit le param au mount (effect, SSR-safe) et
  `router.replace` au changement. Sinon état purement local.
- `header` optionnel rendu dans `<main>` (desktop) / en haut (mobile).
- `contentMaxWidth` optionnel (Profil = 900, conteneur centré).

## Intégrations
- **Profil** : `ProfileContent` réécrit pour rendre `<SectionLayout urlParam="tab"
  contentMaxWidth={900} header sections=[Profil/Notifications/Réglages IA]>`.
  Style `.profile-notif-grid` conservé. Aucune régression visuelle.
- **Planning** : suppression des pills ; `<SectionLayout sections=[Entraînement
  (Dumbbell), Semaine (CalendarDays)] header=<titre + bouton ?>>`. Contenu
  `TrainingTab` / `WeekTab` inchangé.
- **Calendar** : suppression des pills `.tab-btn` ; `<SectionLayout sections=[
  Course (Trophy)/Pro (Briefcase)/Perso (Heart)/Tout (LayoutGrid)]>`. Ids
  conservés (`race/pro/perso/all`) → composants `RaceTab/CategoryTab/AllTab`
  inchangés. Loader géré par section.content.

## Garanties
Aucune logique métier touchée (hooks, CRUD, modales conservés). Ids d'onglets
inchangés. Sidebar `var(--bg)` partout (y compris Profil).

npm run build : 0 erreur.
