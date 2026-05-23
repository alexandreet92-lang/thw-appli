# PROMPT_IA_CLAUDE_EXACT — Refonte page IA identique à Claude.ai

## OBJECTIF
Refaire entièrement la page IA pour qu'elle soit visuellement
identique à Claude.ai, adapté aux couleurs THW.

---

## RÈGLE ABSOLUE N°1 : ZÉRO BORDER VISIBLE
Interdiction d'utiliser `border`, `border-t`, `border-b`, `divide-y`
ou toute ligne de séparation dans cette interface.
La séparation entre éléments = UNIQUEMENT l'espace blanc et
les différences de fond de couleur.
Exception unique : un `border-r` de 1px très léger entre la sidebar et le contenu principal.

## RÈGLE ABSOLUE N°2 : PALETTE RÉDUITE
Couleurs autorisées :
- Fond principal : blanc `#FFFFFF` (light) / `#0A0A0A` (dark)
- Fond sidebar : `#F7F7F7` (light) / `#141414` (dark)
- Texte principal : `#0A0A0A` (light) / `#FAFAFA` (dark)
- Texte secondaire (dates, placeholders) : `#8C8C8C`
- Fond hover conversation : `rgba(0,0,0,0.05)` (light) / `rgba(255,255,255,0.05)` (dark)
- Conversation active : `rgba(0,0,0,0.08)` (light) / `rgba(255,255,255,0.08)` (dark)
- Les logos agents : leurs couleurs spécifiques
- Bouton envoi : dégradé `#06B6D4 → #2563EB`
- AUCUNE autre couleur

## RÈGLE ABSOLUE N°3 : LOGOS AGENTS OBLIGATOIRES
Athéna = shuriken 4 bras, couleur #2563EB (bleu)
Zeus   = shuriken 6 bras, couleur #7C3AED (violet)
Hermès = shuriken 3 bras, couleur #D97706 (ambre)

---

## STRUCTURE GLOBALE
```tsx
<div className="flex h-screen overflow-hidden bg-white dark:bg-[#0A0A0A]">
  <AISidebar />
  <main className="flex-1 flex flex-col min-w-0">
    <AIHeader />
    <AIContent />
    <AIInputBar />
  </main>
</div>
```

## FICHIERS
- `/components/ai/AgentIcon.tsx` (nouveau, < 60 lignes)
- `/components/ai/AISidebar.tsx` (refaire entièrement, < 180 lignes)
- `/components/ai/AIHeader.tsx` (refaire, < 80 lignes)
- `/components/ai/AIInputBar.tsx` (refaire, < 120 lignes)
- `/components/ai/AIContent.tsx` (refaire, < 100 lignes)
- `/components/ai/QuickActionsSheet.tsx` (nouveau, < 80 lignes)
- Page IA principale : utiliser ces composants

## Règles finales
- Aucun emoji
- Aucune couleur en dehors de la palette définie
- AgentIcon partout où l'agent est mentionné
- npm run build doit passer
