# Navigation — Fluidité des transitions entre pages

## Problème
Quand l'utilisateur change de page, il y a un temps de latence 
visible (écran blanc ou skeleton) qui casse la fluidité.

## Diagnostic
Vérifier ces points dans l'ordre :

### 1. Utilisation de Link au lieu de <a>
Chercher tous les liens de navigation dans l'app :
grep -rn "<a " --include="*.tsx" -l
grep -rn "window.location" --include="*.tsx" -l
grep -rn "router.push" --include="*.tsx" -l

Tout <a href="..."> ou window.location = "..." force un 
rechargement complet de la page.
Remplacer par import Link from 'next/link' et <Link href="...">.
router.push est OK mais vérifier qu'il est utilisé correctement.

### 2. Prefetch des routes
Next.js prefetch automatiquement les routes des <Link> visibles.
Vérifier que les liens dans la barre de navigation (sidebar, 
tab bar mobile) utilisent bien <Link> avec prefetch activé 
(c'est le défaut).

Pour les sous-pages de la tab bar mobile :
ajouter prefetch explicite au mount du composant :

```javascript
import { useRouter } from 'next/navigation'
const router = useRouter()
useEffect(() => {
  router.prefetch('/planning')
  router.prefetch('/calendar')
  router.prefetch('/recovery')
  // etc. pour toutes les pages principales
}, [])
```



### 3. Fichiers loading.tsx
Dans chaque dossier de page (app/(dashboard)/recovery/, etc.),
créer un fichier loading.tsx qui affiche un skeleton léger 
INSTANTANÉMENT pendant que la page charge.

Le skeleton doit correspondre au layout de la page 
(pas un spinner générique) :
- Rectangles gris animés (shimmer) aux emplacements des sections
- Même structure que la page finale
- Animation shimmer : gradient qui glisse de gauche à droite

### 4. Transition entre pages
Ajouter une transition CSS sur le contenu principal :
- Page sortante : fade-out 150ms
- Page entrante : fade-in 150ms
- Pas de déplacement (translateX/Y), juste opacity

Implémenter via un layout wrapper :

```tsx
// components/PageTransition.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```


Si framer-motion n'est pas installé : utiliser des CSS transitions.

### 5. Cache des données
Vérifier que les pages ne refont pas un fetch complet à chaque 
navigation. Utiliser le pattern stale-while-revalidate :
- Afficher les données en cache immédiatement
- Revalider en arrière-plan
- Mettre à jour si les données ont changé

Si les pages utilisent des Server Components avec fetch :
ajouter { next: { revalidate: 60 } } pour cacher 60 secondes.

Si les pages utilisent useEffect + fetch côté client :
utiliser SWR ou React Query pour le cache automatique.
