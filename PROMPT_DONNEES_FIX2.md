# PROMPT_DONNEES_FIX2 — Trois corrections page Données/Training

## FIX 0 — Supprimer le composant parasite sur la landing page

### Problème
Sur la landing page `/`, l'onboarding global (WelcomeSlide avec animation orbite Hybrid,
rectangle blanc, sélecteur Std/Sat/Hyb) s'affiche brièvement avant que le middleware
redirige l'utilisateur. C'est parce que `GlobalOnboardingWrapper` dans `layout.tsx`
ne vérifie pas la route actuelle et tente de s'afficher sur toutes les pages.

### Fichier modifié
- src/components/onboarding/GlobalOnboardingWrapper.tsx

### Solution
Ajouter un check `window.location.pathname` dans le useEffect :
si on est sur `/` ou `/auth`, ne pas déclencher `setShow(true)`.

---

## FIX 1 — Extraire FitnessCards en composant autonome

### Problème
Les 3 cartes CTL/ATL/TSB sont inline dans SectionDonnees (activities/page.tsx ~lignes 1904-1955).
Doit devenir un composant réutilisable.

### Fichiers
- Créer : src/components/training/FitnessCards.tsx
- Modifier : src/app/activities/page.tsx — remplacer le bloc inline par <FitnessCards ctl={ctl} atl={atl} tsb={tsb} />

### Code FitnessCards.tsx
Props : `{ ctl: number|null; atl: number|null; tsb: number|null }`
State local : `const [openSheet, setOpenSheet] = useState<'CTL'|'ATL'|'TSB'|null>(null)`
Rendu : 3 cartes flex row (identique au code inline actuel) + 3 BottomSheet CTL/ATL/TSB

---

## FIX 2 — Animation slide BottomSheet + clic volume hebdo

### Problème
Le BottomSheet apparaît/disparaît sans animation (pas de slide-up/slide-down).
Le clic sur les barres du volume hebdo doit déclencher un BottomSheet animé.

### Fichier modifié
- src/components/ui/BottomSheet.tsx

### Solution animation
Remplacer le rendu statique par une animation CSS slide-up/slide-down :
- State `visible` (contrôle le montage dans le DOM)
- State `animIn` (contrôle le CSS transform)
- Quand `isOpen` passe à true : `setVisible(true)` → double rAF → `setAnimIn(true)`
- Quand `isOpen` passe à false : `setAnimIn(false)` → timeout 300ms → `setVisible(false)`
- Transform : `translateY(100%)` → `translateY(0)` en 300ms cubic-bezier(0.16,1,0.3,1)

Le clic volume hebdo (`setSelectedWeek(w)`) déjà wired à BottomSheet — bénéficie automatiquement de l'animation.
