# PROMPT IA SIDEBAR V2

## PROBLÈMES À CORRIGER EN PRIORITÉ

### Problème 1 — Logo incorrect
Chercher dans TOUT le projet le composant du logo shuriken THW.
Il est probablement dans :
- `/components/ui/Logo.tsx`
- `/components/Logo.tsx`
- `/public/` (SVG ou PNG)
- Dans le header de l'app principale

Utiliser CE composant existant partout dans l'interface IA.
Ne jamais dessiner un nouveau SVG étoile ou shuriken —
utiliser uniquement le logo officiel déjà dans le projet.

### Problème 2 — Structure sidebar à refaire entièrement
Ignorer tout ce qui a été fait sur la sidebar précédemment.
Repartir de zéro en suivant exactement ce prompt.

---

## SIDEBAR : STRUCTURE EXACTE

S'inspirer pixel par pixel de la sidebar Claude (image de référence).
Fond sombre : `#1A1A1A`. Texte blanc.

### ZONE HAUTE — Nom de l'app

```tsx
<div className="px-5 pt-5 pb-4">
  <div className="flex items-center justify-between">

    {/* Nom de l'app — même style typographique que "Claude" */}
    <h1 className="text-[28px] font-semibold tracking-tight
                   text-white leading-none">
      Hybrid
    </h1>

    {/* Avatar utilisateur — cercle avec initiale */}
    <div className="w-9 h-9 rounded-full bg-[#3A3A3A]
                    flex items-center justify-center
                    text-sm font-medium text-white
                    cursor-pointer hover:bg-[#444] transition-colors">
      {userInitial}  {/* ex: "A" pour Alex */}
    </div>
  </div>
</div>
```

### ZONE NAVIGATION — 3 items

Même structure que Claude : icône + label, spacing généreux.
Pas de border. Hover = léger fond arrondi.

```tsx
<nav className="px-3 pb-4">

  {/* PROJETS */}
  <NavItem
    icon={<ProjectsIcon />}   // SVG dossier empilé — même icône que Claude
    label="Projets"
    onClick={() => setView('projects')}
    active={view === 'projects'}
  />

  {/* TRAINING — agent Hybrid Training */}
  <NavItem
    icon={<LogoShuriken size={18} />}  // logo THW existant
    label="Training"
    onClick={() => setView('training')}
    active={view === 'training'}
  />

  {/* NETWORKS — agent Networks */}
  <NavItem
    icon={<NetworksIcon />}   // SVG réseau/connexion simple
    label="Networks"
    onClick={() => setView('networks')}
    active={view === 'networks'}
  />
</nav>
```

Composant NavItem :

```tsx
function NavItem({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5
        rounded-xl text-base font-medium
        transition-colors duration-100
        ${active
          ? 'bg-white/10 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/5'
        }
      `}
    >
      <span className="w-5 flex items-center justify-center opacity-70">
        {icon}
      </span>
      {label}
    </button>
  )
}
```

### SÉPARATEUR + LABEL "Récents"

```tsx
<div className="px-5 pt-2 pb-1">
  <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
    Récents
  </p>
</div>
```

### LISTE DES CONVERSATIONS

Filtrée selon la vue active (Training → conversations de l'agent Training,
Networks → conversations Networks, Projets → projets).

```tsx
<div className="flex-1 overflow-y-auto px-2">
  {conversations.map(conv => (
    <button
      key={conv.id}
      onClick={() => openConversation(conv.id)}
      className={`
        w-full text-left px-3 py-2 rounded-xl
        transition-colors duration-100
        ${activeConvId === conv.id
          ? 'bg-white/10'
          : 'hover:bg-white/5'
        }
      `}
    >
      <p className="text-sm text-white/90 truncate font-medium leading-snug">
        {conv.title ?? 'Nouvelle discussion'}
      </p>
      <p className="text-xs text-white/40 mt-0.5">
        {formatRelativeDate(conv.updated_at)}
      </p>
    </button>
  ))}
