# Navigation mobile — Barre d'onglets en bas

## ⚠️ Contrainte
S'applique UNIQUEMENT sur mobile (< 768px).
La navigation desktop (hamburger + sidebar) reste inchangée.
Créer un composant dédié : components/MobileTabBar.tsx
Max 200 lignes par fichier — décomposer si nécessaire.

---

## Structure de la barre

### Position et style
- Position : fixed en bas de l'écran, z-index élevé (50+)
- Hauteur : 64px + safe-area-inset-bottom (pour les iPhones)
- Fond : blanc (light mode) ou gris très foncé #1A1A1E (dark mode)
- Border-top : 0.5px solid gris clair
- 5 onglets répartis équitablement sur la largeur
- Le contenu de la page doit avoir un padding-bottom de 80px 
  pour ne pas être caché par la barre

### État principal — 5 onglets
De gauche à droite :

**Onglet 1 — Plan**
- Icône : calendrier (Lucide: CalendarDays)
- Label : "Plan" (10px, gris moyen)
- Actif : icône + label en bleu accent app
- Tap : passe en mode sous-pages (voir ci-dessous)

**Onglet 2 — Stats**
- Icône : graphique (Lucide: BarChart3)
- Label : "Stats" (10px)
- Tap : passe en mode sous-pages

**Onglet 3 — Enregistrer (bouton central)**
- PAS un onglet classique — un bouton circulaire proéminent
- Taille : 56px diamètre, dépasse de la barre de 16px vers le haut
- Fond : bleu accent app (dégradé cyan→bleu comme le logo)
- Icône : cercle concentrique (double cercle, blanc, 
  style bouton record Apple Watch)
- Pas de label texte
- Ombre : 0 4px 12px rgba(0,0,0,0.15)
- Tap : ouvre la page Enregistrer (placeholder pour l'instant,
  afficher un écran "Bientôt disponible" avec le logo app centré)

**Onglet 4 — Plus**
- Icône : 3 points horizontaux (Lucide: MoreHorizontal) 
  ou grille (Lucide: Grid3x3)
- Label : "Plus" (10px)
- Tap : passe en mode sous-pages

**Onglet 5 — IA**
- Icône : logo shuriken 4 bras (/logos/logo_gradient_4bras.png)
- Taille icône : 24px
- Pas de label texte (le logo suffit)
- Tap : ouvre DIRECTEMENT l'interface Coach IA
  (même action que le logo IA en haut à droite)

---

## Mode sous-pages

Quand l'utilisateur tape sur Plan, Stats ou Plus :
La barre se transforme — les 5 onglets sont REMPLACÉS par 
les sous-pages de cet onglet.

### Animation de transition
- Les 5 onglets glissent vers le bas (translateY +20px) et 
  fade out (opacity 0), durée 200ms
- Les sous-pages glissent vers le haut (translateY -20px → 0) 
  et fade in (opacity 0 → 1), durée 200ms
- Transition fluide, pas de saut

### Sous-pages Plan
`[← ] [Planning] [Calendar] [Session] [Blessures]`

- ← : flèche retour (Lucide: ChevronLeft), 24px, tap = retour 
  aux 5 onglets principaux
- Planning : icône Lucide: ClipboardList, label "Planning"
- Calendar : icône Lucide: Calendar, label "Calendar"
- Session : icône Lucide: Dumbbell, label "Session"
- Blessures : icône Lucide: HeartPulse, label "Blessures"

Chaque sous-page = icône (20px) + label (10px) dessous.
Tap = navigation vers la page correspondante.

### Sous-pages Stats
`[← ] [Training] [Récup] [Nutrition] [Perf]`

- Training : icône Lucide: Activity, label "Training"
- Récup : icône Lucide: Moon, label "Récup"
- Nutrition : icône Lucide: Apple, label "Nutrition"
- Perf : icône Lucide: Trophy, label "Perf"

### Sous-pages Plus
`[← ] [Connexions] [Briefing] [Profil] [Réglages]`

- Connexions : icône Lucide: Link, label "Connexions"
- Briefing : icône Lucide: FileText, label "Briefing"
- Profil : icône Lucide: User, label "Profil"
- Réglages : icône Lucide: Settings, label "Réglages"

---

## Comportement de navigation

### Page active = onglet surligné
Quand l'utilisateur est sur une page (ex: /recovery), 
l'onglet parent correspondant (Stats) doit être surligné 
en bleu dans la barre principale.

Mapping pages → onglets :
- Plan : /planning, /calendar, /session, /blessures
- Stats : /activities, /recovery, /nutrition, /performance
- Plus : /connexions, /briefing, /profil, /parametres

### Retour automatique
Quand l'utilisateur navigue vers une page depuis les sous-pages,
la barre revient à l'état principal (5 onglets) avec l'onglet 
parent surligné.

### Cacher la barre dans certains cas
Masquer la barre quand :
- L'interface IA est ouverte en plein écran
- Un modal est ouvert
- Le clavier est visible (sur mobile, détecter le resize)

---

## Masquer l'ancien hamburger sur mobile
Sur mobile (< 768px) :
- Masquer le bouton hamburger (3 traits) dans la navbar
- Masquer le drawer/sidebar latéral
- La navbar du haut ne contient plus que : 
  logo app (gauche) + titre page (centre) + photo profil (droite)

---

## Rendu visuel des onglets
- Inactif : icône gris (#9CA3AF), label gris
- Actif : icône bleu accent, label bleu accent
- Tap feedback : légère réduction (scale 0.95) pendant 100ms
- Le bouton central Enregistrer ne change PAS de couleur,
  il est toujours bleu accent

## Responsive
- La barre n'apparaît QUE sur mobile (< 768px)
- Sur tablette (768-1024px) : au choix, la barre OU le sidebar
- Sur desktop (> 1024px) : pas de barre, navigation classique
