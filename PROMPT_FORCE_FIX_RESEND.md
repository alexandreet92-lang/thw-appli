# Force fix Resend — éliminer lavoiehybride.com

## Diagnostic réel
`grep -rn "lavoiehybride"` sur tout le projet → **0 occurrence** dans le code.
Le `from` utilisait déjà `the-hybridway.com`. L'erreur 403 des logs Vercel
(`lavoiehybride.com domain is not verified`) vient donc de la **variable d'env
`RESEND_FROM` configurée sur Vercel** qui pointe encore vers
`...lavoiehybride.com`. Comme `process.env.RESEND_FROM` est prioritaire sur le
fallback, le code ne pouvait pas la corriger seul.

## Correctif (défensif, robuste)
`src/app/api/topup/request-link/route.ts` : on **ignore** tout `RESEND_FROM`
contenant `lavoiehybride` et on retombe sur le domaine vérifié :

```ts
const FALLBACK_FROM = 'Hybrid Training <noreply@the-hybridway.com>'
const envFrom = process.env.RESEND_FROM
const from = envFrom && !envFrom.includes('lavoiehybride') ? envFrom : FALLBACK_FROM
```

→ Plus aucune chance d'expédier depuis le domaine non vérifié, même si l'env
Vercel n'est pas encore corrigée.

## Action recommandée côté Vercel (propreté)
Mettre à jour OU supprimer la variable `RESEND_FROM` :
`RESEND_FROM = Hybrid Training <noreply@the-hybridway.com>` (ou la retirer pour
laisser le fallback). Puis redéployer.

## Vérif
- `grep -rn "lavoiehybride" src` → vide. ✅
- Code : env prioritaire SAUF si elle contient le domaine non vérifié.
- npm run build : 0 erreur.
