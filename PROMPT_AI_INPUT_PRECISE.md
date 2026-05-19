# Interface IA — Champ d'écriture et animations

## RÉFÉRENCE : copier le comportement EXACT de Claude.ai
L'objectif est d'obtenir le même rendu.

---

## 1. Champ d'écriture — SPECS EXACTES

### Structure HTML
Remplacer l'input actuel par un <textarea> si ce n'est pas déjà le cas.

### Conteneur du textarea
- Position : fixed en bas de l'écran (pas relative au scroll)
- Largeur : 100% avec max-width 768px, centré horizontalement
- Padding horizontal : 16px à gauche et droite du conteneur
- Margin bottom : 16px (espace avec le bas de l'écran)
- Fond du conteneur : même couleur que le fond du chat (transparent)
- PAS de ligne de séparation au-dessus. PAS de border-top. RIEN.

### Le textarea lui-même
- Background : gris très clair (#F4F4F5 en light mode, #2A2A2E en dark)
- Border : 1px solid transparent au repos
- Border au focus : 1px solid #D1D5DB (light) ou #4A4A4E (dark)
- Border-radius : 24px (très arrondi, comme Claude)
- Padding : 14px 52px 14px 16px (espace à droite pour les boutons)
- Font-size : 16px (IMPORTANT — pas 13px ou 14px, 16px minimum)
- Line-height : 1.5
- Placeholder : "Écrire un message..." en gris moyen, font-size 16px
- Min-height : 52px (une ligne)
- Max-height : 200px (après ça, scroll interne)
- Resize : none (pas de handle de resize)

### Auto-expand (CRITIQUE)
Le textarea DOIT grandir automatiquement quand l'utilisateur tape
du texte sur plusieurs lignes.

```javascript
const textarea = textareaRef.current;
textarea.style.height = 'auto';
textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
```

Appeler cette logique à chaque onChange ET onInput.

### Barre de boutons (à l'INTÉRIEUR du conteneur arrondi)
- Gauche : bouton "+"
- Droite : sélecteur modèle + bouton vocal + bouton envoyer
- Layout : [ + ]  [zone texte]  [Modèle ∨] [🎤] [➤]

### Taille du texte dans le chat
- Messages utilisateur : 16px
- Messages IA : 16px

---

## 2. Animation "IA réfléchit" — SPECS EXACTES

3 points qui rebondissent (bounce), simple comme Claude.

```css
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}
```

PAS de texte "Analyse en cours..."
PAS de cercle de chargement
PAS de barre de progression

Transition : quand le premier token arrive, points fade-out 200ms,
texte fade-in.

---

## 3. Bouton vocal — animation d'enregistrement

### Pendant l'enregistrement
- Texte/placeholder disparaît
- Animation d'onde sonore (20 barres verticales oscillantes)
- Gauche : bouton X (annuler) — cercle gris 32px
- Droite : compteur "0:01" + bouton ✓ (valider) — cercle bleu 32px

### Implémentation
- navigator.mediaDevices.getUserMedia({ audio: true })
- webkitSpeechRecognition / SpeechRecognition
- Si non supporté : masquer le bouton

---

## 4. Application mobile
Identique desktop. Conteneur 100% largeur (pas de max-width).
