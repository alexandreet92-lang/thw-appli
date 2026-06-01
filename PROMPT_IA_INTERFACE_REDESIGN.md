# Refonte Interface IA — Style Claude.ai

## Objectif
Refonte complète de l'interface IA pour qu'elle ressemble à Claude.ai en conservant
l'identité visuelle THW (shuriken, dégradé cyan→bleu, dark/light mode).

## 1 — ÉCRAN PRINCIPAL (état vide, pas de conversation active)

### Layout
Fond bg-background, pleine hauteur, flex column.
Zone centrale (flex-1, flex items-center justify-center) :
- Shuriken SVG 48px, dégradé cyan→bleu
- "Bonjour, bon matin !" ← salutation basée sur l'heure
- "Comment puis-je t'aider ?" text-sm text-muted-foreground, mt-2
- Rien d'autre. Pas de cards. Pas d'actions rapides visibles.

### Barre d'input en bas (fixed bottom-0, safe-area-inset)
Structure Claude.ai :
```
┌─────────────────────────────────────────┐
│ [+] [Agent: Athéna ▾]     [🎤][➤]     │
│ Écrire un message...                    │
└─────────────────────────────────────────┘
```
- Fond : bg-card, border-t border-border, backdrop-blur-sm
- Textarea : auto-resize, max-height 120px, bg-transparent
- Bouton "+" : rond 34px, bg-muted → ouvre le menu actions (section 3)
- Sélecteur agent : pill bg-muted rounded-full px-3 py-1, icône shuriken + nom
- Bouton micro : rond 34px, bg-muted
- Bouton envoi : rond 34px, bg-gradient cyan→bleu, disabled si textarea vide (bg-muted)

## 2 — SIDEBAR (hamburger)

### Déclenchement
Bouton hamburger haut-gauche dans le header : rond 36px, bg-muted/50, 3 traits SVG.

### Animation d'ouverture
- Overlay backdrop : fixed inset-0 bg-black/40 z-40, fade-in 150ms
- Panel : fixed left-0 top-0 bottom-0 w-[280px], slide depuis la gauche

### Contenu
Header (pt-12 pb-4 px-4) :
- Nom de l'agent actuel + icône shuriken, text-lg font-semibold

Bouton "Nouvelle discussion" :
- border border-border rounded-xl px-4 py-2.5, icône + à gauche
- Au clic : nouvelle conversation, ferme sidebar, focus input

Liste conversations (flex-1, overflow-y-auto) :
- Titre section : "RÉCENTES" text-xs text-muted-foreground
- Chaque conversation : titre tronqué + date relative
- Conversation active : bg-accent

Agent switcher (bas, border-t) :
- 3 pills : Athéna | Zeus | Hermès
- Actif : bg-gradient cyan→bleu blanc
- Inactif : bg-muted
- Au clic : change l'agent (model), recharge les conversations, NE FERME PAS la sidebar

## 3 — MENU "+" (actions rapides cachées)

Sheet qui monte depuis le bas, max 60vh :
- Titre "Actions rapides" text-sm text-muted-foreground
- 4 actions avec icône shuriken + titre + description + chevron :
  * Créer un plan d'entraînement → agent Zeus
  * Identifier mes points faibles → agent Athéna
  * Créer un plan nutritionnel → agent Athéna
  * Comprendre l'application → agent Hermès
- Au clic : fermer le sheet, INJECTER le prompt dans le textarea,
  changer l'agent si nécessaire, focus sur l'input.
  NE PAS envoyer automatiquement.
- Section Joindre : Photos / Fichiers / Caméra (mobile seulement)

## 4 — BULLES DE CONVERSATION

Message utilisateur :
```
<div flex justify-end mb-4>
  <div max-w-[80%] bg-muted rounded-2xl rounded-br-sm px-4 py-2.5 text-sm>
    {content}
  </div>
</div>
```

Message IA :
```
<div flex gap-3 mb-4 items-start>
  <div w-7 h-7 rounded-full bg-gradient(cyan→bleu) flex items-center justify-center>
    {shuriken SVG blanc 13px}
  </div>
  <div flex-1 text-sm leading-relaxed>
    {TypedText}
  </div>
</div>
```

Auto-scroll vers le bas à chaque nouveau message.

## 5 — HEADER DE CONVERSATION ACTIVE

[hamburger] [Nom agent + shuriken] [nouvelle conv] [expand] [×]

## 6 — RÈGLES

- Ne pas modifier les agents (système prompt, logique de réponse)
- Ne pas modifier les routes API existantes
- Conversations dans localStorage `thw_ai_convs_v3` (inchangé)
- AISidebar.tsx < 180 lignes
- AIInputBar.tsx < 120 lignes
- AIQuickActionsSheet.tsx < 100 lignes
- AIMessageBubble.tsx < 80 lignes
- Modifier la page IA principale
- Aucun emoji dans l'interface
- npm run build doit passer