</div>
```

### BOUTON "NOUVELLE CONVERSATION" — en bas

C'est l'élément le plus important visuellement.
Exactement comme Claude : pill blanche, "+" à gauche, texte centré.

```tsx
<div className="px-4 pb-6 pt-3">
  <button
    onClick={createNewConversation}
    className="
      w-full h-12
      bg-white text-[#1A1A1A]
      rounded-full
      flex items-center justify-center gap-2
      text-sm font-semibold
      shadow-lg
      hover:bg-white/90
      active:scale-[0.98]
      transition-all duration-150
    "
  >
    {/* Icône + */}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"/>
    </svg>
    Nouvelle conversation
  </button>
</div>
```

---

## HEADER DE LA PAGE (ligne du haut quand sidebar fermée)

Sur mobile, quand la sidebar est fermée :

```tsx
<header className="h-12 flex items-center px-4 relative">

  {/* Hamburger gauche */}
  <button
    onClick={() => setSidebarOpen(true)}
    className="w-8 h-8 rounded-lg flex items-center justify-center
               text-[#8C8C8C] hover:bg-black/5 transition-colors"
  >
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <path d="M0 1h18M0 7h18M0 13h18"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </button>

  {/* Nom agent centré — avec le BON logo */}
  <div className="absolute left-1/2 -translate-x-1/2
                  flex items-center gap-2">
    <LogoShuriken size={16} color={agentColor} />
    <span className="text-sm font-semibold text-[#0A0A0A] dark:text-white">
      {currentAgentName}
      {/* "Training" ou "Networks" selon l'agent actif */}
    </span>
  </div>

  {/* Actions droite */}
  <div className="ml-auto flex items-center gap-0.5">
    {/* + nouvelle conversation */}
    <button className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-[#8C8C8C] hover:bg-black/5 transition-colors">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
    {/* expand */}
    <button className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-[#8C8C8C] hover:bg-black/5 transition-colors">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 5V1h4M9 1h4v4M1 9v4h4M13 9v4H9"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </button>
    {/* fermer */}
    <button className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-[#8C8C8C] hover:bg-black/5 transition-colors">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  </div>
</header>
```

---

## SECTION "PROJETS" (vue quand on clique Projets)

Les Projets dans Claude = collections de conversations avec contexte partagé.
Dans THW, un Projet = un plan entraînement ou nutritionnel créé par l'IA,
avec toutes les conversations liées à ce plan.

Fetch :

```ts
const { data: projects } = await supabase
  .from('ai_conversations')
  .select('id, title, agent, created_at')
  .eq('user_id', session.user.id)
  .eq('is_project', true)  // ou un champ équivalent
  .order('created_at', { ascending: false })
```

Si la table n'a pas de champ `is_project` : ajouter la migration.

```sql
ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS is_project boolean default false,
  ADD COLUMN IF NOT EXISTS project_name text;
```

Affichage dans la sidebar quand view === 'projects' :
Même style que les conversations mais avec une petite icône dossier
devant chaque item.

---

## ANIMATIONS SIDEBAR MOBILE

```css
/* Entrée */
@keyframes sidebar-slide-in {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}

/* Sortie */
@keyframes sidebar-slide-out {
  from { transform: translateX(0); }
  to   { transform: translateX(-100%); }
}

.sidebar-open  { animation: sidebar-slide-in  240ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.sidebar-close { animation: sidebar-slide-out 200ms cubic-bezier(0.4, 0, 1, 1) forwards; }
```

Backdrop : `fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40`
Fade-in 200ms / Fade-out 200ms simultanément à la sidebar.

---

## ÉCRAN VIDE (aucune conversation)

```tsx
<div className="flex-1 flex flex-col items-center justify-center gap-3">
  {/* Logo THW officiel — composant existant, taille 52px */}
  <LogoShuriken size={52} color={agentColor} />

  <div className="text-center">
    <h2 className="text-xl font-semibold text-[#0A0A0A] dark:text-white">
      {greeting}
    </h2>
    <p className="text-sm text-[#8C8C8C] mt-1">
      Comment puis-je t'aider ?
    </p>
  </div>
</div>
```

`agentColor` :
- Training → `#2563EB` (bleu)
- Networks → `#7C3AED` (violet)

---

## INSTRUCTIONS CRITIQUES POUR CLAUDE CODE

1. AVANT TOUT : chercher le composant Logo/Shuriken dans le projet entier.
   Commande : `grep -r "shuriken\|Shuriken\|Logo\|logo" --include="*.tsx" src/`
   Utiliser CE composant. Ne pas en créer un nouveau.

2. Les agents s'appellent "Training" et "Networks" dans l'interface.
   Pas "Athéna", "Zeus", "Hermès". Ces noms sont des noms internes.

3. Chaque fichier < 200 lignes. Séparer si nécessaire.

4. `npm run build` doit passer avant commit.

5. Ne pas modifier la logique des agents (system prompts, API calls).
   Uniquement l'interface visuelle.
