# Fix expéditeur Resend (/api/topup/request-link)

## Problème
L'envoi du lien d'achat échouait : domaine d'expéditeur non vérifié sur Resend.
Le domaine vérifié réel est **the-hybridway.com**.

## Correction
`src/app/api/topup/request-link/route.ts` :
- Le code utilisait déjà `process.env.RESEND_FROM` mais avec un fallback erroné
  (`noreply@thwcoaching.com`).
- Fallback corrigé : `Hybrid Training <noreply@the-hybridway.com>`.

```ts
const from = process.env.RESEND_FROM ?? 'Hybrid Training <noreply@the-hybridway.com>'
```

→ Utilise `RESEND_FROM` si défini sur Vercel, sinon expédie depuis the-hybridway.com.

## Vérif
- RESEND_FROM pris en compte (env prioritaire).
- Email reçu une fois le domaine vérifié dans Resend.
- npm run build : 0 erreur.
